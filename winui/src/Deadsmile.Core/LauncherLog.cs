using System.Text;
using System.Text.RegularExpressions;

namespace Deadsmile.Core;




public static class LauncherLog
{
    private static readonly object Gate = new();
    private static readonly Regex SensitiveValue = new(
        @"(?i)\b(password|passwd|token|secret|authorization|cookie|set-cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|credential|signature|sig|ticket|client[_-]?secret|code[_-]?verifier|device[_-]?code|oauth[_-]?code|nonce|otp|totp)\b(\s*[:=]\s*|\s+)([^\s,;]+)",
        RegexOptions.Compiled);
    private static readonly Regex SensitiveHeader = new(
        @"(?im)\b(authorization|cookie|set-cookie)\b(\s*[:=]\s*)[^\r\n]+",
        RegexOptions.Compiled);
    private const long MaxLogBytes = 8 * 1024 * 1024;
    private const int KeepTailChars = 3 * 1024 * 1024;
    private static string DefaultRoot => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Deadsmile Games Launcher");
    public static string LogPath => Path.Combine(DefaultRoot, "launcher.log");

    public static void Initialize() => Info("Startup", $"launcher process starting; pid={Environment.ProcessId}");
    public static void Info(string source, string message) => Write("INFO", source, message);
    public static void Warning(string source, string message) => Write("WARN", source, message);
    public static void Error(string source, string message, Exception? exception = null) =>
        Write("ERROR", source, message, exception);


    public static void WriteAtRoot(string root, string level, string source, string message, Exception? exception = null) =>
        WriteCore(root, level, source, message, exception);

    private static void Write(string level, string source, string message, Exception? exception = null) =>
        WriteCore(DefaultRoot, level, source, message, exception);

    private static string Clean(string value)
    {
        value = SensitiveHeader.Replace(value, "$1: [REDACTED]");
        return SensitiveValue.Replace(value, "$1=[REDACTED]");
    }

    private static void WriteCore(string root, string level, string source, string message, Exception? exception)
    {
        var safeMessage = Clean(message ?? "");
        var detail = exception is null ? "" : Environment.NewLine + Clean(exception.ToString());
        var entry = string.Concat(DateTimeOffset.UtcNow.ToString("O"), " [", level, "] [",
            Clean(source ?? "Unknown"), "] ", safeMessage, detail, Environment.NewLine);
        try
        {
            var directory = Path.GetFullPath(root);
            var path = Path.Combine(directory, "launcher.log");
            lock (Gate)
            {
                Directory.CreateDirectory(directory);
                TrimIfNeeded(path);
                File.AppendAllText(path, entry, new UTF8Encoding(false));
            }
        }
        catch (Exception)
        {
            try
            {
                var fallback = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Deadsmile Games Launcher");
                var path = Path.Combine(fallback, "launcher.log");
                lock (Gate)
                {
                    Directory.CreateDirectory(fallback);
                    TrimIfNeeded(path);
                    File.AppendAllText(path, entry, new UTF8Encoding(false));
                }
            }
            catch (Exception) { }
        }
    }

    private static void TrimIfNeeded(string path)
    {
        if (!File.Exists(path) || new FileInfo(path).Length <= MaxLogBytes) return;
        var text = File.ReadAllText(path, Encoding.UTF8);
        var start = Math.Max(0, text.Length - KeepTailChars);
        var boundary = text.IndexOf('\n', start);
        var tail = boundary >= 0 ? text[(boundary + 1)..] : text[start..];
        var trimmed = string.Concat(DateTimeOffset.UtcNow.ToString("O"),
            " [WARN] [Logger] older entries trimmed to keep launcher.log bounded", Environment.NewLine, tail);
        File.WriteAllText(path, trimmed, new UTF8Encoding(false));
    }
}
