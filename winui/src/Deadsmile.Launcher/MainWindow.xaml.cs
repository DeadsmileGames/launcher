using System.Diagnostics;
using System.Globalization;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Deadsmile.Launcher.Views;
using Microsoft.UI;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.Windows.AppLifecycle;
using Windows.ApplicationModel.Activation;
using Windows.Foundation;
using VirtualKey = Windows.System.VirtualKey;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow : Window
{
    private sealed record LauncherNotification(string Title, string Message, string Kind, string? EntityId, string? Slug, DateTimeOffset CreatedAt);
    public Localization Locale { get; } = new();
    public ApiClient Api { get; }
    public GameService Games { get; }
    public Game[] Catalog { get; private set; } = [];
    public JsonNode? User { get; private set; }
    private readonly Storage storage;
    private readonly InstallationService installs;
    private readonly DownloadService downloads;
    private readonly LiveLibrary live;
    private readonly AchievementService achievements;
    private readonly NativeWindow native;
    private readonly DispatcherQueueTimer downloadTimer;
    private readonly DispatcherQueueTimer heroTimer;
    private readonly DispatcherQueueTimer appToastTimer;
    private readonly UpdateService updater;
    private GameViewWindow? overlay;
    private Game? selected;
    private Game? featuredGame;
    private readonly Game?[] featuredGames = new Game?[3];
    private readonly HashSet<string> wishlistIds = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<LauncherNotification> localNotifications = [];
    private int homeSlideIndex;
    private bool homeHeroPaused, homeHeroAnimating, notificationsUnread, profileLoaded, profileLoading, changingNavigation;
    private string page = "explore";
    public string OverlayShortcut { get; private set; } = "Control+D";
    internal bool GameIsFocused
    {
        get
        {
            var foreground = GetForegroundWindow();
            if (foreground == IntPtr.Zero) return false;
            if (overlay is { IsOpen: true } activeOverlay &&
                foreground == WinRT.Interop.WindowNative.GetWindowHandle(activeOverlay)) return true;
            _ = GetWindowThreadProcessId(foreground, out var foregroundProcessId);
            return foregroundProcessId != 0 && Games.Running.Any(game =>
                !game.Process.HasExited && (uint)game.Process.Id == foregroundProcessId &&
                !NativeWindow.Minimized(game.Process.MainWindowHandle));
        }
    }
    internal bool IsLauncherForeground
    {
        get
        {
            var foreground = GetForegroundWindow();
            if (foreground == IntPtr.Zero) return false;
            _ = GetWindowThreadProcessId(foreground, out var processId);
            return processId == (uint)Environment.ProcessId;
        }
    }
    private bool ready, refreshing, refreshAgain, twoFactor, authenticating, changingLanguage, connecting, commandBusy, closeDialog, itchConfigured, itchConnected;
    private int downloadDirty = 1, detailRevision;
    private string? pendingLaunch;
    private Image? heroImage;
    private Windows.Media.Playback.MediaPlayer? homeBannerPlayer;
    private string? homeVideoGameId;
    private int homeMediaRevision;
    private string[] heroImages = [];
    private int heroIndex;
    private bool heroPaused;
    private readonly SemaphoreSlim accountGate = new(1, 1);
    public MainWindow()
    {
        InitializeComponent();
        storage = new Storage();
        Preferences = storage.Read("winui-appearance.json", new UiPreferences());
        Locale.Language = storage.Read("winui-language.json", "pt-BR");
        if (Locale.Language is not ("pt-BR" or "en" or "es")) Locale.Language = "pt-BR";
        var sessions = new SessionStore(storage);
        #if UI_VALIDATION
        Api = new ApiClient(Locale, testHandler: new UiValidationHandler());
#else
        Api = new ApiClient(Locale, sessions.Load(), sessions.Save);
#endif
        installs = new InstallationService(storage);
        var saves = new CloudSaveService(Api, storage);
        achievements = new AchievementService(Api, storage);
        Games = new GameService(Api, installs, saves, achievements);
        downloads = new DownloadService(Api, installs, Games.Busy);
        Games.DownloadBusy = downloads.Busy;
        updater = new UpdateService(storage);
        live = new LiveLibrary(Api);
        native = new NativeWindow(this) { Scale = () => Root.XamlRoot?.RasterizationScale ?? 1 };
        native.Hotkey += ToggleOverlay;
        Api.Invalidated += () => { if (!booting && User is not null) UI(async () => { User = null; achievements.Stop(); await Enter(); }); };
        saves.Conflict += _ => UI(() => { Notify(Locale.Error("SAVE_CONFLICT")); return Task.CompletedTask; });
        Games.Failed += ex => UI(() => { Notify(Locale.Error(ex)); return Task.CompletedTask; });
        Games.Changed += () => UI(() => { UpdateBusy(); UpdateFeaturedAction(); RefreshGameActions(); GameStartedHint(); return Task.CompletedTask; });
        achievements.Unlocked += (_, achievement) => UI(() => { ShowAchievement(achievement); return Task.CompletedTask; });
        downloads.Changed += () => Interlocked.Exchange(ref downloadDirty, 1);
        downloads.Installed += (install, game) => UI(async () =>
        {
            try { DesktopIntegration.Shortcut(install, game); } catch { Notify(Locale.Error("GAME_SHORTCUT_CREATE_FAILED")); }
            await Refresh(); RefreshGameActions();
        });
        live.Changed += () => UI(async () => { await Refresh(); await LoadNews(); });
        live.EventReceived += item => UI(() => { ContentNotification(item); return Task.CompletedTask; });
        downloadTimer = DispatcherQueue.CreateTimer(); downloadTimer.Interval = TimeSpan.FromMilliseconds(250);
        downloadTimer.Tick += (_, _) =>
        {
            if (Interlocked.Exchange(ref downloadDirty, 0) != 0 || downloads.Jobs.Any(x =>
                x.Status == "complete" && x.CompletedAt is { } completed && DateTimeOffset.UtcNow - completed < TimeSpan.FromSeconds(3)))
            { RenderDownloads(); UpdateBusy(); }
        };
        downloadTimer.Start();
        appToastTimer = DispatcherQueue.CreateTimer(); appToastTimer.Interval = TimeSpan.FromSeconds(5);
        appToastTimer.Tick += (_, _) => { appToastTimer.Stop(); AppToast.Visibility = Visibility.Collapsed; };
        heroTimer = DispatcherQueue.CreateTimer(); heroTimer.Interval = TimeSpan.FromSeconds(5);
        heroTimer.Tick += (_, _) =>
        {
            if (!Preferences.RotateBanners || !MotionEnabled || !AppWindow.IsVisible) return;
            if (selected is not null && !heroPaused && heroImages.Length > 1 && heroImage is not null)
            {
                heroIndex = (heroIndex + 1) % heroImages.Length; SetImage(heroImage, heroImages[heroIndex]);
                var animation = new FadeInThemeAnimation(); Storyboard.SetTarget(animation, heroImage);
                var storyboard = new Storyboard(); storyboard.Children.Add(animation); storyboard.Begin();
            }
            else if (selected is null && page == "explore" && !homeHeroPaused &&
                string.IsNullOrWhiteSpace(SearchBox.Text) && !(InstalledFilter.IsChecked ?? false) && Catalog.Length > 1)
                _ = AdvanceHomeHeroAsync();
        };
        heroTimer.Start();
        AppWindow.SetIcon(Path.Combine(AppContext.BaseDirectory, "Assets", "Icon.ico"));
        if (AppWindow.Presenter is OverlappedPresenter presenter)
        {
            presenter.PreferredMinimumWidth = 960;
            presenter.PreferredMinimumHeight = 640;
        }
        AppWindow.Resize(new Windows.Graphics.SizeInt32(1271, 796));
        ExtendsContentIntoTitleBar = true; SetTitleBar(AppTitleBar);
        if (AppWindowTitleBar.IsCustomizationSupported())
        { AppWindow.TitleBar.ButtonBackgroundColor = Windows.UI.Color.FromArgb(255, 32, 32, 32); AppWindow.TitleBar.ButtonForegroundColor = Colors.White; }
        AppWindow.Closing += (_, args) =>
        {
            if (!exiting && Preferences.CloseToTray && tray is { Available: true })
            { args.Cancel = true; MinimizeToTray(); return; }
            if (Games.AnyBusy || downloads.AnyBusy || commandBusy)
            { args.Cancel = true; UI(ConfirmClose); }
        };
        Closed += (_, _) =>
        {
            live.Dispose(); achievements.Stop(); downloads.Dispose(); tray?.Dispose(); notifications?.Dispose(); updateTimer?.Stop(); bannerPlayer?.Dispose(); homeBannerPlayer?.Dispose(); native.Dispose(); overlay?.Close();
            downloadTimer.Stop(); heroTimer.Stop(); appToastTimer.Stop(); systemUi.ColorValuesChanged -= SystemColorsChanged; Api.Dispose();
        };
        VersionLabel.Text = "Deadsmile Games Launcher " + BuildInfo.Version;
        Root.SizeChanged += (_, _) => AdjustLayout();
        GameGrid.SizeChanged += (_, _) => AdjustLayout();
        PageLayout.SizeChanged += PageLayoutSizeChanged;
        Shell.SelectedItem = ExploreItem;
        ready = true;
        ApplyAppearance();
        Root.ActualThemeChanged += (_, _) => ApplyCaptionColors();
        systemUi.ColorValuesChanged += SystemColorsChanged;
        OverlayShortcut = storage.Read("game-view.json", new JsonObject()).S("shortcut");
        if (string.IsNullOrWhiteSpace(OverlayShortcut)) OverlayShortcut = "Control+D";
        OverlayToggle.IsOn = storage.Read("game-view.json", new JsonObject()).B("enabled") ||
            !File.Exists(storage.FilePath("game-view.json"));
        ShortcutText.Text = OverlayShortcut.Replace("Control", "Ctrl").Replace("+", " + ");
        ApplyLanguage();
        Root.Loaded += async (_, _) => await Boot();
        DesktopIntegration.RegisterProtocol();
        InitializeDesktop();
    }
    private void UI(Func<Task> action) => DispatcherQueue.TryEnqueue(async () =>
    { try { await action(); } catch (Exception ex) { Notify(Locale.Error(ex)); storage.Log(ex is LauncherException le ? le.Code : "UI_OPERATION_FAILED"); } });
    private async Task Guard(Func<Task> action)
    { try { await action(); } catch (Exception ex) { Notify(Locale.Error(ex)); storage.Log(ex is LauncherException le ? le.Code : "UI_OPERATION_FAILED"); } }
    private void Notify(string text, InfoBarSeverity severity = InfoBarSeverity.Warning)
    { Notice.Message = text; Notice.Severity = severity; Notice.IsOpen = true; }
    private void ShowInAppToast(string title, string message)
    {
        if (!AppWindow.IsVisible) return;
        AppToastTitle.Text = title; AppToastMessage.Text = message; AppToast.Visibility = Visibility.Visible;
        appToastTimer.Stop(); appToastTimer.Start();
    }
    private void DismissAppToastClick(object sender, RoutedEventArgs e)
    { appToastTimer.Stop(); AppToast.Visibility = Visibility.Collapsed; }
    private async Task Boot() => await StartBoot();
    private void ShowLogin() => UI(async () => { await OpenSignIn(); });
    private async Task Enter(bool alreadyLoaded = false)
    {
        LoginPanel.Visibility = Visibility.Collapsed; Shell.Visibility = Visibility.Visible;
        SearchBox.Visibility = Visibility.Visible; AccountButton.Visibility = Visibility.Visible;
        AppTitleBar.IsPaneToggleButtonVisible = false; AppTitleBar.IsBackButtonVisible = true;
        UpdateAccount(); PasswordBox.Password = ""; CodeBox.Text = ""; LoginError.IsOpen = false;
        if (!alreadyLoaded) await Refresh(); ShowPage(); loginDialog?.Hide();
#if !UI_VALIDATION
        live.Start(User is not null); if (User is not null) achievements.Start(User.S("id"));
#endif
        if (User is not null && pendingLaunch is { } id)
        { pendingLaunch = null; var game = Catalog.FirstOrDefault(x => x.Id == id); if (game is not null) await Guard(() => LaunchWithSequence(game)); }
    }
    private async void LoginClick(object sender, RoutedEventArgs e) => await SignIn();
    private async void LoginKeyDown(object sender, KeyRoutedEventArgs e)
    { if (e.Key == VirtualKey.Enter) { e.Handled = true; await SignIn(); } }
    private async Task SignIn()
    {
        if (authenticating) return;
        authenticating = true; LoginButton.IsEnabled = false; LoginError.IsOpen = false; LoginError.Severity = InfoBarSeverity.Error;
        try
        {
            var n = twoFactor ? await Api.Post("/auth/verify-2fa", new { token = CodeBox.Text.Trim() }) :
                await Api.Post("/auth/mobile-login", new { email = EmailBox.Text.Trim(), password = PasswordBox.Password });
            if (n.B("requiresTwoFactor"))
            {
                twoFactor = true; LoginHeading.Text = Locale.T("Verify sign in"); LoginBackButton.Visibility = Visibility.Visible; CredentialsPanel.Visibility = Visibility.Collapsed; CodeBox.Visibility = Visibility.Visible;
                CodeBox.Text = ""; CodeBox.Focus(FocusState.Programmatic); LoginButton.Content = Locale.T("Verify");
            }
            else { User = await Api.Get("/auth/me"); await Enter(); }
        }
        catch (Exception ex)
        {
            LoginError.Message = Locale.Error(ex); LoginError.IsOpen = true;
            ResendButton.Visibility = ex is LauncherException { Code: "EMAIL_NOT_VERIFIED" } ? Visibility.Visible : Visibility.Collapsed;
        }
        finally { authenticating = false; LoginButton.IsEnabled = true; UpdateBusy(); }
    }
    private async void ResendClick(object sender, RoutedEventArgs e)
    {
        if (authenticating) return; authenticating = true;
        try { await Api.Post("/auth/resend-email", new { email = EmailBox.Text.Trim(), password = PasswordBox.Password });
            LoginError.Message = Locale.T("Verification email sent."); LoginError.Severity = InfoBarSeverity.Success; LoginError.IsOpen = true; }
        catch (Exception ex) { LoginError.Message = Locale.Error(ex); LoginError.IsOpen = true; }
        finally { authenticating = false; }
    }
    private void LoginBackClick(object sender, RoutedEventArgs e)
    {
        if (authenticating) return;
        twoFactor = false; LoginHeading.Text = Locale.T("Sign in"); CodeBox.Text = ""; CodeBox.Visibility = Visibility.Collapsed;
        CredentialsPanel.Visibility = Visibility.Visible; LoginBackButton.Visibility = Visibility.Collapsed;
        LoginButton.Content = Locale.T("Sign in"); LoginError.IsOpen = false;
    }
    private void RegisterClick(object sender, RoutedEventArgs e) => DesktopIntegration.Open(Urls.Website + "/register");
    private void ForgotClick(object sender, RoutedEventArgs e) => DesktopIntegration.Open(Urls.Website + "/forgot-password");
    private void WebsiteClick(object sender, RoutedEventArgs e) => DesktopIntegration.Open(Urls.Website);
    private async void LogoutClick(object sender, RoutedEventArgs e)
    {
        if (AllBusy) return;
        await accountGate.WaitAsync();
        try
        {
            if (AllBusy) return;
            await Api.Post("/auth/logout"); Api.ClearSession(); User = null; profileLoaded = false; privacyLoaded = false; wishlistIds.Clear();
            live.Stop(); achievements.Stop(); Catalog = []; GameGrid.ItemsSource = null; await Enter();
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { accountGate.Release(); }
    }
    private async Task Refresh()
    {
        if (refreshing) { refreshAgain = true; return; }
        var user = User.S("id"); refreshing = true; BusyRing.IsActive = true; UpdateBusy();
        try
        {
            if (User is not null)
            {
                var connection = await Api.Get("/integrations/itch");
                itchConfigured = connection.B("configured"); itchConnected = connection.B("connected");
                ItchStatus.Text = Locale.T(itchConnected ? "Connected to itch.io" : "Connect itch.io to sync purchased games.");
                ItchButton.Tag = itchConnected; ItchButton.Content = Locale.T(itchConnected ? "Disconnect itch.io" : "Connect itch.io");
            }
            else { itchConfigured = itchConnected = false; ItchStatus.Text = Locale.T("Sign in to manage your account."); ItchButton.Content = Locale.T("Sign in"); }
            var catalog = await PublicCatalog.Load(Api, User is not null);
            if (User.S("id") != user) return;
            var legacyReady = User is not null && await DetectLegacyFreeInstallations(catalog);
            await installs.Refresh(catalog, id => Games.Busy(id) || downloads.Busy(id), legacyReady);
            Catalog = catalog; RenderCatalog();
            if (User is not null)
            {
                try
                {
                    var wishlist = await Api.Get("/wishlist");
                    wishlistIds.Clear();
                    foreach (var item in wishlist.Items())
                        if (Guid.TryParse(item.S("id", "gameId"), out var wishlistId)) wishlistIds.Add(wishlistId.ToString());
                }
                catch (Exception) { }
            }
            RefreshGameActions();
        }
        finally { refreshing = false; BusyRing.IsActive = false; UpdateBusy();
            if (refreshAgain) { refreshAgain = false; UI(Refresh); } }
    }
    private async Task<bool> DetectLegacyFreeInstallations(IEnumerable<Game> catalog)
    {
        var canMigrateLegacyFolders = true;
        foreach (var game in catalog)
        {
            if (!game.Data.S("accessType").Equals("free", StringComparison.OrdinalIgnoreCase)) continue;
            try
            {
                if (string.IsNullOrWhiteSpace(game.Slug)) continue;
                var legacyFolder = Path.Combine(storage.Games, Urls.Slug(game.Slug));
                PathGuard.RequireInside(storage.Games, legacyFolder);
                if (!Directory.Exists(legacyFolder) || InstallationService.FindExe(legacyFolder) is null) continue;
                if (!game.InLibrary)
                {
                    try
                    {
                        await Api.Post("/library/" + Urls.Id(game.Id), new { });
                        if (game.Data is JsonObject data)
                        {
                            data["owned"] = true;
                            data["inLibrary"] = true;
                        }
                    }
                    catch (Exception ex)
                    {
                        canMigrateLegacyFolders = false;
                        storage.Log(ex is LauncherException failure ? failure.Code : "EXTERNAL_FREE_GAME_CLAIM_FAILED");
                        continue;
                    }
                }
                DesktopNotice(Locale.T("Free game installation detected"), game.Title + " · " + Locale.T("Added to library."),
                    "game", game.Id, game.Slug);
            }
            catch (Exception ex)
            {
                storage.Log(ex is LauncherException failure ? failure.Code : "EXTERNAL_FREE_GAME_DETECTION_FAILED");
            }
        }
        return canMigrateLegacyFolders;
    }
    private async void RefreshClick(object sender, RoutedEventArgs e) => await Guard(Refresh);
    private void NavigationChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
    {
        if (!ready || changingNavigation) return;
        RememberPage();
        page = args.IsSettingsSelected ? "settings" : (args.SelectedItem as NavigationViewItem)?.Tag as string ?? "explore";
        selected = null; detailRevision++; ShowPage();
    }
    private void TitleBackRequested(TitleBar sender, object args)
    { NavigateBack(); }
    private void TitlePaneToggleRequested(TitleBar sender, object args) => Shell.IsPaneOpen = !Shell.IsPaneOpen;
    private void ShowPage()
    {
        if (selected is null) { heroImage = null; heroImages = []; bannerPlayer?.Dispose(); bannerPlayer = null; }
        if (selected is not null || page != "explore") StopHomeVideo();
        CatalogPanel.Visibility = selected is null && (page is "explore" or "library") ? Visibility.Visible : Visibility.Collapsed;
        DetailPanel.Visibility = selected is not null ? Visibility.Visible : Visibility.Collapsed;
        DownloadsPanel.Visibility = selected is null && page == "downloads" ? Visibility.Visible : Visibility.Collapsed;
        SettingsPanel.Visibility = selected is null && page == "settings" ? Visibility.Visible : Visibility.Collapsed;
        PageToolbar.Visibility = selected is null ? Visibility.Visible : Visibility.Collapsed;
        AppTitleBar.IsBackButtonVisible = true;
        AppTitleBar.IsBackButtonEnabled = selected is not null || page != "explore" || history.Count > 0;
        ContentPage.Visibility = selected is null && page is "wishlist" or "news" ? Visibility.Visible : Visibility.Collapsed;
        HomeNews.Visibility = page == "explore" && Preferences.ShowNewswireOnHome && newsItems.Length > 0 ? Visibility.Visible : Visibility.Collapsed;
        if (selected is null) HomeHeroPauseButton.Content = Locale.T(homeHeroPaused ? "Resume" : "Pause");
        CollapseLabel.Visibility = Shell.IsPaneOpen ? Visibility.Visible : Visibility.Collapsed;
        if (ContentPage.Visibility == Visibility.Visible) UI(RenderContentPage);
        PageHeading.Text = Locale.T(page switch { "library" => "Library", "downloads" => "Downloads", "settings" or "account" => "Settings", "wishlist" => "Wishlist", "news" => "Newswire", _ => "Explore" });
        changingNavigation = true;
        try { Shell.SelectedItem = page switch { "library" => LibraryItem, "downloads" => DownloadsItem, "wishlist" => WishlistItem, "news" => NewsItem, _ => ExploreItem }; }
        finally { changingNavigation = false; }
        RenderCatalog(); RenderDownloads(); AdjustLayout();
    }
    private void AdjustLayout()
    {
        if (LoginLayout is null || GameGrid is null) return;
        LoginLayout.MinHeight = 0;
        SearchBox.Width = Root.ActualWidth < 900 ? 180 : Math.Clamp(Root.ActualWidth * 0.4, 180, 600);
        AppTitleBar.Title = "Deadsmile Games Launcher";
        if (SettingsPanel.ActualWidth > 0) SettingsBody.Width = Math.Max(0, Math.Min(1000, SettingsPanel.ActualWidth - 24));
        if (HomeHeroSurface.ActualWidth > 0 && FeaturedVideo.Visibility == Visibility.Visible)
        { FeaturedVideo.Width = HomeHeroSurface.ActualWidth; FeaturedVideo.Height = HomeHeroSurface.ActualHeight; }
        CatalogHeader.Width = Math.Max(0, GameGrid.ActualWidth - 16);
        FeaturedPanel.Visibility = featuredGame is not null && Root.ActualHeight >= 600 ? Visibility.Visible : Visibility.Collapsed;
        FeaturedPanel.Height = Root.ActualWidth >= 1008 ? 340 : 260;
        FeaturedSide.Visibility = Visibility.Collapsed;
        FeaturedSideColumn.Width = new GridLength(0);
    }
    private void RenderCatalog()
    {
        var query = page is "explore" or "library" ? SearchBox.Text?.Trim() ?? "" : "";
        var items = Catalog.Where(x => (page != "library" || x.InLibrary) &&
            (!(InstalledFilter.IsChecked ?? false) || installs.Installed.ContainsKey(x.Id)) &&
            x.SearchText.Contains(query, StringComparison.CurrentCultureIgnoreCase)).ToArray();
        featuredGame = page == "explore" && selected is null && query.Length == 0 && !(InstalledFilter.IsChecked ?? false) && items.Length > 0
            ? items[homeSlideIndex % items.Length] : null;
        var catalogItems = featuredGame is null ? items : items.Where(x => !x.Id.Equals(featuredGame.Id, StringComparison.OrdinalIgnoreCase)).ToArray();
        GameGrid.ItemsSource = catalogItems;
        if (featuredGame is null) StopHomeVideo();
        if (featuredGame is not null)
        {
            FeaturedImage.Source = null;
            SetImage(FeaturedImage, featuredGame.HeroImages.FirstOrDefault() ?? featuredGame.Cover);
            FeaturedTitle.Text = featuredGame.Title; FeaturedGenres.Text = featuredGame.Genres;
            UpdateFeaturedAction();
            if (selected is null && page == "explore") _ = ConfigureHomeVideo(featuredGame);
        }
        Array.Fill(featuredGames, null);
        SecondaryFeature.Visibility = ThirdFeature.Visibility = FourthFeature.Visibility = Visibility.Collapsed;
        AdjustLayout();
        EmptyCatalog.Text = Locale.T(page == "library" ? "Your library is empty." : "No games found.");
        EmptyCatalog.Visibility = catalogItems.Length == 0 && featuredGame is null ? Visibility.Visible : Visibility.Collapsed;
    }
    private void NavigationInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        if (!ready) return;
        if (args.InvokedItemContainer is NavigationViewItem item && item.Tag?.ToString() == page)
        {
            selected = null;
            detailRevision++;
            ShowPage();
            if (page is "news" or "wishlist") UI(RenderContentPage);
        }
    }
    private void NavigationCompactClick(object sender, RoutedEventArgs e) => NavigationChoice.SelectedIndex = 0;
    private void NavigationExpandedClick(object sender, RoutedEventArgs e) => NavigationChoice.SelectedIndex = 1;
    private void SearchChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args)
    {
        if (!ready || args.Reason != AutoSuggestionBoxTextChangeReason.UserInput) return;
        SearchSuggestions(sender.Text); RenderCatalog();
    }
    private async void SearchSubmitted(AutoSuggestBox sender, AutoSuggestBoxQuerySubmittedEventArgs args)
    { await ChooseSearch(args.ChosenSuggestion ?? searchResults.FirstOrDefault()); }
    private void SearchChosen(AutoSuggestBox sender, AutoSuggestBoxSuggestionChosenEventArgs args)
    { if (args.SelectedItem is SearchEntry entry) sender.Text = entry.Title; }
    private void UpdateFeaturedAction()
    {
        if (featuredGame is not { } game)
        {
            FeaturedButton.Content = Locale.T("View details");
            FeaturedButton.IsEnabled = true;
            return;
        }
        var canLaunch = installs.Installed.ContainsKey(game.Id) && game.CanLaunch;
        var running = Games.Running.Any(entry => entry.Game.Id == game.Id && !entry.Process.HasExited);
        var label = canLaunch ? running ? "Stop" : "Play" : "View details";
        FeaturedButton.Content = Locale.T(label);
        AutomationProperties.SetName(FeaturedButton, Locale.T(label));
        FeaturedButton.IsEnabled = running || (!Games.Busy(game.Id) && !downloads.Busy(game.Id) && !commandBusy);
    }
    private async Task AdvanceHomeHeroAsync()
    {
        if (homeHeroAnimating || homeHeroPaused || selected is not null || page != "explore" || Catalog.Length < 2) return;
        homeHeroAnimating = true;
        try
        {
            var outgoing = new TranslateTransform();
            HomeHeroSurface.RenderTransform = outgoing;
            HomeHeroSurface.Opacity = 1;
            var leave = new Storyboard();
            var leaveX = new DoubleAnimation
            {
                To = -72, Duration = TimeSpan.FromMilliseconds(230),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseIn }
            };
            Storyboard.SetTarget(leaveX, outgoing);
            Storyboard.SetTargetProperty(leaveX, "X");
            var leaveFade = new DoubleAnimation { To = 0.82, Duration = TimeSpan.FromMilliseconds(230) };
            Storyboard.SetTarget(leaveFade, HomeHeroSurface);
            Storyboard.SetTargetProperty(leaveFade, "Opacity");
            leave.Children.Add(leaveX); leave.Children.Add(leaveFade); leave.Begin();
            await Task.Delay(250);
            if (homeHeroPaused || page != "explore" || selected is not null) return;
            homeSlideIndex = (homeSlideIndex + 1) % Catalog.Length;
            RenderCatalog();
            var incoming = new TranslateTransform { X = 72 };
            HomeHeroSurface.RenderTransform = incoming;
            HomeHeroSurface.Opacity = 0.82;
            var enter = new Storyboard();
            var enterX = new DoubleAnimation
            {
                To = 0, Duration = TimeSpan.FromMilliseconds(280),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };
            Storyboard.SetTarget(enterX, incoming);
            Storyboard.SetTargetProperty(enterX, "X");
            var enterFade = new DoubleAnimation { To = 1, Duration = TimeSpan.FromMilliseconds(280) };
            Storyboard.SetTarget(enterFade, HomeHeroSurface);
            Storyboard.SetTargetProperty(enterFade, "Opacity");
            enter.Children.Add(enterX); enter.Children.Add(enterFade); enter.Begin();
            await Task.Delay(300);
        }
        finally
        {
            HomeHeroSurface.RenderTransform = new TranslateTransform();
            HomeHeroSurface.Opacity = 1;
            homeHeroAnimating = false;
        }
    }
    private async void FeaturedClick(object sender, RoutedEventArgs e)
    {
        if (featuredGame is not { } game) return;
        if (installs.Installed.ContainsKey(game.Id) && game.CanLaunch)
        {
            if (Games.Running.Any(entry => entry.Game.Id == game.Id && !entry.Process.HasExited))
                Games.Stop(game.Id);
            else
                await LaunchWithSequence(game);
            UpdateFeaturedAction();
            return;
        }
        await LoadDetail(game);
    }
    private async void SecondaryFeaturedClick(object sender, RoutedEventArgs e)
    {
        if (int.TryParse(((Button)sender).Tag?.ToString(), out var index) && index >= 0 && index < featuredGames.Length && featuredGames[index] is { } game)
            await LoadDetail(game);
    }
    private void FilterChanged(object sender, RoutedEventArgs e) { if (ready) RenderCatalog(); }
    private async void GameClick(object sender, ItemClickEventArgs e)
    { if (e.ClickedItem is Game game) await LoadDetail(game); }
    private async Task LoadDetail(Game game)
    {
        RememberPage(); selected = game; ShowPage(); var revision = ++detailRevision;
        heroImage = null; heroImages = [];
        DetailContent.Children.Clear(); DetailContent.Children.Add(new ProgressRing { IsActive = true });
        try
        {
            var detail = await Api.Get("/games/" + Urls.Slug(game.Slug));
            if (revision != detailRevision) return;
            if (detail is null) throw new LauncherException("INVALID_RESPONSE");
            selected = game.Merge(new Game(detail)); RenderDetail(selected);
        }
        catch (Exception ex)
        {
            if (revision != detailRevision) return;
            DetailContent.Children.Clear(); DetailContent.Children.Add(Text(Locale.Error(ex)));
            DetailContent.Children.Add(Action("Try again", () => LoadDetail(game)));
        }
    }
    private void RefreshGameActions() { if (selected is not null) RenderDetail(selected); }
    private Button Action(string key, Func<Task> callback, bool primary = false)
    {
        var b = new Button { Content = Locale.T(key) };
        if (primary) b.Style = (Style)Application.Current.Resources["AccentButtonStyle"];
        b.Click += async (_, _) => await Guard(callback); return b;
    }
    private TextBlock Text(string text, double size = 14, bool heading = false) => new()
    {
        Text = text, TextWrapping = TextWrapping.Wrap,
        Style = (Style)Application.Current.Resources[heading ? (size >= 36 ? "TitleLargeTextBlockStyle" : size >= 26 ? "TitleTextBlockStyle" : "SubtitleTextBlockStyle") : "BodyTextBlockStyle"]
    };
    private Border Section(string title, UIElement content)
    {
        var panel = new StackPanel { Spacing = 16 };
        panel.Children.Add(new TextBlock { Text = Locale.T(title), Style = (Style)Application.Current.Resources["BodyStrongTextBlockStyle"] });
        panel.Children.Add(content);
        return new Border { Style = (Style)Application.Current.Resources["Panel"], Child = panel };
    }
    private MenuFlyout BuildGameContextFlyout(Game game)
    {
        var flyout = new MenuFlyout();
        var busy = Games.Busy(game.Id) || downloads.Busy(game.Id) || commandBusy;
        void Add(string key, Func<Task> callback, bool enabled = true, Symbol symbol = Symbol.Accept)
        {
            var item = new MenuFlyoutItem { Text = Locale.T(key), Icon = new SymbolIcon(symbol), IsEnabled = enabled && !busy };
            item.Click += async (_, _) => await Guard(callback);
            flyout.Items.Add(item);
        }
        if (installs.Installed.ContainsKey(game.Id))
        {
            var running = Games.Running.Any(entry => entry.Game.Id == game.Id && !entry.Process.HasExited);
            if (game.CanLaunch)
                Add(running ? "Stop" : "Play", () =>
                {
                    if (running) { Games.Stop(game.Id); return Task.CompletedTask; }
                    return LaunchWithSequence(game);
                }, true, running ? Symbol.Stop : Symbol.Play);
            Add("Update game", async () =>
            {
                var remote = await Api.Metadata(game.Id);
                if (Versions.Compare(remote.Version, installs.Installed[game.Id].Version) > 0) await Download(game);
                else Notify(Locale.T("No update available."), InfoBarSeverity.Informational);
            }, true, Symbol.Refresh);
            Add("Uninstall", () => Uninstall(game), true, Symbol.Delete);
        }
        else if (game.DownloadAvailable && (game.CanLaunch || game.Data.S("accessType") == "free" || User is null))
            Add("Install", () => Download(game), true, Symbol.Download);
        if (flyout.Items.Count > 0) flyout.Items.Add(new MenuFlyoutSeparator());
        var inWishlist = wishlistIds.Contains(Urls.Id(game.Id));
        Add(inWishlist ? "Remove from wishlist" : "Add to wishlist",
            () => ToggleWishlist(game), true, Symbol.Favorite);
        return flyout;
    }
    private void GameCardLoaded(object sender, RoutedEventArgs e)
    {
        if (sender is Border card && card.DataContext is Game game)
        {
            card.Background = CenteredArtwork(game.Poster);
            card.ContextFlyout = BuildGameContextFlyout(game);
        }
    }
    private static ImageBrush CenteredArtwork(string value)
    {
        ImageSource source;
        #if UI_VALIDATION
        if (value.Contains("fixture.invalid", StringComparison.Ordinal))
            source = new BitmapImage(new Uri("ms-appx:///Assets/StoreLogo.png"));
        else
        #endif
        {
            var safe = Urls.Image(value);
            source = string.IsNullOrWhiteSpace(safe)
                ? new BitmapImage(new Uri("ms-appx:///Assets/StoreLogo.png"))
                : safe.EndsWith(".svg", StringComparison.OrdinalIgnoreCase)
                    ? new SvgImageSource(new Uri(safe)) : new BitmapImage(new Uri(safe));
        }
        return new ImageBrush
        {
            ImageSource = source, Stretch = Stretch.UniformToFill,
            AlignmentX = AlignmentX.Center, AlignmentY = AlignmentY.Center
        };
    }
    private static void SetImage(Image image, string value)
    {
        #if UI_VALIDATION
        if (value.Contains("fixture.invalid", StringComparison.Ordinal))
        { image.Source = new BitmapImage(new Uri("ms-appx:///Assets/StoreLogo.png")); return; }
#endif
        if (Urls.Https(value) is { } uri) image.Source = uri.AbsolutePath.EndsWith(".svg", StringComparison.OrdinalIgnoreCase) ? new SvgImageSource(uri) : new BitmapImage(uri);
    }
    private async Task Download(Game game)
    {
        if (!await RequireAccount()) return;
        await accountGate.WaitAsync();
        try
        {
            if (User is null) return;
            if (Games.Busy(game.Id)) throw new LauncherException("GAME_RUNNING");
            if (game.Data.S("accessType") == "free" && !game.InLibrary) { await Api.Post("/library/" + game.Id); await Refresh(); }
            downloads.Enqueue(game); page = "downloads"; selected = null; detailRevision++; ShowPage();
        }
        finally { accountGate.Release(); }
    }
    private Grid WrapActions(IEnumerable<Button> buttons)
    {
        var grid = new Grid { RowSpacing = 12, ColumnSpacing = 12, HorizontalAlignment = HorizontalAlignment.Stretch };
        foreach (var b in buttons) { b.HorizontalAlignment = HorizontalAlignment.Stretch; grid.Children.Add(b); }
        var last = 0;
        void Arrange()
        {
            var count = Math.Max(1, (int)(grid.ActualWidth / 190)); if (count == last) return; last = count;
            grid.ColumnDefinitions.Clear(); grid.RowDefinitions.Clear();
            for (var i = 0; i < count; i++) grid.ColumnDefinitions.Add(new ColumnDefinition());
            for (var i = 0; i < (grid.Children.Count + count - 1) / count; i++) grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            for (var i = 0; i < grid.Children.Count; i++) { Grid.SetColumn((FrameworkElement)grid.Children[i], i % count); Grid.SetRow((FrameworkElement)grid.Children[i], i / count); }
        }
        grid.SizeChanged += (_, _) => Arrange(); Arrange(); return grid;
    }
    private static Windows.UI.Color HeroAccent(Game game) =>
        Windows.UI.Color.FromArgb(255, 74, 49, 40);

    private void RenderDetail(Game game)
    {
        DetailContent.Children.Clear(); heroImages = game.HeroImages; heroIndex = 0;
        var hero = new Grid { Height = 360, MaxHeight = 360, CornerRadius = new CornerRadius(8) };
        var hasStoreScreenshots = game.Store.At("screenshots").Items().Any();
        var backdropUrl = hasStoreScreenshots ? game.HeroImages.FirstOrDefault() ?? game.Cover :
            game.Poster.Length > 0 ? game.Poster : game.Cover;
        hero.Background = Root.Background;
        hero.Children.Add(new Border
        {
            Background = CenteredArtwork(backdropUrl),
            CornerRadius = new CornerRadius(8)
        });
        heroImage = new Image
        {
            Height = 360, MaxHeight = 360, Stretch = Stretch.UniformToFill,
            HorizontalAlignment = HorizontalAlignment.Stretch,
            Visibility = hasStoreScreenshots ? Visibility.Visible : Visibility.Collapsed
        };
        var banner = heroImage;
        if (hasStoreScreenshots) SetImage(heroImage, backdropUrl);
        hero.Children.Add(heroImage);
        var accentOverlay = new Border
        {
            Background = CreateHeroShade(HeroAccent(game)),
            CornerRadius = new CornerRadius(8)
        };
        hero.Children.Add(accentOverlay);
        hero.ContextFlyout = BuildGameContextFlyout(game);
        var contents = new StackPanel { Spacing = 16, Padding = new Thickness(24), MaxWidth = 640, RequestedTheme = ElementTheme.Dark,
            HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Center };
        var identity = new Grid { ColumnSpacing = 24 };
        identity.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        identity.ColumnDefinitions.Add(new ColumnDefinition());
        var icon = new Image { Width = 96, Height = 96, Stretch = Stretch.Uniform, VerticalAlignment = VerticalAlignment.Top };
        if (game.ProductIcon.Length > 0)
        { SetImage(icon, game.ProductIcon); identity.Children.Add(new Border { Width = 96, Height = 96, CornerRadius = new CornerRadius(16), Child = icon }); }
        else identity.ColumnDefinitions[0].Width = new GridLength(0);
        var heading = new StackPanel { Spacing = 8, VerticalAlignment = VerticalAlignment.Center };
        heading.Children.Add(Text(game.Title, 28, true));
        var publisher = game.Data.S("publisher"); if (publisher.Length == 0) publisher = game.Store.S("publisher");
        if (publisher.Length > 0) heading.Children.Add(Text(publisher));
        if (game.Genres.Length > 0) heading.Children.Add(Text(game.Genres));
        Grid.SetColumn(heading, 1); identity.Children.Add(heading); contents.Children.Add(identity);
        if (game.Description.Length > 0)
        { var summary = Text(game.Description); summary.MaxLines = 2; summary.TextTrimming = TextTrimming.CharacterEllipsis; contents.Children.Add(summary); }
        var buttons = new List<Button>(); var options = new MenuFlyout();
        var busy = Games.Busy(game.Id) || downloads.Busy(game.Id) || commandBusy;
        if (installs.Installed.ContainsKey(game.Id) && game.CanLaunch)
        {
            var runningNow = Games.Running.Any(x => x.Game.Id == game.Id && !x.Process.HasExited);
            var play = runningNow
                ? Action("Stop", () => { Games.Stop(game.Id); return Task.CompletedTask; }, true)
                : Action("Play", async () => { if (await RequireAccount()) await LaunchWithSequence(game); }, true);
            play.IsEnabled = runningNow || !busy; buttons.Add(play);
            var update = new MenuFlyoutItem { Text = Locale.T("Update game"), Icon = new SymbolIcon(Symbol.Refresh), IsEnabled = !busy };
            update.Click += async (_, _) => await Guard(async () =>
            {
                var remote = await Api.Metadata(game.Id);
                if (Versions.Compare(remote.Version, installs.Installed[game.Id].Version) > 0) await Download(game);
                else Notify(Locale.T("No update available."), InfoBarSeverity.Informational);
            }); options.Items.Add(update);
            var remove = new MenuFlyoutItem { Text = Locale.T("Uninstall"), Icon = new SymbolIcon(Symbol.Delete), IsEnabled = !busy };
            remove.Click += async (_, _) => await Guard(() => Uninstall(game)); options.Items.Add(remove);
        }
        else if (game.DownloadAvailable && (game.CanLaunch || game.Data.S("accessType") == "free" || User is null))
        { var install = Action("Install", () => Download(game), true); install.IsEnabled = !busy; buttons.Add(install); }
        foreach (var offer in game.Data.At("offers").Items())
        {
            if (game.CanLaunch) break;
            var url = Urls.Https(offer.S("href")); var provider = offer.S("provider");
            if (url is null || provider is not ("itch" or "microsoft")) continue;
            if (provider == "itch" && url.Host != "itch.io" && !url.Host.EndsWith(".itch.io")) continue;
            buttons.Add(Action(provider == "itch" ? (game.Data.B("isFree") ? "Get on itch.io" : "Buy on itch.io") : (game.Data.B("isFree") ? "Get on Microsoft Store" : "Buy on Microsoft Store"),
                () => { DesktopIntegration.Open(url.AbsoluteUri); return Task.CompletedTask; }, true));
        }
        if (!game.CanLaunch && game.DownloadAvailable && game.Data.S("accessType") == "paid")
        { var verify = Action("Verify purchase", () => VerifyPurchase(game)); verify.IsEnabled = !busy; buttons.Add(verify); }
        if (options.Items.Count > 0)
        {
            var more = new Button { Content = new SymbolIcon(Symbol.More), Flyout = options };
            AutomationProperties.SetName(more, Locale.T("More options")); buttons.Add(more);
        }
        if (buttons.Count == 0) { var unavailable = Action("Unavailable", () => Task.CompletedTask); unavailable.IsEnabled = false; buttons.Add(unavailable); }
        var inWishlist = wishlistIds.Contains(Urls.Id(game.Id));
        var wishlistButton = Action(inWishlist ? "Already in wishlist" : "Add to wishlist", () => ToggleWishlist(game));
        wishlistButton.IsEnabled = !inWishlist;
        buttons.Add(wishlistButton);
        contents.Children.Add(WrapActions(buttons)); hero.Children.Add(contents);
        hero.SizeChanged += (_, _) =>
        {
            banner.Width = Math.Max(0, hero.ActualWidth);
            banner.MaxWidth = banner.Width;
            banner.Clip = new RectangleGeometry { Rect = new Rect(0, 0, hero.ActualWidth, 360) };
            if (hero.Children.FirstOrDefault() is Border backdrop)
                backdrop.Clip = new RectangleGeometry { Rect = new Rect(0, 0, hero.ActualWidth, 360) };
            var video = hero.Children.OfType<MediaPlayerElement>().FirstOrDefault(element => element.Visibility == Visibility.Visible);
            contents.Width = Math.Min(640, Math.Max(240, hero.ActualWidth - (video is null ? 0 : video.Width + 36)));
            hero.Clip = new RectangleGeometry { Rect = new Rect(0, 0, hero.ActualWidth, 360) };
        };
        AddVideoBackground(game, hero, banner, accentOverlay);
        if (heroImages.Length > 1 && game.BackgroundVideo.Length == 0)
        {
            var pause = new Button { Content = new SymbolIcon(heroPaused ? Symbol.Play : Symbol.Pause), Margin = new Thickness(16),
                HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Bottom };
            AutomationProperties.SetName(pause, Locale.T(heroPaused ? "Resume" : "Pause"));
            pause.Click += (_, _) => { heroPaused = !heroPaused; pause.Content = new SymbolIcon(heroPaused ? Symbol.Play : Symbol.Pause);
                AutomationProperties.SetName(pause, Locale.T(heroPaused ? "Resume" : "Pause")); };
            hero.Children.Add(pause);
        }
        DetailContent.Children.Add(hero);
        var body = new Grid { ColumnSpacing = 24, RowSpacing = 24 };
        var main = new StackPanel { Spacing = 16 }; var information = new StackPanel { Spacing = 16 };
        body.Children.Add(main); body.Children.Add(information);
        void ArrangeBody()
        {
            var wide = body.ActualWidth >= 1056;
            body.ColumnDefinitions.Clear(); body.RowDefinitions.Clear();
            body.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(wide ? 2 : 1, GridUnitType.Star) });
            if (wide) body.ColumnDefinitions.Add(new ColumnDefinition());
            else { body.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); body.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); }
            Grid.SetColumn(information, wide ? 1 : 0); Grid.SetRow(information, wide ? 0 : 1);
        }
        body.SizeChanged += (_, _) => ArrangeBody(); ArrangeBody();
        var pictures = game.Screenshots.Length > 0 ? game.Screenshots : game.Store.At("screenshots").Items()
            .Select(x => Urls.Image(x is JsonObject ? x.S("url") : x.S())).Where(x => x is not null).Select(x => x!).ToArray();
        if (pictures.Length > 0 || game.Trailer.Length > 0)
        {
            var media = new StackPanel { Spacing = 16 };
            var strip = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 16 };
            for (var i = 0; i < pictures.Length; i++)
            {
                var index = i; var image = new Image { Width = 320, Height = 180, Stretch = Stretch.UniformToFill };
                SetImage(image, pictures[i]); var button = new Button { Content = image, Padding = new Thickness(0) };
                AutomationProperties.SetName(button, Locale.T("Screenshots") + " " + (i + 1));
                button.Click += async (_, _) => await Guard(() => Gallery(pictures, index)); strip.Children.Add(button);
            }
            media.Children.Add(new ScrollViewer { Content = strip, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
                VerticalScrollBarVisibility = ScrollBarVisibility.Disabled, HorizontalScrollMode = ScrollMode.Enabled });
            if (game.Trailer.Length > 0) media.Children.Add(Action("Watch trailer", () => { DesktopIntegration.Open(game.Trailer); return Task.CompletedTask; }));
            main.Children.Add(Section("Screenshots", media));
        }
        if (game.Description.Length > 0) main.Children.Add(Section("About this game", Text(game.Description)));
        var meta = new StackPanel { Spacing = 12 };
        foreach (var (key, field) in new[] { ("Genres", "genres"), ("Developer", "developer"), ("Publisher", "publisher"),
            ("Release date", "releaseDate"), ("Version", "version"), ("Age rating", "ageRating") })
        {
            var value = game.Data.At(field);
            var text = value is JsonArray array ? string.Join(", ", array.Items().Select(x => x.S())) : value.S();
            if (field == "releaseDate") text = FormatDate(text);
            if (text.Length == 0) continue;
            var row = new StackPanel { Spacing = 4 };
            row.Children.Add(new TextBlock { Text = Locale.T(key), Style = (Style)Application.Current.Resources["CaptionTextBlockStyle"] });
            row.Children.Add(Text(text)); meta.Children.Add(row);
        }
        var times = storage.Read("playtime.json", new Dictionary<string, double>());
        if (times.GetValueOrDefault(game.Id) > 0) meta.Children.Add(Text(Locale.T("Playtime") + ": " + TimeSpan.FromSeconds(times[game.Id]).ToString(@"hh\:mm")));
        if (meta.Children.Count > 0) information.Children.Add(Section("Additional information", meta));
        AddStoreInformation(game, information);
        var achievementsPanel = new StackPanel { Spacing = 12 }; if (User is not null) main.Children.Add(Section("Achievements", achievementsPanel));
        DetailContent.Children.Add(body);
        if (User is not null) _ = FillAchievements(game.Id, achievementsPanel, detailRevision);
    }
    private async Task VerifyPurchase(Game game)
    {
        if (AllBusy || !await RequireAccount()) return;
        await accountGate.WaitAsync(); commandBusy = true; UpdateBusy();
        try
        {
            await Api.Post("/library/" + Urls.Id(game.Id)); await Refresh();
            if (Catalog.FirstOrDefault(x => x.Id == game.Id) is { } current) await LoadDetail(current);
        }
        finally { commandBusy = false; UpdateBusy(); RefreshGameActions(); accountGate.Release(); }
    }
    private async Task FillAchievements(string id, StackPanel panel, int revision)
    {
        try
        {
            var data = await Api.Get("/platform/achievements/" + Urls.Id(id));
            if (revision != detailRevision) return;
            foreach (var a in data.Items())
            {
                var unlocked = a.At("unlocked_at", "unlockedAt") is not null;
                var title = a.B("hidden") && !unlocked ? Locale.T("Hidden achievement") : a.S("title");
                panel.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"],
                    Child = Text(title + "\n" + (a.B("hidden") && !unlocked ? "" : a.S("description")) +
                    "\n" + Locale.T(unlocked ? "Unlocked" : "Locked") + " · " + a.L("points")) });
            }
            if (panel.Children.Count == 0) panel.Children.Add(Text(Locale.T("No achievements yet.")));
        }
        catch (Exception ex) { if (revision == detailRevision) panel.Children.Add(Text(Locale.Error(ex))); }
    }
    private async Task Gallery(string[] images, int index)
    {
        var viewer = CreateGallery(images, index);
        await viewer.ShowAsync();
    }
    private async Task Uninstall(Game game)
    {
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = Root.RequestedTheme,
            Title = Locale.T("Uninstall") + " " + game.Title, Content = Locale.T("Uninstall this game?"),
            PrimaryButtonText = Locale.T("Uninstall"), CloseButtonText = Locale.T("Cancel") };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        await accountGate.WaitAsync();
        try
        {
            commandBusy = true; UpdateBusy();
            await Api.TrustedGame(game.Id, game.Slug);
            await installs.Uninstall(game.Id, id => Games.Busy(id) || downloads.Busy(id));
            DesktopIntegration.RemoveShortcuts(game.Id); await Refresh(); RenderDetail(game);
        }
        finally { commandBusy = false; UpdateBusy(); RefreshGameActions(); accountGate.Release(); }
    }
    private void RenderDownloads()
    {
        DownloadRows.Children.Clear();
        var jobs = downloads.Jobs.Where(x => x.Status != "complete" ||
            (x.CompletedAt is { } completed && DateTimeOffset.UtcNow - completed < TimeSpan.FromSeconds(2))).ToArray();
        var activeCount = jobs.Count(x => downloads.Busy(x.Id));
        DownloadsItem.InfoBadge = activeCount > 0 ? new InfoBadge { Value = activeCount } : null;
        if (jobs.Length == 0) { DownloadRows.Children.Add(Text(Locale.T("No downloads yet."))); return; }
        foreach (var job in jobs)
        {
            var card = new Grid { ColumnSpacing = 16 };
            card.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(140) });
            card.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            var cover = new Grid { Width = 140, Height = 210, Background = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 32, 32, 32)) };
            cover.Background = CenteredArtwork(job.Game.Poster.Length > 0 ? job.Game.Poster : job.Game.Cover);
            cover.Clip = new RectangleGeometry { Rect = new Rect(0, 0, 140, 210) };
            if (job.Status is not ("complete" or "cancelled" or "failed"))
            {
                cover.Children.Add(new Border { Background = new SolidColorBrush(Windows.UI.Color.FromArgb(190, 0, 0, 0)) });
                var percent = job.Status is "extracting" or "committing" ? 96 : (int)Math.Clamp(job.Percent, 0, 95);
                cover.Children.Add(CircularProgress(percent));
            }
            var artworkColumn = new StackPanel { Width = 140, Spacing = 6 };
            artworkColumn.Children.Add(cover);
            if (job.Status == "complete")
                artworkColumn.Children.Add(new Border
                {
                    Background = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 132, 216, 0)),
                    CornerRadius = new CornerRadius(8), Padding = new Thickness(8, 5, 8, 5),
                    Child = new TextBlock { Text = Locale.T("Installed"), FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
                        Foreground = new SolidColorBrush(Microsoft.UI.Colors.Black), HorizontalAlignment = HorizontalAlignment.Center }
                });
            card.Children.Add(artworkColumn);
            var content = new StackPanel { Spacing = 10, VerticalAlignment = VerticalAlignment.Center, MinWidth = 0 };
            content.Children.Add(Text(job.Game.Title, 22, true));
            var status = Locale.T(job.Status switch { "queued" => "Queued", "paused" => "Paused", "complete" => "Installed",
                "extracting" => "Extracting…", "committing" => "Installing…", "cancelled" => "Cancelled", "failed" => "Failed", _ => "Downloading…" });
            content.Children.Add(Text(job.Status == "complete" ? Locale.T("Installed") : status + " · " + Bytes(job.Received) + " / " + Bytes(job.Total)));
            content.Children.Add(new ProgressBar { Minimum = 0, Maximum = 100,
                Value = job.Status == "complete" ? 100 : job.Status is "extracting" or "committing" ? 96 : job.Percent });
            if (job.Error is not null && job.Status == "failed") content.Children.Add(Text(Locale.Error(job.Error)));
            var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
            if (job.Status is "queued" or "downloading") actions.Children.Add(Action("Pause", () => { downloads.Pause(job.Id); return Task.CompletedTask; }));
            if (job.Status is "paused" or "failed") actions.Children.Add(Action(job.Status == "paused" ? "Resume" : "Retry", () => { downloads.Resume(job.Id); return Task.CompletedTask; }));
            if (job.Status is not ("complete" or "cancelled" or "committing")) actions.Children.Add(Action("Cancel", () => { downloads.Cancel(job.Id); return Task.CompletedTask; }));
            content.Children.Add(actions); Grid.SetColumn(content, 1); card.Children.Add(content);
            DownloadRows.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"], Padding = new Thickness(16), Child = card });
        }
    }
    private Grid CircularProgress(int value)
    {
        value = Math.Clamp(value, 0, 99);
        const double size = 76, center = 38, radius = 33;
        var canvas = new Grid { Width = size, Height = size, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        canvas.Children.Add(new Microsoft.UI.Xaml.Shapes.Ellipse
        {
            Width = size, Height = size, StrokeThickness = 4,
            Stroke = new SolidColorBrush(Windows.UI.Color.FromArgb(110, 255, 255, 255)),
            Fill = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0))
        });
        if (value > 0)
        {
            var angle = value / 100d * 2 * Math.PI;
            var end = new Point(center + radius * Math.Sin(angle), center - radius * Math.Cos(angle));
            var figure = new Microsoft.UI.Xaml.Media.PathFigure { StartPoint = new Point(center, center - radius), IsClosed = false };
            figure.Segments.Add(new Microsoft.UI.Xaml.Media.ArcSegment
            {
                Point = end, Size = new Size(radius, radius), IsLargeArc = value > 50,
                SweepDirection = Microsoft.UI.Xaml.Media.SweepDirection.Clockwise
            });
            var geometry = new Microsoft.UI.Xaml.Media.PathGeometry(); geometry.Figures.Add(figure);
            canvas.Children.Add(new Microsoft.UI.Xaml.Shapes.Path
            {
                Data = geometry, StrokeThickness = 5,
                StrokeStartLineCap = Microsoft.UI.Xaml.Media.PenLineCap.Round,
                StrokeEndLineCap = Microsoft.UI.Xaml.Media.PenLineCap.Round,
                Stroke = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 132, 216, 0))
            });
        }
        canvas.Children.Add(new TextBlock { Text = value + "%", FontSize = 16, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
            HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center });
        return canvas;
    }
    internal string FormatDate(string value, bool includeTime = false)
    {
        if (!DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var date)) return value;
        var culture = CultureInfo.GetCultureInfo(Locale.Language == "en" ? "en-US" : Locale.Language == "es" ? "es-ES" : "pt-BR");
        return date.ToLocalTime().ToString(includeTime ? "g" : "d", culture);
    }
    private async Task LaunchWithSequence(Game game)
    {
        if (Games.Busy(game.Id) || !await RequireAccount()) return;
        if (!AppWindow.IsVisible || NativeWindow.Minimized(WinRT.Interop.WindowNative.GetWindowHandle(this)))
            RestoreFromTray();
        await Guard(() => Games.Launch(game));
    }
    private static string Bytes(long value) => value >= 1073741824 ? (value / 1073741824.0).ToString("0.0") + " GB" :
        value >= 1048576 ? (value / 1048576.0).ToString("0.0") + " MB" : value >= 1024 ? (value / 1024.0).ToString("0") + " KB" : value + " B";
    private bool AllBusy => Games.AnyBusy || downloads.AnyBusy || commandBusy || connecting || authenticating || refreshing;
    private void UpdateBusy()
    {
        if (!ready) return;
        LogoutButton.IsEnabled = !AllBusy; ItchButton.IsEnabled = !AllBusy && (User is null || itchConfigured || itchConnected); UpdateButton.IsEnabled = !AllBusy;
        if (!native.Register(OverlayToggle.IsOn && Games.Running.Length > 0, OverlayShortcut)) Notify(Locale.Error("SHORTCUT_INVALID"));
    }
    private async void ItchClick(object sender, RoutedEventArgs e)
    {
        if (AllBusy || !await RequireAccount()) return; await accountGate.WaitAsync(); connecting = true; UpdateBusy();
        try
        {
            var connection = await Api.Get("/integrations/itch");
            if (connection.B("connected"))
            { await Api.Delete("/integrations/itch"); await Refresh(); return; }
            var n = await Api.Post("/integrations/itch/connect", new { client = "launcher", locale = Locale.Language });
            var url = Urls.ItchOAuth(n.S("authorizeUrl")) ?? throw new LauncherException("INVALID_RESPONSE");
            DesktopIntegration.Open(url.AbsoluteUri); ItchButton.Content = Locale.T("Connecting…");
            var until = DateTimeOffset.UtcNow.AddMinutes(2);
            while (DateTimeOffset.UtcNow < until)
            {
                await Task.Delay(4000); var state = await Api.Get("/integrations/itch");
                if (!state.B("connected")) continue;
                await Api.Post("/library/sync"); await Refresh(); return;
            }
            throw new LauncherException("ITCH_LINK_EXPIRED");
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { connecting = false; UpdateBusy(); accountGate.Release(); }
    }
    private void LanguageChanged(object sender, SelectionChangedEventArgs e)
    {
        if (!ready || changingLanguage || ((ComboBox)sender).SelectedItem is not ComboBoxItem item) return;
        Locale.Language = (string)item.Tag; storage.Write("winui-language.json", Locale.Language);
        ApplyLanguage(); if (selected is not null) RenderDetail(selected); else ShowPage();
        UI(Refresh);
    }
    private void ApplyLanguage()
    {
        changingLanguage = true;
        try
        {
            foreach (var combo in new[] { LoginLanguage, SettingsLanguage })
                combo.SelectedIndex = Locale.Language == "pt-BR" ? 0 : Locale.Language == "en" ? 1 : 2;
            Translate(Root);
            ExploreItem.Content = Locale.T("Explore"); LibraryItem.Content = Locale.T("Library"); DownloadsItem.Content = Locale.T("Downloads");
            WishlistItem.Content = Locale.T("Wishlist"); NewsItem.Content = Locale.T("Newswire");
            SignInMenuItem.Text = Locale.T("Sign in"); AccountMenuItem.Text = Locale.T("My account"); UpdateAccount();
            LogoutButton.Text = Locale.T("Sign out"); WebsiteMenuItem.Text = Locale.T("Website");
            FeaturedButton.Content = Locale.T("View details");
            OverlayToggle.OnContent = Locale.T("On"); OverlayToggle.OffContent = Locale.T("Off");
            AppearanceLabels();
            AutomationProperties.SetName(SearchBox, Locale.T("Search games"));
            AutomationProperties.SetName(CollapseButton, Locale.T("Collapse navigation"));
            AutomationProperties.SetName(NavigationCompactCard, Locale.T("Compact navigation layout"));
            AutomationProperties.SetName(NavigationExpandedCard, Locale.T("Expanded navigation layout"));
            EmailBox.Header = Locale.T("Email or username"); PasswordBox.Header = Locale.T("Password");
            CodeBox.Header = Locale.T("Authentication code"); SearchBox.PlaceholderText = Locale.T("Search games");
            InstalledFilter.Content = Locale.T("Installed only"); LoginLanguage.Header = Locale.T("Language");
            foreach (var item in ThemeChoice.Items.OfType<ComboBoxItem>())
                item.Content = Locale.T(item.Tag?.ToString() switch { "dark" => "Dark", "light" => "Light", _ => "Use system setting" });
            foreach (var item in NavigationChoice.Items.OfType<ComboBoxItem>())
                item.Content = Locale.T(item.Tag?.ToString() switch { "compact" => "Compact", _ => "Expanded" });
        }
        finally { changingLanguage = false; }
    }
    private void Translate(DependencyObject node)
    {
        if (node is FrameworkElement element && element.Tag is string key && Locale.HasKey(key))
        {
            var translated = Locale.T(key);
            if (node is TextBlock textBlock) textBlock.Text = translated;
            else if (node is ButtonBase button && button.Content is string) button.Content = translated;
            else if (node is TextBox textBox && textBox.Header is string) textBox.Header = translated;
            else if (node is PasswordBox passwordBox && passwordBox.Header is string) passwordBox.Header = translated;
            else if (node is ComboBox comboBox && comboBox.Header is string) comboBox.Header = translated;
            else if (node is ToggleSwitch toggleSwitch && toggleSwitch.Header is string) toggleSwitch.Header = translated;
            if (!string.IsNullOrWhiteSpace(AutomationProperties.GetName(element)))
                AutomationProperties.SetName(element, translated);
        }
        if (node is ToggleSwitch toggle)
        {
            toggle.OnContent = Locale.T("On");
            toggle.OffContent = Locale.T("Off");
        }
        if (node is Panel panel) { foreach (var child in panel.Children) Translate(child); return; }
        if (node is Border border && border.Child is { } childBorder) { Translate(childBorder); return; }
        if (node is NavigationView navigation && navigation.Content is DependencyObject navContent) { Translate(navContent); return; }
        if (node is ContentControl control && control.Content is DependencyObject content) { Translate(content); return; }
        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(node); i++) Translate(VisualTreeHelper.GetChild(node, i));
    }
    private void OverlayToggled(object sender, RoutedEventArgs e)
    {
        if (!ready) return;
        storage.Write("game-view.json", new { enabled = OverlayToggle.IsOn, shortcut = OverlayShortcut });
        if (!OverlayToggle.IsOn) overlay?.Hide(true); UpdateBusy();
    }
    private void ToggleOverlay()
    {
        try
        {
            if (!OverlayToggle.IsOn || Games.Running.Length == 0) return;
            if (!GameIsFocused) { overlay?.Hide(true); return; }
            overlay ??= new GameViewWindow(this);
            if (overlay.IsOpen) overlay.Hide(true); else overlay.Show();
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); storage.Log("OVERLAY_UNAVAILABLE"); }
    }
    private void ShowAchievement(JsonNode achievement)
    {
        Notify(Locale.T("Achievement unlocked") + ": " + achievement.S("title"), InfoBarSeverity.Success);
        if (!Preferences.AchievementToasts) return;
        var toast = new AchievementWindow(this, Locale.T("Achievement unlocked"), achievement.S("title"));
        toast.ShowOn(Games.Running.FirstOrDefault()?.Process.MainWindowHandle ?? IntPtr.Zero);
    }
    private void OpenGamesClick(object sender, RoutedEventArgs e) =>
        Process.Start(new ProcessStartInfo("explorer.exe", "\"" + storage.Games + "\"") { UseShellExecute = true });
    private async void UpdateClick(object sender, RoutedEventArgs e)
    {
        if (AllBusy) return;
        commandBusy = true; UpdateBusy();
        try
        {
            if (DesktopIntegration.Packaged)
            { Notify(Locale.T("Updates are managed by App Installer or Microsoft Store."), InfoBarSeverity.Informational); return; }
            var update = await updater.Check();
            if (update is null) { Notify(Locale.T("No update available."), InfoBarSeverity.Informational); return; }
            var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = Root.RequestedTheme,
                Title = Locale.T("Update available") + " " + update.Version, Content = update.Notes,
                PrimaryButtonText = Locale.T("Update"), CloseButtonText = Locale.T("Cancel") };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            var file = await updater.Download(update);
            updater.Install(file, update.Sha256);
            commandBusy = false; exiting = true; Close();
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { commandBusy = false; UpdateBusy(); }
    }
    private async Task ConfirmClose()
    {
        if (closeDialog) return; closeDialog = true;
        try
        {
        if (Games.AnyBusy || commandBusy)
        { Notify(Locale.T("Close running games before exiting the launcher.")); return; }
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = Root.RequestedTheme,
            Title = Locale.T("Downloads in progress"), Content = Locale.T("Cancel downloads and exit?"),
            PrimaryButtonText = Locale.T("Exit"), CloseButtonText = Locale.T("Cancel") };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        foreach (var j in downloads.Jobs) downloads.Cancel(j.Id);
        while (downloads.Jobs.Any(x => downloads.Busy(x.Id))) await Task.Delay(100);
        exiting = true; Close();
        } finally { closeDialog = false; }
    }
    public void HandleActivation(AppActivationArguments args)
    {
        Activate();
        var value = args.Data is ProtocolActivatedEventArgs protocol ? protocol.Uri.AbsoluteUri :
            args.Data is Windows.ApplicationModel.Activation.LaunchActivatedEventArgs launch ? launch.Arguments :
            string.Join(" ", Environment.GetCommandLineArgs().Skip(1));
        var uri = Regex.Match(value, @"deadsmile://launch/[0-9a-fA-F-]{36}").Value;
        var id = Urls.LaunchId(uri);
        if (id is null)
        {
            var argument = Regex.Match(value, @"--launch-game\s+([0-9a-fA-F-]{36})").Groups[1].Value;
            if (Guid.TryParse(argument, out var parsed)) id = parsed.ToString();
        }
        if (id is null) return;
        var game = Catalog.FirstOrDefault(x => x.Id == id);
        if (User is null || game is null) { pendingLaunch = id; return; }
        UI(() => LaunchWithSequence(game));
    }
}

