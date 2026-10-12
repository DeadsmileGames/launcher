using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json.Nodes;

namespace Deadsmile.Core;

public sealed record RunningGame(Game Game, Process Process, string UserId, string SessionId, DateTimeOffset Started,
    SaveState? Save, string? LiveFile);

public sealed class GameService(ApiClient api, InstallationService installs, CloudSaveService saves, AchievementService achievements)
{
    private readonly ConcurrentDictionary<string, RunningGame> running = new();
    private readonly ConcurrentDictionary<string, byte> starting = new();
    private readonly SemaphoreSlim transitions = new(1, 1);
    public RunningGame[] Running => running.Values.ToArray();
    public bool Busy(string id) => running.ContainsKey(id) || starting.ContainsKey(id);
    public bool AnyBusy => running.Count > 0 || starting.Count > 0;
    public Func<string, bool> DownloadBusy { get; set; } = _ => false;
    public bool Stop(string id)
    {
        if (!running.TryGetValue(Urls.Id(id), out var active) || active.Process.HasExited) return false;
        try { active.Process.Kill(entireProcessTree: true); return true; }
        catch (InvalidOperationException) { return true; }
        catch (System.ComponentModel.Win32Exception) { return false; }
    }
    public event Action? Changed;
    public event Action<Exception>? Failed;
    public async Task Launch(Game requested)
    {
        var id = Urls.Id(requested.Id);
        if (!starting.TryAdd(id, 0)) throw new LauncherException("GAME_ALREADY_RUNNING");
        string? session = null;
        try
        {
            await transitions.WaitAsync();
            try
            {
                if (running.ContainsKey(id)) throw new LauncherException("GAME_ALREADY_RUNNING");
                if (DownloadBusy(id)) throw new LauncherException("GAME_DOWNLOAD_IN_PROGRESS");
                var metadata = await api.TrustedGame(id, requested.Slug);
                if (!installs.Installed.TryGetValue(id, out var installed)) throw new LauncherException("GAME_EXECUTABLE_INVALID");
                if (InstallationService.ReadRecord(installed.FolderPath, id) is not { } record ||
                    !Path.GetFullPath(Path.Combine(installed.FolderPath, record.Executable)).Equals(installed.Path, StringComparison.OrdinalIgnoreCase))
                    throw new LauncherException("GAME_EXECUTABLE_INVALID");
                var userId = (await api.Get("/auth/me")).S("id");
                if (!Guid.TryParse(userId, out _)) throw new LauncherException("GAME_ACCESS_UNAVAILABLE");
                var save = await saves.Prepare(metadata);
                var created = await api.Post("/platform/sessions", new { gameId = id, launcherVersion = BuildInfo.Version,
                    gameVersion = installed.Version, platform = "windows" });
                session = created.S("id");
                if (!Guid.TryParse(session, out _)) throw new LauncherException("GAME_ACCESS_UNAVAILABLE");
                if ((await api.Get("/auth/me")).S("id") != userId) throw new LauncherException("ACCOUNT_CHANGED");
                var live = metadata.Engine == "pico8" || CloudSaveService.IsAbby(metadata.Title, metadata.SaveTemplate)
                    ? Path.Combine(Path.GetDirectoryName(installed.Path)!, "deadsmile_achievements.txt") : null;
                if (live is not null) Storage.AtomicWrite(live, []);
                PathGuard.RequireInside(installs.Storage.Games, installed.Path);
                var info = new ProcessStartInfo(installed.Path) { WorkingDirectory = Path.GetDirectoryName(installed.Path),
                    UseShellExecute = false };
                // Do not pass launcher bootstrap settings into a game's unrelated runtime.
                foreach (var key in info.Environment.Keys.Where(x => x.StartsWith("MICROSOFT_WINDOWSAPPRUNTIME_",
                    StringComparison.OrdinalIgnoreCase) || x.StartsWith("DOTNET_STARTUP_", StringComparison.OrdinalIgnoreCase)).ToArray())
                    info.Environment.Remove(key);
                var process = Process.Start(info) ?? throw new LauncherException("GAME_LAUNCH_FAILED");
                var active = new RunningGame(metadata, process, userId, session, DateTimeOffset.UtcNow, save, live);
                running[id] = active; session = null; Changed?.Invoke(); _ = Observe(active);
            }
            finally { transitions.Release(); }
        }
        finally
        {
            if (session is not null) await End(session);
            starting.TryRemove(id, out _); Changed?.Invoke();
        }
    }
    private async Task Observe(RunningGame active)
    {
        var id = active.Game.Id;
        try
        {
            var exit = active.Process.WaitForExitAsync();
            while (!exit.IsCompleted)
            {
                try { await achievements.Detect(active.Game, active.Save?.Target, active.LiveFile, active.UserId); }
                catch (Exception ex) { installs.Storage.Log(ex is LauncherException le ? le.Code : "ACHIEVEMENT_TRACK_FAILED"); }
                await Task.WhenAny(exit, Task.Delay(2000));
            }
            await exit;
        }
        catch (Exception ex) { Failed?.Invoke(ex); }
        finally
        {
            try
            {
                var times = installs.Storage.Read("playtime.json", new Dictionary<string, double>());
                times[id] = times.GetValueOrDefault(id) + Math.Max(0, (DateTimeOffset.UtcNow - active.Started).TotalSeconds);
                installs.Storage.Write("playtime.json", times);
                await achievements.Detect(active.Game, active.Save?.Target, active.LiveFile, active.UserId);
            }
            catch (Exception ex) { installs.Storage.Log(ex is LauncherException le ? le.Code : "GAME_FINAL_SYNC_FAILED"); }
            try { if (active.Game.CloudEnabled) await saves.Upload(id, active.Save, active.UserId); }
            catch (Exception ex) { Failed?.Invoke(ex); }
            await End(active.SessionId);
            running.TryRemove(id, out _); active.Process.Dispose(); Changed?.Invoke();
        }
    }
    private async Task End(string session)
    {
        if (!Guid.TryParse(session, out _)) return;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { await api.Post("/platform/sessions/" + session + "/end", new { }); return; }
            catch (LauncherException ex) when (ex.Status == 409 && ex.Code == "SESSION_NOT_ACTIVE") { return; }
            catch { if (attempt < 2) await Task.Delay(500 * (1 << attempt)); }
        }
        installs.Storage.Log("SESSION_END_FAILED");
    }
}

