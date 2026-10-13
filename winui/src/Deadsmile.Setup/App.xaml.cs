using Microsoft.UI.Xaml;
using System.IO;
using System.Reflection;
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
        UnhandledException += (_, e) =>
        {
            var detail = "Application UnhandledException: " + e.Message + " (HRESULT=0x" +
                e.Exception.HResult.ToString("X8") + ")";
            var context = e.Exception.GetType().GetProperties(BindingFlags.Instance | BindingFlags.Public)
                .Where(property => property.Name is "LineNumber" or "LinePosition" or "BaseUri" or "KeyContext" or "NameContext" or "UidContext")
                .Select(property =>
                {
                    try { return property.Name + "=" + property.GetValue(e.Exception); }
                    catch (Exception) { return null; }
                })
                .Where(value => !string.IsNullOrWhiteSpace(value));
            Log(detail + (context.Any() ? Environment.NewLine + string.Join("; ", context) : ""), e.Exception);
        };
        try
        {
            RequestedTheme = ApplicationTheme.Dark;
            InitializeComponent();
            Log("Application XAML initialized");
        }
        catch (Exception ex)
        {
            Log("Application initialization failed", ex);
            throw;
        }
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        Log("OnLaunched entered");
        try
        {
            window = new MainWindow(Program.Arguments);
            Log("MainWindow constructor returned");
            window.Activate();
            Log("MainWindow activated");
        }
        catch (Exception ex)
        {
            Log("OnLaunched failed", ex);
            throw;
        }
    }
}
