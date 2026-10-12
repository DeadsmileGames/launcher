using Deadsmile.Launcher.Services;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Composition.SystemBackdrops;
namespace Deadsmile.Launcher.Views;

public sealed partial class AchievementWindow : Window
{
    private readonly DispatcherQueueTimer timer;
    public AchievementWindow(MainWindow owner, string heading, string title, bool forceSolid = false)
    {
        InitializeComponent(); Heading.Text = heading; AchievementTitle.Text = title;
        ToastRoot.RequestedTheme = owner.UiTheme;
        // Mica is opaque, including its system fallback. Windows 10 always retains the solid XAML surface.
        if (!forceSolid && owner.Preferences.WindowsMaterials && OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000) && MicaController.IsSupported())
        { SystemBackdrop = new MicaBackdrop(); ToastRoot.Background = new SolidColorBrush(Microsoft.UI.Colors.Transparent); }
        if (owner.MotionEnabled) ToastRoot.ChildrenTransitions = new TransitionCollection { new EntranceThemeTransition { FromVerticalOffset = 20 } };
        if (AppWindow.Presenter is OverlappedPresenter p)
        { p.SetBorderAndTitleBar(false, false); p.IsResizable = false; p.IsAlwaysOnTop = true; }
        NativeWindow.Overlay(this); NativeWindow.PassClicks(this, true);
        NativeWindow.RoundCorners(this);
        timer = DispatcherQueue.CreateTimer(); timer.Interval = TimeSpan.FromSeconds(6);
        timer.Tick += (_, _) => { timer.Stop(); Close(); };
        Closed += (_, _) => timer.Stop();
    }
#if UI_VALIDATION
    internal FrameworkElement ValidationRoot => ToastRoot;
    internal bool ValidationSolid => ToastRoot.Background is SolidColorBrush brush && brush.Color.A == 255;
#endif
    public void ShowOn(IntPtr game)
    {
        var monitor = NativeWindow.MonitorFor(game);
        var rect = new NativeWindow.Rect { Left = monitor.Right - 440, Top = monitor.Bottom - 166,
            Right = monitor.Right - 20, Bottom = monitor.Bottom - 20 };
        NativeWindow.Place(this, rect); NativeWindow.ShowInactive(this); timer.Start();
    }
}

