using System.Diagnostics;
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
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.Windows.AppLifecycle;
using Windows.ApplicationModel.Activation;
using Windows.Foundation;
using Windows.System;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow : Window
{
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
    private readonly UpdateService updater;
    private GameViewWindow? overlay;
    private Game? selected;
    private string page = "explore";
    public string OverlayShortcut { get; private set; } = "Control+D";
    private bool ready, refreshing, refreshAgain, twoFactor, authenticating, changingLanguage, connecting, commandBusy, closeDialog, itchConfigured, itchConnected;
    private int downloadDirty = 1, detailRevision;
    private string? pendingLaunch;
    private Image? heroImage;
    private string[] heroImages = [];
    private int heroIndex;
    private bool heroPaused;
    private readonly SemaphoreSlim accountGate = new(1, 1);
    public MainWindow()
    {
        InitializeComponent();
        storage = new Storage();
        Locale.Language = storage.Read("winui-language.json", "pt-BR");
        if (Locale.Language is not ("pt-BR" or "en" or "es")) Locale.Language = "pt-BR";
        var sessions = new SessionStore(storage);
        Api = new ApiClient(Locale, sessions.Load(), sessions.Save);
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
        Api.Invalidated += () => UI(() => { User = null; live.Stop(); achievements.Stop(); ShowLogin(); return Task.CompletedTask; });
        saves.Conflict += _ => UI(() => { Notify(Locale.Error("SAVE_CONFLICT")); return Task.CompletedTask; });
        Games.Failed += ex => UI(() => { Notify(Locale.Error(ex)); return Task.CompletedTask; });
        Games.Changed += () => UI(() => { UpdateBusy(); RefreshGameActions(); return Task.CompletedTask; });
        achievements.Unlocked += (_, achievement) => UI(() => { ShowAchievement(achievement); return Task.CompletedTask; });
        downloads.Changed += () => Interlocked.Exchange(ref downloadDirty, 1);
        downloads.Installed += (install, game) => UI(async () =>
        {
            try { DesktopIntegration.Shortcut(install, game); } catch { Notify(Locale.Error("GAME_SHORTCUT_CREATE_FAILED")); }
            await Refresh(); RefreshGameActions();
        });
        live.Changed += () => UI(Refresh);
        downloadTimer = DispatcherQueue.CreateTimer(); downloadTimer.Interval = TimeSpan.FromMilliseconds(250);
        downloadTimer.Tick += (_, _) => { if (Interlocked.Exchange(ref downloadDirty, 0) != 0) { RenderDownloads(); UpdateBusy(); } };
        downloadTimer.Start();
        heroTimer = DispatcherQueue.CreateTimer(); heroTimer.Interval = TimeSpan.FromSeconds(5);
        heroTimer.Tick += (_, _) =>
        {
            if (heroPaused || heroImages.Length < 2 || heroImage is null || !AppWindow.IsVisible ||
                !new Windows.UI.ViewManagement.UISettings().AnimationsEnabled) return;
            heroIndex = (heroIndex + 1) % heroImages.Length; SetImage(heroImage, heroImages[heroIndex]);
        };
        heroTimer.Start();
        AppWindow.SetIcon(Path.Combine(AppContext.BaseDirectory, "Assets", "Icon.ico"));
        AppWindow.Resize(new Windows.Graphics.SizeInt32(1271, 796));
        ExtendsContentIntoTitleBar = true; SetTitleBar(TitleDrag);
        if (AppWindowTitleBar.IsCustomizationSupported())
        { AppWindow.TitleBar.ButtonBackgroundColor = Colors.Black; AppWindow.TitleBar.ButtonForegroundColor = Colors.White; }
        AppWindow.Closing += (_, args) =>
        {
            if (Games.AnyBusy || downloads.AnyBusy || commandBusy)
            { args.Cancel = true; UI(ConfirmClose); }
        };
        Closed += (_, _) =>
        {
            live.Dispose(); achievements.Stop(); downloads.Dispose(); native.Dispose(); overlay?.Close();
            downloadTimer.Stop(); heroTimer.Stop(); Api.Dispose();
        };
        VersionLabel.Text = "Deadsmile Games Launcher " + BuildInfo.Version;
        ready = true;
        OverlayShortcut = storage.Read("game-view.json", new JsonObject()).S("shortcut");
        if (string.IsNullOrWhiteSpace(OverlayShortcut)) OverlayShortcut = "Control+D";
        OverlayToggle.IsOn = storage.Read("game-view.json", new JsonObject()).B("enabled") ||
            !File.Exists(storage.FilePath("game-view.json"));
        ApplyLanguage();
        Root.Loaded += async (_, _) => await Boot();
        DesktopIntegration.RegisterProtocol();
    }
    private void UI(Func<Task> action) => DispatcherQueue.TryEnqueue(async () =>
    { try { await action(); } catch (Exception ex) { Notify(Locale.Error(ex)); storage.Log(ex is LauncherException le ? le.Code : "UI_OPERATION_FAILED"); } });
    private async Task Guard(Func<Task> action)
    { try { await action(); } catch (Exception ex) { Notify(Locale.Error(ex)); storage.Log(ex is LauncherException le ? le.Code : "UI_OPERATION_FAILED"); } }
    private void Notify(string text, InfoBarSeverity severity = InfoBarSeverity.Warning)
    { Notice.Message = text; Notice.Severity = severity; Notice.IsOpen = true; }
    private async Task Boot()
    {
        try { User = await Api.Get("/auth/me"); if (User is null) throw new LauncherException("INVALID_RESPONSE"); await Enter(); }
        catch (LauncherException ex) when (ex.Status == 401) { ShowLogin(); }
        catch (Exception ex) { ShowLogin(); LoginError.Message = Locale.Error(ex); LoginError.IsOpen = true; }
    }
    private void ShowLogin()
    {
        BootPanel.Visibility = Visibility.Collapsed; Shell.Visibility = Visibility.Collapsed; LoginPanel.Visibility = Visibility.Visible;
        selected = null; detailRevision++; twoFactor = false; PasswordBox.Password = ""; CodeBox.Text = "";
        CredentialsPanel.Visibility = Visibility.Visible; CodeBox.Visibility = Visibility.Collapsed;
        LoginBackButton.Visibility = Visibility.Collapsed; ResendButton.Visibility = Visibility.Collapsed; LoginButton.Content = Locale.T("Sign in");
        overlay?.Hide();
    }
    private async Task Enter()
    {
        BootPanel.Visibility = Visibility.Collapsed; LoginPanel.Visibility = Visibility.Collapsed; Shell.Visibility = Visibility.Visible;
        Username.Text = User.S("username"); Avatar.DisplayName = Username.Text;
        if (Urls.Https(User.S("avatarUrl")) is { } avatar) Avatar.ProfilePicture = new BitmapImage(avatar);
        PasswordBox.Password = ""; CodeBox.Text = ""; LoginError.IsOpen = false;
        await Refresh(); live.Start(); achievements.Start(User.S("id"));
        if (pendingLaunch is { } id)
        { pendingLaunch = null; var game = Catalog.FirstOrDefault(x => x.Id == id); if (game is not null) await Guard(() => Games.Launch(game)); }
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
                twoFactor = true; LoginBackButton.Visibility = Visibility.Visible; CredentialsPanel.Visibility = Visibility.Collapsed; CodeBox.Visibility = Visibility.Visible;
                CodeBox.Text = ""; CodeBox.Focus(FocusState.Programmatic); LoginButton.Content = Locale.T("Verify");
            }
            else { User = await Api.Get("/auth/me"); await Enter(); }
        }
        catch (Exception ex)
        {
            LoginError.Message = Locale.Error(ex); LoginError.IsOpen = true;
            ResendButton.Visibility = ex is LauncherException { Code: "EMAIL_NOT_VERIFIED" } ? Visibility.Visible : Visibility.Collapsed;
        }
        finally { authenticating = false; LoginButton.IsEnabled = true; }
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
        twoFactor = false; CodeBox.Text = ""; CodeBox.Visibility = Visibility.Collapsed;
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
            await Api.Post("/auth/logout"); Api.ClearSession(); User = null; live.Stop(); achievements.Stop(); Catalog = []; GameGrid.ItemsSource = null; ShowLogin();
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { accountGate.Release(); }
    }
    private async Task Refresh()
    {
        if (User is null) return;
        if (refreshing) { refreshAgain = true; return; }
        var user = User.S("id"); refreshing = true; BusyRing.IsActive = true; UpdateBusy();
        try
        {
            var connection = await Api.Get("/integrations/itch");
            itchConfigured = connection.B("configured"); itchConnected = connection.B("connected");
            ItchStatus.Text = Locale.T(connection.B("connected") ? "Connected to itch.io" : "Connect itch.io to sync purchased games.");
            ItchButton.Tag = connection.B("connected"); ItchButton.Content = Locale.T(connection.B("connected") ? "Disconnect itch.io" : "Connect itch.io");
            ItchButton.IsEnabled = connection.B("configured") || connection.B("connected");
            var data = await Api.Get("/library/catalog");
            var catalog = data.At("items").Items().Where(x => Guid.TryParse(x.S("id"), out _)).Select(x => new Game(x)).ToArray();
            if (User.S("id") != user) return;
            await installs.Refresh(catalog, id => Games.Busy(id) || downloads.Busy(id));
            Catalog = catalog; RenderCatalog();
        }
        finally { refreshing = false; BusyRing.IsActive = false; UpdateBusy();
            if (refreshAgain) { refreshAgain = false; UI(Refresh); } }
    }
    private async void RefreshClick(object sender, RoutedEventArgs e) => await Guard(Refresh);
    private void NavigateClick(object sender, RoutedEventArgs e)
    { page = (string)((Button)sender).Tag; selected = null; detailRevision++; ShowPage(); }
    private void BackClick(object sender, RoutedEventArgs e)
    { selected = null; detailRevision++; ShowPage(); }
    private void ShowPage()
    {
        CatalogPanel.Visibility = selected is null && (page is "explore" or "library") ? Visibility.Visible : Visibility.Collapsed;
        DetailPanel.Visibility = selected is not null ? Visibility.Visible : Visibility.Collapsed;
        DownloadsPanel.Visibility = selected is null && page == "downloads" ? Visibility.Visible : Visibility.Collapsed;
        SettingsPanel.Visibility = selected is null && page == "settings" ? Visibility.Visible : Visibility.Collapsed;
        BackButton.Visibility = selected is null ? Visibility.Collapsed : Visibility.Visible;
        PageHeading.Text = selected?.Title ?? Locale.T(page switch { "library" => "Library", "downloads" => "Downloads", "settings" => "Settings", _ => "Explore" });
        foreach (var item in Navigation.Children.OfType<Button>())
            item.Background = new SolidColorBrush((string)item.Tag == page ? Windows.UI.Color.FromArgb(255, 41, 41, 41) : Colors.Transparent);
        RenderCatalog(); RenderDownloads();
    }
    private void RenderCatalog()
    {
        var query = SearchBox.Text.Trim();
        var items = Catalog.Where(x => (page != "library" || x.InLibrary) &&
            (!(InstalledFilter.IsChecked ?? false) || installs.Installed.ContainsKey(x.Id)) &&
            (x.Title + " " + x.Genres).Contains(query, StringComparison.CurrentCultureIgnoreCase)).ToArray();
        GameGrid.ItemsSource = items;
        EmptyCatalog.Text = Locale.T(page == "library" ? "Your library is empty." : "No games found.");
        EmptyCatalog.Visibility = items.Length == 0 ? Visibility.Visible : Visibility.Collapsed;
    }
    private void SearchChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args) { if (ready) RenderCatalog(); }
    private void FilterChanged(object sender, RoutedEventArgs e) { if (ready) RenderCatalog(); }
    private async void GameClick(object sender, ItemClickEventArgs e)
    { if (e.ClickedItem is Game game) await LoadDetail(game); }
    private async Task LoadDetail(Game game)
    {
        selected = game; ShowPage(); var revision = ++detailRevision;
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
            DetailContent.Children.Add(Action("Retry", () => LoadDetail(game)));
        }
    }
    private void RefreshGameActions() { if (selected is not null) RenderDetail(selected); }
    private Button Action(string key, Func<Task> callback, bool primary = false)
    {
        var b = new Button { Content = Locale.T(key), Style = (Style)Application.Current.Resources[primary ? "PrimaryButton" : "SecondaryButton"] };
        b.Click += async (_, _) => await Guard(callback); return b;
    }
    private TextBlock Text(string text, double size = 16, bool heading = false) => new()
    { Text = text, FontSize = size, FontFamily = (FontFamily)Application.Current.Resources[heading ? "DisplayFont" : "BodyFont"] };
    private static void SetImage(Image image, string value)
    {
        if (Urls.Https(value) is { } uri) image.Source = uri.AbsolutePath.EndsWith(".svg", StringComparison.OrdinalIgnoreCase) ? new SvgImageSource(uri) : new BitmapImage(uri);
    }
    private async Task Download(Game game)
    {
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
    private void RenderDetail(Game game)
    {
        DetailContent.Children.Clear(); heroImages = game.HeroImages; heroIndex = 0;
        var hero = new Grid { Height = 560, Background = new SolidColorBrush(Colors.Black) };
        heroImage = new Image { Stretch = Stretch.UniformToFill }; SetImage(heroImage, heroImages.FirstOrDefault() ?? "");
        hero.Children.Add(heroImage);
        var shade = new LinearGradientBrush { StartPoint = new Point(0, 0), EndPoint = new Point(1, 0) };
        shade.GradientStops.Add(new GradientStop { Color = Windows.UI.Color.FromArgb(235, 0, 0, 0), Offset = 0 });
        shade.GradientStops.Add(new GradientStop { Color = Windows.UI.Color.FromArgb(120, 0, 0, 0), Offset = 1 });
        hero.Children.Add(new Border { Background = shade });
        var contents = new StackPanel { Spacing = 24, Padding = new Thickness(34), VerticalAlignment = VerticalAlignment.Bottom };
        if (game.ProductIcon.Length > 0)
        {
            var icon = new Image { Width = 140, Height = 140, HorizontalAlignment = HorizontalAlignment.Left };
            SetImage(icon, game.ProductIcon); contents.Children.Add(icon);
        }
        contents.Children.Add(Text(game.Title, 42, true));
        var buttons = new List<Button>();
        var busy = Games.Busy(game.Id) || downloads.Busy(game.Id);
        if (installs.Installed.ContainsKey(game.Id) && game.CanLaunch)
        {
            var play = Action(Games.Busy(game.Id) ? "Running" : "Play", () => Games.Launch(game), true); play.IsEnabled = !busy; buttons.Add(play);
            var update = Action("Check for updates", async () =>
            {
                var remote = await Api.Metadata(game.Id);
                if (Versions.Compare(remote.Version, installs.Installed[game.Id].Version) > 0) await Download(game);
                else Notify(Locale.T("No update available."), InfoBarSeverity.Informational);
            }); update.IsEnabled = !busy; buttons.Add(update);
            var verify = Action("Verify installation", async () =>
            {
                await installs.Refresh(Catalog, id => Games.Busy(id) || downloads.Busy(id));
                Notify(Locale.T(installs.Installed.ContainsKey(game.Id) ? "Installation verified." : "Game installation is unavailable."), InfoBarSeverity.Informational);
            }); verify.IsEnabled = !busy; buttons.Add(verify);
            var remove = Action("Uninstall", () => Uninstall(game)); remove.IsEnabled = !busy; buttons.Add(remove);
        }
        else if (game.DownloadAvailable && (game.CanLaunch || game.Data.S("accessType") == "free"))
        {
            var install = Action("Install", () => Download(game), true); install.IsEnabled = !busy; buttons.Add(install);
        }
        foreach (var offer in game.Data.At("offers").Items())
        {
            if (game.CanLaunch) break;
            var url = Urls.Https(offer.S("href")); var provider = offer.S("provider");
            if (url is null || provider is not ("itch" or "microsoft")) continue;
            if (provider == "itch" && url.Host != "itch.io" && !url.Host.EndsWith(".itch.io")) continue;
            buttons.Add(Action(provider == "itch" ? (game.Data.B("isFree") ? "Get on itch.io" : "Buy on itch.io") : (game.Data.B("isFree") ? "Get on Microsoft Store" : "Buy on Microsoft Store"),
                () => { DesktopIntegration.Open(url.AbsoluteUri); return Task.CompletedTask; }, true));
        }
        if (heroImages.Length > 1)
            buttons.Add(Action("Pause background", () => { heroPaused = !heroPaused; return Task.CompletedTask; }));
        contents.Children.Add(WrapActions(buttons)); hero.Children.Add(contents); DetailContent.Children.Add(hero);
        if (!string.IsNullOrEmpty(game.Description))
        { DetailContent.Children.Add(Text(Locale.T("About this game"), 28, true)); DetailContent.Children.Add(Text(game.Description)); }
        var meta = new StackPanel { Spacing = 10 };
        foreach (var (key, field) in new[] { ("Genres", "genres"), ("Developer", "developer"), ("Publisher", "publisher"),
            ("Release date", "releaseDate"), ("Version", "version"), ("Age rating", "ageRating") })
        {
            var value = game.Data.At(field);
            var text = value is JsonArray array ? string.Join(", ", array.Items().Select(x => x.S())) : value.S();
            if (text.Length > 0) meta.Children.Add(Text(Locale.T(key) + ": " + text));
        }
        var times = storage.Read("playtime.json", new Dictionary<string, double>());
        if (times.GetValueOrDefault(game.Id) > 0) meta.Children.Add(Text(Locale.T("Playtime") + ": " + TimeSpan.FromSeconds(times[game.Id]).ToString(@"hh\:mm")));
        DetailContent.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"], Child = meta });
        AddStoreInformation(game);
        if (game.Screenshots.Length > 0)
        {
            DetailContent.Children.Add(Text(Locale.T("Screenshots"), 28, true));
            var gallery = new GridView { SelectionMode = ListViewSelectionMode.None, IsItemClickEnabled = false };
            for (var i = 0; i < game.Screenshots.Length; i++)
            {
                var index = i; var image = new Image { Width = 300, Height = 169, Stretch = Stretch.UniformToFill };
                SetImage(image, game.Screenshots[i]); var b = new Button { Content = image, Padding = new Thickness(0) };
                b.Click += async (_, _) => await Guard(() => Gallery(game.Screenshots, index)); gallery.Items.Add(b);
            }
            DetailContent.Children.Add(gallery);
        }
        if (game.Trailer.Length > 0) DetailContent.Children.Add(Action("Watch trailer", () => { DesktopIntegration.Open(game.Trailer); return Task.CompletedTask; }));
        var achievementRows = new StackPanel { Spacing = 14 }; DetailContent.Children.Add(Text(Locale.T("Achievements"), 28, true));
        DetailContent.Children.Add(achievementRows); var revision = detailRevision;
        _ = FillAchievements(game.Id, achievementRows, revision);
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
        var image = new Image { Stretch = Stretch.Uniform, MaxHeight = Math.Max(200, Root.XamlRoot.Size.Height - 200) };
        SetImage(image, images[index]);
        var panel = new StackPanel { Spacing = 16, Width = Math.Max(300, Math.Min(1000, Root.XamlRoot.Size.Width - 150)) };
        panel.Children.Add(image);
        var commands = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 16, HorizontalAlignment = HorizontalAlignment.Center };
        foreach (var (title, delta) in new[] { ("Previous", -1), ("Next", 1) })
            commands.Children.Add(Action(title, () => { index = (index + delta + images.Length) % images.Length; SetImage(image, images[index]); return Task.CompletedTask; }));
        panel.Children.Add(commands);
        await new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = ElementTheme.Dark, Content = panel,
            CloseButtonText = Locale.T("Close") }.ShowAsync();
    }
    private async Task Uninstall(Game game)
    {
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = ElementTheme.Dark,
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
        finally { commandBusy = false; UpdateBusy(); accountGate.Release(); }
    }
    private void RenderDownloads()
    {
        DownloadRows.Children.Clear(); var jobs = downloads.Jobs;
        DownloadsLabel.Text = Locale.T("Downloads") + (jobs.Count(x => downloads.Busy(x.Id)) > 0 ? " (" + jobs.Count(x => downloads.Busy(x.Id)) + ")" : "");
        if (jobs.Length == 0) { DownloadRows.Children.Add(Text(Locale.T("No downloads yet."))); return; }
        foreach (var job in jobs)
        {
            var content = new StackPanel { Spacing = 14 };
            content.Children.Add(Text(job.Game.Title, 24, true));
            var status = Locale.T(job.Status switch { "queued" => "Queued", "paused" => "Paused", "complete" => "Installed",
                "extracting" => "Extracting…", "committing" => "Installing…", "cancelled" => "Cancelled", "failed" => "Failed", _ => "Downloading…" });
            content.Children.Add(Text(status + " · " + Bytes(job.Received) + " / " + Bytes(job.Total)));
            content.Children.Add(new ProgressBar { Minimum = 0, Maximum = 100,
                Value = job.Status == "complete" ? 100 : job.Status is "extracting" or "committing" ? 96 : job.Percent });
            if (job.Error is not null && job.Status == "failed") content.Children.Add(Text(Locale.Error(job.Error)));
            var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
            if (job.Status is "queued" or "downloading") actions.Children.Add(Action("Pause", () => { downloads.Pause(job.Id); return Task.CompletedTask; }));
            if (job.Status is "paused" or "failed") actions.Children.Add(Action(job.Status == "paused" ? "Resume" : "Retry", () => { downloads.Resume(job.Id); return Task.CompletedTask; }));
            if (job.Status is not ("complete" or "cancelled" or "committing")) actions.Children.Add(Action("Cancel", () => { downloads.Cancel(job.Id); return Task.CompletedTask; }));
            content.Children.Add(actions);
            DownloadRows.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"], Child = content });
        }
    }
    private static string Bytes(long value) => value >= 1073741824 ? (value / 1073741824.0).ToString("0.0") + " GB" :
        value >= 1048576 ? (value / 1048576.0).ToString("0.0") + " MB" : value >= 1024 ? (value / 1024.0).ToString("0") + " KB" : value + " B";
    private bool AllBusy => Games.AnyBusy || downloads.AnyBusy || commandBusy || connecting || authenticating || refreshing;
    private void UpdateBusy()
    {
        if (!ready) return;
        LogoutButton.IsEnabled = !AllBusy; ItchButton.IsEnabled = !AllBusy && (itchConfigured || itchConnected); UpdateButton.IsEnabled = !AllBusy;
        if (!native.Register(OverlayToggle.IsOn && Games.Running.Length > 0, OverlayShortcut)) Notify(Locale.Error("SHORTCUT_INVALID"));
    }
    private async void ItchClick(object sender, RoutedEventArgs e)
    {
        if (AllBusy) return; await accountGate.WaitAsync(); connecting = true; UpdateBusy();
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
            Translate(Root); EmailBox.Header = Locale.T("Email or username"); PasswordBox.Header = Locale.T("Password");
            CodeBox.Header = Locale.T("Authentication code"); SearchBox.PlaceholderText = Locale.T("Search games");
            InstalledFilter.Content = Locale.T("Installed only"); LoginLanguage.Header = Locale.T("Language");
        }
        finally { changingLanguage = false; }
    }
    private void Translate(DependencyObject node)
    {
        if (node is FrameworkElement { Tag: string key })
        {
            if (node is TextBlock t) t.Text = Locale.T(key);
            if (node is Button b && b.Content is string) b.Content = Locale.T(key);
        }
        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(node); i++) Translate(VisualTreeHelper.GetChild(node, i));
    }
    private void OverlayToggled(object sender, RoutedEventArgs e)
    {
        if (!ready) return;
        storage.Write("game-view.json", new { enabled = OverlayToggle.IsOn, shortcut = OverlayShortcut });
        if (!OverlayToggle.IsOn) overlay?.Hide(); UpdateBusy();
    }
    private void ToggleOverlay()
    {
        try
        {
            if (!OverlayToggle.IsOn || Games.Running.Length == 0) return;
            overlay ??= new GameViewWindow(this);
            if (overlay.AppWindow.IsVisible) overlay.Hide(); else overlay.Show();
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); storage.Log("OVERLAY_UNAVAILABLE"); }
    }
    private void ShowAchievement(JsonNode achievement)
    {
        Notify(Locale.T("Achievement unlocked") + ": " + achievement.S("title"), InfoBarSeverity.Success);
        var toast = new AchievementWindow(Locale.T("Achievement unlocked"), achievement.S("title"));
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
            var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = ElementTheme.Dark,
                Title = Locale.T("Update available") + " " + update.Version, Content = update.Notes,
                PrimaryButtonText = Locale.T("Update"), CloseButtonText = Locale.T("Cancel") };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            var file = await updater.Download(update);
            updater.Install(file);
            commandBusy = false; Close();
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
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = ElementTheme.Dark,
            Title = Locale.T("Downloads in progress"), Content = Locale.T("Cancel downloads and exit?"),
            PrimaryButtonText = Locale.T("Exit"), CloseButtonText = Locale.T("Cancel") };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        foreach (var j in downloads.Jobs) downloads.Cancel(j.Id);
        while (downloads.Jobs.Any(x => downloads.Busy(x.Id))) await Task.Delay(100);
        Close();
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
        UI(() => Games.Launch(game));
    }
}

