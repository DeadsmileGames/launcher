using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using Deadsmile.Core;
using Microsoft.Win32;

namespace Deadsmile.Launcher.Services;

public static class DesktopIntegration
{
    public static bool Packaged
    {
        get
        {
            uint length = 0;
            return GetCurrentPackageFullName(ref length, null) != 15700;
        }
    }
    public static void Open(string value)
    {
        var uri = Urls.Https(value) ?? throw new LauncherException("INVALID_RESPONSE");
        Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
    }
    public static void RegisterProtocol()
    {
        if (Packaged) return;
        using var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\deadsmile");
        key.SetValue("", "URL:Deadsmile Games Launcher"); key.SetValue("URL Protocol", "");
        using var icon = key.CreateSubKey("DefaultIcon"); icon.SetValue("", "\"" + Environment.ProcessPath + "\",0");
        using var command = key.CreateSubKey(@"shell\open\command"); command.SetValue("", "\"" + Environment.ProcessPath + "\" \"%1\"");
    }
    public static void Shortcut(InstalledGame install, Game game)
    {
        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        if (string.IsNullOrEmpty(desktop)) return;
        var safe = string.Concat(game.Title.Where(c => !Path.GetInvalidFileNameChars().Contains(c))).Trim().TrimEnd('.', ' ');
        if (safe.Length > 100) safe = safe[..100];
        if (System.Text.RegularExpressions.Regex.IsMatch(safe.Split('.')[0], "^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) safe = "Deadsmile " + safe;
        if (string.IsNullOrEmpty(safe)) safe = "Deadsmile Game";
        var path = Path.Combine(desktop, safe + ".url");
        if (File.Exists(path) && !PointsTo(path, game.Id))
            path = Path.Combine(desktop, safe + " - Deadsmile " + game.Id[..8] + ".url");
        var text = "[InternetShortcut]\r\nURL=deadsmile://launch/" + Urls.Id(game.Id) +
            "\r\nIconFile=" + install.Path + "\r\nIconIndex=0\r\n";
        Storage.AtomicWrite(path, Encoding.Unicode.GetPreamble().Concat(Encoding.Unicode.GetBytes(text)).ToArray());
    }
    public static void RemoveShortcuts(string id)
    {
        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        if (!Directory.Exists(desktop)) return;
        try
        {
            foreach (var file in Directory.EnumerateFiles(desktop, "*.url"))
            {
                try
                {
                    if (new FileInfo(file).Length < 32768 && PointsTo(file, Urls.Id(id)))
                        File.Delete(file);
                }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
    }
    private static bool PointsTo(string file, string id) =>
        new FileInfo(file).Length < 32768 && File.ReadAllLines(file).Any(line =>
            line.Trim().Equals("URL=deadsmile://launch/" + id, StringComparison.OrdinalIgnoreCase));
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetCurrentPackageFullName(ref uint length, StringBuilder? name);
}

