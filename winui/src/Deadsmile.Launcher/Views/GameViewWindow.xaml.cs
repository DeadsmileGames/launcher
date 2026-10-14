using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Composition;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Foundation;
using System.Numerics;

namespace Deadsmile.Launcher.Views;

public sealed partial class GameViewWindow : Window
{
    private readonly MainWindow owner;
    private readonly NativeWindow windowHook;
    private readonly DispatcherQueueTimer timer;
    private string? selected;
    private int request;
    private bool positioned;
    private Border? dragging;
    private Point dragOrigin, panelOrigin;
    private DateTime lastClock;
    private DateTime focusLostAt = DateTime.MinValue;
    private static readonly TimeSpan FocusLossGrace = TimeSpan.FromMilliseconds(900);
    public bool IsOpen { get; private set; }
    private Border[] Widgets => [ProfilePanel, LibraryPanel, AchievementsPanel, CloudPanel, CapturePanel];
    private ToggleButton[] Toggles => [ProfileToggle, LibraryToggle, AchievementsToggle, CloudToggle, CaptureToggle];
    private ToggleButton[] Pins => [ProfilePin, LibraryPin, AchievementsPin, CloudPin, CapturePin];
    public GameViewWindow(MainWindow main)
    {
        owner = main; InitializeComponent();
        LauncherLog.Info("DeadBar", "overlay window created");
        windowHook = new NativeWindow(this, noActivate: true);
        SystemBackdrop = new TransparentBackdrop();
        if (AppWindow.Presenter is OverlappedPresenter presenter)
        { presenter.SetBorderAndTitleBar(false, false); presenter.IsResizable = false; presenter.IsAlwaysOnTop = true; }
        NativeWindow.Overlay(this);
        timer = DispatcherQueue.CreateTimer(); timer.Interval = TimeSpan.FromMilliseconds(50);
        timer.Tick += (_, _) =>
        {
            try { Monitor(); }
            catch (Exception ex)
            {
                LauncherLog.Error("DeadBar", "focus-monitor tick failed; closing overlay safely", ex);
                try { Hide(true); } catch (Exception hideError) { LauncherLog.Error("DeadBar", "failed to hide after monitor error", hideError); }
            }
        };
        Closed += (_, _) =>
        {
            timer.Stop();
            LauncherLog.Info("DeadBar", "overlay window closed");
            captureShare?.Dispose(); windowHook.Dispose();
        };
        OverlayRoot.SizeChanged += (_, _) => { if (!positioned) ResetLayout(); else ClampWidgets(); };
        foreach (var widget in Widgets)
        {
            // Composition visuals are not guaranteed to be attached to a XamlRoot during
            // construction. Apply clipping only after the widget has entered the live tree.
            widget.Loaded += (_, _) => ApplyRoundedWidgetClip(widget);
            widget.SizeChanged += (_, _) => ApplyRoundedWidgetClip(widget);
        }
        ApplyPreferences(); ReloadLabels();
    }
    private static void ApplyRoundedWidgetClip(Border widget)
    {
        if (!widget.IsLoaded || widget.XamlRoot is null ||
            widget.ActualWidth <= 0 || widget.ActualHeight <= 0)
            return;

        try
        {
            var visual = ElementCompositionPreview.GetElementVisual(widget);
            var compositor = visual.Compositor;
            var geometry = compositor.CreateRoundedRectangleGeometry();
            geometry.Size = new Vector2((float)widget.ActualWidth, (float)widget.ActualHeight);
            geometry.CornerRadius = new Vector2(16, 16);
            visual.Clip = compositor.CreateGeometricClip(geometry);
        }
        catch (Exception)
        {
            // A failed optional visual effect must never take down the launcher or hotkey.
            // The XAML Border still provides its normal layout and background.
        }
    }
    public void ApplyPreferences()
    {
        OverlayRoot.RequestedTheme = owner.UiTheme;
        ReloadLabels();
        foreach (var widget in Widgets)
            widget.Transitions = owner.MotionEnabled ? new TransitionCollection { new EntranceThemeTransition { FromVerticalOffset = 16, IsStaggeringEnabled = false } } : null;
    }
    public void Show(RunningGame game)
    {
        LauncherLog.Info("DeadBar", $"show requested; game={game.Game.Id}; pid={game.Process.Id}");
        try
        {
            game.Process.Refresh();
            if (game.Process.HasExited)
            {
                LauncherLog.Warning("DeadBar", $"show aborted because game process exited; game={game.Game.Id}");
                return;
            }
            var gameHandle = game.Process.MainWindowHandle;
            if (gameHandle != IntPtr.Zero && NativeWindow.Minimized(gameHandle))
            {
                LauncherLog.Warning("DeadBar", $"show aborted because game is minimized; game={game.Game.Id}");
                return;
            }
            selected = game.Game.Id;
        focusLostAt = DateTime.MinValue;
            var monitor = NativeWindow.MonitorFor(gameHandle);
            NativeWindow.Place(this, monitor);
            OpenWidgets();
            NativeWindow.PassClicks(this, false);
            NativeWindow.ShowInactive(this);
            if (!NativeWindow.IsVisible(this))
            {
                // Native no-activate display can race on first show; retry without activating the overlay.
                NativeWindow.Place(this, monitor);
                NativeWindow.ShowInactive(this);
            }
            var nativeVisible = NativeWindow.IsVisible(this);
            LauncherLog.Info("DeadBar", $"overlay show result; game={game.Game.Id}; hwnd_visible={nativeVisible}; appwindow_visible={AppWindow.IsVisible}");
            if (!nativeVisible)
            {
                Hide(true);
                throw new InvalidOperationException("The DeadBar HWND remained hidden after a no-activate show.");
            }
            Monitor();
            _ = Reload();
        }
        catch (Exception ex)
        {
            LauncherLog.Error("DeadBar", $"overlay show failed; game={game.Game.Id}", ex);
            throw;
        }
    }
    private void OpenWidgets()
    {
        IsOpen = true;
        if (!timer.IsRunning)
        {
            timer.Start();
            LauncherLog.Info("DeadBar", "focus monitor timer started");
        }
        ToolbarPanel.Visibility = Visibility.Visible;
        for (var i = 0; i < Widgets.Length; i++) Widgets[i].Visibility = Toggles[i].IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
        ApplyPreferences(); if (!positioned) ResetLayout(); ReloadLabels();
    }
    public void Hide(bool force = false)
    {
        LauncherLog.Info("DeadBar", $"hide requested; force={force}; visible_widgets={Widgets.Count(x => x.Visibility == Visibility.Visible)}");
        captureDialog?.Hide(); request++; IsOpen = false; ToolbarPanel.Visibility = Visibility.Collapsed;
        for (var i = 0; i < Widgets.Length; i++) Widgets[i].Visibility = !force && Pins[i].IsChecked == true && Toggles[i].IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
        if (force || Widgets.All(x => x.Visibility == Visibility.Collapsed))
        {
            AppWindow.Hide();
            timer.Stop();
            LauncherLog.Info("DeadBar", "overlay hidden; focus monitor timer stopped");
        }
        else if (!timer.IsRunning)
        {
            timer.Start();
            LauncherLog.Info("DeadBar", "focus monitor kept active for pinned widgets");
        }
    }
    private void ReloadLabels()
    {
        ShortcutLabel.Text = owner.OverlayShortcut.Replace("Control", "Ctrl").Replace("+", " + ");
        var labels = new[] { "Profile", "Library", "Achievements", "Cloud saves", "Capture" };
        var headings = new[] { ProfileHeading, LibraryHeading, AchievementsHeading, CloudHeading, CaptureHeading };
        for (var i = 0; i < labels.Length; i++)
        {
            headings[i].Text = owner.Locale.T(labels[i]);
            AutomationProperties.SetName(Toggles[i], owner.Locale.T(labels[i])); ToolTipService.SetToolTip(Toggles[i], owner.Locale.T(labels[i]));
            AutomationProperties.SetName(Pins[i], owner.Locale.T("Pin widget")); ToolTipService.SetToolTip(Pins[i], owner.Locale.T("Pin widget"));
            if (Widgets[i].Child is Grid root && root.Children[0] is Grid header && header.Children.LastOrDefault() is Button close)
            { AutomationProperties.SetName(close, owner.Locale.T("Close widget")); ToolTipService.SetToolTip(close, owner.Locale.T("Close widget")); }
        }
        foreach (var (button, label) in new[] { (ReloadButton, "Refresh"), (LayoutButton, "Reset widget layout"), (CloseButton, "Close") })
        { AutomationProperties.SetName(button, owner.Locale.T(label)); ToolTipService.SetToolTip(button, owner.Locale.T(label)); }
        ClockLabel.Text = DateTime.Now.ToString("t");
        CaptureButton.Content = owner.Locale.T("Take screenshot"); ShareCaptureButton.Content = owner.Locale.T("Share screenshot"); CaptureButton.IsEnabled = !capturing && GameCapture.Supported;
    }
    internal static bool ShouldDismissOverlay(bool processRunning, bool gameMinimized, bool gameFocused, bool focusLossGraceElapsed) =>
        !processRunning || gameMinimized || (!gameFocused && focusLossGraceElapsed);

