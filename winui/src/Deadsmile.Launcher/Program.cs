using System.Collections.Concurrent;
using System.IO;
using Deadsmile.Core;
using System.Runtime.InteropServices;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Xaml;
using Microsoft.Windows.AppLifecycle;

namespace Deadsmile.Launcher;

internal static class Program
{
    internal static readonly ConcurrentQueue<AppActivationArguments> Activations = new();
    private static AppInstance? instance;
    [STAThread]
    private static int Main()
    {
        LauncherLog.Initialize();
        LauncherLog.Info("Startup", $"entry point started; pid={Environment.ProcessId}");
        try
        {
            var result = Run();
            LauncherLog.Info("Startup", $"entry point returned; exit_code={result}");
            return result;
        }
        catch (Exception ex)
        {
            LauncherLog.Error("Startup", "fatal startup/activation error", ex);
            ReportStartupFailure(ex);
            return 1;
        }
    }

    private static int Run()
    {
        WinRT.ComWrappersSupport.InitializeComWrappers();
        LauncherLog.Info("Startup", "WinRT COM wrappers initialized");
        var args = AppInstance.GetCurrent().GetActivatedEventArgs();
        LauncherLog.Info("Startup", $"activation received; kind={args.Kind}");
        instance = AppInstance.FindOrRegisterForKey("Deadsmile.Games.Launcher.WinUI");
        if (!instance.IsCurrent) return Redirect(instance, args);
        Activations.Enqueue(args);
        LauncherLog.Info("Startup", "single-instance registration complete");
        instance.Activated += (_, activation) =>
        {
            LauncherLog.Info("Startup", $"secondary activation received; kind={activation.Kind}");
            if (App.Main is { } window) window.DispatcherQueue.TryEnqueue(() => window.HandleActivation(activation));
            else Activations.Enqueue(activation);
        };
        Application.Start(parameters =>
        {
            var queue = DispatcherQueue.GetForCurrentThread();
            // Windows.UI.Composition system backdrops require the system queue in addition to WinUI's queue.
            queue.EnsureSystemDispatcherQueue();
            SynchronizationContext.SetSynchronizationContext(new DispatcherQueueSynchronizationContext(queue));
            _ = new App();
            LauncherLog.Info("Startup", "WinUI application object constructed");
        });
        return 0;
    }
    private static int Redirect(AppInstance target, AppActivationArguments args)
    {
        using var signal = new ManualResetEvent(false);
        Exception? failure = null;
        var work = Task.Run(async () =>
        {
            try { await target.RedirectActivationToAsync(args); }
            catch (Exception ex) { failure = ex; }
            finally { try { signal.Set(); } catch (ObjectDisposedException) { } }
        });
        var handles = new[] { signal.SafeWaitHandle.DangerousGetHandle() };
        var hr = CoWaitForMultipleHandles(8 | 16, 30000, 1, handles, out _);
        if (hr != 0) throw new COMException("Windows timed out while forwarding launcher activation.", hr);
        if (failure is not null) throw new InvalidOperationException("Could not forward activation to the active launcher instance.", failure);
        return 0;
    }

    private static void ReportStartupFailure(Exception exception)
    {
        // The full sanitized exception is already in the single central launcher.log.
        var message = "O Deadsmile Games Launcher não conseguiu iniciar." + Environment.NewLine + Environment.NewLine +
            "Detalhes: " + exception.GetBaseException().Message + Environment.NewLine + Environment.NewLine +
            "Log: " + LauncherLog.LogPath;
        _ = MessageBoxW(IntPtr.Zero, message, "Deadsmile Games Launcher", 0x10);
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    [DllImport("ole32.dll", EntryPoint = "CoWaitForMultipleHandles")]
    private static extern int CoWaitForMultipleHandles(uint flags, uint timeout, uint count, IntPtr[] handles, out uint index);
}

