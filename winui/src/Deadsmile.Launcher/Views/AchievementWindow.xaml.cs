using Deadsmile.Launcher.Services;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
namespace Deadsmile.Launcher.Views;

public sealed partial class AchievementWindow : Window
{
    private readonly DispatcherQueueTimer timer;
    public AchievementWindow(string heading, string title)
    {
        InitializeComponent(); Heading.Text = heading; AchievementTitle.Text = title;
        SystemBackdrop = new TransparentBackdrop();
        if (AppWindow.Presenter is OverlappedPresenter p)
        { p.SetBorderAndTitleBar(false, false); p.IsResizable = false; p.IsAlwaysOnTop = true; }
        NativeWindow.Overlay(this); NativeWindow.PassClicks(this, true);
        timer = DispatcherQueue.CreateTimer(); timer.Interval = TimeSpan.FromSeconds(6);
        timer.Tick += (_, _) => { timer.Stop(); Close(); };
        Closed += (_, _) => timer.Stop();
    }
    public void ShowOn(IntPtr game)
    {
        var monitor = NativeWindow.MonitorFor(game);
        var rect = new NativeWindow.Rect { Left = monitor.Right - 440, Top = monitor.Bottom - 166,
            Right = monitor.Right - 20, Bottom = monitor.Bottom - 20 };
        NativeWindow.Place(this, rect); NativeWindow.ShowInactive(this); timer.Start();
    }
}

