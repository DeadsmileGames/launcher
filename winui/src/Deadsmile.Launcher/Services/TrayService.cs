using System.Runtime.InteropServices;
using Microsoft.UI.Xaml;

namespace Deadsmile.Launcher.Services;

public sealed class TrayService : IDisposable
{
    private const uint Callback = 0x8001;
    private readonly NativeWindow hook;
    private NotifyIconData data;
    private readonly IntPtr icon;
    private readonly uint taskbarCreated = RegisterWindowMessage("TaskbarCreated");
    public bool Available { get; private set; }
    public event Action? Restore;
    public event Action? Menu;
    public TrayService(Window owner, NativeWindow native)
    {
        hook = native;
        icon = LoadImage(IntPtr.Zero, Path.Combine(AppContext.BaseDirectory, "Assets", "Icon.ico"), 1, 32, 32, 0x10);
        data = new NotifyIconData { Size = (uint)Marshal.SizeOf<NotifyIconData>(), Window = WinRT.Interop.WindowNative.GetWindowHandle(owner), Id = 0x4453,
            Flags = 1 | 2 | 4 | 0x80, CallbackMessage = Callback, Icon = icon, Tip = "Deadsmile Games Launcher", Info = "", InfoTitle = "" };
        Add(); hook.Message += Receive;
    }
    private void Add()
    { Available = icon != IntPtr.Zero && ShellNotifyIcon(0, ref data); if (Available) { data.TimeoutOrVersion = 4; ShellNotifyIcon(4, ref data); } }
    private void Receive(uint message, IntPtr wp, IntPtr lp)
    {
        if (message == taskbarCreated) { Add(); return; }
        if (message != Callback) return;
        var action = (uint)(lp.ToInt64() & 0xffff);
        if (action is 0x202 or 0x400 or 0x401 or 0x405) Restore?.Invoke();
        if (action is 0x205 or 0x7b) Menu?.Invoke();
    }
    public bool Notify(string title, string message)
    {
        if (!Available) return false;
        data.Flags = 8; data.InfoTitle = title.Length > 63 ? title[..63] : title; data.Info = message.Length > 255 ? message[..255] : message;
        data.InfoFlags = 1; data.TimeoutOrVersion = 10000;
        var shown = ShellNotifyIcon(1, ref data); data.Flags = 1 | 2 | 4 | 0x80; return shown;
    }
    public void Dispose() { hook.Message -= Receive; if (Available) ShellNotifyIcon(2, ref data); Available = false; if (icon != IntPtr.Zero) DestroyIcon(icon); }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private struct NotifyIconData
    {
        public uint Size; public IntPtr Window; public uint Id, Flags, CallbackMessage; public IntPtr Icon;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string Tip;
        public uint State, StateMask;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string Info;
        public uint TimeoutOrVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string InfoTitle;
        public uint InfoFlags; public Guid Guid; public IntPtr BalloonIcon;
    }
    [DllImport("shell32.dll", EntryPoint = "Shell_NotifyIconW", CharSet = CharSet.Unicode)] private static extern bool ShellNotifyIcon(uint operation, ref NotifyIconData data);
    [DllImport("user32.dll", EntryPoint = "LoadImageW", CharSet = CharSet.Unicode)] private static extern IntPtr LoadImage(IntPtr instance, string name, uint type, int width, int height, uint flags);
    [DllImport("user32.dll")] private static extern bool DestroyIcon(IntPtr icon);
    [DllImport("user32.dll", EntryPoint = "RegisterWindowMessageW", CharSet = CharSet.Unicode)] private static extern uint RegisterWindowMessage(string value);
}