    private bool IsPointerOverInteractiveSurface()
    {
        if (captureDialog is not null || dragging is not null) return true;

        // ShowInactive() can make the HWND visible before WinUI has attached every
        // element to its XamlRoot. TransformToVisual throws in that brief interval.
        // The widgets live directly on WidgetCanvas, so their Canvas coordinates and
        // measured sizes provide the same hit-test without querying the visual tree.
        var root = OverlayRoot;
        var xamlRoot = root.XamlRoot;
        if (!root.IsLoaded || xamlRoot is null || root.ActualWidth <= 0 || root.ActualHeight <= 0)
            return false;

        var point = NativeWindow.Cursor(this);
        var scale = xamlRoot.RasterizationScale;
        if (scale <= 0 || double.IsNaN(scale) || double.IsInfinity(scale)) scale = 1;
        point = new(point.X / scale, point.Y / scale);

        foreach (var panel in Widgets)
        {
            if (panel.Visibility != Visibility.Visible || panel.ActualWidth <= 0 || panel.ActualHeight <= 0)
                continue;

            var left = Canvas.GetLeft(panel);
            var top = Canvas.GetTop(panel);
            if (double.IsNaN(left)) left = 0;
            if (double.IsNaN(top)) top = 0;
            if (new Rect(left, top, panel.ActualWidth, panel.ActualHeight).Contains(point))
                return true;
        }

        // ToolbarPanel is centered horizontally at the top of OverlayRoot.
        if (ToolbarPanel.Visibility == Visibility.Visible &&
            ToolbarPanel.ActualWidth > 0 && ToolbarPanel.ActualHeight > 0)
        {
            var left = (root.ActualWidth - ToolbarPanel.ActualWidth) / 2;
            var top = ToolbarPanel.Margin.Top;
            if (new Rect(left, top, ToolbarPanel.ActualWidth, ToolbarPanel.ActualHeight).Contains(point))
                return true;
        }

        return false;
    }

