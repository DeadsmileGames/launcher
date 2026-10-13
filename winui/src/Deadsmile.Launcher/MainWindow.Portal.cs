using System.Diagnostics;
using System.Net;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Media.Core;
using Windows.Media.Playback;
using Windows.Media.Streaming.Adaptive;
using Windows.Graphics.Imaging;
using Windows.Storage.Streams;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    private bool booting = true;
    private ContentDialog? loginDialog;
    private ContentDialog? accountDialog;
    private ContentDialog? newsDialog;
    private readonly Stack<(string Page, Game? Game)> history = new();
    private JsonNode[] newsItems = [];
    private Action? arrangeNewswire;
    private void PageLayoutSizeChanged(object sender, SizeChangedEventArgs e)
    {
        if (page == "news") arrangeNewswire?.Invoke();
    }
    private readonly List<SearchEntry> searchResults = new();
    private MediaPlayer? bannerPlayer;
    private int pageRevision;
    private string[] quotes = ["Mais uma tentativa. Desta vez vai.", "É perigoso ir sozinho. Leve sua biblioteca.",
        "O próximo checkpoint está logo ali.", "Uma nova aventura espera por você.", "A biblioteca está em outro castelo.",
        "Continue? Claro que sim.", "Pressione iniciar para uma boa história.", "Um pequeno passo, uma grande conquista.",
        "Sem atalhos para a fase final.", "Você encontrou uma área secreta: seus jogos.", "Preparando a próxima missão.",
        "Guarde energia para o chefão.", "Carregando mais uma vida.", "A jornada começa na tela inicial.", "O verdadeiro loot são os jogos que descobrimos."];
    private sealed class SearchEntry(string title, Game? game = null, string? setting = null)
    { public string Title { get; } = title; public Game? Game { get; } = game; public string? Setting { get; } = setting; public override string ToString() => Title; }
    private async Task StartBoot()
    {
        if (booting && BootRing.IsActive && BootRetry.Visibility == Visibility.Collapsed && Catalog.Length > 0) return;
        booting = true; BootPanel.Visibility = Visibility.Visible; Shell.Visibility = Visibility.Collapsed; LoginPanel.Visibility = Visibility.Collapsed;
        BootPanel.Opacity = 1; BootRing.IsActive = true; BootRing.Visibility = Visibility.Visible;
        BootErrorPhrase.Visibility = BootErrorCode.Visibility = BootRetry.Visibility = Visibility.Collapsed;
        SearchBox.Visibility = AccountButton.Visibility = Visibility.Collapsed;
        var watch = Stopwatch.StartNew(); var index = Random.Shared.Next(quotes.Length);
        BootQuote.Text = quotes[index]; var ticker = DispatcherQueue.CreateTimer(); ticker.Interval = TimeSpan.FromMilliseconds(750);
        ticker.Tick += (_, _) => { index = (index + 1) % quotes.Length; BootQuote.Text = quotes[index]; }; ticker.Start();
        try
        {
            try { User = await Api.Get("/auth/me"); }
            catch (LauncherException ex) when (ex.Status == 401) { User = null; Api.ClearSession(); }
            await Refresh(); await LoadNews();
            var remaining = TimeSpan.FromSeconds(3) - watch.Elapsed; if (remaining > TimeSpan.Zero) await Task.Delay(remaining);
            ticker.Stop();
            if (MotionEnabled) { var animation = new FadeOutThemeAnimation(); Storyboard.SetTarget(animation, BootRing); var storyboard = new Storyboard(); storyboard.Children.Add(animation); storyboard.Begin(); await Task.Delay(180); }
            BootPanel.Visibility = Visibility.Collapsed; booting = false; await Enter(true);
            if (MotionEnabled) { var animation = new FadeInThemeAnimation(); Storyboard.SetTarget(animation, Shell); var storyboard = new Storyboard(); storyboard.Children.Add(animation); storyboard.Begin(); }
        }
        catch (Exception ex)
        {
            ticker.Stop(); BootRing.IsActive = false; BootRing.Visibility = Visibility.Collapsed;
            BootErrorPhrase.Text = "Ah sh*t, aqui vamos nós de novo."; BootQuote.Text = "Seu próximo checkpoint pode esperar um instante.";
            BootErrorCode.Text = Locale.T("Error") + ": " + LauncherErrors.Number(ex);
            BootErrorPhrase.Visibility = BootErrorCode.Visibility = BootRetry.Visibility = Visibility.Visible;
            storage.Log("BOOT_" + LauncherErrors.Number(ex)); booting = false;
        }
    }
    private async void BootRetryClick(object sender, RoutedEventArgs e) => await StartBoot();
    private async void GuestSignInClick(object sender, RoutedEventArgs e) => await Guard(async () => { await OpenSignIn(); });
    private async Task<bool> RequireAccount()
    {
        if (User is not null) return true;
        var width = Math.Min(440, Root.XamlRoot.Size.Width - 96);
        var content = new StackPanel { Spacing = 16, Width = width };
        var picture = new Image { Width = width, Height = width * 9 / 16, Stretch = Stretch.UniformToFill };
        try { var launcher = await Api.Get("/launcher"); SetImage(picture, launcher.At("screenshots").Items().FirstOrDefault().S("url")); }
        catch (Exception) { /* Account access remains usable if optional Store artwork is unavailable. */ }
        content.Children.Add(new Border { CornerRadius = new CornerRadius(8), Child = picture });
        content.Children.Add(Text(Locale.T("Keep your library together, sync supported saves and achievements, and manage your games with a Deadsmile Games account.")));
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = UiTheme,
            DefaultButton = ContentDialogButton.Primary, Title = Locale.T("Your next adventure starts here"), Content = new ScrollViewer { Content = content, MaxHeight = Math.Max(140, Root.XamlRoot.Size.Height - 200) }, PrimaryButtonText = Locale.T("Sign in"), CloseButtonText = Locale.T("Cancel") };
        accountDialog = dialog;
        ContentDialogResult choice;
        try { choice = await dialog.ShowAsync(); } finally { accountDialog = null; }
        return choice == ContentDialogResult.Primary && await OpenSignIn();
    }
    private async Task<bool> OpenSignIn()
    {
        if (User is not null) return true;
        if (loginDialog is not null) return false;
        LoginHeading.Text = Locale.T("Sign in"); twoFactor = false; CredentialsPanel.Visibility = Visibility.Visible;
        CodeBox.Visibility = LoginBackButton.Visibility = ResendButton.Visibility = Visibility.Collapsed;
        PasswordBox.Password = CodeBox.Text = ""; LoginButton.Content = Locale.T("Sign in"); LoginError.IsOpen = false;
        LoginPanel.Content = null; LoginLayout.MinHeight = 0; LoginLayout.Padding = new Thickness(0);
        var scroll = new ScrollViewer { Content = LoginLayout, MaxHeight = Math.Max(240, Root.XamlRoot.Size.Height - 180), VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        loginDialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = UiTheme, Content = scroll, CloseButtonText = Locale.T("Cancel") };
        try { await loginDialog.ShowAsync(); return User is not null; }
        finally { loginDialog = null; scroll.Content = null; LoginPanel.Content = LoginLayout; PasswordBox.Password = CodeBox.Text = ""; }
    }
    private void UpdateAccount()
    {
        var loggedIn = User is not null;
        Username.Text = loggedIn ? User.S("username") : Locale.T("Guest"); Avatar.DisplayName = loggedIn ? Username.Text : "";
        AccountActionLabel.Text = loggedIn ? "" : Locale.T("Sign in");
        SignInMenuItem.Visibility = loggedIn ? Visibility.Collapsed : Visibility.Visible;
        LogoutButton.Visibility = loggedIn ? Visibility.Visible : Visibility.Collapsed;
        AccountMenuItem.Visibility = loggedIn ? Visibility.Visible : Visibility.Collapsed;
        Avatar.ProfilePicture = null; if (loggedIn) _ = SetProfilePicture(Avatar, User.S("avatarUrl"));
    }
    internal static async Task SetProfilePicture(PersonPicture picture, string value)
    {
        try
        {
            if (Urls.Image(value) is { } image && Urls.Https(image) is { } uri) { picture.ProfilePicture = new BitmapImage(uri); return; }
            if (!Regex.IsMatch(value, @"^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$", RegexOptions.IgnoreCase) || value.Length > 1000000) return;
            var bytes = Convert.FromBase64String(value[(value.IndexOf(',') + 1)..]);
            using var stream = new InMemoryRandomAccessStream(); using var writer = new DataWriter(stream.GetOutputStreamAt(0));
            writer.WriteBytes(bytes); await writer.StoreAsync(); stream.Seek(0);
            var decoder = await Windows.Graphics.Imaging.BitmapDecoder.CreateAsync(stream);
            if (decoder.PixelWidth > 2048 || decoder.PixelHeight > 2048) return;
            stream.Seek(0); var bitmap = new BitmapImage(); await bitmap.SetSourceAsync(stream); picture.ProfilePicture = bitmap;
        }
        catch (Exception) { picture.ProfilePicture = null; }
    }
    private void RememberPage() { if (!booting) history.Push((page, selected)); if (history.Count > 50) { var keep = history.Take(50).Reverse().ToArray(); history.Clear(); foreach (var item in keep) history.Push(item); } }
    private void NavigateBack()
    {
        var previous = history.Count > 0 ? history.Pop() : ("explore", (Game?)null);
        page = previous.Item1; selected = previous.Item2; detailRevision++; ShowPage(); if (selected is not null) RenderDetail(selected);
    }
    private void CollapseClick(object sender, RoutedEventArgs e) { Shell.IsPaneOpen = !Shell.IsPaneOpen; CollapseLabel.Visibility = Shell.IsPaneOpen ? Visibility.Visible : Visibility.Collapsed; }
    private void SearchSuggestions(string query)
    {
        searchResults.Clear(); query = query.Trim();
        if (query.Length > 0)
        {
            foreach (var game in Catalog.Where(x => x.SearchText.Contains(query, StringComparison.CurrentCultureIgnoreCase)).Take(8))
                searchResults.Add(new SearchEntry(game.Title, game));
            if (searchResults.Count == 0)
            {
                var settings = new[] { "App theme", "Animations", "Language", "DeadBar", "Notifications", "Settings", "Profile", "Newswire", "Support" };
                var matches = settings.Where(key => key.Contains(query, StringComparison.CurrentCultureIgnoreCase) ||
                    Locale.T(key).Contains(query, StringComparison.CurrentCultureIgnoreCase)).ToArray();
                foreach (var key in (matches.Length > 0 ? matches : settings))
                    searchResults.Add(new SearchEntry(Locale.T(key), setting: key));
            }
        }
        SearchBox.ItemsSource = searchResults.ToArray(); SearchBox.IsSuggestionListOpen = searchResults.Count > 0;
    }
    private async Task ChooseSearch(object? value)
    {
        if (value is not SearchEntry entry) return;
        SearchBox.IsSuggestionListOpen = false;
        if (entry.Game is { } game)
        {
            await Guard(() => LoadDetail(game));
            return;
        }
        RememberPage();
        selected = null;
        page = "settings";
        ShowPage();
        SettingsPanel.ChangeView(null, 0, null, true);
        FrameworkElement? target = entry.Setting switch
        {
            "App theme" => ThemeChoice,
            "Animations" => AnimationToggle,
            "Language" => SettingsLanguage,
            "DeadBar" => OverlayToggle,
            "Notifications" => NotificationsToggle,
            "Profile" => ProfileSettingsSection,
            "Newswire" => NewswireToggle,
            "Support" => SupportSection,
            _ => SettingsBody
        };
        target?.StartBringIntoView();
    }
    private async Task LoadNews()
    {
        var list = await Api.Get("/newswire?limit=24&offset=0");
        if (list is not JsonArray) throw new LauncherException("INVALID_RESPONSE"); newsItems = list.Items().Select(x => x.DeepClone()).ToArray();
        HomeNewsRows.Children.Clear();
        foreach (var item in newsItems.Take(2)) HomeNewsRows.Children.Add(NewsCard(item, 300));
        HomeNews.Visibility = page == "explore" && Preferences.ShowNewswireOnHome && newsItems.Length > 0 ? Visibility.Visible : Visibility.Collapsed;
    }
    private Button NewsCard(JsonNode item, double cardWidth = 300)
    {
        cardWidth = Math.Clamp(cardWidth, 240, 420);
        var innerWidth = cardWidth - 24;
        var stack = new StackPanel { Spacing = 10, Width = innerWidth, MinWidth = 0 };
        var image = new Image
        {
            Width = innerWidth, Height = innerWidth * 9 / 16, Stretch = Stretch.UniformToFill,
            HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center
        };
        SetImage(image, Urls.Image(item.S("image", "coverImage", "cover_image")) ?? "");
        stack.Children.Add(new Border
        {
            Width = innerWidth, Height = innerWidth * 9 / 16, CornerRadius = new CornerRadius(8), Child = image
        });
        var title = Text(item.S("title"), 20, true);
        title.MaxLines = 2; title.TextTrimming = TextTrimming.CharacterEllipsis; stack.Children.Add(title);
        if (item.S("excerpt").Length > 0)
        {
            var excerpt = Text(item.S("excerpt"));
            excerpt.MaxLines = 2; excerpt.TextTrimming = TextTrimming.CharacterEllipsis; stack.Children.Add(excerpt);
        }
        var published = item.S("published_at", "publishedAt", "created_at", "createdAt", "date");
        if (published.Length > 0) stack.Children.Add(Text(FormatDate(published), 12));
        var button = new Button
        {
            Content = stack, Width = cardWidth, Height = 390, MinWidth = 0, MaxWidth = cardWidth,
            MinHeight = 390, MaxHeight = 390, HorizontalAlignment = HorizontalAlignment.Stretch,
            HorizontalContentAlignment = HorizontalAlignment.Stretch, VerticalContentAlignment = VerticalAlignment.Top,
            Padding = new Thickness(12)
        };
        button.Click += async (_, _) => await Guard(() => ShowNews(item));
        return button;
    }
    private async Task ShowNews(JsonNode summary)
    {
        var slug = summary.S("slug"); if (!Regex.IsMatch(slug, "^[a-z0-9-]{1,160}$")) throw new LauncherException("INVALID_RESPONSE");
        var item = await Api.Get("/newswire/" + slug);
        var availableWidth = Root.XamlRoot?.Size.Width ?? Root.ActualWidth;
        var width = Math.Max(280, Math.Min(600, availableWidth - 80));
        var body = new StackPanel { Spacing = 12, Width = width };
        body.Children.Add(Text(item.S("title"), 24, true));
        if (item.S("excerpt").Length > 0) body.Children.Add(Text(item.S("excerpt"), 17, true));
        var pictureWidth = Math.Min(width, 480);
        var image = new Image { Width = pictureWidth, Height = pictureWidth * 9 / 16, Stretch = Stretch.UniformToFill,
            HorizontalAlignment = HorizontalAlignment.Center };
        SetImage(image, Urls.Image(item.S("image")) ?? ""); body.Children.Add(image);
        // API HTML is rendered as native text, never evaluated as HTML/XAML.
        var text = Regex.Replace(item.S("body"), @"</(p|div|li|h[1-6])>|<br\s*/?>", "\n\n", RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"<[^>]+>", ""); body.Children.Add(Text(WebUtility.HtmlDecode(text)));
        if (item.S("game_slug").Length > 0 && Catalog.FirstOrDefault(x => x.Slug == item.S("game_slug")) is { } related)
        {
            body.Children.Add(Text(Locale.T("Related game"), 20, true));
            var game = new Button { Content = related.Title, HorizontalAlignment = HorizontalAlignment.Stretch };
            body.Children.Add(game);
            ContentDialog? current = null;
            game.Click += async (_, _) => { current?.Hide(); await Task.Delay(80); await Guard(() => LoadDetail(related)); };
            var viewer = NewsDialog(body, width); current = viewer; newsDialog = viewer;
            try { await viewer.ShowAsync(); } finally { newsDialog = null; } return;
        }
        newsDialog = NewsDialog(body, width); try { await newsDialog.ShowAsync(); } finally { newsDialog = null; }
    }
    private ContentDialog NewsDialog(StackPanel body, double width)
    {
        var viewer = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = UiTheme, CloseButtonText = Locale.T("Close"),
            Content = new ScrollViewer
            {
                Content = new Border { Padding = new Thickness(0, 0, 8, 24), Child = body },
                Height = Math.Max(180, Math.Min(680, Root.XamlRoot.Size.Height - 160)),
                MaxHeight = Math.Max(180, Root.XamlRoot.Size.Height - 128),
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                VerticalScrollMode = ScrollMode.Enabled,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                HorizontalScrollMode = ScrollMode.Disabled
            } };
        viewer.Resources["ContentDialogMaxWidth"] = width + 32; return viewer;
    }
    private async void AccountClick(object sender, RoutedEventArgs e)
    {
        RememberPage(); selected = null; page = "settings"; profileLoaded = false; ShowPage();
        if (User is null) await RequireAccount();
        if (User is not null)
        {
            await LoadProfileSettings();
            ProfileSettingsSection.StartBringIntoView();
        }
    }
    private async Task RenderContentPage()
    {
        var revision = ++pageRevision; var current = page; arrangeNewswire = null; ContentRows.Children.Clear();
        if (current is "wishlist" or "account" && User is null)
        { ContentRows.Children.Add(Text(Locale.T("Sign in to manage your account."))); ContentRows.Children.Add(Action("Sign in", async () => { if (await RequireAccount()) await RenderContentPage(); }, true)); return; }
        if (current == "news")
        {
            var newsGrid = new Grid { HorizontalAlignment = HorizontalAlignment.Stretch, ColumnSpacing = 16, RowSpacing = 18 };
            void ArrangeNews()
            {
                // The ScrollViewer's content can report its extent rather than the host viewport.
                // PageLayout is the window-bound element and changes whenever the native window is resized.
                var viewport = PageLayout.ActualWidth;
                if (viewport <= 0) viewport = ContentPage.ActualWidth;
                var width = Math.Max(260, viewport - 48);
                // 300 DIPs matches a 240-DIP card plus its text/image margins and spacing.
                // This permits three readable cards at a 955-DIP viewport and two at 871 DIPs.
                var columns = Math.Clamp((int)((width + 16) / 300), 1, 4);
                var cellWidth = Math.Clamp((width - 16 * (columns - 1)) / columns, 240, 420);
                newsGrid.Width = width;
                if (newsGrid.ColumnDefinitions.Count != columns)
                {
                    newsGrid.ColumnDefinitions.Clear(); newsGrid.RowDefinitions.Clear();
                    for (var i = 0; i < columns; i++) newsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                    var rows = (newsItems.Length + columns - 1) / columns;
                    for (var i = 0; i < rows; i++) newsGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                    for (var i = 0; i < newsGrid.Children.Count; i++)
                    if (newsGrid.Children[i] is FrameworkElement child)
                    { Grid.SetColumn(child, i % columns); Grid.SetRow(child, i / columns); }
                }
                foreach (var child in newsGrid.Children)
                    if (child is Button button && button.Content is StackPanel stack)
                    {
                        button.Width = cellWidth; button.MaxWidth = cellWidth;
                        stack.Width = cellWidth - 24;
                        if (stack.Children.FirstOrDefault() is Border border && border.Child is Image image)
                        { image.Width = cellWidth - 24; image.Height = (cellWidth - 24) * 9 / 16; border.Width = image.Width; border.Height = image.Height; }
                    }
            }
            foreach (var item in newsItems) newsGrid.Children.Add(NewsCard(item, 300));
            ContentRows.Children.Add(newsGrid);
            arrangeNewswire = ArrangeNews;
            DispatcherQueue.TryEnqueue(ArrangeNews);
            return;
        }
        if (current == "support") { DesktopIntegration.Open(Urls.Website + "/support"); return; }
        ContentRows.Children.Add(new ProgressRing { IsActive = true });
        try
        {
            var data = await Api.Get(current == "wishlist" ? "/wishlist" : "/account");
            if (revision != pageRevision || page != current) return; ContentRows.Children.Clear();
            if (current == "account")
            {
                RememberPage(); selected = null; page = "settings"; profileLoaded = false; ShowPage();
                await LoadProfileSettings(); return;
            }
            if (current == "wishlist")
            {
                wishlistIds.Clear();
                foreach (var wishlistItem in data.Items())
                    if (Guid.TryParse(wishlistItem.S("id", "gameId"), out var parsed)) wishlistIds.Add(parsed.ToString());
                if (!data.Items().Any()) { ContentRows.Children.Add(Text(Locale.T("Your wishlist is empty."))); return; }
                foreach (var item in data.Items())
                {
                    var id = item.S("id", "gameId");
                    var game = Catalog.FirstOrDefault(x => x.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
                    var coverUrl = game is not null ? (game.Poster.Length > 0 ? game.Poster : game.Cover) : Urls.Image(item.S("cover_image", "coverImage"));
                    var card = new Grid { ColumnSpacing = 16 };
                    card.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(112) });
                    card.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                    var cover = new Border
                    {
                        Width = 112, Height = 168, CornerRadius = new CornerRadius(8),
                        Background = CenteredArtwork(coverUrl ?? "")
                    };
                    if (game is not null) cover.ContextFlyout = BuildGameContextFlyout(game);
                    card.Children.Add(cover);
                    var details = new StackPanel { Spacing = 10, VerticalAlignment = VerticalAlignment.Center, MinWidth = 0 };
                    var title = Text(item.S("title", "name", "gameTitle"), 20, true); title.MaxLines = 2; title.TextTrimming = TextTrimming.CharacterEllipsis; details.Children.Add(title);
                    var desc = item.S("short_description", "shortDescription");
                    if (desc.Length > 0) { var summary = Text(desc); summary.MaxLines = 3; summary.TextTrimming = TextTrimming.CharacterEllipsis; details.Children.Add(summary); }
                    if (game is not null) details.Children.Add(Action("View details", () => LoadDetail(game), true));
                    var remove = Action("Already in wishlist · Remove", async () =>
                    {
                        await Api.Delete("/wishlist/" + Urls.Id(id)); wishlistIds.Remove(id);
                        await RenderContentPage(); RefreshGameActions();
                    });
                    details.Children.Add(remove); Grid.SetColumn(details, 1); card.Children.Add(details);
                    ContentRows.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"], Padding = new Thickness(16), Child = card });
                }
                return;
            }
            foreach (var item in data.Items())
            {
                var title = item.S("title"); var row = new StackPanel { Spacing = 8 }; row.Children.Add(Text(title, 20, true));
                var button = new Button { Content = row, HorizontalAlignment = HorizontalAlignment.Stretch, HorizontalContentAlignment = HorizontalAlignment.Stretch };
                if (current == "wishlist")
                {
                    button.Click += async (_, _) => { if (Catalog.FirstOrDefault(x => x.Id == item.S("id")) is { } game) await Guard(() => LoadDetail(game)); };
                    var remove = Action("Remove from wishlist", async () => { await Api.Delete("/wishlist/" + Urls.Id(item.S("id"))); await RenderContentPage(); });
                    var line = new Grid { ColumnSpacing = 16 }; line.ColumnDefinitions.Add(new ColumnDefinition()); line.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                    line.Children.Add(button); Grid.SetColumn(remove, 1); line.Children.Add(remove);
                    ContentRows.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"], Padding = new Thickness(16), Child = line }); continue;
                }
                else { var url = Urls.Https(item.S("video_url", "videoUrl")); button.Click += (_, _) => { if (url is not null) DesktopIntegration.Open(url.AbsoluteUri); }; }
                ContentRows.Children.Add(button);
            }
            if (ContentRows.Children.Count == 0) ContentRows.Children.Add(Text(Locale.T("Nothing here yet.")));
        }
        catch (Exception ex) { if (revision == pageRevision) { ContentRows.Children.Clear(); ContentRows.Children.Add(Text(Locale.Error(ex))); } }
    }
    private async Task ToggleWishlist(Game game)
    {
        if (!await RequireAccount()) return;
        var id = Urls.Id(game.Id);
        if (wishlistIds.Contains(id)) { Notify(Locale.T("Already in wishlist."), InfoBarSeverity.Informational); return; }
        await Api.Post("/wishlist", new { gameId = id });
        wishlistIds.Add(id); RefreshGameActions(); Notify(Locale.T("Added to wishlist."), InfoBarSeverity.Success);
    }
    private void HomeHeroPauseClick(object sender, RoutedEventArgs e)
    {
        homeHeroPaused = !homeHeroPaused;
        if (homeHeroPaused) homeBannerPlayer?.Pause();
        else if (Preferences.VideoBackgrounds && MotionEnabled) homeBannerPlayer?.Play();
        HomeHeroPauseButton.Content = Locale.T(homeHeroPaused ? "Resume" : "Pause");
        AutomationProperties.SetName(HomeHeroPauseButton, Locale.T(homeHeroPaused ? "Resume featured games" : "Pause featured games"));
    }
    private void HomeNewsOpenClick(object sender, RoutedEventArgs e)
    { RememberPage(); selected = null; page = "news"; ShowPage(); }
    private void HomeNewsDisableClick(object sender, RoutedEventArgs e)
    {
        RememberPage(); selected = null; page = "settings"; ShowPage();
        _ = LoadProfileSettings(); NewswireToggle.StartBringIntoView();
        Notify(Locale.T("Turn off Show Newswire on Home in settings."), InfoBarSeverity.Informational);
    }
    private void StopHomeVideo()
    {
        homeMediaRevision++;
        homeVideoGameId = null;
        homeBannerPlayer?.Dispose();
        homeBannerPlayer = null;
        FeaturedVideo.Visibility = Visibility.Collapsed;
    }
    private async Task ConfigureHomeVideo(Game game)
    {
#if UI_VALIDATION
        return;
#else
        if (!Preferences.VideoBackgrounds || !MotionEnabled || game.BackgroundVideo.Length == 0)
        { StopHomeVideo(); return; }
        if (homeVideoGameId == game.Id && homeBannerPlayer is not null) return;
        var revision = ++homeMediaRevision;
        homeVideoGameId = game.Id;
        homeBannerPlayer?.Dispose(); homeBannerPlayer = null;
        FeaturedVideo.Visibility = Visibility.Collapsed;
        try
        {
            if (!Uri.TryCreate(game.BackgroundVideo, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) return;
            MediaSource? source;
            if (uri.AbsolutePath.EndsWith(".mpd", StringComparison.OrdinalIgnoreCase) || uri.AbsolutePath.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase))
            {
                var adaptive = await AdaptiveMediaSource.CreateFromUriAsync(uri);
                if (revision != homeMediaRevision || adaptive.Status != AdaptiveMediaSourceCreationStatus.Success) return;
                adaptive.MediaSource.DesiredMinBitrate = 2_000_000;
                adaptive.MediaSource.InitialBitrate = 4_000_000;
                adaptive.MediaSource.DesiredMaxBitrate = 8_000_000;
                source = MediaSource.CreateFromAdaptiveMediaSource(adaptive.MediaSource);
            }
            else source = MediaSource.CreateFromUri(uri);
            if (revision != homeMediaRevision) { source.Dispose(); return; }
            var player = new MediaPlayer { Source = source, IsMuted = true, IsLoopingEnabled = true };
            homeBannerPlayer = player; FeaturedVideo.SetMediaPlayer(player);
            FeaturedVideo.Visibility = Visibility.Visible;
            FeaturedVideo.Width = HomeHeroSurface.ActualWidth;
            FeaturedVideo.Height = HomeHeroSurface.ActualHeight;
            player.MediaFailed += (_, _) => DispatcherQueue.TryEnqueue(() =>
            { if (revision == homeMediaRevision) FeaturedVideo.Visibility = Visibility.Collapsed; });
            player.Play();
        }
        catch (Exception) { if (revision == homeMediaRevision) FeaturedVideo.Visibility = Visibility.Collapsed; }
#endif
    }
    private static readonly HttpClient ArtworkAccentClient = new() { Timeout = TimeSpan.FromSeconds(4) };

    private static LinearGradientBrush CreateHeroShade(Windows.UI.Color accent)
    {
        var shade = new LinearGradientBrush { StartPoint = new Point(0, 0.5), EndPoint = new Point(1, 0.5) };
        shade.GradientStops.Add(new GradientStop { Color = Windows.UI.Color.FromArgb(232, accent.R, accent.G, accent.B), Offset = 0 });
        shade.GradientStops.Add(new GradientStop { Color = Windows.UI.Color.FromArgb(220, 22, 22, 22), Offset = 0.48 });
        shade.GradientStops.Add(new GradientStop { Color = Windows.UI.Color.FromArgb(45, 15, 15, 15), Offset = 1 });
        return shade;
    }

    private static async Task<Windows.UI.Color?> DetectArtworkAccentAsync(string imageUrl)
    {
#if UI_VALIDATION
        return Windows.UI.Color.FromArgb(255, 74, 49, 40);
#else
        try
        {
            var safe = Urls.Image(imageUrl);
            if (safe is null || Urls.Https(safe) is not { } uri) return null;
            using var response = await ArtworkAccentClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead);
            if (!response.IsSuccessStatusCode || response.Content.Headers.ContentLength is > 4_000_000) return null;
            await using var source = await response.Content.ReadAsStreamAsync();
            using var input = new MemoryStream();
            var buffer = new byte[8192];
            int read;
            while ((read = await source.ReadAsync(buffer)) > 0)
            {
                if (input.Length + read > 4_000_000) return null;
                await input.WriteAsync(buffer.AsMemory(0, read));
            }
            using var stream = new InMemoryRandomAccessStream();
            using (var writer = new DataWriter(stream))
            {
                writer.WriteBytes(input.ToArray());
                await writer.StoreAsync();
                writer.DetachStream();
            }
            stream.Seek(0);
            var decoder = await BitmapDecoder.CreateAsync(stream);
            var transform = new BitmapTransform { ScaledWidth = 48, ScaledHeight = 48 };
            var pixels = (await decoder.GetPixelDataAsync(
                BitmapPixelFormat.Rgba8, BitmapAlphaMode.Ignore, transform,
                ExifOrientationMode.IgnoreExifOrientation, ColorManagementMode.DoNotColorManage)).DetachPixelData();

            var counts = new int[24];
            var red = new long[24]; var green = new long[24]; var blue = new long[24];
            for (var i = 0; i + 3 < pixels.Length; i += 4)
            {
                var r = (int)pixels[i]; var g = (int)pixels[i + 1]; var b = (int)pixels[i + 2];
                var max = Math.Max(r, Math.Max(g, b)); var min = Math.Min(r, Math.Min(g, b));
                var delta = max - min;
                if (max < 50 || max > 245 || delta < 28) continue;
                double hue;
                if (max == r) hue = 60 * (((g - b) / (double)delta) % 6);
                else if (max == g) hue = 60 * (((b - r) / (double)delta) + 2);
                else hue = 60 * (((r - g) / (double)delta) + 4);
                if (hue < 0) hue += 360;
                var bin = Math.Clamp((int)(hue / 15), 0, 23);
                counts[bin]++; red[bin] += r; green[bin] += g; blue[bin] += b;
            }
            var dominant = Array.IndexOf(counts, counts.Max());
            if (dominant < 0 || counts[dominant] < 3) return null;
            return Windows.UI.Color.FromArgb(255, (byte)(red[dominant] / counts[dominant]),
                (byte)(green[dominant] / counts[dominant]), (byte)(blue[dominant] / counts[dominant]));
        }
        catch (Exception) { return null; }
