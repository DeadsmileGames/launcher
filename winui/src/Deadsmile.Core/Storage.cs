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
    }
    public T Read<T>(string name, T fallback)
    {
        try { return JsonSerializer.Deserialize<T>(File.ReadAllText(FilePath(name)), JsonOptions) ?? fallback; }
        catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException) { return fallback; }
    }
    public void Write<T>(string name, T value) => AtomicWrite(FilePath(name), JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions));
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
    public void Log(string code)
    {
        try { File.AppendAllText(FilePath("winui.log"), DateTimeOffset.UtcNow.ToString("O") + " " + code + Environment.NewLine); }
        catch (IOException) { }
    }
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

