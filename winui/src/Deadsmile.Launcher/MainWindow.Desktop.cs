using System.Runtime.InteropServices;
using System.Text.Json.Nodes;
using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Deadsmile.Launcher.Views;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
#if UI_VALIDATION
    private DesktopNotifications? notifications = null;
#else
    private DesktopNotifications? notifications;
#endif
    private readonly HashSet<long> notifiedEvents = [];
    private void InitializeDesktop()
    {
        LauncherLog.Info("Desktop", "initializing Windows notification integration");
#if !UI_VALIDATION
        try
        {
            notifications = new DesktopNotifications(); notifications.Invoked += () => DispatcherQueue.TryEnqueue(RestoreFromNotification);
            LauncherLog.Info("Desktop", "Windows app notifications initialized");
        }
        catch (Exception ex)
        {
            LauncherLog.Error("Desktop", "Windows app notifications unavailable", ex);
            storage.Log("DESKTOP_NOTIFICATIONS_UNAVAILABLE");
        }
#endif
    }
    private bool Foreground => AppWindow.IsVisible && GetForegroundWindow() == WinRT.Interop.WindowNative.GetWindowHandle(this);
    private void DesktopNotice(string title, string text, string kind = "", string? entityId = null, string? slug = null)
    {
        if (!Preferences.Notifications)
        {
            LauncherLog.Info("Notifications", $"notification suppressed by preference; kind={kind}");
            return;
        }
        LauncherLog.Info("Notifications", $"notification event; kind={kind}; in_app={AppWindow.IsVisible}");
        AddLocalNotification(title, text, kind, entityId, slug);
        var window = WinRT.Interop.WindowNative.GetWindowHandle(this);
        if (AppWindow.IsVisible && !NativeWindow.Minimized(window)) { ShowInAppToast(title, text); return; }
        if (notifications?.Show(title, text) != true) storage.Log("DESKTOP_NOTIFICATION_UNAVAILABLE");
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
    private void UpdateNotificationsIcon(bool enabled)
    {
        NotificationIcon.Glyph = enabled ? "\uEA8F" : "\uE7ED";
        var accessibleName = Locale.T(enabled ? "Notifications" : "Notifications disabled");
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(NotificationsButton, accessibleName);
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(NotificationIcon, accessibleName);
        ToolTipService.SetToolTip(NotificationsButton, accessibleName);
    }

    private void NotificationsClick(object sender, RoutedEventArgs e) => RefreshNotificationMenu();
    private void RestoreFromNotification()
    {
        LauncherLog.Info("Desktop", "launcher restore requested from notification");
        AppWindow.Show(); Activate();
        if (Preferences.VideoBackgrounds && MotionEnabled)
        {
            bannerPlayer?.Play();
            if (page == "explore" && !homeHeroPaused) homeBannerPlayer?.Play();
        }
    }
    private void ContentNotification(JsonNode item)
    {
        var id = item.L("id"); if (id <= 0 || !notifiedEvents.Add(id)) return;
        if (notifiedEvents.Count > 1000) { var keep = notifiedEvents.OrderDescending().Take(500).ToArray(); notifiedEvents.Clear(); foreach (var key in keep) notifiedEvents.Add(key); }
        var type = item.S("event_type");
        LauncherLog.Info("Notifications", $"content event received; event_id={id}; event_type={type}");
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
            DesktopNotice(Locale.T("Newswire"), title.Length > 0 ? title : Locale.T("A new story is available."), "news", null, slug);
        else if (type is "launcher.updated" or "launcher.released")
            DesktopNotice(Locale.T("Launcher update available"), title.Length > 0 ? title : Locale.T("A new launcher version is available."));
    }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
}
