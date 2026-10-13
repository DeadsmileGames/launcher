using System.Diagnostics;
using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32;

namespace Deadsmile.Setup;

internal static class SetupOperations
{
    internal static string DefaultInstallPath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs", "Deadsmile Games Launcher");

    internal static bool HasArgument(IEnumerable<string> args, string value) =>
        args.Any(arg => string.Equals(arg, value, StringComparison.OrdinalIgnoreCase));

    internal static string? GetArgument(IReadOnlyList<string> args, string name)
    {
        for (var index = 0; index + 1 < args.Count; index++)
            if (string.Equals(args[index], name, StringComparison.OrdinalIgnoreCase))
                return args[index + 1].Trim('"');
        return null;
    }

    internal static int RunSilent(string[] args)
    {
        try
        {
            var target = GetArgument(args, "--target") ?? DefaultInstallPath;
            if (HasArgument(args, "--uninstall")) BeginUninstall(target);
            else Install(target, static _ => { });
            return 0;
        }
        catch (Exception)
        {
            return 1;
        }
    }

    internal static void Install(string requestedTarget, Action<int> progress)
    {
        var target = NormalizeTarget(requestedTarget);
        if (Directory.Exists(target) && !IsManagedInstall(target))
            throw new InvalidOperationException("A pasta escolhida já existe e não é uma instalação reconhecida do launcher. Escolha outra pasta ou desinstale a versão antiga primeiro.");
        if (Directory.Exists(target) && IsLauncherRunning())
            throw new InvalidOperationException("Feche o launcher e os jogos em execução antes de instalar ou atualizar.");

        var backup = target + ".backup";
        if (Directory.Exists(backup))
            throw new InvalidOperationException("Uma instalação anterior deixou um backup pendente. Renomeie ou restaure a pasta: " + backup);

        var payload = Path.Combine(AppContext.BaseDirectory, "AppPayload.zip");
        if (!File.Exists(payload))
            throw new FileNotFoundException("O pacote do launcher está ausente. Baixe novamente o instalador.", payload);

        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        var staging = target + ".new-" + Guid.NewGuid().ToString("N");
        try
        {
            var totalBytes = 0L;
            using (var archive = ZipFile.OpenRead(payload))
            {
                if (archive.Entries.Count is 0 or > 100000)
                    throw new InvalidDataException("O pacote de instalação não é válido.");
                foreach (var entry in archive.Entries)
                {
                    totalBytes = checked(totalBytes + entry.Length);
                    if (totalBytes > 4L * 1024 * 1024 * 1024)
                        throw new InvalidDataException("O pacote excede o tamanho máximo permitido.");
                }
            }

            ExtractPayload(payload, staging, totalBytes, progress);
            if (!File.Exists(Path.Combine(staging, "Deadsmile.Launcher.exe")) ||
                !File.Exists(Path.Combine(staging, "Microsoft.UI.Xaml.dll")))
                throw new InvalidDataException("O pacote está incompleto ou não contém o runtime WinUI.");

            File.WriteAllText(Path.Combine(staging, "deadsmile.install"), "Deadsmile.WinUI\n1.0.0\n", new UTF8Encoding(false));
            CopyUninstaller(staging);
            progress(97);

            var hadPrevious = Directory.Exists(target);
            if (hadPrevious) Directory.Move(target, backup);
            try { Directory.Move(staging, target); }
            catch
            {
                if (hadPrevious && !Directory.Exists(target) && Directory.Exists(backup))
                    Directory.Move(backup, target);
                throw;
            }

            Register(target);
            CreateShortcuts(target);
            progress(100);
            if (hadPrevious)
            {
                try { Directory.Delete(backup, true); }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
            }
        }
        catch
        {
            if (Directory.Exists(staging))
            {
                try { Directory.Delete(staging, true); }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
            }
            throw;
        }
    }

