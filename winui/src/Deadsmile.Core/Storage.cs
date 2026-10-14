using System.Text.Json;

namespace Deadsmile.Core;

public sealed class Storage
{
    public string Root { get; }
    public string Games => System.IO.Path.Combine(Root, "Games");
    public string Settings => System.IO.Path.Combine(Root, "settings");
    public static JsonSerializerOptions JsonOptions { get; } = new()
    { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true, WriteIndented = true };

    public Storage(string? root = null)
    {
        Root = System.IO.Path.GetFullPath(root ?? System.IO.Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Deadsmile Games Launcher"));
        Directory.CreateDirectory(Settings); Directory.CreateDirectory(Games);
        PathGuard.CheckAncestors(Root); PathGuard.CheckAncestors(Settings); PathGuard.CheckAncestors(Games);
        LauncherLog.Info("Storage", $"storage initialized; root={Root}");
    }
    public T Read<T>(string name, T fallback)
    {
        var path = FilePath(name);
        if (!File.Exists(path)) return fallback;
        try { return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions) ?? fallback; }
        catch (JsonException)
        {
            LauncherLog.Warning("Storage", $"settings read failed; file={name}; reason=invalid_json");
            return fallback;
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            LauncherLog.Warning("Storage", $"settings read failed; file={name}; reason={e.GetType().Name}");
            return fallback;
        }
    }
    public void Write<T>(string name, T value)
    {
        AtomicWrite(FilePath(name), JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions));
        LauncherLog.Info("Storage", $"settings file written; file={name}");
    }
    public string FilePath(string name)
    {
        if (System.IO.Path.GetFileName(name) != name || name.Any(char.IsControl))
            throw new ArgumentException("Invalid settings filename");
        var p = System.IO.Path.Combine(Settings, name); PathGuard.CheckAncestors(p); return p;
    }
    public static void AtomicWrite(string destination, byte[] bytes)
    {
        PathGuard.CheckAncestors(destination); Directory.CreateDirectory(System.IO.Path.GetDirectoryName(destination)!);
        var temp = destination + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            { stream.Write(bytes); stream.Flush(true); }
            File.Move(temp, destination, true);
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }
    public void Log(string code) => LauncherLog.WriteAtRoot(Root, "INFO", "Core", code);
}

public static class PathGuard
{
    public static bool Inside(string root, string candidate)
    {
        var rel = System.IO.Path.GetRelativePath(System.IO.Path.GetFullPath(root), System.IO.Path.GetFullPath(candidate));
        return rel != "." && rel != ".." && !rel.StartsWith(".." + System.IO.Path.DirectorySeparatorChar)
            && !System.IO.Path.IsPathRooted(rel);
    }
    public static void RequireInside(string root, string candidate)
    { if (!Inside(root, candidate)) throw new LauncherException("GAME_PATH_UNSAFE"); CheckAncestors(candidate); }
    public static void CheckAncestors(string candidate)
    {
        var current = System.IO.Path.GetFullPath(candidate);
        while (!string.IsNullOrEmpty(current))
        {
            if ((File.Exists(current) || Directory.Exists(current)) &&
                (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                throw new LauncherException("GAME_PATH_UNSAFE");
            current = System.IO.Path.GetDirectoryName(current);
        }
    }
}

