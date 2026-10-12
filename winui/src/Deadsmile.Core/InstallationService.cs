using System.IO.Compression;
using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Deadsmile.Core;

public sealed class InstallationService(Storage storage)
{
    public const string RecordName = ".deadsmile-install.json";
    private readonly SemaphoreSlim gate = new(1, 1);
    public Storage Storage { get; } = storage;
    public ConcurrentDictionary<string, InstalledGame> Installed { get; private set; } = new();
    public string Folder(string id) => Path.Combine(Storage.Games, Urls.Id(id));

    public async Task Refresh(IEnumerable<Game> catalog, Func<string, bool> busy, bool allowLegacyDetection = true)
    {
        await gate.WaitAsync();
        try
        {
            var indexed = new Dictionary<string, InstalledGame>();
            foreach (var game in catalog)
            {
                var id = Urls.Id(game.Id); var folder = Folder(id);
                PathGuard.RequireInside(Storage.Games, folder);
                var backup = folder + ".backup";
                PathGuard.RequireInside(Storage.Games, backup);
                if (!busy(id) && !Directory.Exists(folder) && Directory.Exists(backup) && ReadRecord(backup, id) is not null)
                    Directory.Move(backup, folder);
                if (allowLegacyDetection && !Directory.Exists(folder) && !busy(id) && !string.IsNullOrEmpty(game.Slug))
                {
                    var legacy = Path.Combine(Storage.Games, Urls.Slug(game.Slug));
                    PathGuard.RequireInside(Storage.Games, legacy);
                    if (Directory.Exists(legacy))
                    {
                        var old = ReadRecord(legacy, id);
                        var exe = old is not null ? Path.Combine(legacy, old.Executable) : FindExe(legacy);
                        if (exe is not null)
                        {
                            WriteRecord(legacy, new(id, Path.GetRelativePath(legacy, exe), old?.Version ?? game.Version));
                            Directory.Move(legacy, folder);
                        }
                    }
                }
                var record = ReadRecord(folder, id);
                if (record is not null)
                    indexed[id] = new(id, Path.Combine(folder, record.Executable), folder, record.Version);
                else if (busy(id) && Installed.TryGetValue(id, out var existing)) indexed[id] = existing;
            }
            Installed = new ConcurrentDictionary<string, InstalledGame>(indexed);
            Storage.Write("winui-installed.json", indexed);
        }
        finally { gate.Release(); }
    }
    public static InstallRecord? ReadRecord(string folder, string id)
    {
        try
        {
            PathGuard.CheckAncestors(folder);
            var record = JsonSerializer.Deserialize<InstallRecord>(File.ReadAllText(Path.Combine(folder, RecordName)), global::Deadsmile.Core.Storage.JsonOptions);
            if (record?.GameId != id || Path.IsPathRooted(record.Executable)) return null;
            var exe = Path.GetFullPath(Path.Combine(folder, record.Executable));
            PathGuard.RequireInside(folder, exe);
            return exe.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && File.Exists(exe) ? record : null;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException or LauncherException) { return null; }
    }
    public static void WriteRecord(string folder, InstallRecord record) =>
        global::Deadsmile.Core.Storage.AtomicWrite(Path.Combine(folder, RecordName), JsonSerializer.SerializeToUtf8Bytes(record, global::Deadsmile.Core.Storage.JsonOptions));
    public static string? FindExe(string folder)
    {
        var files = new List<string>(); var queue = new Queue<string>(); queue.Enqueue(folder);
        while (queue.TryDequeue(out var current))
        {
            foreach (var entry in Directory.EnumerateFileSystemEntries(current))
            {
                PathGuard.RequireInside(folder, entry);
                if (Directory.Exists(entry)) queue.Enqueue(entry); else files.Add(entry);
                if (files.Count + queue.Count > 100000) throw new LauncherException("ZIP_TOO_MANY_ENTRIES");
            }
        }
        var paths = files.ToArray();
        return paths.Where(x => x.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
            .Where(x => !Regex.IsMatch(Path.GetFileName(x), "^(unins|uninstall|setup)", RegexOptions.IgnoreCase))
            .OrderBy(x => Path.GetRelativePath(folder, x).Count(c => c == Path.DirectorySeparatorChar))
            .ThenBy(x => x, StringComparer.OrdinalIgnoreCase).FirstOrDefault();
    }
    public async Task<InstalledGame> Commit(string id, string staged, string? version, Func<string, bool> running)
    {
        id = Urls.Id(id);
        await gate.WaitAsync();
        try
        {
            if (running(id)) throw new LauncherException("GAME_RUNNING");
            var target = Folder(id); var backup = target + ".backup";
            PathGuard.RequireInside(Storage.Games, staged); PathGuard.RequireInside(Storage.Games, target);
            PathGuard.RequireInside(Storage.Games, backup);
            var exe = FindExe(staged) ?? throw new LauncherException("WINDOWS_EXECUTABLE_MISSING");
            var relative = Path.GetRelativePath(staged, exe);
            WriteRecord(staged, new(id, relative, version));
            if (Directory.Exists(backup)) throw new LauncherException("GAME_INSTALL_BACKUP_EXISTS");
            var hadOld = Directory.Exists(target);
            if (hadOld) Directory.Move(target, backup);
            try { Directory.Move(staged, target); }
            catch { if (hadOld && !Directory.Exists(target)) Directory.Move(backup, target); throw; }
            var result = new InstalledGame(id, Path.Combine(target, relative), target, version);
            Installed[id] = result;
            try { Storage.Write("winui-installed.json", Installed); }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException) { Storage.Log("INSTALL_INDEX_RECOVERY_PENDING"); }
            if (hadOld) { try { Directory.Delete(backup, true); } catch (Exception e) when (e is IOException or UnauthorizedAccessException) { Storage.Log("INSTALL_BACKUP_CLEANUP_PENDING"); } }
            return result;
        }
        finally { gate.Release(); }
    }
    public async Task Uninstall(string id, Func<string, bool> busy)
    {
        id = Urls.Id(id); await gate.WaitAsync();
        try
        {
            if (busy(id)) throw new LauncherException("GAME_RUNNING");
            var folder = Folder(id); PathGuard.RequireInside(Storage.Games, folder);
            if (ReadRecord(folder, id) is null) throw new LauncherException("GAME_PATH_UNSAFE");
            if (busy(id)) throw new LauncherException("GAME_RUNNING");
            Directory.Delete(folder, true); Installed.TryRemove(id, out _);
            Storage.Write("winui-installed.json", Installed);
        }
        finally { gate.Release(); }
    }
    public static async Task Extract(string archive, string destination, CancellationToken ct)
    {
        PathGuard.CheckAncestors(destination); Directory.CreateDirectory(destination);
        using var zip = ZipFile.OpenRead(archive);
        if (zip.Entries.Count > 100000) throw new LauncherException("ZIP_TOO_MANY_ENTRIES");
        long total = 0;
        foreach (var entry in zip.Entries)
        {
            ct.ThrowIfCancellationRequested();
            total = checked(total + entry.Length);
            if (total > 40L * 1024 * 1024 * 1024) throw new LauncherException("ZIP_EXTRACTED_SIZE_LIMIT");
            var segments = entry.FullName.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0 || segments.Any(s => s is "." or ".." || s.Contains(':') || s.EndsWith('.') || s.EndsWith(' ') ||
                s.Any(char.IsControl) || Regex.IsMatch(s.Split('.')[0], "^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$", RegexOptions.IgnoreCase)) ||
                Path.IsPathRooted(entry.FullName) || ((entry.ExternalAttributes >> 16) & 0xf000) == 0xa000)
                throw new LauncherException("ZIP_UNSAFE_ENTRY_BLOCKED");
            var target = Path.GetFullPath(Path.Combine(destination, Path.Combine(segments)));
            PathGuard.RequireInside(destination, target);
            if (entry.FullName.EndsWith('/') || entry.FullName.EndsWith('\\'))
            { Directory.CreateDirectory(target); continue; }
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            await using var source = entry.Open();
            await using var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true);
            await source.CopyToAsync(output, ct);
        }
    }
}

