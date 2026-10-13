using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    private ContentDialog CreateGallery(string[] images, int index)
    {
        var width = Math.Max(200, Math.Min(760, Root.XamlRoot.Size.Width - 64));
        var height = Math.Max(120, Math.Min(440, Root.XamlRoot.Size.Height - 180));
        var image = new Image { Name = "FullScreenshot", Width = width, Height = height, Stretch = Stretch.Uniform };
        AutomationProperties.SetName(image, Locale.T("Screenshots"));
        var panel = new Grid { Width = width, RowSpacing = 16 };
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.Children.Add(image);
        var commands = new Grid { ColumnSpacing = 16 };
        commands.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        commands.ColumnDefinitions.Add(new ColumnDefinition());
        commands.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        var counter = new TextBlock { HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        Grid.SetColumn(counter, 1); commands.Children.Add(counter);
        void Show(int delta)
        { index = (index + delta + images.Length) % images.Length; SetImage(image, images[index]); counter.Text = $"{index + 1} / {images.Length}"; }
        var previous = Action("Previous image", () => { Show(-1); return Task.CompletedTask; });
        var next = Action("Next image", () => { Show(1); return Task.CompletedTask; });
        previous.IsEnabled = next.IsEnabled = images.Length > 1;
        commands.Children.Add(previous); Grid.SetColumn(next, 2); commands.Children.Add(next);
        Grid.SetRow(commands, 1); panel.Children.Add(commands); Show(0);
        var dialog = new ContentDialog { XamlRoot = Root.XamlRoot, RequestedTheme = Root.RequestedTheme,
            Title = Locale.T("Screenshots"), Content = panel, CloseButtonText = Locale.T("Close"),
            HorizontalContentAlignment = HorizontalAlignment.Stretch, MaxHeight = Root.XamlRoot.Size.Height - 32 };
        dialog.Resources["ContentDialogMaxWidth"] = width + 32;
        dialog.Resources["ContentDialogMinWidth"] = 0d;
        dialog.Resources["ContentDialogMaxHeight"] = Root.XamlRoot.Size.Height - 32;
        void ResizeViewer(object sender, SizeChangedEventArgs args)
        {
            panel.Width = image.Width = Math.Max(200, Math.Min(760, Root.XamlRoot.Size.Width - 64));
            image.Height = Math.Max(120, Math.Min(440, Root.XamlRoot.Size.Height - 180));
            dialog.MaxWidth = panel.Width + 32; dialog.MaxHeight = Root.XamlRoot.Size.Height - 32;
        }
        dialog.Opened += (_, _) => Root.SizeChanged += ResizeViewer;
        dialog.Closed += (_, _) => Root.SizeChanged -= ResizeViewer;
        dialog.KeyDown += (_, e) =>
        {
            if (e.Key == Windows.System.VirtualKey.Left) { Show(-1); e.Handled = true; }
            if (e.Key == Windows.System.VirtualKey.Right) { Show(1); e.Handled = true; }
        };
        return dialog;
    }
}
