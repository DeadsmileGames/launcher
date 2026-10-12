using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Nodes;
using Deadsmile.Core;

namespace Deadsmile.Launcher.Services;

public sealed record LauncherUpdate(string Version, string Url, string Name, string Sha256, long Size, string Notes);
public sealed class UpdateService(Storage storage)
{
    public async Task<LauncherUpdate?> Check()
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Deadsmile-Games-Launcher/" + BuildInfo.Version);
        var json = await http.GetStringAsync("https://api.github.com/repos/deadsmilegames/launcher/releases/latest");
        var release = JsonNode.Parse(json); var version = release.S("tag_name").TrimStart('v', 'V');
        if (Versions.Compare(version, BuildInfo.Version) <= 0) return null;
        var asset = release.At("assets").Items().FirstOrDefault(x =>
            x.S("name").StartsWith("Deadsmile-Games-Launcher-WinUI-Setup-", StringComparison.OrdinalIgnoreCase) &&
            x.S("name").EndsWith("-x64.exe", StringComparison.OrdinalIgnoreCase));
        if (asset is null || Urls.Https(asset.S("browser_download_url")) is not { Host: "github.com" }) return null;
        var digest = asset.S("digest");
        if (!System.Text.RegularExpressions.Regex.IsMatch(digest, "^sha256:[a-fA-F0-9]{64}$"))
            throw new LauncherException("UPDATE_CHECKSUM_MISSING");
        var size = asset.L("size");
        if (size <= 0 || size > 1024L * 1024 * 1024) throw new LauncherException("UPDATE_INVALID");
        return new(version, asset.S("browser_download_url"), asset.S("name"), digest[7..].ToLowerInvariant(), size, release.S("body"));
    }
    public async Task<string> Download(LauncherUpdate update)
    {
        var folder = Path.Combine(storage.Settings, "updates"); PathGuard.CheckAncestors(folder); Directory.CreateDirectory(folder);
        var target = Path.Combine(folder, "setup-" + Guid.NewGuid().ToString("N") + ".exe");
        try
        {
            using var http = SafeNetwork.CreateClient();
            using var stop = new CancellationTokenSource(TimeSpan.FromMinutes(15));
            using var response = await SafeNetwork.Get(http, update.Url, 0, stop.Token);
            response.EnsureSuccessStatusCode();
            await using (var input = await response.Content.ReadAsStreamAsync(stop.Token))
            await using (var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true))
            {
                var buffer = new byte[81920]; long size = 0; int count;
                while ((count = await input.ReadAsync(buffer, stop.Token)) > 0)
                {
                    size += count; if (size > update.Size) throw new LauncherException("UPDATE_INVALID");
                    await output.WriteAsync(buffer.AsMemory(0, count), stop.Token);
                }
                if (size != update.Size) throw new LauncherException("UPDATE_INVALID");
            }
            await using (var file = File.OpenRead(target))
                if (Convert.ToHexString(await SHA256.HashDataAsync(file)).ToLowerInvariant() != update.Sha256)
                    throw new LauncherException("UPDATE_CHECKSUM_MISMATCH");
            await Task.Run(() => Verify(target));
            return target;
        }
        catch { if (File.Exists(target)) File.Delete(target); throw; }
    }
    public void Install(string path)
    {
        PathGuard.RequireInside(Path.Combine(storage.Settings, "updates"), path); Verify(path);
        _ = Process.Start(new ProcessStartInfo(path) { UseShellExecute = true, Arguments = "/UPGRADE" })
            ?? throw new LauncherException("UPDATE_FAILED");
    }
    private static void Verify(string path)
    {
        var action = new Guid("00AAC56B-CD44-11d0-8CC2-00C04FC295EE");
        var info = new FileInfoNative { Size = (uint)Marshal.SizeOf<FileInfoNative>(), Path = path };
        var pointer = Marshal.AllocHGlobal(Marshal.SizeOf<FileInfoNative>());
        try
        {
            Marshal.StructureToPtr(info, pointer, false);
            var data = new TrustData { Size = (uint)Marshal.SizeOf<TrustData>(), Ui = 2, Revocation = 1, Choice = 1,
                File = pointer, StateAction = 1 };
            try { if (WinVerifyTrust(new IntPtr(-1), ref action, ref data) != 0) throw new LauncherException("UPDATE_SIGNATURE_INVALID"); }
            finally { data.StateAction = 2; WinVerifyTrust(new IntPtr(-1), ref action, ref data); }
            using var installed = new X509Certificate2(X509Certificate.CreateFromSignedFile(Environment.ProcessPath!));
            using var downloaded = new X509Certificate2(X509Certificate.CreateFromSignedFile(path));
            if (!installed.GetPublicKey().SequenceEqual(downloaded.GetPublicKey()))
                throw new LauncherException("UPDATE_SIGNATURE_INVALID");
        }
        catch (CryptographicException) { throw new LauncherException("UPDATE_SIGNATURE_INVALID"); }
        finally { Marshal.DestroyStructure<FileInfoNative>(pointer); Marshal.FreeHGlobal(pointer); }
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct FileInfoNative { public uint Size; [MarshalAs(UnmanagedType.LPWStr)] public string Path; public IntPtr Handle, Subject; }
    [StructLayout(LayoutKind.Sequential)]
    private struct TrustData
    {
        public uint Size; public IntPtr Policy, Sip; public uint Ui, Revocation, Choice; public IntPtr File;
        public uint StateAction; public IntPtr State, Url; public uint Flags, Context; public IntPtr Signature;
    }
    [DllImport("wintrust.dll", ExactSpelling = true, SetLastError = true)]
    private static extern int WinVerifyTrust(IntPtr hwnd, ref Guid action, ref TrustData data);
}

