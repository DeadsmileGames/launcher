using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Deadsmile.Core;

namespace Deadsmile.Launcher.Services;

public sealed record LauncherUpdate(string Version, string Revision, string Url, string Name, string Sha256, long Size, string Notes);
public sealed class UpdateService(Storage storage)
{
    public async Task<LauncherUpdate?> Check()
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Deadsmile-Games-Launcher/" + BuildInfo.Version);
        var json = await http.GetStringAsync("https://api.github.com/repos/deadsmilegames/launcher/releases/latest");
        var release = JsonNode.Parse(json);
        var version = release.S("tag_name").TrimStart('v', 'V');
        var versionOrder = Versions.Compare(version, BuildInfo.Version);
        if (versionOrder < 0) return null;
        var assets = release.At("assets").Items().ToArray();
        var manifestAsset = assets.FirstOrDefault(x => x.S("name").Equals("launcher-build.json", StringComparison.OrdinalIgnoreCase));
        var revision = "";
        if (manifestAsset is not null)
        {
            var manifestUrl = Urls.Https(manifestAsset.S("browser_download_url"));
            if (manifestUrl is null || manifestUrl.Host != "github.com")
                throw new LauncherException("UPDATE_INVALID");
            var manifestText = await http.GetStringAsync(manifestUrl.AbsoluteUri);
            var manifest = JsonNode.Parse(manifestText);
            revision = manifest.S("sourceSha").ToLowerInvariant();
            if (!System.Text.RegularExpressions.Regex.IsMatch(revision, "^[a-f0-9]{40}$"))
                throw new LauncherException("UPDATE_INVALID");
        }
        if (versionOrder == 0 && (revision.Length == 0 ||
            revision.Equals(BuildInfo.Revision, StringComparison.OrdinalIgnoreCase)))
            return null;
        var asset = assets.FirstOrDefault(x =>
            x.S("name").StartsWith("Deadsmile-Games-Launcher-WinUI-Setup-", StringComparison.OrdinalIgnoreCase) &&
            x.S("name").EndsWith("-x64.exe", StringComparison.OrdinalIgnoreCase));
        if (asset is null || Urls.Https(asset.S("browser_download_url")) is not { Host: "github.com" }) return null;
        var digest = asset.S("digest");
        if (!System.Text.RegularExpressions.Regex.IsMatch(digest, "^sha256:[a-fA-F0-9]{64}$"))
        {
            // GitHub API versions that omit asset.digest can still use the SHA-256 sidecar
            // published alongside the unsigned setup. Match both digest and filename.
            var sidecar = assets.FirstOrDefault(x =>
                x.S("name").Equals(asset.S("name") + ".sha256", StringComparison.OrdinalIgnoreCase));
            var sidecarUrl = Urls.Https(sidecar.S("browser_download_url"));
            if (sidecar is null || sidecarUrl is null || sidecarUrl.Host != "github.com")
                throw new LauncherException("UPDATE_CHECKSUM_MISSING");
            var text = await http.GetStringAsync(sidecarUrl.AbsoluteUri);
            var match = System.Text.RegularExpressions.Regex.Match(text.Trim(),
                "^([a-fA-F0-9]{64})\\s+(.+)$", System.Text.RegularExpressions.RegexOptions.CultureInvariant);
            if (!match.Success || !match.Groups[2].Value.Trim().Equals(asset.S("name"), StringComparison.Ordinal))
                throw new LauncherException("UPDATE_CHECKSUM_MISSING");
            digest = "sha256:" + match.Groups[1].Value.ToLowerInvariant();
        }
        var size = asset.L("size");
        if (size <= 0 || size > 1024L * 1024 * 1024) throw new LauncherException("UPDATE_INVALID");
        return new(version, revision, asset.S("browser_download_url"), asset.S("name"), digest[7..].ToLowerInvariant(), size, release.S("body"));
    }
    public async Task<string> Download(LauncherUpdate update)
    {
        var folder = Path.Combine(storage.Settings, "updates"); PathGuard.CheckAncestors(folder); Directory.CreateDirectory(folder);
        var target = Path.Combine(folder, "setup-" + Guid.NewGuid().ToString("N") + ".exe");
        try
        {
            using var http = SafeNetwork.CreateClient();
            using var stop = new CancellationTokenSource(TimeSpan.FromMinutes(15));
            using var response = await SafeNetwork.Get(http, update.Url, 0, stop.Token);
            response.EnsureSuccessStatusCode();
            await using (var input = await response.Content.ReadAsStreamAsync(stop.Token))
            await using (var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true))
            {
                var buffer = new byte[81920]; long size = 0; int count;
                while ((count = await input.ReadAsync(buffer, stop.Token)) > 0)
                {
                    size += count; if (size > update.Size) throw new LauncherException("UPDATE_INVALID");
                    await output.WriteAsync(buffer.AsMemory(0, count), stop.Token);
                }
                if (size != update.Size) throw new LauncherException("UPDATE_INVALID");
            }
            await using (var file = File.OpenRead(target))
                if (Convert.ToHexString(await SHA256.HashDataAsync(file)).ToLowerInvariant() != update.Sha256)
                    throw new LauncherException("UPDATE_CHECKSUM_MISMATCH");
            return target;
        }
        catch { if (File.Exists(target)) File.Delete(target); throw; }
    }
    public void Install(string path, string expectedSha256)
    {
        var updateFolder = Path.Combine(storage.Settings, "updates");
        PathGuard.RequireInside(updateFolder, path);
        var file = new FileInfo(path);
        if (!file.Exists || file.Length is <= 0 or > 1024L * 1024 * 1024 ||
            !System.Text.RegularExpressions.Regex.IsMatch(expectedSha256, "^[a-fA-F0-9]{64}$"))
            throw new LauncherException("UPDATE_INVALID");
        using (var stream = File.OpenRead(path))
        {
            var actual = Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
            if (!actual.Equals(expectedSha256, StringComparison.OrdinalIgnoreCase))
                throw new LauncherException("UPDATE_CHECKSUM_MISMATCH");
        }
        var installFolder = Path.GetDirectoryName(Environment.ProcessPath ?? "") ??
            throw new LauncherException("UPDATE_FAILED");
        var start = new ProcessStartInfo(path)
        {
            UseShellExecute = true,
            Arguments = "--target " + "\"" + installFolder + "\""
        };
        _ = Process.Start(start) ?? throw new LauncherException("UPDATE_FAILED");
    }
}

