#if UI_VALIDATION
// This file is compiled only into the separate CI validation executable.
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Deadsmile.Core;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.Storage.Streams;

namespace Deadsmile.Launcher;

internal sealed class UiValidationHandler : HttpMessageHandler
{
    private bool authenticated;
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
        if (path.EndsWith("/csrf")) data = J.Obj(("token", "ci-layout-token"));
        else if (path.EndsWith("/auth/mobile-login")) { authenticated = true; data = J.Obj(("id", "ci-layout")); }
        else if (path.EndsWith("/auth/me"))
        { if (authenticated) data = J.Obj(("id", "ci-layout"), ("username", "Conta de teste")); else status = 401; }
        else if (path.EndsWith("/integrations/itch")) data = J.Obj(("configured", true), ("connected", false));
        else if (path.EndsWith("/library/catalog"))
        {
            var items = new JsonArray();
            for (var i = 0; i < 6; i++)
            {
                var game = GameData();
                if (i > 0) { game["id"] = new Guid(i, 0, 0, new byte[8]).ToString(); game["title"] = "Jogo de teste " + (i + 1); }
                items.Add(game);
            }
            data = new JsonObject { ["items"] = items };
        }
        else if (path.Contains("/games/")) data = GameData();
        else if (path.Contains("/platform/achievements/")) data = new JsonArray
        {
            J.Obj(("title", "First steps"), ("description", "Complete the first level."), ("points", 10), ("unlockedAt", "2026-10-12T00:00:00Z")),
            J.Obj(("title", "Explorer"), ("description", "Discover every room."), ("points", 20))
        };
        else { status = 404; }
        var payload = status == 200 ? new JsonObject { ["data"] = data } :
            new JsonObject { ["error"] = J.Obj(("code", status == 401 ? "UNAUTHENTICATED" : "NOT_FOUND")) };
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
        async Task Capture(string name)
        {
            void UseLocalArtwork(DependencyObject node)
            {
                if (node is Image { Source: BitmapImage { UriSource: { Host: "fixture.invalid" } } } image)
                    image.Source = new BitmapImage(new Uri("ms-appx:///Assets/StoreLogo.png"));
                for (var i = 0; i < VisualTreeHelper.GetChildrenCount(node); i++) UseLocalArtwork(VisualTreeHelper.GetChild(node, i));
            }
            UseLocalArtwork(Root);
            await Task.Delay(500); Root.UpdateLayout();
            var bitmap = new RenderTargetBitmap(); await bitmap.RenderAsync(Root);
            var buffer = await bitmap.GetPixelsAsync(); var bytes = new byte[buffer.Length];
            using (var reader = DataReader.FromBuffer(buffer)) reader.ReadBytes(bytes);
            Check(bitmap.PixelWidth > 0 && bitmap.PixelHeight > 0 && bytes.Any(x => x != 0), "Rendered " + name);
            if (Shell.Visibility == Visibility.Visible && !Shell.IsPaneOpen)
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
        try
        {
            await Task.Delay(1500); await Resize(1280, 800);
            Check(LoginPanel.Visibility == Visibility.Visible, "Login is visible before authentication");
            Check(LoginButton.Style == (Style)Application.Current.Resources["AccentButtonStyle"], "Login uses native AccentButtonStyle");
            Check(EmailBox.Header?.ToString() == Locale.T("Email or username"), "Login email has its localized header");
            Fits(EmailBox, "Login email fits at 1280x800"); Fits(LoginButton, "Login button fits at 1280x800");
            await Capture("01-login-1280");
            await Resize(800, 600); Fits(EmailBox, "Login email fits at 800x600"); await Capture("02-login-800");
            await Resize(1280, 800);
            EmailBox.Text = "layout@example.invalid"; PasswordBox.Password = "ci-layout-fixture"; await SignIn(); await Task.Delay(300);
            Check(User is not null && Shell.Visibility == Visibility.Visible, "Native sign-in opens the shell");
            Check(ItchButton.IsEnabled && LogoutButton.IsEnabled, "Account controls re-enable after sign-in");
            Check(Shell is NavigationView && AppTitleBar is TitleBar, "Shell uses native NavigationView and TitleBar");
            Check(Shell.PaneDisplayMode == NavigationViewPaneDisplayMode.LeftCompact, "Store compact navigation is enabled");
            Check(((SolidColorBrush)Root.Background).Color == Windows.UI.Color.FromArgb(255, 39, 39, 39), "Body color is exactly 272727");
            Check(((SolidColorBrush)Shell.Background).Color == Windows.UI.Color.FromArgb(255, 32, 32, 32), "Sidebar color is exactly 202020");
            Check(GameGrid.Items.Count == 6, "Catalog items render from the existing API contract");
            await Capture("03-explore-1280");
            Shell.IsPaneOpen = true; await Capture("04-navigation-expanded"); Shell.IsPaneOpen = false;
            Shell.SelectedItem = LibraryItem; await Task.Delay(200);
            Check(page == "library" && CatalogPanel.Visibility == Visibility.Visible, "Native library selection navigates");
            await Capture("05-library-1280");
            SearchBox.Text = "Abby"; await Task.Delay(200); RenderCatalog();
            Check(GameGrid.Items.Count == 1, "Title-bar search filters the library"); SearchBox.Text = ""; await Task.Delay(200); RenderCatalog();
            await LoadDetail(Catalog[0]); await Task.Delay(300);
            Check(DetailPanel.Visibility == Visibility.Visible && AppTitleBar.IsBackButtonEnabled, "Game details enable native back navigation");
            Check(((FrameworkElement)DetailContent.Children[0]).ActualHeight <= 420, "Product hero leaves room for Store content below it");
            await Capture("06-game-details-1280");
            await Resize(800, 600); await Capture("07-game-details-800");
            TitleBackRequested(AppTitleBar, new object());
            Check(DetailPanel.Visibility == Visibility.Collapsed && !AppTitleBar.IsBackButtonEnabled, "Native back restores the library");
            await Resize(1280, 800); Shell.SelectedItem = DownloadsItem; await Task.Delay(200);
            Check(page == "downloads" && DownloadsPanel.Visibility == Visibility.Visible, "Native downloads selection navigates");
            await Capture("08-downloads-1280");
            Shell.SelectedItem = Shell.SettingsItem; await Task.Delay(200);
            Check(page == "settings" && SettingsPanel.Visibility == Visibility.Visible, "Native settings selection navigates");
            await Capture("09-settings-1280");
            await Resize(800, 600); Fits(SettingsLanguage, "Language setting fits at 800x600"); await Capture("10-settings-800");
            await Resize(640, 480); Fits(SettingsLanguage, "Language setting fits at minimum width"); await Capture("11-settings-640");
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
