using Microsoft.UI;
using Microsoft.UI.Composition;
using Compositor = Windows.UI.Composition.Compositor;
using CompositionColorBrush = Windows.UI.Composition.CompositionColorBrush;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;
namespace Deadsmile.Launcher.Services;

// Window alpha and click-through must be verified against real Windows/DWM and graphics drivers.
public sealed class TransparentBackdrop : SystemBackdrop
{
    private Compositor? compositor;
    private CompositionColorBrush? brush;
    protected override void OnTargetConnected(ICompositionSupportsSystemBackdrop target, XamlRoot root)
    {
        base.OnTargetConnected(target, root);
        compositor = new Compositor(); brush = compositor.CreateColorBrush(Colors.Transparent);
        target.SystemBackdrop = brush;
    }
    protected override void OnTargetDisconnected(ICompositionSupportsSystemBackdrop target)
    {
        target.SystemBackdrop = null; brush?.Dispose(); compositor?.Dispose();
        brush = null; compositor = null; base.OnTargetDisconnected(target);
    }
}

