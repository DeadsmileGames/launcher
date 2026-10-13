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
    private bool exiting;
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
#endif
    }
    private bool Foreground => AppWindow.IsVisible && GetForegroundWindow() == WinRT.Interop.WindowNative.GetWindowHandle(this);
    private void DesktopNotice(string title, string text, string kind = "", string? entityId = null, string? slug = null)
    {
        if (!Preferences.Notifications) return;
        AddLocalNotification(title, text, kind, entityId, slug);
        var window = WinRT.Interop.WindowNative.GetWindowHandle(this);
        if (AppWindow.IsVisible && !NativeWindow.Minimized(window)) { ShowInAppToast(title, text); return; }
        if (notifications?.Show(title, text) != true) tray?.Notify(title, text);
    }
    private void AddLocalNotification(string title, string message, string kind, string? entityId, string? slug)
    {
        localNotifications.Insert(0, new LauncherNotification(title, message, kind, entityId, slug, DateTimeOffset.Now));
        if (localNotifications.Count > 50) localNotifications.RemoveRange(50, localNotifications.Count - 50);
        notificationsUnread = true;
        RefreshNotificationMenu();
    }
    private void RefreshNotificationMenu()
    {
        NotificationMenu.Items.Clear();
        if (localNotifications.Count == 0)
        {
            NotificationMenu.Items.Add(new MenuFlyoutItem { Text = Locale.T("You're all caught up."), IsEnabled = false });
        }
        else
        {
            var readAll = new MenuFlyoutItem
            {
                Text = Locale.T("Read all notifications"),
                IsEnabled = notificationsUnread
            };
            readAll.Click += (_, _) =>
            {
                notificationsUnread = false;
                NotificationBadge.Visibility = Visibility.Collapsed;
                RefreshNotificationMenu();
            };
            NotificationMenu.Items.Add(readAll);
            NotificationMenu.Items.Add(new MenuFlyoutSeparator());
        }
        foreach (var notification in localNotifications.Take(12))
        {
            var item = new MenuFlyoutSubItem
            {
                Text = notification.Title + " · " + FormatDate(notification.CreatedAt.ToString("O"), true)
            };
            var open = new MenuFlyoutItem
            {
                Text = Locale.T("Open notification"),
                IsEnabled = notification.Kind is "game" or "news"
            };
            open.Click += async (_, _) => await OpenNotification(notification);
            var dismiss = new MenuFlyoutItem { Text = Locale.T("Dismiss notification") };
            dismiss.Click += (_, _) =>
            {
                localNotifications.Remove(notification);
                if (localNotifications.Count == 0) notificationsUnread = false;
                RefreshNotificationMenu();
            };
            item.Items.Add(open);
            item.Items.Add(dismiss);
            NotificationMenu.Items.Add(item);
        }
        NotificationBadge.Value = Math.Min(99, localNotifications.Count);
        NotificationBadge.Visibility = notificationsUnread && localNotifications.Count > 0 ? Visibility.Visible : Visibility.Collapsed;
    }
    private async Task OpenNotification(LauncherNotification notification)
    {
        if (notification.Kind == "game" &&
            Catalog.FirstOrDefault(game => game.Id.Equals(notification.EntityId, StringComparison.OrdinalIgnoreCase) || game.Slug == notification.Slug) is { } game)
            await Guard(() => LoadDetail(game));
        else if (notification.Kind == "news" &&
            newsItems.FirstOrDefault(story => story.S("slug") == notification.Slug) is { } story)
            await Guard(() => ShowNews(story));
    }
    private void NotificationsClick(object sender, RoutedEventArgs e) => RefreshNotificationMenu();
    private void MinimizeToTray()
    {
        AppWindow.Hide(); bannerPlayer?.Pause(); homeBannerPlayer?.Pause();
        if (!storage.Read("winui-tray-tip.json", false))
        {
            var message = Locale.T("The launcher is still running in the notification area. Click its icon to return. You can change this in Settings.");
            var accepted = notifications?.Show("Deadsmile Games Launcher", message) == true || tray?.Notify("Deadsmile Games Launcher", message) == true;
            if (accepted) storage.Write("winui-tray-tip.json", true);
        }
    }
    private void RestoreFromTray()
    {
        AppWindow.Show(); Activate();
        if (Preferences.VideoBackgrounds && MotionEnabled)
        {
            bannerPlayer?.Play();
            if (page == "explore" && !homeHeroPaused) homeBannerPlayer?.Play();
        }
    }
    private void OpenTrayMenu()
    {
        // The tray menu itself is XAML/WinUI rather than a second UI framework.
        var menu = new Window(); var root = new StackPanel { Spacing = 4, Padding = new Thickness(8), RequestedTheme = UiTheme };
        var background = new Microsoft.UI.Xaml.Media.SolidColorBrush(UiTheme == ElementTheme.Light ? Microsoft.UI.Colors.White : Windows.UI.Color.FromArgb(255, 39, 39, 39));
        var frame = new Border
        {
            Background = background,
            BorderBrush = new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(255, 62, 62, 62)),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(10),
            Child = root
        };
        menu.Content = frame;
        var open = new Button { Content = Locale.T("Open launcher"), HorizontalAlignment = HorizontalAlignment.Stretch };
        var exit = new Button { Content = Locale.T("Exit"), HorizontalAlignment = HorizontalAlignment.Stretch };
        open.Click += (_, _) => { menu.Close(); RestoreFromTray(); };
        exit.Click += async (_, _) => { menu.Close(); if (AllBusy) await ConfirmClose(); else { exiting = true; Close(); } };
        root.Children.Add(open); root.Children.Add(exit);
        if (menu.AppWindow.Presenter is OverlappedPresenter p) { p.SetBorderAndTitleBar(false, false); p.IsResizable = false; p.IsAlwaysOnTop = true; }
        NativeWindow.RemoveNonClientFrame(menu);
        NativeWindow.RoundCorners(menu);
        var cursor = NativeWindow.CursorScreen();
        var area = NativeWindow.WorkAreaAt(cursor.X, cursor.Y); var scale = NativeWindow.DpiScale(IntPtr.Zero, this);
        var width = (int)Math.Round(236 * scale); var height = (int)Math.Round(104 * scale); var margin = (int)Math.Round(8 * scale);
        var left = Math.Clamp(cursor.X - width + margin, area.Left + margin, Math.Max(area.Left + margin, area.Right - width - margin));
        var top = cursor.Y - height - margin;
        if (top < area.Top + margin) top = Math.Min(area.Bottom - height - margin, cursor.Y + margin);
        top = Math.Clamp(top, area.Top + margin, Math.Max(area.Top + margin, area.Bottom - height - margin));
        NativeWindow.Place(menu, new NativeWindow.Rect { Left = left, Top = top, Right = left + width, Bottom = top + height });
        menu.Activate(); var timer = DispatcherQueue.CreateTimer(); timer.Interval = TimeSpan.FromSeconds(5); timer.Tick += (_, _) => { timer.Stop(); menu.Close(); };
        menu.Closed += (_, _) => timer.Stop(); timer.Start();
    }
    private void ContentNotification(JsonNode item)
    {
        var id = item.L("id"); if (id <= 0 || !notifiedEvents.Add(id)) return;
        if (notifiedEvents.Count > 1000) { var keep = notifiedEvents.OrderDescending().Take(500).ToArray(); notifiedEvents.Clear(); foreach (var key in keep) notifiedEvents.Add(key); }
        var type = item.S("event_type");
        var payload = item.At("payload");
        var title = payload.S("title");
        var entityId = payload.S("gameId", "game_id", "id");
        var slug = payload.S("slug", "game_slug", "gameSlug", "newsSlug");
        if (type is "game.published" or "game.available" or "game.purchasable" or "game.redeemable" or "game.released")
            DesktopNotice(Locale.T(type is "game.purchasable" or "game.redeemable" ? "Game ready to claim or purchase" : "New game available"),
                title.Length > 0 ? title : Locale.T("Explore the latest games."), "game", entityId, slug);
        else if (type is "game.updated" or "game.version.updated")
            DesktopNotice(Locale.T("A game has been updated"), title.Length > 0 ? title : Locale.T("Check your library for updates."), "game", entityId, slug);
        else if (type is "news.updated" or "news.published")
            DesktopNotice("Newswire", title.Length > 0 ? title : Locale.T("A new story is available."), "news", null, slug);
        else if (type is "launcher.updated" or "launcher.released")
            DesktopNotice(Locale.T("Launcher update available"), title.Length > 0 ? title : Locale.T("A new launcher version is available."));
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
        var toast = new AchievementWindow(this, "DeadBar", Locale.T("Ctrl + D for DeadBar"), hint: true);
        toast.ShowOn(game.Process.MainWindowHandle, centered: true);
    }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
}
