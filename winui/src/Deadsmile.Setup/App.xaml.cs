using Microsoft.UI.Xaml;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

namespace Deadsmile.Setup;

public partial class App : Application
{
    [ComImport]
    [Guid("82BA7092-4C88-427D-A7BC-16DD93FEB67E")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IRestrictedErrorInfo
    {
        [PreserveSig]
        int GetErrorDetails(
            [MarshalAs(UnmanagedType.BStr)] out string description,
            out int error,
            [MarshalAs(UnmanagedType.BStr)] out string restrictedDescription,
            [MarshalAs(UnmanagedType.BStr)] out string capabilitySid);

        [PreserveSig]
        int GetReference([MarshalAs(UnmanagedType.BStr)] out string reference);
    }

    [DllImport("combase.dll", ExactSpelling = true)]
    private static extern int RoGetRestrictedErrorInfo(out IRestrictedErrorInfo? restrictedErrorInfo);

    private static string ReadRestrictedErrorInfo()
    {
        try
        {
            var result = RoGetRestrictedErrorInfo(out var info);
            if (result < 0 || info is null)
                return "RoGetRestrictedErrorInfo HRESULT=0x" + result.ToString("X8");
            var detailsResult = info.GetErrorDetails(
                out var description, out var error, out var restrictedDescription, out var capabilitySid);
            return "RestrictedErrorInfo HRESULT=0x" + detailsResult.ToString("X8") +
                "; Error=0x" + error.ToString("X8") +
                "; Description=" + description +
                "; RestrictedDescription=" + restrictedDescription +
                "; CapabilitySid=" + capabilitySid;
        }
        catch (Exception ex)
        {
            return "RestrictedErrorInfo retrieval failed: " + ex;
        }
    }

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
            var exceptionData = e.Exception.Data.Keys.Cast<object>()
                .Select(key => key + "=" + e.Exception.Data[key]);
            var inner = e.Exception.InnerException is null ? "" :
                Environment.NewLine + "InnerException: " + e.Exception.InnerException;
            Log(detail + (context.Any() ? Environment.NewLine + string.Join("; ", context) : "") +
                (exceptionData.Any() ? Environment.NewLine + "Data: " + string.Join("; ", exceptionData) : "") +
                inner + Environment.NewLine + ReadRestrictedErrorInfo(), e.Exception);
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
