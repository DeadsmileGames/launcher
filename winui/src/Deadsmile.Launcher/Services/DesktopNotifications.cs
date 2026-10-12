using Microsoft.Windows.AppNotifications;
using Microsoft.Windows.AppNotifications.Builder;

namespace Deadsmile.Launcher.Services;

public sealed class DesktopNotifications : IDisposable
{
    private bool registered;
    public event Action? Invoked;
    public DesktopNotifications()
    {
        try { AppNotificationManager.Default.NotificationInvoked += NotificationInvoked; AppNotificationManager.Default.Register(); registered = true; }
        catch (Exception) { /* Shell tray notifications remain available when the runtime registration is unavailable. */ }
    }
    private void NotificationInvoked(AppNotificationManager sender, AppNotificationActivatedEventArgs args) => Invoked?.Invoke();
    public bool Show(string title, string text)
    {
        if (!registered) return false;
        try { AppNotificationManager.Default.Show(new AppNotificationBuilder().AddText(title).AddText(text).BuildNotification()); return true; }
        catch (Exception) { return false; }
    }
    public void Dispose()
    {
        try { AppNotificationManager.Default.NotificationInvoked -= NotificationInvoked; if (registered) AppNotificationManager.Default.Unregister(); }
        catch (Exception) { }
    }
}
