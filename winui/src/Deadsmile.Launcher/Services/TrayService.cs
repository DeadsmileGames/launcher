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
    public static int ShowNativeMenu(Window owner, string openText, string exitText)
    {
        var menu = CreatePopupMenu();
        if (menu == IntPtr.Zero) return 0;
        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(owner);
        try
        {
            if (!AppendMenu(menu, 0, new UIntPtr(1), openText)) return 0;
            if (!AppendMenu(menu, 0x0800, UIntPtr.Zero, null)) return 0;
            if (!AppendMenu(menu, 0, new UIntPtr(2), exitText)) return 0;
            if (!GetCursorPos(out var cursor)) return 0;
            _ = SetForegroundWindow(hwnd);
            const uint flags = 0x0100u | 0x0002u | 0x0008u | 0x0020u;
            var command = TrackPopupMenu(menu, flags, cursor.X, cursor.Y, 0, hwnd, IntPtr.Zero);
            _ = PostMessage(hwnd, 0, IntPtr.Zero, IntPtr.Zero);
            return checked((int)command);
        }
        finally { DestroyMenu(menu); }
    }

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
    [StructLayout(LayoutKind.Sequential)] private struct PopupPoint { public int X, Y; }
    [DllImport("user32.dll")] private static extern IntPtr CreatePopupMenu();
    [DllImport("user32.dll", EntryPoint = "AppendMenuW", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool AppendMenu(IntPtr menu, uint flags, UIntPtr id, string? text);
    [DllImport("user32.dll", EntryPoint = "TrackPopupMenu", SetLastError = true)] private static extern uint TrackPopupMenu(IntPtr menu, uint flags, int x, int y, int reserved, IntPtr hwnd, IntPtr rect);
    [DllImport("user32.dll")] private static extern bool GetCursorPos(out PopupPoint point);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern bool DestroyMenu(IntPtr menu);
    [DllImport("shell32.dll", EntryPoint = "Shell_NotifyIconW", CharSet = CharSet.Unicode)] private static extern bool ShellNotifyIcon(uint operation, ref NotifyIconData data);
    [DllImport("user32.dll", EntryPoint = "LoadImageW", CharSet = CharSet.Unicode)] private static extern IntPtr LoadImage(IntPtr instance, string name, uint type, int width, int height, uint flags);
    [DllImport("user32.dll")] private static extern bool DestroyIcon(IntPtr icon);
    [DllImport("user32.dll", EntryPoint = "RegisterWindowMessageW", CharSet = CharSet.Unicode)] private static extern uint RegisterWindowMessage(string value);
}
