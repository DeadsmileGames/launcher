using System.Runtime.InteropServices;
using Microsoft.UI.Xaml;

namespace Deadsmile.Launcher.Services;

public static class NativeWindow
{
    public static void FloatingWindow(Window window)
    {
        var h = WinRT.Interop.WindowNative.GetWindowHandle(window);
        var ex = GetWindowLongPtr(h, -20).ToInt64();
        SetWindowLongPtr(h, -20, new IntPtr(ex | 0x08000000 | 0x80 | 0x00200000));
        RemoveNonClientFrame(h);
    }

    public static void PassClicks(Window window, bool pass)
    {
        var h = WinRT.Interop.WindowNative.GetWindowHandle(window);
        var ex = GetWindowLongPtr(h, -20).ToInt64();
        SetWindowLongPtr(h, -20, new IntPtr(pass ? ex | 0x20 : ex & ~0x20));
    }

    public static void ApplyRoundedRegion(Window window, double radiusDip = 18)
    {
        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(window);
        if (!GetWindowRect(hwnd, out var bounds)) return;
        var width = Math.Max(1, bounds.Right - bounds.Left);
        var height = Math.Max(1, bounds.Bottom - bounds.Top);
        var diameter = (int)Math.Round(Math.Min(Math.Min(width, height), radiusDip * DpiScale(IntPtr.Zero, window) * 2));
        if (diameter < 2) return;
        var region = CreateRoundRectRgn(0, 0, width + 1, height + 1, diameter, diameter);
        if (region == IntPtr.Zero) return;
        if (SetWindowRgn(hwnd, region, true) == 0) DeleteObject(region);
    }

    public static void RoundCorners(Window window)
    {
        if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000)) return;
        var preference = 2;
        DwmSetWindowAttribute(WinRT.Interop.WindowNative.GetWindowHandle(window), 33, ref preference, sizeof(int));
    }

    public static Rect WorkAreaFor(IntPtr game)
    {
        var info = new MonitorInfo { Size = Marshal.SizeOf<MonitorInfo>() };
        return GetMonitorInfo(MonitorFromWindow(game, 2), ref info)
            ? info.Work
            : new Rect { Right = 1271, Bottom = 796 };
    }

    public static double DpiScale(IntPtr game, Window fallback)
    {
        var dpi = game == IntPtr.Zero ? 0 : GetDpiForWindow(game);
        if (dpi == 0) dpi = GetDpiForWindow(WinRT.Interop.WindowNative.GetWindowHandle(fallback));
        return dpi > 0 ? dpi / 96d : 1;
    }

    public static void Place(Window window, Rect rect)
    {
        SetWindowPos(WinRT.Interop.WindowNative.GetWindowHandle(window), new IntPtr(-1), rect.Left, rect.Top,
            rect.Right - rect.Left, rect.Bottom - rect.Top, 0x0010 | 0x0040);
    }

    public static bool Minimized(IntPtr hwnd) => hwnd != IntPtr.Zero && IsIconic(hwnd);

    public static void ShowInactive(Window window) =>
        ShowWindow(WinRT.Interop.WindowNative.GetWindowHandle(window), 4);

    private static void RemoveNonClientFrame(IntPtr hwnd)
    {
        const int GwlStyle = -16;
        const long FrameStyles = 0x00C00000L | 0x00800000L | 0x00400000L | 0x00040000L;
        var style = GetWindowLongPtr(hwnd, GwlStyle).ToInt64();
        SetWindowLongPtr(hwnd, GwlStyle, new IntPtr(style & ~FrameStyles));
        SetWindowPos(hwnd, IntPtr.Zero, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0004 | 0x0010 | 0x0020);
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct Rect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MonitorInfo
    {
        public int Size;
        public Rect Monitor;
        public Rect Work;
        public uint Flags;
    }

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")]
    private static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int index);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr SetWindowLongPtr(IntPtr hwnd, int index, IntPtr value);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int width, int height, uint flags);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hwnd);

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);

    [DllImport("user32.dll")]
    private static extern uint GetDpiForWindow(IntPtr hwnd);

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hwnd, out Rect bounds);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateRoundRectRgn(int left, int top, int right, int bottom, int width, int height);

    [DllImport("user32.dll")]
    private static extern int SetWindowRgn(IntPtr hwnd, IntPtr region, bool redraw);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr obj);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hwnd, int command);
}
