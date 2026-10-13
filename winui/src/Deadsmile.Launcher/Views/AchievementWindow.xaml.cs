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
    public AchievementWindow(MainWindow owner, string heading, string title, bool forceSolid = false, bool hint = false)
    {
        InitializeComponent(); Heading.Text = heading; AchievementTitle.Text = title;
        if (hint) { ToastIcon.Symbol = Microsoft.UI.Xaml.Controls.Symbol.Ringer; Heading.Visibility = Visibility.Collapsed; }
        ToastRoot.RequestedTheme = owner.UiTheme;
        // Toasts can appear over full-screen games; keep their surface opaque regardless of
        // the launcher's Mica/acrylic preference so notification text remains legible.
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
    public void ShowOn(IntPtr game, bool centered = false)
    {
        var monitor = NativeWindow.WorkAreaFor(game); var scale = NativeWindow.DpiScale(game, this);
        var margin = (int)Math.Round(16 * scale); var width = Math.Min((int)Math.Round(centered ? 330 * scale : 360 * scale), monitor.Right - monitor.Left - margin * 2);
        var height = (int)Math.Round((centered ? 76 : 104) * scale);
        var rect = new NativeWindow.Rect { Left = monitor.Right - margin - width, Top = monitor.Bottom - margin - height,
            Right = monitor.Right - margin, Bottom = monitor.Bottom - margin };
        NativeWindow.Place(this, rect);
        // The game's process may be DPI-unaware. Re-check our own per-monitor window after placing it.
        var actualScale = NativeWindow.DpiScale(IntPtr.Zero, this);
        if (Math.Abs(actualScale - scale) > 0.01)
        {
            margin = (int)Math.Round(16 * actualScale); width = Math.Min((int)Math.Round(centered ? 330 * actualScale : 360 * actualScale), monitor.Right - monitor.Left - margin * 2);
            height = (int)Math.Round((centered ? 76 : 104) * actualScale);
            rect = new NativeWindow.Rect { Left = monitor.Right - margin - width, Top = monitor.Bottom - margin - height,
                Right = monitor.Right - margin, Bottom = monitor.Bottom - margin };
            NativeWindow.Place(this, rect);
        }
        if (centered)
        { var currentWidth = rect.Right - rect.Left; rect.Left = monitor.Left + (monitor.Right - monitor.Left - currentWidth) / 2; rect.Right = rect.Left + currentWidth; NativeWindow.Place(this, rect); }
        NativeWindow.ShowInactive(this); timer.Start();
    }
}

