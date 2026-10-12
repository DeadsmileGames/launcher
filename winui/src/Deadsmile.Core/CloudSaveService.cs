using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Deadsmile.Core;

public sealed class SaveState(string target, long? revision = null)
{
    public string Target { get; } = target;
    public long? Revision { get; set; } = revision;
    public bool Conflict { get; set; }
}
public sealed class CloudSaveService(ApiClient api, Storage storage)
{
    public event Action<string>? Conflict;
    public static bool IsAbby(string title, string template = "")
    {
        var normalized = Regex.Replace(title.ToLowerInvariant(), "[^a-z0-9]", "");
        return normalized.Contains("abby") && normalized.Contains("restlessheart") ||
            template.Contains("deadsmile_abbys_restless_heart", StringComparison.OrdinalIgnoreCase);
    }
    public static string? Target(Game game)
    {
        var template = game.SaveTemplate;
        if (string.IsNullOrEmpty(template) && IsAbby(game.Title))
            template = "{appdata}/pico-8/cdata/deadsmile_abbys_restless_heart.p8d.txt";
        if (string.IsNullOrEmpty(template)) return null;
        var appdata = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var root = Path.Combine(appdata, "pico-8", "cdata");
        var candidate = Path.GetFullPath(template.Replace("{appdata}", appdata));
        if (!PathGuard.Inside(root, candidate) || !Regex.IsMatch(Path.GetFileName(candidate),
            @"^[a-z0-9_-]{1,64}\.p8d\.txt$", RegexOptions.IgnoreCase)) return null;
        PathGuard.CheckAncestors(candidate); return candidate;
    }
    public static byte[] Validate(byte[] bytes, string? hash = null)
    {
        if (bytes.Length is 0 or > 1024) throw new LauncherException("CLOUD_SAVE_INVALID_PAYLOAD");
        var content = Encoding.Latin1.GetString(bytes).Replace("\r\n", "\n");
        if (content.EndsWith('\n')) content = content[..^1];
        if (!Regex.IsMatch(content, "^(?:[0-9a-fA-F]{64}\\n){7}[0-9a-fA-F]{64}$"))
            throw new LauncherException("CLOUD_SAVE_INVALID_PAYLOAD");
        if (!string.IsNullOrEmpty(hash) && Regex.IsMatch(hash, "^[a-fA-F0-9]{64}$") &&
            !Convert.ToHexString(SHA256.HashData(bytes)).Equals(hash, StringComparison.OrdinalIgnoreCase))
            throw new LauncherException("CLOUD_SAVE_CHECKSUM_MISMATCH");
        return bytes;
    }
    public static byte[] RemoteBytes(JsonNode remote)
    {
        var encoded = remote.S("payload");
        if (encoded.Length is 0 or > 1368 || encoded.Length % 4 != 0 ||
            !Regex.IsMatch(encoded, "^[A-Za-z0-9+/]*={0,2}$")) throw new LauncherException("CLOUD_SAVE_INVALID_PAYLOAD");
        try
        {
            var bytes = Convert.FromBase64String(encoded);
            if (Convert.ToBase64String(bytes).TrimEnd('=') != encoded.TrimEnd('=')) throw new LauncherException("CLOUD_SAVE_INVALID_PAYLOAD");
            return Validate(bytes, remote.S("sha256"));
        }
        catch (FormatException) { throw new LauncherException("CLOUD_SAVE_INVALID_PAYLOAD"); }
    }
    public async Task<SaveState?> Prepare(Game game)
    {
        var target = Target(game); if (target is null) return null;
        var state = new SaveState(target);
        if (!game.CloudEnabled) return state;
        try
        {
            var remote = await api.Get("/platform/saves/" + Urls.Id(game.Id) + "/default");
            if (remote is null) throw new LauncherException("CLOUD_SAVE_INVALID_RESPONSE");
            var bytes = RemoteBytes(remote);
            state.Revision = remote.At("revision") is null ? null : remote.L("revision");
            DateTimeOffset.TryParse(remote.First("updated_at", "updatedAt").S(), out var updated);
            if (!File.Exists(target) || updated.UtcDateTime > File.GetLastWriteTimeUtc(target))
            {
                if (File.Exists(target) && !(await File.ReadAllBytesAsync(target)).SequenceEqual(bytes))
                    Backup(game.Id, target, bytes);
                Storage.AtomicWrite(target, bytes);
            }
        }
        catch (LauncherException ex) when (ex.Status == 404 && ex.Code == "SAVE_NOT_FOUND") { }
        catch (Exception ex)
        { state.Conflict = true; storage.Log(ex is LauncherException le ? le.Code : "CLOUD_SAVE_LOOKUP_UNAVAILABLE"); Conflict?.Invoke(game.Id); }
        return state;
    }
    private void Backup(string id, string target, byte[]? remote)
    {
        var folder = Path.Combine(storage.Settings, "cloud-save-conflicts");
        PathGuard.CheckAncestors(folder); Directory.CreateDirectory(folder);
        var stem = Urls.Id(id) + "-" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + "-" + Guid.NewGuid().ToString("N");
        if (File.Exists(target)) Storage.AtomicWrite(Path.Combine(folder, stem + ".local.p8d.txt"), File.ReadAllBytes(target));
        if (remote is not null) Storage.AtomicWrite(Path.Combine(folder, stem + ".remote.p8d.txt"), remote);
    }
    public async Task Upload(string id, SaveState? state, string userId)
    {
        if (state is null || state.Conflict || !File.Exists(state.Target)) return;
        PathGuard.CheckAncestors(state.Target);
        if ((await api.Get("/auth/me")).S("id") != userId) throw new LauncherException("ACCOUNT_CHANGED");
        var bytes = Validate(await File.ReadAllBytesAsync(state.Target));
        try
        {
            var n = await api.Put("/platform/saves/" + Urls.Id(id) + "/default",
                new { filename = Path.GetFileName(state.Target), payload = Convert.ToBase64String(bytes), revision = state.Revision, expectedUserId = userId });
            state.Revision = n.L("revision");
        }
        catch (LauncherException ex) when (ex.Status == 409 && ex.Code == "SAVE_CONFLICT")
        {
            state.Conflict = true; byte[]? remote = null;
            try { var n = await api.Get("/platform/saves/" + id + "/default"); if (n is not null) remote = RemoteBytes(n); }
            catch (LauncherException) { }
            Backup(id, state.Target, remote); Conflict?.Invoke(id);
        }
    }
    public static double? Number(byte[] bytes, int index)
    {
        var data = Regex.Replace(Encoding.UTF8.GetString(bytes), @"\s+", "");
        if (!Regex.IsMatch(data, "^[a-fA-F0-9]{512}$") || index is < 0 or > 63) return null;
        return unchecked((int)Convert.ToUInt32(data.Substring(index * 8, 8), 16)) / 65536.0;
    }
}

