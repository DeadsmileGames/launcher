using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Foundation;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    private ContentDialog CreateGallery(string[] images, int index)
    {
        var viewportWidth = Math.Max(200, Math.Min(760, Root.XamlRoot.Size.Width - 128));
        var viewportHeight = Math.Max(120, Math.Min(440, Root.XamlRoot.Size.Height - 260));
        var image = new Image { Stretch = Stretch.Uniform, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        AutomationProperties.SetName(image, Locale.T("Screenshots"));
        var imageCanvas = new Grid
        {
            Width = viewportWidth, Height = viewportHeight,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0))
        };
        imageCanvas.Children.Add(image);
        var imageScroll = new ScrollViewer
        {
            Width = viewportWidth, Height = viewportHeight,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            HorizontalScrollMode = ScrollMode.Enabled,
            VerticalScrollMode = ScrollMode.Enabled,
            Content = imageCanvas
        };
        var zoom = new Slider
        {
            Width = Math.Clamp(viewportWidth * 0.30, 84, 150),
            Minimum = 1, Maximum = 4, StepFrequency = 0.25, Value = 1,
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Center
        };
        var zoomLabel = new TextBlock { Text = "100%", MinWidth = 44, VerticalAlignment = VerticalAlignment.Center, TextAlignment = TextAlignment.Center };
        var baseImageWidth = viewportWidth;
        var baseImageHeight = viewportHeight;
        var zoomValue = 1d;
        var isPanning = false;
        var panOrigin = new Point();
        var panStartX = 0d;
        var panStartY = 0d;

        void ApplyZoom(double value, bool preserveCenter)
        {
            var old = Math.Max(0.01, zoomValue);
            var centerX = (imageScroll.HorizontalOffset + viewportWidth / 2) * value / old - viewportWidth / 2;
            var centerY = (imageScroll.VerticalOffset + viewportHeight / 2) * value / old - viewportHeight / 2;
            zoomValue = value;
            image.Width = baseImageWidth * value;
            image.Height = baseImageHeight * value;
            imageCanvas.Width = Math.Max(viewportWidth, image.Width);
            imageCanvas.Height = Math.Max(viewportHeight, image.Height);
            zoomLabel.Text = $"{value:P0}";
            imageScroll.ChangeView(
                preserveCenter ? Math.Clamp(centerX, 0, Math.Max(0, imageCanvas.Width - viewportWidth)) : 0,
                preserveCenter ? Math.Clamp(centerY, 0, Math.Max(0, imageCanvas.Height - viewportHeight)) : 0,
                null, true);
        }
        void FitCurrentImage()
        {
            var sourceWidth = image.Source is BitmapImage bitmap && bitmap.PixelWidth > 0 ? bitmap.PixelWidth : viewportWidth;
            var sourceHeight = image.Source is BitmapImage sourceBitmap && sourceBitmap.PixelHeight > 0 ? sourceBitmap.PixelHeight : viewportHeight;
            var fit = Math.Min(viewportWidth / (double)sourceWidth, viewportHeight / (double)sourceHeight);
            baseImageWidth = Math.Max(1, sourceWidth * fit);
            baseImageHeight = Math.Max(1, sourceHeight * fit);
            ApplyZoom(zoom.Value, preserveCenter: false);
        }
        image.ImageOpened += (_, _) => FitCurrentImage();
        var counter = new TextBlock { HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        void Show(int delta)
        {
            index = (index + delta + images.Length) % images.Length;
            SetImage(image, images[index]);
            counter.Text = $"{index + 1} / {images.Length}";
            imageScroll.ChangeView(0, 0, null, true);
            FitCurrentImage();
        }
        Button IconButton(string glyph, string label, Action action)
        {
            var button = new Button
            {
                Content = glyph, Width = 32, Height = 32, MinWidth = 32, Padding = new Thickness(0),
                HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center
            };
            AutomationProperties.SetName(button, Locale.T(label));
            ToolTipService.SetToolTip(button, Locale.T(label));
            button.Click += (_, _) => action();
            return button;
        }
        var previous = IconButton("‹", "Previous image", () => Show(-1));
        var next = IconButton("›", "Next image", () => Show(1));
        previous.IsEnabled = next.IsEnabled = images.Length > 1;
        var nav = new Grid { ColumnSpacing = 8, Width = viewportWidth };
        nav.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        nav.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        nav.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        nav.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        nav.Children.Add(previous);
        Grid.SetColumn(counter, 1); nav.Children.Add(counter);
        Grid.SetColumn(next, 2); nav.Children.Add(next);
        var zoomOut = IconButton("−", "Zoom out", () => zoom.Value = Math.Max(1, zoom.Value - 0.25));
        var zoomIn = IconButton("+", "Zoom in", () => zoom.Value = Math.Min(4, zoom.Value + 0.25));
        var reset = new Button { Content = Locale.T("Reset zoom"), MinWidth = 0, Padding = new Thickness(8, 4, 8, 4), VerticalAlignment = VerticalAlignment.Center };
        AutomationProperties.SetName(reset, Locale.T("Reset zoom"));
        AutomationProperties.SetName(zoom, Locale.T("Zoom"));
        ToolTipService.SetToolTip(zoom, Locale.T("Zoom"));
        zoom.ValueChanged += (_, args) => ApplyZoom(args.NewValue, preserveCenter: true);
        reset.Click += (_, _) => { zoom.Value = 1; ApplyZoom(1, preserveCenter: false); };
        Grid.SetColumn(reset, 3); nav.Children.Add(reset);
        var zoomRow = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, Spacing = 8 };
        zoomRow.Children.Add(zoomOut); zoomRow.Children.Add(zoom); zoomRow.Children.Add(zoomLabel); zoomRow.Children.Add(zoomIn);

        imageScroll.AddHandler(UIElement.PointerPressedEvent, new PointerEventHandler((_, e) =>
        {
            if (zoom.Value <= 1 || (imageCanvas.Width <= viewportWidth && imageCanvas.Height <= viewportHeight)) return;
            var point = e.GetCurrentPoint(imageScroll);
            if (!point.Properties.IsLeftButtonPressed) return;
            isPanning = true;
            panOrigin = point.Position; panStartX = imageScroll.HorizontalOffset; panStartY = imageScroll.VerticalOffset;
            imageScroll.CapturePointer(e.Pointer); e.Handled = true;
        }), true);
        imageScroll.AddHandler(UIElement.PointerMovedEvent, new PointerEventHandler((_, e) =>
        {
            if (!isPanning) return;
            var point = e.GetCurrentPoint(imageScroll);
            if (!point.Properties.IsLeftButtonPressed) return;
            imageScroll.ChangeView(
                Math.Clamp(panStartX - (point.Position.X - panOrigin.X), 0, imageScroll.ScrollableWidth),
                Math.Clamp(panStartY - (point.Position.Y - panOrigin.Y), 0, imageScroll.ScrollableHeight),
                null, true);
            e.Handled = true;
        }), true);
        void EndPan(object? sender, PointerRoutedEventArgs e)
        {
            if (!isPanning) return;
            isPanning = false;
            imageScroll.ReleasePointerCapture(e.Pointer);
            e.Handled = true;
        }
        imageScroll.AddHandler(UIElement.PointerReleasedEvent, new PointerEventHandler(EndPan), true);
        imageScroll.AddHandler(UIElement.PointerCanceledEvent, new PointerEventHandler(EndPan), true);
        imageScroll.AddHandler(UIElement.PointerCaptureLostEvent, new PointerEventHandler((_, _) => isPanning = false), true);

        var body = new StackPanel { Width = viewportWidth, Spacing = 10, HorizontalAlignment = HorizontalAlignment.Center };
        body.Children.Add(imageScroll); body.Children.Add(nav); body.Children.Add(zoomRow);
        var host = new Grid { Width = viewportWidth + 48, HorizontalAlignment = HorizontalAlignment.Center };
        host.Children.Add(body);
        Show(0);
        var dialog = new ContentDialog
        {
            XamlRoot = Root.XamlRoot,
            RequestedTheme = Root.RequestedTheme,
            Title = Locale.T("Screenshots"),
            Content = host,
            CloseButtonText = Locale.T("Close"),
            HorizontalContentAlignment = HorizontalAlignment.Center,
            MaxHeight = Root.XamlRoot.Size.Height - 32
        };
        dialog.Resources["ContentDialogMaxHeight"] = Root.XamlRoot.Size.Height - 32;
        void ResizeViewer(object sender, SizeChangedEventArgs args)
        {
            viewportWidth = Math.Max(220, Math.Min(760, Root.XamlRoot.Size.Width - 64));
            viewportHeight = Math.Max(120, Math.Min(440, Root.XamlRoot.Size.Height - 210));
            body.Width = nav.Width = imageScroll.Width = viewportWidth;
            imageScroll.Height = viewportHeight;
            zoom.Width = Math.Clamp(viewportWidth * 0.30, 84, 150);
            host.Width = viewportWidth + 48;
            FitCurrentImage();
        }
        dialog.Opened += (_, _) => Root.SizeChanged += ResizeViewer;
        dialog.Closed += (_, _) => Root.SizeChanged -= ResizeViewer;
        dialog.KeyDown += (_, e) =>
        {
            if (e.Key == Windows.System.VirtualKey.Left) { Show(-1); e.Handled = true; }
            if (e.Key == Windows.System.VirtualKey.Right) { Show(1); e.Handled = true; }
            if (e.Key == Windows.System.VirtualKey.Add) { zoom.Value = Math.Min(4, zoom.Value + 0.25); e.Handled = true; }
            if (e.Key == Windows.System.VirtualKey.Subtract) { zoom.Value = Math.Max(1, zoom.Value - 0.25); e.Handled = true; }
        };
        return dialog;
    }
}
