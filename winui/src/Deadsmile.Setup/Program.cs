using Microsoft.UI.Dispatching;
using Microsoft.UI.Xaml;

namespace Deadsmile.Setup;

internal static class Program
{
    internal static string[] Arguments { get; private set; } = [];

    [STAThread]
    private static int Main(string[] args)
    {
        Arguments = args;
        if (SetupOperations.HasArgument(args, "--silent"))
            return SetupOperations.RunSilent(args);

        WinRT.ComWrappersSupport.InitializeComWrappers();
        Application.Start(parameters =>
        {
            var queue = DispatcherQueue.GetForCurrentThread();
            queue.EnsureSystemDispatcherQueue();
            SynchronizationContext.SetSynchronizationContext(new DispatcherQueueSynchronizationContext(queue));
            _ = new App();
        });
        return 0;
    }
}
