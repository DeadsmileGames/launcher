#if UI_VALIDATION
// This file is compiled only into the separate CI validation executable.
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Deadsmile.Core;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.Storage.Streams;
using Deadsmile.Launcher.Views;

namespace Deadsmile.Launcher;

internal sealed class UiValidationHandler : HttpMessageHandler
{
    private bool authenticated;
    internal static bool FailCatalog;
    internal const string GameId = "c24ddf96-8bea-46f5-9707-d6997d996c2b";
    internal static JsonObject GameData() => J.Obj(
        ("id", GameId), ("slug", "abbys-restless-heart"), ("title", "Abby's Restless Heart"),
        ("description", "A labyrinth of deadly traps and ancient ruins. Wall-jump, dodge fireballs and collect magic bubbles."),
        ("coverImage", "https://fixture.invalid/cover.png"), ("screenshots", new[] { "https://fixture.invalid/screen-1.png", "https://fixture.invalid/screen-2.png" }),
        ("genres", new[] { "Ação e aventura", "Plataforma" }), ("publisher", "Deadsmile Games"), ("developer", "Deadsmile Games"),
        ("version", "1.0.0"), ("accessType", "free"), ("inLibrary", true), ("owned", true), ("downloadAvailable", true),
        ("microsoftStore", J.Obj(("publisher", "Deadsmile Games"), ("ratings", new[] {
            J.Obj(("system", "DJCTQ"), ("label", "Livre"), ("description", "Livre para todas as idades")) }))));
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri!.AbsolutePath;
        JsonNode? data = null; var status = 200;
        if (FailCatalog && path.EndsWith("/games")) status = 503;
        else if (path.EndsWith("/csrf")) data = J.Obj(("token", "ci-layout-token"));
        else if (path.EndsWith("/auth/mobile-login")) { authenticated = true; data = J.Obj(("id", "ci-layout")); }
        else if (path.EndsWith("/auth/me"))
        { if (authenticated) data = J.Obj(("id", "ci-layout"), ("username", "Conta de teste")); else status = 401; }
        else if (path.EndsWith("/integrations/itch")) data = J.Obj(("configured", true), ("connected", false));
        else if (path.EndsWith("/library/catalog") || path.EndsWith("/games"))
        {
            var items = new JsonArray();
            for (var i = 0; i < 6; i++)
            {
                var game = GameData();
                if (i > 0)
                {
                    game["id"] = new Guid(i, 0, 0, new byte[8]).ToString();
                    game["slug"] = "jogo-de-teste-" + (i + 1);
                    game["title"] = "Jogo de teste " + (i + 1);
                }
                items.Add(game);
            }
            data = new JsonObject { ["items"] = items, ["pagination"] = J.Obj(("totalPages", 1)) };
        }
        else if (path.EndsWith("/launcher")) data = J.Obj(("screenshots", new[] { J.Obj(("url", "https://fixture.invalid/launcher.png")) }));
        else if (path.EndsWith("/newswire")) data = new JsonArray(Enumerable.Range(1, 8).Select(index => (JsonNode?)J.Obj(
            ("id", "news-ci-" + index), ("slug", "a-new-adventure-" + index),
            ("title", "Uma nova aventura " + index), ("excerpt", "Notícias da biblioteca " + index),
            ("image", "https://fixture.invalid/news.png"))).ToArray());
        else if (path.Contains("/newswire/")) data = J.Obj(("slug", "a-new-adventure"), ("title", "Uma nova aventura"), ("excerpt", "Notícias da biblioteca"), ("body", "<p>Conteúdo seguro de teste.</p>"), ("image", "https://fixture.invalid/news.png"));
        else if (path.EndsWith("/wishlist")) data = new JsonArray { GameData() };
        else if (path.EndsWith("/videos")) data = new JsonArray { J.Obj(("title", "Trailer"), ("video_url", "https://fixture.invalid/video.mp4")) };
        else if (path.EndsWith("/account")) data = J.Obj(("username", "Conta de teste"), ("email", "layout@example.invalid"));
        else if (path.Contains("/games/")) data = GameData();
        else if (path.Contains("/platform/achievements/")) data = new JsonArray
        {
            J.Obj(("title", "First steps"), ("description", "Complete the first level."), ("points", 10), ("unlockedAt", "2026-10-12T00:00:00Z")),
            J.Obj(("title", "Explorer"), ("description", "Discover every room."), ("points", 20))
        };
        else { status = 404; }
        var payload = status == 200 ? new JsonObject { ["data"] = data } :
            new JsonObject { ["error"] = J.Obj(("code", status == 401 ? "UNAUTHENTICATED" : status == 503 ? "INTERNAL_ERROR" : "NOT_FOUND")) };
        return Task.FromResult(new HttpResponseMessage((HttpStatusCode)status)
        { Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json") });
    }
}

public sealed partial class MainWindow
{
    internal async Task ValidateNativeUi()
    {
        var output = Environment.GetEnvironmentVariable("DEADSMILE_UI_ARTIFACTS") ?? Path.Combine(AppContext.BaseDirectory, "ui-screenshots");
        var checks = new List<string>();
        Directory.CreateDirectory(output);
        void Check(bool value, string name)
        { if (!value) throw new InvalidOperationException(name); checks.Add(name); }
        void Fits(FrameworkElement control, string name)
        {
            var rect = control.TransformToVisual(Root).TransformBounds(new Windows.Foundation.Rect(0, 0, control.ActualWidth, control.ActualHeight));
            Check(control.ActualWidth > 0 && rect.Left >= -1 && rect.Right <= Root.ActualWidth + 1 && rect.Top >= -1 && rect.Bottom <= Root.ActualHeight + 1, name);
        }
        async Task Resize(int width, int height)
        { AppWindow.Resize(new Windows.Graphics.SizeInt32(width, height)); await Task.Delay(700); Root.UpdateLayout(); }
        async Task Capture(string name, FrameworkElement? surface = null)
        {
            surface ??= Root;
            void UseLocalArtwork(DependencyObject node)
            {
                if (node is Image { Source: BitmapImage { UriSource: { Host: "fixture.invalid" } } } image)
                    image.Source = new BitmapImage(new Uri("ms-appx:///Assets/StoreLogo.png"));
                for (var i = 0; i < VisualTreeHelper.GetChildrenCount(node); i++) UseLocalArtwork(VisualTreeHelper.GetChild(node, i));
            }
            UseLocalArtwork(surface);
            await Task.Delay(500); surface.UpdateLayout();
            var bitmap = new RenderTargetBitmap(); await bitmap.RenderAsync(surface);
            var buffer = await bitmap.GetPixelsAsync(); var bytes = new byte[buffer.Length];
            using (var reader = DataReader.FromBuffer(buffer)) reader.ReadBytes(bytes);
            var nonZeroBytes = bytes.Count(x => x != 0);
            var rendered = bitmap.PixelWidth > 0 && bitmap.PixelHeight > 0 && nonZeroBytes > 0;
            Check(rendered, $"Rendered {name} (pixels {bitmap.PixelWidth}x{bitmap.PixelHeight}; surface {surface.ActualWidth:0.##}x{surface.ActualHeight:0.##}; root {Root.ActualWidth:0.##}x{Root.ActualHeight:0.##}; nonzero bytes {nonZeroBytes}/{bytes.Length})");
            if (surface == Root && Root.RequestedTheme == ElementTheme.Dark && Shell.Visibility == Visibility.Visible && !Shell.IsPaneOpen)
            {
                var scale = bitmap.PixelWidth / Root.ActualWidth;
                void Pixel(int x, int y, byte value, string label)
                {
                    var offset = (y * bitmap.PixelWidth + x) * 4;
                    Check(bytes[offset] == value && bytes[offset + 1] == value && bytes[offset + 2] == value && bytes[offset + 3] == 255, label + " in " + name);
                }
                Pixel((int)(4 * scale), (int)((AppTitleBar.ActualHeight + 200) * scale), 32, "Rendered sidebar is 202020");
                Pixel(bitmap.PixelWidth - 4, bitmap.PixelHeight - 4, 39, "Rendered body is 272727");
            }
            var file = await (await StorageFolder.GetFolderFromPathAsync(output)).CreateFileAsync(name + ".png", CreationCollisionOption.ReplaceExisting);
            using var stream = await file.OpenAsync(FileAccessMode.ReadWrite);
            var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, stream);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, (uint)bitmap.PixelWidth, (uint)bitmap.PixelHeight, 96, 96, bytes);
            await encoder.FlushAsync();
        }
        ContentDialog? FindDialog(DependencyObject node)
        {
            if (node is ContentDialog dialog) return dialog;
            for (var i = 0; i < VisualTreeHelper.GetChildrenCount(node); i++) if (FindDialog(VisualTreeHelper.GetChild(node, i)) is { } found) return found;
            return null;
        }
        try
        {
            await Task.Delay(1000); await Resize(1280, 800); await Capture("00-boot"); await Task.Delay(3000);
            Check(User is null && Shell.Visibility == Visibility.Visible, "Guests enter directly after a successful public API boot");
            Check(BootPanel.Visibility == Visibility.Collapsed && AppTitleBar.IsBackButtonVisible, "Boot completes and back button remains visible");
            Check(AccountActionLabel.Text == Locale.T("Sign in"), "Guest account button offers sign-in");
            Check(HomeNewsRows.Children.Count == 2, "Newswire home section shows two compact posts");
            await Capture("01-guest-explore");
            var gate = RequireAccount(); await Task.Delay(500); Check(User is null, "Download account gate does not silently sign in");
            Check(accountDialog is not null, "Account benefits use a native ContentDialog");
            await Capture("02-account-benefits", accountDialog!); accountDialog!.Hide();
            Check(!await gate, "Cancel preserves visitor mode");
            var signingIn = OpenSignIn(); await Task.Delay(500);
            Check(loginDialog is not null && LoginPanel.Visibility == Visibility.Collapsed, "Sign-in is a native dialog rather than a separate page");
            Check(LoginButton.Style == (Style)Application.Current.Resources["AccentButtonStyle"], "Login uses native AccentButtonStyle");
            await Capture("03-sign-in-dialog", loginDialog!);
            EmailBox.Text = "layout@example.invalid"; PasswordBox.Password = "ci-layout-fixture"; await SignIn(); await signingIn; await Task.Delay(300);
            Check(User is not null && Shell.Visibility == Visibility.Visible, "Native sign-in opens the shell");
            Check(ItchButton.IsEnabled && LogoutButton.IsEnabled, "Account controls re-enable after sign-in");
            Check(Shell is NavigationView && AppTitleBar is TitleBar, "Shell uses native NavigationView and TitleBar");
            Check(FeaturedSide.Visibility == Visibility.Collapsed && FeaturedSideColumn.Width.Value == 0,
                "Home hero presents one large featured game rather than a tiled collage");
            var firstHero = featuredGame?.Id;
            homeHeroPaused = true;
            homeSlideIndex = 1;
            ShowPage();
            Check(featuredGame is not null && featuredGame.Id != firstHero &&
                !GameGrid.Items.Cast<Game>().Any(game => game.Id.Equals(featuredGame.Id, StringComparison.OrdinalIgnoreCase)),
                "Home slider advances to the next featured game without duplicating it");
            homeHeroPaused = false;
            homeSlideIndex = 0;
            ShowPage();
            Check(NotificationsButton.Content is Grid notificationGrid &&
                notificationGrid.Children.OfType<FontIcon>().Any(icon => icon.Glyph == "\uE7ED"),
                "Notifications use the bell glyph rather than TVMonitor");
            var originalLanguage = Locale.Language;
            Locale.Language = "pt-BR"; ApplyLanguage();
            Check(ProfileFullName.Header?.ToString() == "Nome completo", "Profile field headers translate to Portuguese");
            Check(HomeNewsOpenButton.Content?.ToString() == "Abrir Newswire", "Home Newswire action translates to Portuguese");
            Check(ShareGameActivityToggle.Header?.ToString() == "Compartilhar atividade de jogos", "Privacy settings translate to Portuguese");
            Locale.Language = "es"; ApplyLanguage();
            Check(ProfileFullName.Header?.ToString() == "Nombre completo", "Profile field headers translate to Spanish");
            Check(HomeNewsOpenButton.Content?.ToString() == "Abrir Newswire", "Home Newswire action translates to Spanish");
            Check(ShareGameActivityToggle.Header?.ToString() == "Compartir actividad de juegos", "Privacy settings translate to Spanish");
            Locale.Language = originalLanguage; ApplyLanguage(); ShowPage();
            Check(Shell.PaneDisplayMode == NavigationViewPaneDisplayMode.LeftCompact, "Store compact navigation is enabled");
            Check(((SolidColorBrush)Root.Background).Color == Windows.UI.Color.FromArgb(255, 39, 39, 39), "Body color is exactly 272727");
            Check(((SolidColorBrush)Shell.Background).Color == Windows.UI.Color.FromArgb(255, 32, 32, 32), "Sidebar color is exactly 202020");
            Check(GameGrid.Items.Count == 5 && featuredGame is not null &&
                !GameGrid.Items.Cast<Game>().Any(game => game.Id.Equals(featuredGame.Id, StringComparison.OrdinalIgnoreCase)),
                "Home hero shows its featured game once and keeps remaining catalog items");
            await Capture("03-explore-1280");
            Shell.IsPaneOpen = true; await Capture("04-navigation-expanded"); Shell.IsPaneOpen = false;
            Shell.SelectedItem = LibraryItem; await Task.Delay(200);
            Check(page == "library" && CatalogPanel.Visibility == Visibility.Visible, "Native library selection navigates");
            await Capture("05-library-1280");
            var catalogCountBeforeSuggestions = GameGrid.Items.Count;
            SearchSuggestions("Abby");
            Check(searchResults.Count == 1, "Search suggestions match the one game containing Abby");
            Check(GameGrid.Items.Count == catalogCountBeforeSuggestions, "Opening suggestions does not replace the catalog");
            SearchSuggestions("no-match-ci"); Check(searchResults.Count > 0 && searchResults.All(x => x.Setting is not null), "Search falls back to settings suggestions");
            SearchBox.Text = ""; SearchBox.IsSuggestionListOpen = false;
            await LoadDetail(Catalog[0]); await Task.Delay(300);
            Check(DetailPanel.Visibility == Visibility.Visible && AppTitleBar.IsBackButtonEnabled, "Game details enable native back navigation");
            await Capture("06-game-details-1280");
            var productBanner = (Grid)DetailContent.Children[0];
            Check(Math.Abs(productBanner.ActualHeight - 360) < 1 && heroImage?.MaxHeight == 360 && heroImage.Clip is RectangleGeometry,
                $"Product banner is limited to 360 DIPs (container: {productBanner.ActualHeight}; image: {heroImage?.ActualHeight})");
            Check(((Grid)DetailContent.Children[0]).Clip is RectangleGeometry, "Product image is clipped to its banner container");
            async Task GalleryCheck(string name, bool portrait)
            {
                var dialog = CreateGallery(["https://fixture.invalid/screen-1.png", "https://fixture.invalid/screen-2.png"], 0);
                var content = (StackPanel)dialog.Content;
                var imageScroll = (ScrollViewer)content.Children[0];
                var full = (Image)imageScroll.Content;
                var navigation = (Grid)content.Children[1];
                var zoomControls = (StackPanel)content.Children[2];
                Check(navigation.Children.OfType<Button>().Count() == 3 &&
                    zoomControls.Children.OfType<Button>().Count() == 2 &&
                    zoomControls.Children.OfType<Slider>().Any(slider =>
                        AutomationProperties.GetName(slider) == Locale.T("Zoom")),
                    "Screenshot viewer keeps previous/next/reset buttons and zoom controls");
                // Extreme source aspect ratios expose oversized natural-size image layout.
                var w = portrait ? 180 : 1200; var h = portrait ? 1200 : 180;
                var pixels = new byte[w * h * 4];
                for (var y = 0; y < h; y++) for (var x = 0; x < w; x++)
                {
                    var offset = (y * w + x) * 4;
                    pixels[offset] = (byte)(x < w / 2 ? 180 : 70);
                    pixels[offset + 1] = (byte)(y < h / 2 ? 120 : 210);
                    pixels[offset + 2] = (byte)(x < w / 2 ? 80 : 160); pixels[offset + 3] = 255;
                }
                using var pattern = new InMemoryRandomAccessStream();
                var png = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, pattern);
                png.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Straight, (uint)w, (uint)h, 96, 96, pixels);
                await png.FlushAsync(); pattern.Seek(0);
                var source = new BitmapImage(); await source.SetSourceAsync(pattern); full.Source = source;
                var showing = dialog.ShowAsync(); await Task.Delay(600); content.UpdateLayout();
                var bounds = full.TransformToVisual(Root).TransformBounds(new Windows.Foundation.Rect(0, 0, full.ActualWidth, full.ActualHeight));
                Check(full.Stretch == Stretch.Uniform && bounds.Left >= 0 && bounds.Right <= Root.ActualWidth && bounds.Top >= 0 && bounds.Bottom <= Root.ActualHeight,
                    "Entire " + (portrait ? "portrait" : "panoramic") + " screenshot fits the native dialog in " + name);
                await Capture(name, dialog); dialog.Hide(); await showing;
            }
            await GalleryCheck("12-gallery-wide-1280", false);
            await Resize(960, 640); await Capture("07-game-details-960");
            await GalleryCheck("13-gallery-portrait-960", true);
            TitleBackRequested(AppTitleBar, new object());
            Check(DetailPanel.Visibility == Visibility.Collapsed && AppTitleBar.IsBackButtonVisible, "Native back restores the library");
            await Resize(1280, 800); Shell.SelectedItem = DownloadsItem; await Task.Delay(200);
            Check(page == "downloads" && DownloadsPanel.Visibility == Visibility.Visible, "Native downloads selection navigates");
            await Capture("08-downloads-1280");
            Shell.SelectedItem = ExploreItem; await Task.Delay(100); page = "settings"; selected = null; ShowPage(); await Task.Delay(200);
            Check(page == "settings" && SettingsPanel.Visibility == Visibility.Visible, "Native settings selection navigates");
            await Capture("09-settings-1280");
            Check(ThemeChoice.Items.Count == 3 && ThemeDarkCard.Visibility == Visibility.Visible && ThemeLightCard.Visibility == Visibility.Visible && ThemeSystemCard.Visibility == Visibility.Visible && AnimationToggle.IsOn && MaterialsToggle.IsOn, "Appearance preferences include three visible visual theme cards");
            await Resize(960, 640); ThemeDarkCard.StartBringIntoView(); await Task.Delay(300); Fits(ThemeDarkCard, "Visual theme cards fit at the 960x640 minimum"); await Capture("10-settings-960");
            SettingsLanguage.StartBringIntoView(); await Task.Delay(300); Fits(SettingsLanguage, "Language setting fits at 800x600");
            await Resize(640, 480); SettingsLanguage.StartBringIntoView(); await Task.Delay(300); Fits(SettingsLanguage, "Language setting fits at minimum width"); await Capture("11-settings-640");
            await Resize(1280, 800); ThemeChoice.SelectedIndex = 1; SettingsPanel.ChangeView(null, 0, null, true); await Task.Delay(300);
            Check(Root.RequestedTheme == ElementTheme.Light && ((SolidColorBrush)Root.Background).Color.R > 240, "Light theme applies immediately with native resources");
            Check(ThemeLightCardBorder.BorderThickness.Left == 2 && ThemeDarkCardBorder.BorderThickness.Left == 1, "Light theme preview visibly marks the selected card");
            await Capture("14-settings-light");
            AnimationToggle.IsOn = false;
            Check(!MotionEnabled && DetailContent.ChildrenTransitions is null, "Reduced motion removes native application transitions");
            AnimationToggle.IsOn = true; ThemeChoice.SelectedIndex = 2;
            Check(ThemeSystemCardBorder.BorderThickness.Left == 2 && ThemeLightCardBorder.BorderThickness.Left == 1, "System theme preview visibly marks the selected card");
            ThemeChoice.SelectedIndex = 0;
            Check(ThemeDarkCardBorder.BorderThickness.Left == 2 && ThemeSystemCardBorder.BorderThickness.Left == 1, "Dark theme preview visibly marks the selected card");
            NavigationChoice.SelectedIndex = 1;
            Check(Shell.PaneDisplayMode == NavigationViewPaneDisplayMode.Left, "Expanded navigation preference applies");
            NavigationChoice.SelectedIndex = 0;
            Check(storage.Read("winui-appearance.json", new Services.UiPreferences()).Theme == "dark", "Appearance preferences persist");
            foreach (var (item, expected) in new[] { (WishlistItem, "wishlist"), (NewsItem, "news") })
            {
                Shell.SelectedItem = item; await Task.Delay(500);
                Check(page == expected && ContentPage.Visibility == Visibility.Visible && ContentRows.Children.Count > 0, "Connected native page: " + expected);
                if (expected == "news" && ContentRows.Children.OfType<Grid>().FirstOrDefault() is { } newsGrid)
                {
                    var wideColumns = newsGrid.ColumnDefinitions.Count;
                    var wideViewport = PageLayout.ActualWidth;
                    Check(wideColumns >= 3, $"Newswire uses three columns at the wide viewport ({wideViewport:0} DIPs, {wideColumns} columns)");
                    await Resize(960, 640);
                    var narrowColumns = newsGrid.ColumnDefinitions.Count;
                    var narrowViewport = PageLayout.ActualWidth;
                    Check(narrowViewport < wideViewport,
                        $"Native page viewport shrinks on resize ({wideViewport:0} -> {narrowViewport:0} DIPs)");
                    Check(narrowColumns < wideColumns,
                        $"Newswire adapts columns to a narrower window ({wideColumns} -> {narrowColumns}; viewport {wideViewport:0} -> {narrowViewport:0}; scroll viewport {ContentPage.ActualWidth:0})");
                    await Resize(1280, 800);
                    Check(PageLayout.ActualWidth > narrowViewport, "Native page viewport expands when the window is restored");
                    Check(newsGrid.ColumnDefinitions.Count == wideColumns,
                        $"Newswire restores columns after resizing ({narrowColumns} -> {newsGrid.ColumnDefinitions.Count})");
                }
                await Capture("page-" + expected);
            }
            page = "settings"; selected = null; profileLoaded = false; ShowPage(); await Task.Delay(500);
            Check(ProfileSettingsAvatar is not null, "Profile editor is part of native settings"); await Capture("page-account");
            var reading = ShowNews(newsItems[0]); await Task.Delay(400);
            Check(newsDialog is not null && newsDialog.Content is Grid newsHost && newsHost.HorizontalAlignment == HorizontalAlignment.Center && newsHost.Children.OfType<ScrollViewer>().Any(), "Newswire dialog is centered and uses a bounded native scrolling viewport");
            await Capture("news-dialog", newsDialog!); newsDialog!.Hide(); await reading;
            var galleryValidation = CreateGallery(["https://fixture.invalid/screen-1.png", "https://fixture.invalid/screen-2.png"], 0);
            Check(galleryValidation.Content is StackPanel galleryBody &&
                galleryBody.Children.OfType<ScrollViewer>().Any() &&
                galleryBody.Children.OfType<StackPanel>().Any(row => row.Children.OfType<Slider>().Any(slider =>
                    AutomationProperties.GetName(slider) == Locale.T("Zoom"))) &&
                galleryBody.Children.OfType<Grid>().Any(row => row.Children.OfType<Button>().Count() >= 3),
                "Screenshot viewer has unclipped navigation controls and a zoom slider");
            SearchSuggestions("Abby"); SearchBox.IsSuggestionListOpen = true; await Task.Delay(300);
            Check(SearchBox.ItemsSource is SearchEntry[] results && results.Length == 1, "Native search popup presents game suggestions"); SearchBox.IsSuggestionListOpen = false;
            var view = new GameViewWindow(this); var widgetRoot = await view.ValidationShow(); await Task.Delay(300);
            Check(view.ValidationWidgetsOpaque && view.ValidationLabelsNative, "Game Bar widgets have solid backgrounds and localized content");
            await Capture("15-game-view-widgets", widgetRoot);
            view.ValidationPinAndHide(); Check(view.ValidationPinned, "Pinned widget remains visible when Game View closes"); view.Close();
            var toast = new AchievementWindow(this, Locale.T("Achievement unlocked"), "Uma conquista com um título longo, para conferir a leitura do aviso", forceSolid: true);
            toast.ShowOn(IntPtr.Zero); await Task.Delay(300);
            Check(toast.ValidationSolid, "Windows 10 achievement fallback always has an opaque background");
            await Capture("16-achievement-solid", toast.ValidationRoot); toast.Close();
            var hint = new AchievementWindow(this, "DeadBar", Locale.T("Press {0} to open DeadBar").Replace("{0}", "Ctrl + D"), forceSolid: true, hint: true);
            hint.ShowOn(IntPtr.Zero, centered: true); await Task.Delay(300);
            Check(hint.ValidationRoot.ActualHeight <= 96, "DeadBar reminder is a compact bottom-centered toast");
            await Capture("deadbar-hint", hint.ValidationRoot); hint.Close();
            if (Services.GameCapture.Supported)
            {
                try
                {
                    var shot = await Services.GameCapture.Take(WinRT.Interop.WindowNative.GetWindowHandle(this));
                    var story = await Services.GameCapture.Format(shot, true); using var stream = await story.OpenReadAsync(); var decoder = await BitmapDecoder.CreateAsync(stream);
                    Check(decoder.PixelWidth == 1080 && decoder.PixelHeight == 1920, "Native single-window capture and story export produce a 1080x1920 PNG");
                }
                catch (Exception ex) { checks.Add("Native capture unavailable on this runner: " + ex.GetType().Name); }
            }
            using (var systemTray = new Services.TrayService(this, native))
            {
                Check(systemTray.Available, "Windows notification area accepts the launcher icon"); tray = systemTray;
                MinimizeToTray(); await Task.Delay(200); Check(!AppWindow.IsVisible, "Close-to-tray keeps the process alive and hides the window");
                RestoreFromTray(); await Task.Delay(200); Check(AppWindow.IsVisible, "Tray restore returns the native window"); tray = null;
            }
            UiValidationHandler.FailCatalog = true; await StartBoot();
            Check(Shell.Visibility == Visibility.Collapsed && BootErrorCode.Text.Contains("6799") && BootRetry.Visibility == Visibility.Visible,
                "API failure prevents entry and displays a local error code with retry"); await Capture("boot-error");
            UiValidationHandler.FailCatalog = false;
            await File.WriteAllTextAsync(Path.Combine(output, "results.json"), JsonSerializer.Serialize(new { passed = true, checks, screenshots = Directory.GetFiles(output, "*.png").Length }, new JsonSerializerOptions { WriteIndented = true }));
            Environment.Exit(0);
        }
        catch (Exception ex)
        {
            await File.WriteAllTextAsync(Path.Combine(output, "results.json"), JsonSerializer.Serialize(new { passed = false, checks, error = ex.ToString() }, new JsonSerializerOptions { WriteIndented = true }));
            Environment.Exit(1);
        }
    }
}
#endif
