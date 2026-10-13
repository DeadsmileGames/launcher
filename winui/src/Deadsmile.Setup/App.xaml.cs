using Microsoft.UI.Xaml;

namespace Deadsmile.Setup;

public partial class App : Application
{
    private MainWindow? window;

    public App()
    {
        RequestedTheme = ApplicationTheme.Dark;
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        window = new MainWindow(Program.Arguments);
        window.Activate();
    }
}
