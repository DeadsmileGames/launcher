using System.Net;
using System.Runtime.InteropServices;
using System.Text.Json;
using Deadsmile.Core;

namespace Deadsmile.Launcher.Services;

public sealed class SessionStore(Storage storage)
{
    private sealed record SavedCookie(string Name, string Value, string Path, bool Secure, bool HttpOnly, DateTime Expires);
    private readonly object gate = new();
    public CookieContainer Load()
    {
        var container = new CookieContainer();
        try
        {
            var file = storage.FilePath("winui-session.dat");
            if (!File.Exists(file) || new FileInfo(file).Length > 1024 * 1024) return container;
            var bytes = Transform(File.ReadAllBytes(file), false);
            var values = JsonSerializer.Deserialize<SavedCookie[]>(bytes, Storage.JsonOptions) ?? [];
            foreach (var c in values)
            {
                if (c.Expires != DateTime.MinValue && c.Expires <= DateTime.UtcNow) continue;
                container.Add(ApiClient.BaseUri, new Cookie(c.Name, c.Value, c.Path)
                { Secure = c.Secure, HttpOnly = c.HttpOnly, Expires = c.Expires });
            }
        }
        catch { storage.Log("SESSION_RESTORE_UNAVAILABLE"); }
        return container;
    }
    public void Save(CookieContainer container)
    {
        lock (gate)
        {
            try
            {
                var values = container.GetCookies(ApiClient.BaseUri).Cast<Cookie>()
                    .Where(c => !c.Expired).Select(c => new SavedCookie(c.Name, c.Value, c.Path, c.Secure, c.HttpOnly, c.Expires)).ToArray();
                var bytes = JsonSerializer.SerializeToUtf8Bytes(values, Storage.JsonOptions);
                Storage.AtomicWrite(storage.FilePath("winui-session.dat"), Transform(bytes, true));
            }
            catch { storage.Log("SESSION_PERSIST_UNAVAILABLE"); }
        }
    }
    private static byte[] Transform(byte[] bytes, bool protect)
    {
        var input = new Blob { Size = bytes.Length, Data = Marshal.AllocHGlobal(bytes.Length) };
        try
        {
            Marshal.Copy(bytes, 0, input.Data, bytes.Length);
            Blob output; var ok = protect ? CryptProtectData(ref input, null, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 1, out output) :
                CryptUnprotectData(ref input, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 1, out output);
            if (!ok) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            try { var result = new byte[output.Size]; Marshal.Copy(output.Data, result, 0, result.Length); return result; }
            finally { LocalFree(output.Data); }
        }
        finally { Marshal.FreeHGlobal(input.Data); }
    }
    [StructLayout(LayoutKind.Sequential)] private struct Blob { public int Size; public IntPtr Data; }
    [DllImport("crypt32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool CryptProtectData(ref Blob input, string? description,
        IntPtr entropy, IntPtr reserved, IntPtr prompt, uint flags, out Blob output);
    [DllImport("crypt32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool CryptUnprotectData(ref Blob input, IntPtr description,
        IntPtr entropy, IntPtr reserved, IntPtr prompt, uint flags, out Blob output);
    [DllImport("kernel32.dll")] private static extern IntPtr LocalFree(IntPtr ptr);
}