#endif
    }

    private async void ApplyHeroAccentAsync(Game game, Grid hero, Border overlay)
    {
        var revision = detailRevision;
        var accent = await DetectArtworkAccentAsync(game.Cover);
        if (revision != detailRevision || selected?.Id != game.Id || accent is not { } color) return;
        overlay.Background = CreateHeroShade(color);
    }

    private async void AddVideoBackground(Game game, Grid hero, Image fallback, Border accentOverlay)
    {
        bannerPlayer?.Dispose(); bannerPlayer = null;
        if (!Preferences.VideoBackgrounds || !MotionEnabled || game.BackgroundVideo.Length == 0) return;
        var revision = detailRevision;
        try
        {
            var uri = new Uri(game.BackgroundVideo); MediaSource? source;
            if (uri.AbsolutePath.EndsWith(".mpd", StringComparison.OrdinalIgnoreCase) || uri.AbsolutePath.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase))
            {
                var adaptive = await AdaptiveMediaSource.CreateFromUriAsync(uri);
                if (revision != detailRevision || adaptive.Status != AdaptiveMediaSourceCreationStatus.Success) return;
                adaptive.MediaSource.DesiredMinBitrate = 2_000_000;
                adaptive.MediaSource.InitialBitrate = 4_000_000;
                adaptive.MediaSource.DesiredMaxBitrate = 8_000_000;
                source = MediaSource.CreateFromAdaptiveMediaSource(adaptive.MediaSource);
            }
            else source = MediaSource.CreateFromUri(uri);
            if (revision != detailRevision) { source.Dispose(); return; }
            var player = new MediaPlayer { Source = source, IsMuted = true, IsLoopingEnabled = true }; bannerPlayer = player;
            var video = new MediaPlayerElement
            {
                Stretch = Stretch.Fill, AreTransportControlsEnabled = false,
                HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Stretch,
                Margin = new Thickness(0, 0, 12, 0)
            };
            video.SetMediaPlayer(player); hero.Children.Add(video);
            var contentStack = hero.Children.OfType<StackPanel>().FirstOrDefault(stack => stack.MaxWidth == 640);
            void LayoutVideo()
            {
                var available = Math.Max(0, hero.ActualWidth - 24);
                video.Width = Math.Min(available, hero.ActualWidth * 0.60);
                video.Height = hero.ActualHeight;
                video.MaxHeight = hero.ActualHeight;
                video.Clip = new RectangleGeometry { Rect = new Windows.Foundation.Rect(0, 0, video.Width, video.Height) };
                if (contentStack is not null)
                    contentStack.Width = Math.Min(640, Math.Max(220, hero.ActualWidth - video.Width - 36));
            }
            hero.SizeChanged += (_, _) => LayoutVideo();
            LayoutVideo();
            player.MediaFailed += (_, _) => DispatcherQueue.TryEnqueue(() => { if (revision == detailRevision) video.Visibility = Visibility.Collapsed; });
            var controls = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Bottom, Margin = new Thickness(16) };
            var pause = new Button { Content = new SymbolIcon(Symbol.Pause) }; pause.Click += (_, _) => { if (player.PlaybackSession.PlaybackState == MediaPlaybackState.Playing) { player.Pause(); pause.Content = new SymbolIcon(Symbol.Play); } else { player.Play(); pause.Content = new SymbolIcon(Symbol.Pause); } };
            var mute = new Button { Content = new SymbolIcon(Symbol.Mute) }; mute.Click += (_, _) => { player.IsMuted = !player.IsMuted; mute.Content = new SymbolIcon(player.IsMuted ? Symbol.Mute : Symbol.Volume); };
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(pause, Locale.T("Pause")); Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(mute, Locale.T("Sound"));
            controls.Children.Add(pause); controls.Children.Add(mute); hero.Children.Add(controls); player.Play();
        }
        catch (Exception) { /* The database cover remains visible when media cannot be decoded. */ }
    }
}