    private void Monitor()
    {
        if (!NativeWindow.IsVisible(this)) return;
        var pointerOverInteractive = IsPointerOverInteractiveSurface();
#if !UI_VALIDATION
        var game = selected is null ? null : owner.Games.Running.FirstOrDefault(entry =>
            entry.Game.Id.Equals(selected, StringComparison.OrdinalIgnoreCase));
        var processRunning = false;
        var gameMinimized = false;
        var gameFocused = false;
        if (game is not null)
        {
            try
            {
                game.Process.Refresh();
                processRunning = !game.Process.HasExited;
                var gameWindow = processRunning ? game.Process.MainWindowHandle : IntPtr.Zero;
                // Fullscreen games may briefly expose no main HWND while a non-activating overlay is being used.
                gameMinimized = gameWindow != IntPtr.Zero && NativeWindow.Minimized(gameWindow) && !pointerOverInteractive;
                gameFocused = processRunning && !gameMinimized &&
                    (owner.IsGameFocusedFor(game.Game.Id) || (pointerOverInteractive && owner.IsLauncherForeground));
            }
            catch (Exception) { processRunning = false; gameMinimized = false; }
        }
        var now = DateTime.UtcNow;
        if (gameFocused) focusLostAt = DateTime.MinValue;
        else if (focusLostAt == DateTime.MinValue) focusLostAt = now;
        var graceElapsed = !gameFocused && focusLostAt != DateTime.MinValue && now - focusLostAt >= FocusLossGrace;
        if (ShouldDismissOverlay(processRunning, gameMinimized, gameFocused, graceElapsed))
        {
            LauncherLog.Info("DeadBar", $"auto-hide; process_running={processRunning}; game_minimized={gameMinimized}; game_focused={gameFocused}; grace_elapsed={graceElapsed}");
            Hide(true); return;
        }
#endif
        if ((DateTime.Now - lastClock).TotalSeconds >= 1) { lastClock = DateTime.Now; ClockLabel.Text = lastClock.ToString("t"); }
        NativeWindow.PassClicks(this, !pointerOverInteractive);
    }
    private Border Widget(string name) => Widgets.First(x => x.Tag?.ToString() == name);
    private void WidgetToggled(object sender, RoutedEventArgs e)
    {
        var button = (ToggleButton)sender;
        Widget(button.Tag.ToString()!).Visibility = button.IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
    }
    private void CloseWidget(object sender, RoutedEventArgs e)
    {
        var name = ((Button)sender).Tag.ToString(); var i = Array.FindIndex(Widgets, x => x.Tag.ToString() == name);
        Pins[i].IsChecked = false; Toggles[i].IsChecked = false; Widgets[i].Visibility = Visibility.Collapsed;
        if (!IsOpen && Widgets.All(x => x.Visibility == Visibility.Collapsed))
        {
            AppWindow.Hide();
            timer.Stop();
            LauncherLog.Info("DeadBar", "last pinned widget closed; overlay hidden and focus monitor stopped");
        }
    }
    private void ResetLayoutClick(object sender, RoutedEventArgs e) => ResetLayout();
    private void ResetLayout()
    {
        var width = OverlayRoot.ActualWidth; var height = OverlayRoot.ActualHeight;
        if (width < 100 || height < 100) return;
        var margin = width < 1000 ? 16d : 24d;
        var gap = width < 1000 ? 12d : 24d;
        var available = width - margin * 2 - gap * 2;
        var side = Math.Min(300, available * 0.29); var center = Math.Min(480, available - side * 2);
        var top = 112d; var bottom = Math.Max(180, height - top - margin);
        ProfilePanel.Width = AchievementsPanel.Width = side; ProfilePanel.Height = Math.Min(200, bottom * 0.4);
        LibraryPanel.Width = center; LibraryPanel.Height = bottom;
        CloudPanel.Width = CapturePanel.Width = side; CloudPanel.Height = Math.Min(300, bottom * 0.52);
        CapturePanel.Height = Math.Max(140, bottom - CloudPanel.Height - gap);
        Canvas.SetLeft(CapturePanel, width - margin - side); Canvas.SetTop(CapturePanel, top + CloudPanel.Height + gap);
        AchievementsPanel.Height = Math.Max(120, bottom - ProfilePanel.Height - gap);
        Canvas.SetLeft(ProfilePanel, margin); Canvas.SetTop(ProfilePanel, top);
        Canvas.SetLeft(AchievementsPanel, margin); Canvas.SetTop(AchievementsPanel, top + ProfilePanel.Height + gap);
        Canvas.SetLeft(LibraryPanel, margin + side + gap); Canvas.SetTop(LibraryPanel, top);
        Canvas.SetLeft(CloudPanel, width - margin - side); Canvas.SetTop(CloudPanel, top);
        positioned = true; ClampWidgets();
    }
    private void ClampWidgets()
    {
        foreach (var widget in Widgets)
        {
            widget.Width = Math.Min(widget.Width, Math.Max(120, OverlayRoot.ActualWidth - 32));
            widget.Height = Math.Min(widget.Height, Math.Max(120, OverlayRoot.ActualHeight - 112));
            Canvas.SetLeft(widget, Math.Clamp(Canvas.GetLeft(widget), 16, Math.Max(16, OverlayRoot.ActualWidth - widget.Width - 16)));
            Canvas.SetTop(widget, Math.Clamp(Canvas.GetTop(widget), 96, Math.Max(96, OverlayRoot.ActualHeight - widget.Height - 16)));
        }
    }
    private void WidgetPointerPressed(object sender, PointerRoutedEventArgs e)
    {
        if (!e.GetCurrentPoint(OverlayRoot).Properties.IsLeftButtonPressed) return;
        var header = (Grid)sender; dragging = Widget(header.Tag.ToString()!);
        dragOrigin = e.GetCurrentPoint(OverlayRoot).Position; panelOrigin = new(Canvas.GetLeft(dragging), Canvas.GetTop(dragging));
        header.CapturePointer(e.Pointer); NativeWindow.PassClicks(this, false); e.Handled = true;
    }
    private void WidgetPointerMoved(object sender, PointerRoutedEventArgs e)
    {
        if (dragging is null) return; var point = e.GetCurrentPoint(OverlayRoot).Position;
        Canvas.SetLeft(dragging, panelOrigin.X + point.X - dragOrigin.X); Canvas.SetTop(dragging, panelOrigin.Y + point.Y - dragOrigin.Y);
        ClampWidgets(); e.Handled = true;
    }
    private void WidgetPointerReleased(object sender, PointerRoutedEventArgs e)
    { dragging = null; ((Grid)sender).ReleasePointerCaptures(); }
    private async Task Reload()
    {
        var revision = ++request;
        try
        {
            ReloadLabels(); UserLabel.Text = owner.User.S("username"); ProfileAvatar.DisplayName = UserLabel.Text;
            await MainWindow.SetProfilePicture(ProfileAvatar, owner.User.S("avatarUrl"));
            PlayingLabel.Text = string.Join(" · ", owner.Games.Running.Select(x => x.Game.Title));
            LibraryRows.Children.Clear();
            foreach (var game in owner.Catalog.Where(x => x.InLibrary))
            {
                var row = new Grid { ColumnSpacing = 12 }; row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); row.ColumnDefinitions.Add(new ColumnDefinition());
                var picture = new Image { Width = 48, Height = 48, Stretch = Stretch.UniformToFill };
                var url = game.ProductIcon.Length > 0 ? game.ProductIcon : game.Cover;
#if UI_VALIDATION
                if (url.Contains("fixture.invalid")) picture.Source = new BitmapImage(new Uri("ms-appx:///Assets/StoreLogo.png"));
                else
#endif
                if (Urls.Https(url) is { } uri) picture.Source = uri.AbsolutePath.EndsWith(".svg", StringComparison.OrdinalIgnoreCase) ? new SvgImageSource(uri) : new BitmapImage(uri);
                row.Children.Add(picture);
                var title = new TextBlock { Text = game.Title, TextWrapping = TextWrapping.Wrap, MaxLines = 2, TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center };
                Grid.SetColumn(title, 1); row.Children.Add(title);
                var button = new Button { Content = row, HorizontalAlignment = HorizontalAlignment.Stretch, HorizontalContentAlignment = HorizontalAlignment.Stretch };
                AutomationProperties.SetName(button, game.Title); button.Click += async (_, _) => { selected = game.Id; await Reload(); };
                if (selected == game.Id) button.Style = (Style)Application.Current.Resources["AccentButtonStyle"];
                LibraryRows.Children.Add(button);
            }
            if (LibraryRows.Children.Count == 0) LibraryRows.Children.Add(new TextBlock { Text = owner.Locale.T("Your library is empty."), TextWrapping = TextWrapping.Wrap });
            if (selected is null) return;
            var id = Urls.Id(selected);
            var achievements = await owner.Api.Get("/platform/achievements/" + id);
            if (revision != request) return;
            AchievementRows.Children.Clear();
            foreach (var a in achievements.Items())
            {
                var unlocked = a.At("unlocked_at", "unlockedAt") is not null; var hidden = a.B("hidden") && !unlocked;
                var row = new StackPanel { Spacing = 4 };
                row.Children.Add(new TextBlock { Text = hidden ? owner.Locale.T("Hidden achievement") : a.S("title"), Style = (Style)Application.Current.Resources["BodyStrongTextBlockStyle"], TextWrapping = TextWrapping.Wrap });
                row.Children.Add(new TextBlock { Text = owner.Locale.T(unlocked ? "Unlocked" : "Locked") + " · " + a.L("points"), TextWrapping = TextWrapping.Wrap });
                AchievementRows.Children.Add(row);
            }
            if (AchievementRows.Children.Count == 0) AchievementRows.Children.Add(new TextBlock { Text = owner.Locale.T("No achievements yet.") });
            CloudRows.Children.Clear();
            if (!owner.Catalog.Any(x => x.Id == id && x.CloudEnabled))
            { CloudRows.Children.Add(new TextBlock { Text = owner.Locale.T("Cloud saves are not enabled for this game."), TextWrapping = TextWrapping.Wrap }); return; }
            var saves = await owner.Api.Get("/platform/saves/" + id);
            if (revision != request) return;
            foreach (var item in saves.Items())
                CloudRows.Children.Add(new TextBlock { Text = item.S("filename", "slot") + "\n" + owner.Locale.T("Revision") + " " + item.L("revision") + "\n" + owner.FormatDate(item.S("updated_at", "updatedAt"), true), TextWrapping = TextWrapping.Wrap });
            if (CloudRows.Children.Count == 0) CloudRows.Children.Add(new TextBlock { Text = owner.Locale.T("No cloud saves found.") });
        }
        catch (Exception ex) { if (revision == request) PlayingLabel.Text = owner.Locale.Error(ex); }
    }
