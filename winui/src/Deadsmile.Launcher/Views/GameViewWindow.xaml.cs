using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Microsoft.UI;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;

namespace Deadsmile.Launcher.Views;

public sealed partial class GameViewWindow : Window
{
    private readonly MainWindow owner;
    private readonly DispatcherQueueTimer timer;
    private string? selected;
    private int request;
    public GameViewWindow(MainWindow main)
    {
        owner = main; InitializeComponent();
        SystemBackdrop = new TransparentBackdrop();
        if (AppWindow.Presenter is OverlappedPresenter presenter)
        { presenter.SetBorderAndTitleBar(false, false); presenter.IsResizable = false; presenter.IsAlwaysOnTop = true; }
        NativeWindow.Overlay(this);
        timer = DispatcherQueue.CreateTimer(); timer.Interval = TimeSpan.FromMilliseconds(60);
        timer.Tick += (_, _) => Monitor(); timer.Start();
        Closed += (_, _) => timer.Stop();
        ReloadLabels();
    }
    public void Show()
    {
        var game = owner.Games.Running.FirstOrDefault(x => !x.Process.HasExited && !NativeWindow.Minimized(x.Process.MainWindowHandle));
        if (game is null) return;
        selected ??= game.Game.Id;
        NativeWindow.Place(this, NativeWindow.MonitorFor(game.Process.MainWindowHandle));
        NativeWindow.ShowInactive(this); _ = Reload();
    }
    public void Hide() { request++; AppWindow.Hide(); }
    private void ReloadLabels()
    {
        ShortcutLabel.Text = owner.OverlayShortcut; ProfileHeading.Text = owner.Locale.T("Profile"); LibraryHeading.Text = owner.Locale.T("Library");
        AchievementsHeading.Text = owner.Locale.T("Achievements"); CloudHeading.Text = owner.Locale.T("Cloud saves");
        ReloadButton.Content = owner.Locale.T("Refresh"); CloseButton.Content = owner.Locale.T("Close");
    }
    private void Monitor()
    {
        if (!AppWindow.IsVisible) return;
        if (owner.Games.Running.All(x => x.Process.HasExited || NativeWindow.Minimized(x.Process.MainWindowHandle)))
        { Hide(); return; }
        var point = NativeWindow.Cursor(this); var scale = OverlayRoot.XamlRoot?.RasterizationScale ?? 1;
        point = new(point.X / scale, point.Y / scale);
        var panels = new[] { ToolbarPanel, ProfilePanel, AchievementsPanel, LibraryPanel, CloudPanel };
        var interactive = panels.Any(p =>
        {
            var rect = p.TransformToVisual(OverlayRoot).TransformBounds(new Windows.Foundation.Rect(0, 0, p.ActualWidth, p.ActualHeight));
            return rect.Contains(point);
        });
        NativeWindow.PassClicks(this, !interactive);
    }
    private async Task Reload()
    {
        var revision = ++request;
        try
        {
            ReloadLabels(); UserLabel.Text = owner.User.S("username");
            PlayingLabel.Text = string.Join(" · ", owner.Games.Running.Select(x => x.Game.Title));
            LibraryRows.Children.Clear();
            foreach (var game in owner.Catalog.Where(x => x.InLibrary))
            {
                var button = new Button { Content = game.Title, HorizontalAlignment = HorizontalAlignment.Stretch,
                    HorizontalContentAlignment = HorizontalAlignment.Left };
                button.Click += async (_, _) => { selected = game.Id; await Reload(); };
                LibraryRows.Children.Add(button);
            }
            if (selected is null) return;
            var id = Urls.Id(selected);
            var achievements = await owner.Api.Get("/platform/achievements/" + id);
            if (revision != request) return;
            AchievementRows.Children.Clear();
            foreach (var a in achievements.Items())
            {
                var unlocked = a.At("unlocked_at", "unlockedAt") is not null;
                var hidden = a.B("hidden") && !unlocked;
                AchievementRows.Children.Add(new Border
                {
                    Style = (Style)Application.Current.Resources["Panel"], Padding = new Thickness(16),
                    BorderBrush = (Brush)Application.Current.Resources["CardStrokeColorDefaultBrush"],
                    Child = new TextBlock { Text = (hidden ? owner.Locale.T("Hidden achievement") : a.S("title")) +
                        "\n" + owner.Locale.T(unlocked ? "Unlocked" : "Locked") }
                });
            }
            CloudRows.Children.Clear();
            if (!owner.Catalog.Any(x => x.Id == id && x.CloudEnabled))
            { CloudRows.Children.Add(new TextBlock { Text = owner.Locale.T("Cloud saves are not enabled for this game.") }); return; }
            var saves = await owner.Api.Get("/platform/saves/" + id);
            if (revision != request) return;
            foreach (var item in saves.Items())
                CloudRows.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"],
                    Child = new TextBlock { Text = item.S("filename", "slot") + "\n" + owner.Locale.T("Revision") + " " + item.L("revision") +
                        "\n" + item.S("updated_at", "updatedAt") } });
            if (CloudRows.Children.Count == 0) CloudRows.Children.Add(new TextBlock { Text = owner.Locale.T("No cloud saves found.") });
        }
        catch (Exception ex)
        { if (revision == request) { PlayingLabel.Text = owner.Locale.Error(ex); } }
    }
    private async void ReloadClick(object sender, RoutedEventArgs e) => await Reload();
    private void CloseClick(object sender, RoutedEventArgs e) => Hide();
}

