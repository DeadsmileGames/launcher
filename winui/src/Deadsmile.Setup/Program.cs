using Microsoft.UI.Dispatching;
using Microsoft.UI.Xaml;

namespace Deadsmile.Setup;

internal static class Program
{
    internal static string[] Arguments { get; private set; } = [];
    private static App? app;

    [STAThread]
    private static int Main(string[] args)
    {
        Arguments = args;
        if (SetupOperations.HasArgument(args, "--silent"))
            return SetupOperations.RunSilent(args);

        App.Log("Entry point started");
        try
        {
            WinRT.ComWrappersSupport.InitializeComWrappers();
            Application.Start(parameters =>
            {
                App.Log("Application.Start callback entered");
                try
                {
                    var queue = DispatcherQueue.GetForCurrentThread();
                    queue.EnsureSystemDispatcherQueue();
                    SynchronizationContext.SetSynchronizationContext(new DispatcherQueueSynchronizationContext(queue));
                    app = new App();
                    App.Log("App instance retained");
                }
                catch (Exception ex)
                {
                    App.Log("Application.Start callback failed", ex);
                    throw;
                }
            });
            App.Log("Application.Start returned");
            return 0;
        }
        catch (Exception ex)
        {
            App.Log("Entry point failed", ex);
            throw;
        }
    }
}
