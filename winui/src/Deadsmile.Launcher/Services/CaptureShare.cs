using System.Runtime.InteropServices;
using Windows.ApplicationModel.DataTransfer;
using Windows.Storage;
using Windows.Storage.Streams;
using WinRT;

namespace Deadsmile.Launcher.Services;

public sealed class CaptureShare : IDisposable
{
    private readonly IDataTransferManagerInterop interop;
    private readonly DataTransferManager manager;
    private readonly IntPtr window;
    private readonly string missingScreenshotMessage;
    private StorageFile? pending;
    public CaptureShare(Microsoft.UI.Xaml.Window owner, string missingScreenshotMessage)
    {
        this.missingScreenshotMessage = missingScreenshotMessage;
        window = WinRT.Interop.WindowNative.GetWindowHandle(owner);
        interop = DataTransferManager.As<IDataTransferManagerInterop>();
        var iid = new Guid("a5caee9b-8708-49d1-8d36-67d25a8da00c"); var pointer = interop.GetForWindow(window, ref iid);
        try { manager = MarshalInterface<DataTransferManager>.FromAbi(pointer); } finally { Marshal.Release(pointer); }
        manager.DataRequested += Requested;
    }
    private static DataPackage Package(StorageFile file)
    {
        var package = new DataPackage { RequestedOperation = DataPackageOperation.Copy };
        package.Properties.Title = "DeadBar"; package.SetStorageItems([file]); package.SetBitmap(RandomAccessStreamReference.CreateFromFile(file)); return package;
    }
    private void Requested(DataTransferManager sender, DataRequestedEventArgs args)
    {
        if (pending is not { } file) { args.Request.FailWithDisplayText(missingScreenshotMessage); return; }
        args.Request.Data.Properties.Title = "DeadBar"; args.Request.Data.SetStorageItems([file]); args.Request.Data.SetBitmap(RandomAccessStreamReference.CreateFromFile(file));
    }
    public void Share(StorageFile file) { pending = file; interop.ShowShareUIForWindow(window); }
    public static void Copy(StorageFile file) { Clipboard.SetContent(Package(file)); Clipboard.Flush(); }
    public void Dispose() { manager.DataRequested -= Requested; }
    [ComImport, Guid("3a3dcd6c-3eab-43dc-bcde-45671ce800c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IDataTransferManagerInterop { IntPtr GetForWindow(IntPtr window, ref Guid iid); void ShowShareUIForWindow(IntPtr window); }
}
