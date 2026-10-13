using Microsoft.UI.Xaml;
using System.IO;
using System.Text;

namespace Deadsmile.Setup;

public partial class App : Application
{
    private MainWindow? window;

    internal static void Log(string stage, Exception? exception = null)
    {
        if (!string.Equals(Environment.GetEnvironmentVariable("DEADSMILE_SETUP_DIAGNOSTICS"), "1", StringComparison.Ordinal))
            return;
        try
        {
            var path = Path.Combine(Path.GetTempPath(), "Deadsmile.Setup-startup.log");
            var detail = exception is null ? "" : Environment.NewLine + exception;
            var entry = string.Concat(DateTimeOffset.Now.ToString("O"), " ", stage, detail, Environment.NewLine);
            File.AppendAllText(path, entry, new UTF8Encoding(false));
        }
        catch (Exception) { }
    }

    public App()
    {
        Log("App constructor entered");
        UnhandledException += (_, e) => Log("Application UnhandledException: " + e.Message, e.Exception);
        try
        {
            RequestedTheme = ApplicationTheme.Dark;
            InitializeComponent();
            Log("Application XAML initialized");
            // Keep startup ordering identical to the known-working WinUI 3 unpackaged entry point.
            // Creating the native setup window from OnLaunched was failing before that callback ran
            // in the published self-contained installer on the Windows CI runner.
            window = new MainWindow(Program.Arguments);
            Log("MainWindow constructor returned");
            window.Activate();
            Log("MainWindow activated");
        }
        catch (Exception ex)
        {
            Log("Application startup failed", ex);
            throw;
        }
    }
}
