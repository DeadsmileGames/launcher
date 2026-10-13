using Microsoft.UI.Xaml;

namespace Deadsmile.Setup;

public partial class App : Application
{
    public App()
    {
        RequestedTheme = ApplicationTheme.Dark;
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        var window = new MainWindow(Program.Arguments);
        window.Activate();
    }
}
