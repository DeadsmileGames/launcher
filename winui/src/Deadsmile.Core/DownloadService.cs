using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;

namespace Deadsmile.Core;

public sealed class DownloadJob(Game game)
{
    public Game Game { get; } = game;
    public string Id => Game.Id;
    public string Status { get; internal set; } = "queued";
    public long Received { get; internal set; }
    public long Total { get; internal set; }
    public double Percent => Total == 0 ? 0 : Math.Min(95, Received * 95.0 / Total);
    public string? Error { get; internal set; }
    public DateTimeOffset? CompletedAt { get; internal set; }
    internal CancellationTokenSource? Cancellation;
    internal bool PauseRequested;
    internal bool CancelRequested;
    internal bool Active;
    internal int LastLoggedProgress;
    internal DownloadMetadata? Metadata;
    internal string? WorkRoot;
}

public sealed class DownloadService(ApiClient api, InstallationService installs, Func<string, bool> running) : IDisposable
{
    private readonly HttpClient http = SafeNetwork.CreateClient();
    private readonly SemaphoreSlim slots = new(2, 2);
    private readonly ConcurrentDictionary<string, DownloadJob> jobs = new();
    public DownloadJob[] Jobs => jobs.Values.ToArray();
    public event Action? Changed;
    public event Action<InstalledGame, Game>? Installed;
    public bool Busy(string id) => jobs.TryGetValue(id, out var j) && (j.Active || j.Status is "queued" or "paused");
    public bool AnyBusy => Jobs.Any(j => Busy(j.Id));
    public void Enqueue(Game game)
    {
        var id = Urls.Id(game.Id);
        LauncherLog.Info("Download", $"enqueue requested; game={id}");
        if (running(id)) { LauncherLog.Warning("Download", $"enqueue blocked because game is running; game={id}"); throw new LauncherException("GAME_RUNNING"); }
        if (jobs.TryGetValue(id, out var old) && (old.Active || old.Status is "queued" or "paused")) return;
        var job = new DownloadJob(game); jobs[id] = job; _ = Run(job);
    }
    public void Pause(string id)
    {
        if (!jobs.TryGetValue(id, out var j)) return;
        lock (j) { if (j.Status is "complete" or "committing") return; j.PauseRequested = true; j.Cancellation?.Cancel(); }
        LauncherLog.Info("Download", $"pause requested; game={id}");
    }
    public void Resume(string id)
    {
        if (!jobs.TryGetValue(id, out var j)) return;
        lock (j)
        {
            if (j.Active || j.Status is not ("paused" or "failed")) return;
            j.PauseRequested = false; j.CancelRequested = false; j.Status = "queued";
            LauncherLog.Info("Download", $"resume requested; game={id}"); _ = Run(j);
        }
    }
    public void Cancel(string id)
    {
        if (!jobs.TryGetValue(id, out var j)) return;
        lock (j)
        {
            if (j.Status is "complete" or "committing") return;
            j.CancelRequested = true; j.PauseRequested = false; j.Cancellation?.Cancel();
            LauncherLog.Info("Download", $"cancel requested; game={id}");
            if (!j.Active) { j.Status = "cancelled"; Cleanup(j); }
        }
        Changed?.Invoke();
    }
    private void Cleanup(DownloadJob j)
    {
        if (j.WorkRoot is not null)
        { try { PathGuard.RequireInside(installs.Storage.Games, j.WorkRoot); Directory.Delete(j.WorkRoot, true); } catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { installs.Storage.Log("DOWNLOAD_CLEANUP_PENDING"); } }
        j.WorkRoot = null;
    }
    private async Task Run(DownloadJob job)
    {
        lock (job) { if (job.Active) return; job.Active = true; job.Cancellation = new(); }
        var ct = job.Cancellation.Token; var acquired = false;
        try
        {
            LauncherLog.Info("Download", $"job started; game={job.Id}");
            Changed?.Invoke(); await slots.WaitAsync(ct); acquired = true;
            if (running(job.Id)) throw new LauncherException("GAME_RUNNING");
            var metadata = await api.Metadata(job.Id, ct);
            if (job.Metadata is { } previous && (previous.Size != metadata.Size || previous.Sha256 != metadata.Sha256 ||
                previous.Version != metadata.Version)) { Cleanup(job); job.Received = 0; }
            job.Metadata = metadata; job.Total = metadata.Size;
            var stagingRoot = Path.Combine(installs.Storage.Games, ".deadsmile-staging");
            PathGuard.RequireInside(installs.Storage.Games, stagingRoot); Directory.CreateDirectory(stagingRoot);
            job.WorkRoot ??= Path.Combine(stagingRoot, job.Id + "-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(job.WorkRoot);
            var archive = Path.Combine(job.WorkRoot, "game.zip");
            var offset = File.Exists(archive) ? new FileInfo(archive).Length : 0;
            // An un-hashed partial cannot establish that a fresh signed URL serves the same bytes.
            if (metadata.Sha256 is null && offset > 0) { File.Delete(archive); offset = 0; }
            if (offset > metadata.Size) { File.Delete(archive); offset = 0; }
            job.Status = "downloading"; job.Received = offset; Changed?.Invoke();
            if (offset < metadata.Size)
            {
                using var response = await SafeNetwork.Get(http, metadata.Url, offset, ct);
                if (!response.IsSuccessStatusCode) throw new LauncherException("GAME_DOWNLOAD_FAILED");
                var append = offset > 0 && response.StatusCode == HttpStatusCode.PartialContent &&
                    response.Content.Headers.ContentRange?.From == offset;
                if (response.StatusCode == HttpStatusCode.PartialContent && !append && offset > 0)
                    throw new LauncherException("GAME_DOWNLOAD_FAILED");
                if (!append) offset = 0;
                job.Received = offset;
                if (response.Content.Headers.ContentLength > metadata.Size - offset)
                    throw new LauncherException("GAME_DOWNLOAD_SIZE_MISMATCH");
                await using var input = await response.Content.ReadAsStreamAsync(ct);
                await using var output = new FileStream(archive, append ? FileMode.Append : FileMode.Create,
                    FileAccess.Write, FileShare.None, 81920, true);
                var buffer = new byte[81920];
                while (true)
                {
                    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    timeout.CancelAfter(TimeSpan.FromSeconds(60));
                    var read = await input.ReadAsync(buffer, timeout.Token);
                    if (read == 0) break;
                    if (job.Received + read > metadata.Size) throw new LauncherException("GAME_DOWNLOAD_SIZE_MISMATCH");
                    await output.WriteAsync(buffer.AsMemory(0, read), ct);
                    job.Received += read;
                    var progress = (int)(job.Percent / 10) * 10;
                    if (progress >= 10 && progress > job.LastLoggedProgress)
                    {
                        job.LastLoggedProgress = progress;
                        LauncherLog.Info("Download", $"progress; game={job.Id}; percent={progress}");
                    }
                    Changed?.Invoke();
                }
                await output.FlushAsync(ct);
            }
            if (new FileInfo(archive).Length != metadata.Size) throw new LauncherException("GAME_DOWNLOAD_SIZE_MISMATCH");
            if (metadata.Sha256 is not null)
            {
                await using var stream = File.OpenRead(archive);
                var actual = Convert.ToHexString(await SHA256.HashDataAsync(stream, ct)).ToLowerInvariant();
                if (actual != metadata.Sha256) { Cleanup(job); throw new LauncherException("GAME_DOWNLOAD_CHECKSUM_MISMATCH"); }
            }
            job.Status = "extracting"; Changed?.Invoke();
            var staged = Path.Combine(job.WorkRoot, "install");
            if (Directory.Exists(staged)) Directory.Delete(staged, true);
            await InstallationService.Extract(archive, staged, ct);
            lock (job) { ct.ThrowIfCancellationRequested(); job.Status = "committing"; }
            Changed?.Invoke();
            var result = await installs.Commit(job.Id, staged, metadata.Version, running);
            job.Status = "complete"; job.CompletedAt = DateTimeOffset.UtcNow;
            LauncherLog.Info("Download", $"installation complete; game={job.Id}; version={metadata.Version}");
            Installed?.Invoke(result, job.Game); Cleanup(job);
        }
        catch (OperationCanceledException)
        {
            job.Status = job.CancelRequested ? "cancelled" : job.PauseRequested ? "paused" : "failed";
            job.Error = "NETWORK_ERROR";
            LauncherLog.Info("Download", $"job ended; game={job.Id}; state={job.Status}");
        }
        catch (Exception e)
        {
            job.Status = "failed"; job.Error = e is LauncherException le ? le.Code : "GAME_DOWNLOAD_FAILED";
            LauncherLog.Error("Download", $"job failed; game={job.Id}; code={job.Error}", e);
        }
        finally
        {
            if (job.CancelRequested && job.Status != "complete") Cleanup(job);
            lock (job) { job.Active = false; job.Cancellation?.Dispose(); job.Cancellation = null; }
            if (acquired) slots.Release(); Changed?.Invoke();
        }
    }
    public void Dispose()
    { foreach (var j in Jobs) j.Cancellation?.Cancel(); http.Dispose(); }
}