    private static string NormalizeTarget(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new InvalidOperationException("Escolha uma pasta de instalação.");
        var full = Path.TrimEndingDirectorySeparator(Path.GetFullPath(value.Trim().Trim('"')));
        var root = Path.TrimEndingDirectorySeparator(Path.GetPathRoot(full) ?? "");
        if (full.Length == 0 || string.Equals(full, root, StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(Path.GetFileName(full)))
            throw new InvalidOperationException("Não é permitido instalar o launcher na raiz de uma unidade.");
        var windows = Path.TrimEndingDirectorySeparator(Environment.GetFolderPath(Environment.SpecialFolder.Windows)) + Path.DirectorySeparatorChar;
        var programFiles = Path.TrimEndingDirectorySeparator(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)) + Path.DirectorySeparatorChar;
        if (full.StartsWith(windows, StringComparison.OrdinalIgnoreCase) ||
            full.StartsWith(programFiles, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("O instalador usa uma pasta do usuário e não deve gravar em diretórios protegidos do Windows.");
        return full;
    }

    private static bool IsManagedInstall(string folder)
    {
        try { return File.ReadAllText(Path.Combine(folder, "deadsmile.install")).StartsWith("Deadsmile.WinUI", StringComparison.Ordinal); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { return false; }
    }

    private static bool IsLauncherRunning()
    {
        foreach (var process in Process.GetProcessesByName("Deadsmile.Launcher"))
        {
            using (process)
            {
                try { if (!process.HasExited) return true; }
                catch (InvalidOperationException) { }
            }
        }
        return false;
    }

    private static void ExtractPayload(string payload, string staging, long total, Action<int> progress)
    {
        Directory.CreateDirectory(staging);
        var root = Path.GetFullPath(staging);
        var prefix = Path.TrimEndingDirectorySeparator(root) + Path.DirectorySeparatorChar;
        long completed = 0;
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using var archive = ZipFile.OpenRead(payload);
        foreach (var entry in archive.Entries)
        {
            var normalized = entry.FullName.Replace('\\', '/');
            var segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0 || Path.IsPathRooted(normalized) ||
                segments.Any(segment => segment is "." or ".." || segment.Contains(':') ||
                    segment.Any(char.IsControl) || segment.EndsWith(' ') || segment.EndsWith('.')) ||
                ((entry.ExternalAttributes >> 16) & 0xf000) == 0xa000)
                throw new InvalidDataException("O pacote contém um caminho de arquivo não permitido.");

            var destination = Path.GetFullPath(Path.Combine(root, normalized.Replace('/', Path.DirectorySeparatorChar)));
            if (!destination.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
                !names.Add(destination))
                throw new InvalidDataException("O pacote contém caminhos repetidos ou fora da pasta.");

            if (entry.FullName.EndsWith('/') || entry.FullName.EndsWith('\\'))
            {
                Directory.CreateDirectory(destination);
                continue;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            using var source = entry.Open();
            using var output = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, FileOptions.SequentialScan);
            var buffer = new byte[81920];
            int read;
            while ((read = source.Read(buffer, 0, buffer.Length)) > 0)
            {
                output.Write(buffer, 0, read);
                completed += read;
                progress(total > 0 ? Math.Clamp((int)(completed * 95 / total), 0, 95) : 95);
            }
        }
        progress(95);
    }

    private static void CopyUninstaller(string staging)
    {
        var destination = Path.Combine(staging, "Uninstall");
        Directory.CreateDirectory(destination);
        var sourceRoot = Path.TrimEndingDirectorySeparator(Path.GetFullPath(AppContext.BaseDirectory));
        foreach (var file in Directory.EnumerateFiles(sourceRoot, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(sourceRoot, file);
            if (string.Equals(relative, "AppPayload.zip", StringComparison.OrdinalIgnoreCase)) continue;
            var output = Path.Combine(destination, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            File.Copy(file, output, true);
        }
    }

    private static void Register(string target)
    {
        var exe = Path.Combine(target, "Deadsmile.Launcher.exe");
        using (var app = Registry.CurrentUser.CreateSubKey(@"Software\Deadsmile Games Launcher"))
            app?.SetValue("InstallDir", target);

        using (var protocol = Registry.CurrentUser.CreateSubKey(@"Software\Classes\deadsmile"))
        {
            protocol?.SetValue("", "URL:Deadsmile Games Launcher");
            protocol?.SetValue("URL Protocol", "");
        }
        using (var icon = Registry.CurrentUser.CreateSubKey(@"Software\Classes\deadsmile\DefaultIcon"))
            icon?.SetValue("", "\"" + exe + "\",0");
        using (var command = Registry.CurrentUser.CreateSubKey(@"Software\Classes\deadsmile\shell\open\command"))
            command?.SetValue("", "\"" + exe + "\" \"%1\"");

        var uninstaller = Path.Combine(target, "Uninstall", "Deadsmile.Setup.exe");
        using var uninstall = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI");
        uninstall?.SetValue("DisplayName", "Deadsmile Games Launcher");
        uninstall?.SetValue("DisplayVersion", "1.0.0");
        uninstall?.SetValue("Publisher", "Deadsmile Games");
        uninstall?.SetValue("InstallLocation", target);
        uninstall?.SetValue("DisplayIcon", exe);
        uninstall?.SetValue("UninstallString", "\"" + uninstaller + "\" --uninstall --target \"" + target + "\"");
        uninstall?.SetValue("NoModify", 1, RegistryValueKind.DWord);
        uninstall?.SetValue("NoRepair", 1, RegistryValueKind.DWord);
    }

    private static void CreateShortcuts(string target)
    {
        var exe = Path.Combine(target, "Deadsmile.Launcher.exe");
        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "Microsoft", "Windows", "Start Menu", "Programs", "Deadsmile Games");
        Directory.CreateDirectory(startMenu);
        try { CreateShortcut(Path.Combine(desktop, "Deadsmile Games Launcher.lnk"), exe, target); }
        catch (Exception ex) when (ex is COMException or InvalidOperationException or UnauthorizedAccessException) { }
        try { CreateShortcut(Path.Combine(startMenu, "Deadsmile Games Launcher.lnk"), exe, target); }
        catch (Exception ex) when (ex is COMException or InvalidOperationException or UnauthorizedAccessException) { }
    }

    private static void CreateShortcut(string path, string target, string workingDirectory)
    {
        var type = Type.GetTypeFromProgID("WScript.Shell", throwOnError: true)!;
        object shell = Activator.CreateInstance(type)!;
        try
        {
            dynamic shortcut = type.InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, [path])!;
            shortcut.TargetPath = target;
            shortcut.WorkingDirectory = workingDirectory;
            shortcut.IconLocation = target + ",0";
            shortcut.Description = "Deadsmile Games Launcher";
            shortcut.Save();
            if (Marshal.IsComObject(shortcut)) Marshal.FinalReleaseComObject(shortcut);
        }
        finally { if (Marshal.IsComObject(shell)) Marshal.FinalReleaseComObject(shell); }
    }

    internal static void BeginUninstall(string requestedTarget)
    {
        var target = NormalizeTarget(requestedTarget);
        if (!IsManagedInstall(target))
            throw new InvalidOperationException("Não foi encontrada uma instalação reconhecida nesta pasta.");

        var exe = Path.Combine(target, "Deadsmile.Launcher.exe");
        using (var protocol = Registry.CurrentUser.OpenSubKey(@"Software\Classes\deadsmile\shell\open\command", writable: false))
        {
            var command = protocol?.GetValue("") as string;
            if (command?.StartsWith("\"" + exe + "\"", StringComparison.OrdinalIgnoreCase) == true)
                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\deadsmile", throwOnMissingSubKey: false);
        }
        using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI", writable: false))
        {
            if (string.Equals(key?.GetValue("InstallLocation") as string, target, StringComparison.OrdinalIgnoreCase))
                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI", throwOnMissingSubKey: false);
        }
        using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Deadsmile Games Launcher", writable: false))
        {
            if (string.Equals(key?.GetValue("InstallDir") as string, target, StringComparison.OrdinalIgnoreCase))
                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Deadsmile Games Launcher", throwOnMissingSubKey: false);
        }

        var desktop = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Deadsmile Games Launcher.lnk");
        var startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "Microsoft", "Windows", "Start Menu", "Programs", "Deadsmile Games");
        TryDeleteFile(desktop);
        TryDeleteFile(Path.Combine(startMenu, "Deadsmile Games Launcher.lnk"));
        try { if (Directory.Exists(startMenu) && !Directory.EnumerateFileSystemEntries(startMenu).Any()) Directory.Delete(startMenu); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }

        ScheduleFolderRemoval(target);
    }

    private static void ScheduleFolderRemoval(string target)
    {
        var escaped = target.Replace("'", "''");
        var scriptPath = Path.Combine(Path.GetTempPath(), "deadsmile-uninstall-" + Guid.NewGuid().ToString("N") + ".ps1");
        var script = "$processId = " + Environment.ProcessId + Environment.NewLine +
            "$installPath = '" + escaped + "'" + Environment.NewLine +
            "try { Wait-Process -Id $processId -Timeout 180 -ErrorAction SilentlyContinue } catch {}" + Environment.NewLine +
            "Start-Sleep -Milliseconds 500" + Environment.NewLine +
            "if (Test-Path -LiteralPath $installPath) { Remove-Item -LiteralPath $installPath -Recurse -Force -ErrorAction SilentlyContinue }" + Environment.NewLine +
            "Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue" + Environment.NewLine;
        File.WriteAllText(scriptPath, script, new UTF8Encoding(false));
        var start = new ProcessStartInfo("powershell.exe")
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };
        start.ArgumentList.Add("-NoProfile");
        start.ArgumentList.Add("-ExecutionPolicy");
        start.ArgumentList.Add("Bypass");
        start.ArgumentList.Add("-File");
        start.ArgumentList.Add(scriptPath);
        if (Process.Start(start) is null)
            throw new InvalidOperationException("Não foi possível iniciar a limpeza da desinstalação.");
    }

    private static void TryDeleteFile(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
    }
}