#if UI_VALIDATION
    internal async Task<Grid> ValidationShow()
    {
        AppWindow.Resize(new Windows.Graphics.SizeInt32(1280, 800));
        selected = owner.Catalog.FirstOrDefault()?.Id;
        // RenderTargetBitmap needs the secondary XamlRoot activated in the UI test runner.
        // This method is compiled only for UI_VALIDATION; normal Game View stays non-activating.
        Activate();
        OpenWidgets();
        await Reload();
        return OverlayRoot;
    }
    internal bool ValidationWidgetsOpaque => Widgets.All(x => x.Background is SolidColorBrush brush && brush.Color.A == 255);
    internal bool ValidationLabelsNative => ProfileHeading.Text == owner.Locale.T("Profile") && LibraryRows.Children.Count > 0 && AchievementRows.Children.Count > 0;
    internal void ValidationPinAndHide() { ProfilePin.IsChecked = true; Hide(); }
    internal bool ValidationPinned => !IsOpen && ProfilePanel.Visibility == Visibility.Visible && LibraryPanel.Visibility == Visibility.Collapsed;
    internal bool ValidationTimerRunning => timer.IsRunning;
    internal bool ValidationNativeVisible => NativeWindow.IsVisible(this);
#endif
    private async void ReloadClick(object sender, RoutedEventArgs e) => await Reload();
    private void CloseClick(object sender, RoutedEventArgs e) => Hide(true);
}
