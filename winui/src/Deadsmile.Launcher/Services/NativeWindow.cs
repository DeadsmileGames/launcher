using System.Runtime.InteropServices;
using System.Threading;
using Deadsmile.Core;
using Microsoft.UI.Xaml;

namespace Deadsmile.Launcher.Services;

public sealed class NativeWindow : IDisposable
{
    private readonly IntPtr hwnd;
    private static long nextSubclassId;
    private readonly SubclassProc handler;
    private readonly UIntPtr subclassId;
    private bool subclassed;
    private bool registered;
    private readonly bool noActivate;
    private string registeredShortcut = "";
    public event Action? Hotkey;
    public event Action<uint, IntPtr, IntPtr>? Message;
    public Func<double>? Scale { get; set; }
    public NativeWindow(Window window, bool noActivate = false)
    {
        this.noActivate = noActivate;
        hwnd = WinRT.Interop.WindowNative.GetWindowHandle(window);
        handler = Procedure;
        subclassId = new UIntPtr(unchecked((uint)Interlocked.Increment(ref nextSubclassId)));
        // Preserve the WinUI window-procedure chain and remove this hook explicitly at disposal.
        if (!SetWindowSubclass(hwnd, handler, subclassId, UIntPtr.Zero))
        {
            var error = new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            LauncherLog.Error("NativeWindow", $"failed to install HWND message hook; hwnd=0x{hwnd.ToInt64():X}", error);
            throw error;
        }
        subclassed = true;
        LauncherLog.Info("NativeWindow", $"HWND message hook installed; hwnd=0x{hwnd.ToInt64():X}; subclass_id={subclassId}");
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
            uint key = VirtualKey(keyName);
            if (key == 0)
            {
                LauncherLog.Warning("DeadBar", $"hotkey rejected by parser; shortcut={shortcut}");
                return false;
            }
            registered = RegisterHotKey(hwnd, 0x4453, modifiers, key);
            registeredShortcut = shortcut;
            LauncherLog.Info("DeadBar", $"global hotkey registration; shortcut={shortcut}; enabled={enabled}; success={registered}; win32_error={(registered ? 0 : Marshal.GetLastWin32Error())}");
        }
        return !enabled || registered;
    }
    internal static uint VirtualKey(string keyName)
    {
        var normalized = keyName.ToUpperInvariant();
        // Microsoft reserves F12 for debugger/JIT debugger use.
        if (normalized == "F12") return 0;
        return normalized.Length == 1 && char.IsAsciiLetterOrDigit(normalized[0]) ? normalized[0] :
            normalized.StartsWith('F') && int.TryParse(normalized[1..], out var function) && function is >= 1 and <= 24
                ? (uint)(111 + function) : 0;
    }

    private IntPtr Procedure(IntPtr h, uint message, IntPtr wp, IntPtr lp, UIntPtr id, UIntPtr refData)
    {
        // Never unwind a managed exception through the native Windows message loop.
        try { Message?.Invoke(message, wp, lp); }
        catch (Exception ex) { LauncherLog.Error("NativeWindow", $"window message observer failed; message=0x{message:X}", ex); }
        if (message == 0x0312 && wp.ToInt64() == 0x4453)
        {
            LauncherLog.Info("DeadBar", "WM_HOTKEY delivered to the launcher HWND");
            try { Hotkey?.Invoke(); }
            catch (Exception ex) { LauncherLog.Error("DeadBar", "hotkey callback failed", ex); }
            return IntPtr.Zero;
        }
        if (noActivate && message == 0x0021) return new IntPtr(3);
        if (message == 0x0024 && lp != IntPtr.Zero)
        {
            var s = Scale?.Invoke() ?? 1;
            Marshal.WriteInt32(lp, 24, (int)(640 * s)); Marshal.WriteInt32(lp, 28, (int)(480 * s));
        }
        return DefSubclassProc(h, message, wp, lp);
    }
    public static void Overlay(Window window)
    {
        var h = WinRT.Interop.WindowNative.GetWindowHandle(window);
        var ex = GetWindowLongPtr(h, -20).ToInt64();
        SetWindowLongPtr(h, -20, new IntPtr((ex | 0x08000000 | 0x80 | 0x00200000) & ~0x40000));
        RemoveNonClientFrame(h);
        var margins = new Margins { Left = -1, Right = -1, Top = -1, Bottom = -1 };
        DwmExtendFrameIntoClientArea(h, ref margins);
    }
    public static void PassClicks(Window window, bool pass)
    {
        var h = WinRT.Interop.WindowNative.GetWindowHandle(window);
        var ex = GetWindowLongPtr(h, -20).ToInt64();
        SetWindowLongPtr(h, -20, new IntPtr(pass ? ex | 0x20 : ex & ~0x20));
    }
    public static void FloatingWindow(Window window)
    {
        var h = WinRT.Interop.WindowNative.GetWindowHandle(window);
        var ex = GetWindowLongPtr(h, -20).ToInt64();
        SetWindowLongPtr(h, -20, new IntPtr(ex | 0x08000000 | 0x80 | 0x00200000));
        RemoveNonClientFrame(h);
    }
    public static void RemoveNonClientFrame(Window window) =>
        RemoveNonClientFrame(WinRT.Interop.WindowNative.GetWindowHandle(window));
    private static void RemoveNonClientFrame(IntPtr h)
    {
        const int GwlStyle = -16;
        const long FrameStyles = 0x00C00000L | 0x00800000L | 0x00400000L | 0x00040000L;
        var style = GetWindowLongPtr(h, GwlStyle).ToInt64();
        SetWindowLongPtr(h, GwlStyle, new IntPtr(style & ~FrameStyles));
        SetWindowPos(h, IntPtr.Zero, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0004 | 0x0010 | 0x0020);
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
        // SetWindowRgn transfers ownership of the HRGN to Windows on success.
        if (SetWindowRgn(hwnd, region, true) == 0) DeleteObject(region);
    }
    public static void RoundCorners(Window window)
    {
        if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000)) return;
        var preference = 2; // DWMWCP_ROUND, available in Windows 11.
        DwmSetWindowAttribute(WinRT.Interop.WindowNative.GetWindowHandle(window), 33, ref preference, sizeof(int));
    }
    public static Rect MonitorFor(IntPtr game)
    {
        var monitor = MonitorFromWindow(game, 2); var info = new MonitorInfo { Size = Marshal.SizeOf<MonitorInfo>() };
        return GetMonitorInfo(monitor, ref info) ? info.Monitor : new Rect { Right = 1271, Bottom = 796 };
    }
    public static Rect WorkAreaFor(IntPtr game)
    {
        var info = new MonitorInfo { Size = Marshal.SizeOf<MonitorInfo>() };
        return GetMonitorInfo(MonitorFromWindow(game, 2), ref info) ? info.Work : MonitorFor(game);
    }
    public static (int X, int Y) CursorScreen()
    {
        GetCursorPos(out var point);
        return (point.X, point.Y);
    }
    public static Rect WorkAreaAt(int x, int y)
    {
        var point = new Point { X = x, Y = y };
        var info = new MonitorInfo { Size = Marshal.SizeOf<MonitorInfo>() };
        return GetMonitorInfo(MonitorFromPoint(point, 2), ref info) ? info.Work : new Rect { Right = 1271, Bottom = 796 };
    }
    public static double DpiScale(IntPtr game, Window fallback)
    {
        var dpi = GetDpiForWindow(game);
        if (dpi == 0) dpi = GetDpiForWindow(WinRT.Interop.WindowNative.GetWindowHandle(fallback));
        return dpi > 0 ? dpi / 96d : 1;
    }
    public static void Place(Window window, Rect rect)
    {
        SetWindowPos(WinRT.Interop.WindowNative.GetWindowHandle(window), new IntPtr(-1), rect.Left, rect.Top,
            rect.Right - rect.Left, rect.Bottom - rect.Top, 0x0010 | 0x0040);
    }
    public static bool Minimized(IntPtr h) => h != IntPtr.Zero && IsIconic(h);
    public static IntPtr RootOwner(IntPtr h) => h == IntPtr.Zero ? IntPtr.Zero : GetAncestor(h, 3);
    public static Windows.Foundation.Point Cursor(Window window)
    {
        GetCursorPos(out var p); ScreenToClient(WinRT.Interop.WindowNative.GetWindowHandle(window), ref p);
        return new(p.X, p.Y);
    }
    public static void ShowInactive(Window window) => ShowWindow(WinRT.Interop.WindowNative.GetWindowHandle(window), 4);
    public static bool IsVisible(Window window) => IsWindowVisible(WinRT.Interop.WindowNative.GetWindowHandle(window));
    public void Dispose()
    {
        Register(false);
        if (subclassed)
        {
            var removed = RemoveWindowSubclass(hwnd, handler, subclassId);
            LauncherLog.Info("NativeWindow", $"HWND hook removed; hwnd=0x{hwnd.ToInt64():X}; success={removed}");
            subclassed = false;
        }
    }
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] private struct Margins { public int Left, Right, Top, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MonitorInfo { public int Size; public Rect Monitor, Work; public uint Flags; }
    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    private delegate IntPtr SubclassProc(IntPtr hwnd, uint msg, IntPtr wp, IntPtr lp, UIntPtr subclassId, UIntPtr refData);
    [DllImport("comctl32.dll", SetLastError = true, ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetWindowSubclass(IntPtr hWnd, SubclassProc callback, UIntPtr subclassId, UIntPtr refData);
    [DllImport("comctl32.dll", SetLastError = true, ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool RemoveWindowSubclass(IntPtr hWnd, SubclassProc callback, UIntPtr subclassId);
    [DllImport("comctl32.dll", ExactSpelling = true)]
    private static extern IntPtr DefSubclassProc(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)] private static extern IntPtr SetWindowLongPtr(IntPtr h, int index, IntPtr value);
    [DllImport("user32.dll")] private static extern uint GetDpiForWindow(IntPtr h);
    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr h, int attribute, ref int value, int size);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] private static extern IntPtr GetWindowLongPtr(IntPtr h, int index);
    [DllImport("user32.dll")] private static extern bool RegisterHotKey(IntPtr h, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] private static extern bool UnregisterHotKey(IntPtr h, int id);
    [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int height, uint flags);
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr h, int command);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] private static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] private static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] private static extern bool ScreenToClient(IntPtr h, ref Point point);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] private static extern IntPtr GetAncestor(IntPtr h, uint flags);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromPoint(Point point, uint flags);
    [DllImport("user32.dll", EntryPoint = "GetMonitorInfoW")] private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool GetWindowRect(IntPtr h, out Rect rect);
    [DllImport("gdi32.dll", SetLastError = true)] private static extern IntPtr CreateRoundRectRgn(int left, int top, int right, int bottom, int widthEllipse, int heightEllipse);
    [DllImport("user32.dll", SetLastError = true)] private static extern int SetWindowRgn(IntPtr h, IntPtr region, bool redraw);
    [DllImport("gdi32.dll")] private static extern bool DeleteObject(IntPtr obj);
    [DllImport("dwmapi.dll")] private static extern int DwmExtendFrameIntoClientArea(IntPtr h, ref Margins margins);
}

