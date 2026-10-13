using System.Runtime.InteropServices;
using Deadsmile.Core;
using Windows.Graphics.Capture;
using Windows.Graphics.DirectX;
using Windows.Graphics.DirectX.Direct3D11;
using Windows.Graphics.Imaging;
using Windows.Storage;
using WinRT;

namespace Deadsmile.Launcher.Services;

// Single-window capture. No desktop enumeration, microphone, upload or background recording.
public static class GameCapture
{
    public static bool Supported => GraphicsCaptureSession.IsSupported();
    public static async Task<StorageFile> Take(IntPtr gameWindow)
    {
        if (!Supported || gameWindow == IntPtr.Zero || NativeWindow.Minimized(gameWindow)) throw new LauncherException("CAPTURE_UNAVAILABLE");
        var iid = new Guid("79c3f95b-31f7-4ec2-a464-632ef5d30760");
        var interop = GraphicsCaptureItem.As<IGraphicsCaptureItemInterop>();
        var pointer = interop.CreateForWindow(gameWindow, ref iid);
        GraphicsCaptureItem item;
        try { item = MarshalInterface<GraphicsCaptureItem>.FromAbi(pointer); } finally { Marshal.Release(pointer); }
        if (item.Size.Width <= 0 || item.Size.Height <= 0 || (long)item.Size.Width * item.Size.Height > 64000000) throw new LauncherException("CAPTURE_UNAVAILABLE");
        using var device = CreateDevice();
        using var pool = Direct3D11CaptureFramePool.CreateFreeThreaded(device, DirectXPixelFormat.B8G8R8A8UIntNormalized, 2, item.Size);
        using var session = pool.CreateCaptureSession(item);
        var result = new TaskCompletionSource<Direct3D11CaptureFrame>(TaskCreationOptions.RunContinuationsAsynchronously);
        void Arrived(Direct3D11CaptureFramePool sender, object args)
        { var frame = sender.TryGetNextFrame(); if (frame is not null && !result.TrySetResult(frame)) frame.Dispose(); }
        pool.FrameArrived += Arrived;
        try
        {
            session.StartCapture(); using var frame = await result.Task.WaitAsync(TimeSpan.FromSeconds(8));
            using var bitmap = await SoftwareBitmap.CreateCopyFromSurfaceAsync(frame.Surface);
            var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), "Deadsmile Captures");
            PathGuard.CheckAncestors(folder); Directory.CreateDirectory(folder);
            var file = await (await StorageFolder.GetFolderFromPathAsync(folder)).CreateFileAsync("DeadBar-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".png", CreationCollisionOption.GenerateUniqueName);
            using var stream = await file.OpenAsync(FileAccessMode.ReadWrite); var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, stream);
            encoder.SetSoftwareBitmap(bitmap); encoder.BitmapTransform.Bounds = new BitmapBounds { Width = (uint)Math.Min(bitmap.PixelWidth, frame.ContentSize.Width), Height = (uint)Math.Min(bitmap.PixelHeight, frame.ContentSize.Height) };
            await encoder.FlushAsync(); return file;
        }
        catch (TimeoutException)
        {
            // Cancel the completion source so a late frame is disposed by Arrived instead of leaking its D3D surface.
            if (!result.TrySetCanceled() && result.Task.IsCompletedSuccessfully)
                result.Task.Result.Dispose();
            throw new LauncherException("CAPTURE_UNAVAILABLE");
        }
        finally { pool.FrameArrived -= Arrived; }
    }
    private static IDirect3DDevice CreateDevice()
    {
        var hr = D3D11CreateDevice(IntPtr.Zero, 1, IntPtr.Zero, 0x20, IntPtr.Zero, 0, 7, out var device, out _, out var context);
        if (hr < 0) hr = D3D11CreateDevice(IntPtr.Zero, 5, IntPtr.Zero, 0x20, IntPtr.Zero, 0, 7, out device, out _, out context);
        Marshal.ThrowExceptionForHR(hr);
        IntPtr dxgi = IntPtr.Zero, inspectable = IntPtr.Zero;
        try
        {
            var iid = new Guid("54ec77fa-1377-44e6-8c32-88fd5f44c84c"); Marshal.ThrowExceptionForHR(Marshal.QueryInterface(device, in iid, out dxgi));
            Marshal.ThrowExceptionForHR(CreateDirect3D11DeviceFromDXGIDevice(dxgi, out inspectable)); return MarshalInterface<IDirect3DDevice>.FromAbi(inspectable);
        }
        finally { if (inspectable != IntPtr.Zero) Marshal.Release(inspectable); if (dxgi != IntPtr.Zero) Marshal.Release(dxgi); if (context != IntPtr.Zero) Marshal.Release(context); if (device != IntPtr.Zero) Marshal.Release(device); }
    }
    public static async Task<StorageFile> Format(StorageFile original, bool story)
    {
        using var input = await original.OpenReadAsync(); var decoder = await BitmapDecoder.CreateAsync(input);
        var width = 1080; var height = story ? 1920 : 1080;
        var ratio = Math.Min(width / (double)decoder.PixelWidth, height / (double)decoder.PixelHeight);
        var scaledWidth = Math.Max(1, (int)Math.Round(decoder.PixelWidth * ratio)); var scaledHeight = Math.Max(1, (int)Math.Round(decoder.PixelHeight * ratio));
        var pixels = (await decoder.GetPixelDataAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Ignore,
            new BitmapTransform { ScaledWidth = (uint)scaledWidth, ScaledHeight = (uint)scaledHeight, InterpolationMode = BitmapInterpolationMode.Fant },
            ExifOrientationMode.IgnoreExifOrientation, ColorManagementMode.ColorManageToSRgb)).DetachPixelData();
        var output = new byte[width * height * 4];
        for (var i = 0; i < output.Length; i += 4) { output[i] = output[i + 1] = output[i + 2] = 39; output[i + 3] = 255; }
        var left = (width - scaledWidth) / 2; var top = (height - scaledHeight) / 2;
        for (var y = 0; y < scaledHeight; y++) Buffer.BlockCopy(pixels, y * scaledWidth * 4, output, ((y + top) * width + left) * 4, scaledWidth * 4);
        var folder = await original.GetParentAsync(); var file = await folder.CreateFileAsync(original.DisplayName + (story ? "-story.png" : "-post.png"), CreationCollisionOption.GenerateUniqueName);
        using var stream = await file.OpenAsync(FileAccessMode.ReadWrite); var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, stream);
        encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Ignore, (uint)width, (uint)height, 96, 96, output); await encoder.FlushAsync(); return file;
    }
    [ComImport, Guid("3628e81b-3cac-4c60-b7f4-23ce0e0c3356"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IGraphicsCaptureItemInterop { IntPtr CreateForWindow(IntPtr window, ref Guid iid); IntPtr CreateForMonitor(IntPtr monitor, ref Guid iid); }
    [DllImport("d3d11.dll")] private static extern int D3D11CreateDevice(IntPtr adapter, uint driver, IntPtr software, uint flags, IntPtr levels, uint levelCount, uint sdk, out IntPtr device, out uint level, out IntPtr context);
    [DllImport("d3d11.dll")] private static extern int CreateDirect3D11DeviceFromDXGIDevice(IntPtr device, out IntPtr graphicsDevice);
}
