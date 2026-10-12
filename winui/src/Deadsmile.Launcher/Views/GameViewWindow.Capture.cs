using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Storage;
using Windows.Storage.Pickers;

namespace Deadsmile.Launcher.Views;

public sealed partial class GameViewWindow
{
    private bool capturing;
    private StorageFile? lastCapture;
    private CaptureShare? captureShare;
    private ContentDialog? captureDialog;
    private async void CaptureClick(object sender, RoutedEventArgs e)
    {
        if (capturing) return; capturing = true; CaptureButton.IsEnabled = false;
        try
        {
            var game = owner.Games.Running.FirstOrDefault(x => x.Game.Id == selected && !x.Process.HasExited) ?? owner.Games.Running.FirstOrDefault(x => !x.Process.HasExited);
            if (game is null) throw new LauncherException("CAPTURE_UNAVAILABLE");
            game.Process.Refresh(); lastCapture = await GameCapture.Take(game.Process.MainWindowHandle);
            ShareCaptureButton.IsEnabled = true; CaptureStatus.Text = owner.Locale.T("Screenshot saved in Pictures / Deadsmile Captures.");
        }
        catch (Exception ex) { CaptureStatus.Text = owner.Locale.Error(ex); }
        finally { capturing = false; CaptureButton.IsEnabled = GameCapture.Supported; }
    }
    private async void ShareCaptureClick(object sender, RoutedEventArgs e)
    { try { await ShowCaptureShare(); } catch (Exception ex) { CaptureStatus.Text = owner.Locale.Error(ex); } }
    private async Task ShowCaptureShare()
    {
        if (lastCapture is null || captureDialog is not null) return;
        var file = lastCapture;
        var width = Math.Min(560, OverlayRoot.XamlRoot.Size.Width - 112);
        var body = new StackPanel { Width = width, Spacing = 16 };
        var picture = new Image { Width = width, Height = width * 9 / 16, Stretch = Stretch.Uniform };
        using (var stream = await file.OpenReadAsync()) { var source = new BitmapImage(); await source.SetSourceAsync(stream); picture.Source = source; }
        body.Children.Add(picture);
        body.Children.Add(new TextBlock { Text = owner.Locale.T("Choose a destination. The selected network will ask you to confirm publication."), TextWrapping = TextWrapping.Wrap });
        var result = new InfoBar { IsOpen = false, IsClosable = false }; body.Children.Add(result);
        Button Action(string title, Func<Task> work)
        {
            var button = new Button { Content = owner.Locale.T(title), HorizontalAlignment = HorizontalAlignment.Stretch };
            button.Click += async (_, _) =>
            {
                button.IsEnabled = false;
                try { await work(); }
                catch (Exception ex) { result.Message = owner.Locale.Error(ex); result.Severity = InfoBarSeverity.Error; result.IsOpen = true; }
                finally { button.IsEnabled = true; }
            }; body.Children.Add(button); return button;
        }
        Action("Share with Windows", () => { captureShare ??= new CaptureShare(this); captureShare.Share(file); return Task.CompletedTask; });
        async Task Prepare(string network, bool? story = null)
        {
            var image = story is { } format ? await GameCapture.Format(file, format) : file;
            CaptureShare.Copy(image);
            DesktopIntegration.Open(network == "x" ? "https://twitter.com/intent/tweet" : network == "whatsapp" ? "https://web.whatsapp.com/" : "https://www.instagram.com/");
            result.Message = owner.Locale.T("The image is saved and copied. Paste or attach it in the selected network to publish.");
            result.Severity = InfoBarSeverity.Informational; result.IsOpen = true;
        }
        Action("Instagram story (9:16)", () => Prepare("instagram", true));
        Action("Instagram post (1:1)", () => Prepare("instagram", false));
        Action("X / Twitter", () => Prepare("x")); Action("WhatsApp", () => Prepare("whatsapp"));
        Action("Save a copy", async () =>
        {
            var picker = new FileSavePicker { SuggestedStartLocation = PickerLocationId.PicturesLibrary, SuggestedFileName = file.DisplayName };
            picker.FileTypeChoices.Add("PNG", new List<string> { ".png" }); WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(this));
            var destination = await picker.PickSaveFileAsync(); if (destination is not null) await file.CopyAndReplaceAsync(destination);
        });
        captureDialog = new ContentDialog { XamlRoot = OverlayRoot.XamlRoot, RequestedTheme = owner.UiTheme,
            Title = owner.Locale.T("Share screenshot"), Content = new ScrollViewer { Content = body, MaxHeight = OverlayRoot.XamlRoot.Size.Height - 180 }, CloseButtonText = owner.Locale.T("Close") };
        captureDialog.Resources["ContentDialogMaxWidth"] = width + 48;
        try { await captureDialog.ShowAsync(); } finally { captureDialog = null; }
    }
}
