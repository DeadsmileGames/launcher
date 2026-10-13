using Deadsmile.Launcher.Services;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
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
        if (hint)
        {
            ToastSurface.Visibility = Visibility.Collapsed;
            ShortcutSurface.Visibility = Visibility.Visible;
            ToastRoot.RequestedTheme = owner.UiTheme;
            ShortcutSurface.RequestedTheme = owner.UiTheme;
            ShortcutHeading.Text = heading;
            ShortcutMessage.Text = title;
            ShortcutKey.Text = owner.OverlayShortcut.Replace("Control", "Ctrl").Replace("+", " + ");
            ShortcutIcon.Glyph = "\uEA80";
            ApplyShortcutTheme(owner.UiTheme);
        }
        else ToastRoot.RequestedTheme = owner.UiTheme;
        // Toasts can appear over full-screen games; keep their surface opaque regardless of
        // the launcher's Mica/acrylic preference so notification text remains legible.
        if (owner.MotionEnabled) ToastRoot.ChildrenTransitions = new TransitionCollection { new EntranceThemeTransition { FromVerticalOffset = 20 } };
        if (AppWindow.Presenter is OverlappedPresenter p)
        { p.SetBorderAndTitleBar(false, false); p.IsResizable = false; p.IsAlwaysOnTop = true; }
        NativeWindow.FloatingWindow(this); NativeWindow.PassClicks(this, true);
        NativeWindow.RoundCorners(this);
        timer = DispatcherQueue.CreateTimer(); timer.Interval = TimeSpan.FromSeconds(6);
        timer.Tick += (_, _) => { timer.Stop(); Close(); };
        Closed += (_, _) => timer.Stop();
    }
    private void ApplyShortcutTheme(ElementTheme theme)
    {
        var light = theme == ElementTheme.Light;
        ShortcutSurface.Background = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 246, 247, 249)
            : Windows.UI.Color.FromArgb(255, 36, 36, 36));
        ShortcutSurface.BorderBrush = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 213, 217, 223)
            : Windows.UI.Color.FromArgb(255, 69, 69, 69));
        ShortcutIconSurface.Background = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 228, 232, 237)
            : Windows.UI.Color.FromArgb(255, 56, 56, 56));
        ShortcutHeading.Foreground = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 29, 31, 34)
            : Windows.UI.Color.FromArgb(255, 245, 245, 245));
        ShortcutKey.Foreground = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 58, 63, 69)
            : Windows.UI.Color.FromArgb(255, 223, 223, 223));
        ShortcutMessage.Foreground = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 76, 81, 88)
            : Windows.UI.Color.FromArgb(255, 193, 193, 193));
        ShortcutIcon.Foreground = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 61, 105, 0)
            : Windows.UI.Color.FromArgb(255, 150, 222, 47));
        ShortcutMeter.Background = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 218, 222, 228)
            : Windows.UI.Color.FromArgb(255, 65, 65, 65));
        ShortcutMeterFill.Background = new SolidColorBrush(light
            ? Windows.UI.Color.FromArgb(255, 85, 140, 0)
            : Windows.UI.Color.FromArgb(255, 134, 217, 0));
    }

#if UI_VALIDATION
    internal FrameworkElement ValidationRoot => ToastRoot;
    internal bool ValidationSolid => ToastSurface.Background is SolidColorBrush brush && brush.Color.A == 255;
    internal bool ValidationHintStyle =>
        ShortcutSurface.Visibility == Visibility.Visible &&
        ToastSurface.Visibility == Visibility.Collapsed &&
        ShortcutHeading.Text.Length > 0 &&
        ShortcutMessage.Text.Length > 0 &&
        ShortcutIcon.Glyph == "\uEA80" &&
        ToastRoot.RequestedTheme == owner.UiTheme &&
        ShortcutSurface.RequestedTheme == owner.UiTheme &&
        ShortcutSurface.Background is SolidColorBrush surface &&
        (owner.UiTheme == ElementTheme.Light ? surface.Color.R > 200 : surface.Color.R < 80);
#endif
    public void ShowOn(IntPtr game, bool centered = false)
    {
        var monitor = NativeWindow.WorkAreaFor(game); var scale = NativeWindow.DpiScale(game, this);
        var margin = (int)Math.Round(16 * scale); var width = Math.Min((int)Math.Round(centered ? 440 * scale : 360 * scale), monitor.Right - monitor.Left - margin * 2);
        var height = (int)Math.Round((centered ? 88 : 104) * scale);
        var rect = centered
            ? new NativeWindow.Rect { Left = monitor.Left + (monitor.Right - monitor.Left - width) / 2, Top = monitor.Top + margin * 2, Right = monitor.Left + (monitor.Right - monitor.Left + width) / 2, Bottom = monitor.Top + margin * 2 + height }
            : new NativeWindow.Rect { Left = monitor.Right - margin - width, Top = monitor.Bottom - margin - height, Right = monitor.Right - margin, Bottom = monitor.Bottom - margin };
        NativeWindow.Place(this, rect);
        // The game's process may be DPI-unaware. Re-check our own per-monitor window after placing it.
        var actualScale = NativeWindow.DpiScale(IntPtr.Zero, this);
        if (Math.Abs(actualScale - scale) > 0.01)
        {
            margin = (int)Math.Round(16 * actualScale); width = Math.Min((int)Math.Round(centered ? 440 * actualScale : 360 * actualScale), monitor.Right - monitor.Left - margin * 2);
            height = (int)Math.Round((centered ? 88 : 104) * actualScale);
            rect = centered
                ? new NativeWindow.Rect { Left = monitor.Left + (monitor.Right - monitor.Left - width) / 2, Top = monitor.Top + margin * 2, Right = monitor.Left + (monitor.Right - monitor.Left + width) / 2, Bottom = monitor.Top + margin * 2 + height }
                : new NativeWindow.Rect { Left = monitor.Right - margin - width, Top = monitor.Bottom - margin - height, Right = monitor.Right - margin, Bottom = monitor.Bottom - margin };
            NativeWindow.Place(this, rect);
        }
        if (centered)
        { var currentWidth = rect.Right - rect.Left; rect.Left = monitor.Left + (monitor.Right - monitor.Left - currentWidth) / 2; rect.Right = rect.Left + currentWidth; NativeWindow.Place(this, rect); }
        NativeWindow.ApplyRoundedRegion(this, 22);
        NativeWindow.RoundCorners(this);
        NativeWindow.ShowInactive(this); timer.Start();
    }
}

