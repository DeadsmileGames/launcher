using System.Runtime.InteropServices;
using System.Text.Json.Nodes;
using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Deadsmile.Launcher.Views;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    private TrayService? tray;
    private DesktopNotifications? notifications;
    private DispatcherQueueTimer? updateTimer;
    private bool exiting, checkingUpdate;
    private string? announcedUpdate;
    private readonly HashSet<int> hintedGames = [];
    private readonly HashSet<long> notifiedEvents = [];
    private void InitializeDesktop()
    {
#if !UI_VALIDATION
        try
        {
            tray = new TrayService(this, native); tray.Restore += RestoreFromTray; tray.Menu += OpenTrayMenu;
            notifications = new DesktopNotifications(); notifications.Invoked += () => DispatcherQueue.TryEnqueue(RestoreFromTray);
        }
        catch (Exception) { storage.Log("TRAY_UNAVAILABLE"); }
        updateTimer = DispatcherQueue.CreateTimer(); updateTimer.Interval = TimeSpan.FromMinutes(5);
        updateTimer.Tick += async (_, _) => await CheckBackgroundUpdate(); updateTimer.Start();
#endif
    }
    private bool Foreground => AppWindow.IsVisible && GetForegroundWindow() == WinRT.Interop.WindowNative.GetWindowHandle(this);
    private void DesktopNotice(string title, string text)
    {
        if (!Preferences.Notifications) return;
        if (Foreground) { Notify(title + ": " + text, InfoBarSeverity.Informational); return; }
        if (notifications?.Show(title, text) != true) tray?.Notify(title, text);
    }
    private void MinimizeToTray()
    {
        AppWindow.Hide(); bannerPlayer?.Pause();
        if (!storage.Read("winui-tray-tip.json", false))
        {
            var message = Locale.T("The launcher is still running in the notification area. Click its icon to return. You can change this in Settings.");
            var accepted = notifications?.Show("Deadsmile Games Launcher", message) == true || tray?.Notify("Deadsmile Games Launcher", message) == true;
            if (accepted) storage.Write("winui-tray-tip.json", true);
        }
    }
    private void RestoreFromTray()
    { AppWindow.Show(); Activate(); if (Preferences.VideoBackgrounds && MotionEnabled) bannerPlayer?.Play(); }
    private void OpenTrayMenu()
    {
        // The tray menu itself is XAML/WinUI rather than a second UI framework.
        var menu = new Window(); var root = new StackPanel { Spacing = 4, Padding = new Thickness(8), RequestedTheme = UiTheme };
        var background = new Microsoft.UI.Xaml.Media.SolidColorBrush(UiTheme == ElementTheme.Light ? Microsoft.UI.Colors.White : Windows.UI.Color.FromArgb(255, 39, 39, 39));
        var frame = new Border { Background = background, Child = root }; menu.Content = frame;
        var open = new Button { Content = Locale.T("Open launcher"), HorizontalAlignment = HorizontalAlignment.Stretch };
        var exit = new Button { Content = Locale.T("Exit"), HorizontalAlignment = HorizontalAlignment.Stretch };
        open.Click += (_, _) => { menu.Close(); RestoreFromTray(); };
        exit.Click += async (_, _) => { menu.Close(); if (AllBusy) await ConfirmClose(); else { exiting = true; Close(); } };
        root.Children.Add(open); root.Children.Add(exit);
        if (menu.AppWindow.Presenter is OverlappedPresenter p) { p.SetBorderAndTitleBar(false, false); p.IsResizable = false; p.IsAlwaysOnTop = true; }
        NativeWindow.Overlay(menu); NativeWindow.RoundCorners(menu);
        var area = NativeWindow.WorkAreaFor(IntPtr.Zero); var scale = NativeWindow.DpiScale(IntPtr.Zero, this);
        NativeWindow.Place(menu, new NativeWindow.Rect { Left = area.Right - (int)(236 * scale), Top = area.Bottom - (int)(104 * scale), Right = area.Right - (int)(16 * scale), Bottom = area.Bottom - (int)(16 * scale) });
        menu.Activate(); var timer = DispatcherQueue.CreateTimer(); timer.Interval = TimeSpan.FromSeconds(5); timer.Tick += (_, _) => { timer.Stop(); menu.Close(); };
        menu.Closed += (_, _) => timer.Stop(); timer.Start();
    }
    private async Task CheckBackgroundUpdate()
    {
        if (checkingUpdate || booting) return; checkingUpdate = true;
        try { var update = await updater.Check(); if (update is not null && update.Version != announcedUpdate) { announcedUpdate = update.Version; DesktopNotice(Locale.T("Launcher update available"), update.Version); } }
        catch (Exception) { /* Routine polling never interrupts games or repeats a network error toast. */ }
        finally { checkingUpdate = false; }
    }
    private void ContentNotification(JsonNode item)
    {
        var id = item.L("id"); if (id <= 0 || !notifiedEvents.Add(id)) return;
        if (notifiedEvents.Count > 1000) { var keep = notifiedEvents.OrderDescending().Take(500).ToArray(); notifiedEvents.Clear(); foreach (var key in keep) notifiedEvents.Add(key); }
        var type = item.S("event_type"); var title = item.At("payload").S("title");
        if (type == "game.published") DesktopNotice(Locale.T("New game available"), title.Length > 0 ? title : Locale.T("Explore the latest games."));
        else if (type == "game.updated") DesktopNotice(Locale.T("A game has been updated"), title.Length > 0 ? title : Locale.T("Check your library for updates."));
        else if (type == "news.updated") DesktopNotice("Newswire", title.Length > 0 ? title : Locale.T("A new story is available."));
    }
    private void GameStartedHint()
    {
        foreach (var game in Games.Running)
        {
            if (!hintedGames.Add(game.Process.Id)) continue;
            _ = ShowGameHint(game);
        }
        var active = Games.Running.Select(x => x.Process.Id).ToHashSet(); hintedGames.RemoveWhere(x => !active.Contains(x));
    }
    private async Task ShowGameHint(RunningGame game)
    {
        if (!OverlayToggle.IsOn) return;
        for (var attempt = 0; attempt < 25 && !game.Process.HasExited && game.Process.MainWindowHandle == IntPtr.Zero; attempt++) { await Task.Delay(200); game.Process.Refresh(); }
        if (game.Process.HasExited) return;
        var toast = new AchievementWindow(this, "DeadBar", Locale.T("Press {0} to open DeadBar").Replace("{0}", OverlayShortcut.Replace("Control", "Ctrl").Replace("+", " + ")));
        toast.ShowOn(game.Process.MainWindowHandle, centered: true);
    }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
}
