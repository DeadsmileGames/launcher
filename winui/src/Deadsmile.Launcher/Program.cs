using System.Collections.Concurrent;
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
        WinRT.ComWrappersSupport.InitializeComWrappers();
        var args = AppInstance.GetCurrent().GetActivatedEventArgs();
        instance = AppInstance.FindOrRegisterForKey("Deadsmile.Games.Launcher.WinUI");
        if (!instance.IsCurrent) return Redirect(instance, args);
        Activations.Enqueue(args);
        instance.Activated += (_, activation) =>
        {
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
        return hr == 0 && failure is null ? 0 : 1;
    }
    [DllImport("ole32.dll", EntryPoint = "CoWaitForMultipleHandles")]
    private static extern int CoWaitForMultipleHandles(uint flags, uint timeout, uint count, IntPtr[] handles, out uint index);
}

