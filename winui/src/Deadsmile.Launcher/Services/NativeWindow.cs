using System.Runtime.InteropServices;
using Microsoft.UI.Xaml;

namespace Deadsmile.Launcher.Services;

public sealed class NativeWindow : IDisposable
{
    private readonly IntPtr hwnd;
    private readonly WndProc handler;
    private readonly IntPtr previous;
    private bool registered;
    private string registeredShortcut = "";
    public event Action? Hotkey;
    public Func<double>? Scale { get; set; }
    public NativeWindow(Window window)
    {
        hwnd = WinRT.Interop.WindowNative.GetWindowHandle(window);
        handler = Procedure;
        previous = SetWindowLongPtr(hwnd, -4, Marshal.GetFunctionPointerForDelegate(handler));
        if (previous == IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    }
    public bool Register(bool enabled, string shortcut = "Control+D")
    {
        if (registered && enabled && registeredShortcut == shortcut) return true;
        if (registered) { UnregisterHotKey(hwnd, 0x4453); registered = false; }
        if (enabled)
        {
            var parts = shortcut.Split('+', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            uint modifiers = 0x4000;
            foreach (var part in parts.SkipLast(1))
            {
                var flag = part.ToLowerInvariant() switch { "control" or "ctrl" => 2u, "shift" => 4u, "alt" => 1u, "super" or "win" or "meta" => 8u, _ => 0u };
                if (flag == 0) return false; modifiers |= flag;
            }
            var keyName = parts.LastOrDefault()?.ToUpperInvariant() ?? "";
            uint key = keyName.Length == 1 && char.IsAsciiLetterOrDigit(keyName[0]) ? keyName[0] :
                keyName.StartsWith('F') && int.TryParse(keyName[1..], out var function) && function is >= 1 and <= 24 ? (uint)(111 + function) : 0;
            if (key == 0) return false;
            registered = RegisterHotKey(hwnd, 0x4453, modifiers, key); registeredShortcut = shortcut;
        }
        return !enabled || registered;
    }
    private IntPtr Procedure(IntPtr h, uint message, IntPtr wp, IntPtr lp)
    {
        if (message == 0x0312 && wp.ToInt64() == 0x4453) { Hotkey?.Invoke(); return IntPtr.Zero; }
        if (message == 0x0024)
        {
            var s = Scale?.Invoke() ?? 1;
            Marshal.WriteInt32(lp, 24, (int)(800 * s)); Marshal.WriteInt32(lp, 28, (int)(600 * s));
        }
        return CallWindowProc(previous, h, message, wp, lp);
    }
    public static void Overlay(Window window)
    {
        var h = WinRT.Interop.WindowNative.GetWindowHandle(window);
        var ex = GetWindowLongPtr(h, -20).ToInt64();
        SetWindowLongPtr(h, -20, new IntPtr((ex | 0x08000000 | 0x80 | 0x00200000) & ~0x40000));
        var margins = new Margins { Left = -1, Right = -1, Top = -1, Bottom = -1 };
        DwmExtendFrameIntoClientArea(h, ref margins);
    }
    public static void PassClicks(Window window, bool pass)
    {
        var h = WinRT.Interop.WindowNative.GetWindowHandle(window);
        var ex = GetWindowLongPtr(h, -20).ToInt64();
        SetWindowLongPtr(h, -20, new IntPtr(pass ? ex | 0x20 : ex & ~0x20));
    }
    public static Rect MonitorFor(IntPtr game)
    {
        var monitor = MonitorFromWindow(game, 2); var info = new MonitorInfo { Size = Marshal.SizeOf<MonitorInfo>() };
        return GetMonitorInfo(monitor, ref info) ? info.Monitor : new Rect { Right = 1271, Bottom = 796 };
    }
    public static void Place(Window window, Rect rect)
    {
        SetWindowPos(WinRT.Interop.WindowNative.GetWindowHandle(window), new IntPtr(-1), rect.Left, rect.Top,
            rect.Right - rect.Left, rect.Bottom - rect.Top, 0x0010 | 0x0040);
    }
    public static bool Minimized(IntPtr h) => h != IntPtr.Zero && IsIconic(h);
    public static Windows.Foundation.Point Cursor(Window window)
    {
        GetCursorPos(out var p); ScreenToClient(WinRT.Interop.WindowNative.GetWindowHandle(window), ref p);
        return new(p.X, p.Y);
    }
    public static void ShowInactive(Window window) => ShowWindow(WinRT.Interop.WindowNative.GetWindowHandle(window), 4);
    public void Dispose()
    {
        Register(false); SetWindowLongPtr(hwnd, -4, previous);
    }
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] private struct Margins { public int Left, Right, Top, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MonitorInfo { public int Size; public Rect Monitor, Work; public uint Flags; }
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] private delegate IntPtr WndProc(IntPtr hwnd, uint msg, IntPtr wp, IntPtr lp);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)] private static extern IntPtr SetWindowLongPtr(IntPtr h, int index, IntPtr value);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] private static extern IntPtr GetWindowLongPtr(IntPtr h, int index);
    [DllImport("user32.dll", EntryPoint = "CallWindowProcW")] private static extern IntPtr CallWindowProc(IntPtr proc, IntPtr h, uint msg, IntPtr wp, IntPtr lp);
    [DllImport("user32.dll")] private static extern bool RegisterHotKey(IntPtr h, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] private static extern bool UnregisterHotKey(IntPtr h, int id);
    [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int height, uint flags);
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr h, int command);
    [DllImport("user32.dll")] private static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] private static extern bool ScreenToClient(IntPtr h, ref Point point);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll", EntryPoint = "GetMonitorInfoW")] private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("dwmapi.dll")] private static extern int DwmExtendFrameIntoClientArea(IntPtr h, ref Margins margins);
}

