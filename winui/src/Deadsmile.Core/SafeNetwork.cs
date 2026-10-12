using System.Net;
using System.Net.Sockets;

namespace Deadsmile.Core;

public static class SafeNetwork
{
    public static bool Public(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) return Public(address.MapToIPv4());
        if (IPAddress.IsLoopback(address)) return false;
        var b = address.GetAddressBytes();
        if (b.Length == 4)
        {
            if (b[0] == 0 || b[0] == 10 || b[0] == 127 || b[0] >= 224 ||
                (b[0] == 169 && b[1] == 254) || (b[0] == 172 && b[1] is >= 16 and <= 31) ||
                (b[0] == 192 && b[1] == 168) || (b[0] == 100 && b[1] is >= 64 and <= 127) ||
                (b[0] == 198 && b[1] is 18 or 19) ||
                (b[0] == 192 && b[1] == 0 && b[2] is 0 or 2) ||
                (b[0] == 198 && b[1] == 51 && b[2] == 100) ||
                (b[0] == 203 && b[1] == 0 && b[2] == 113)) return false;
            return true;
        }
        return (b[0] & 0xe0) == 0x20 && !(b[0] == 0x20 && b[1] == 1 && b[2] == 0x0d && b[3] == 0xb8);
    }
    public static HttpClient CreateClient()
    {
        var handler = new SocketsHttpHandler
        {
            AllowAutoRedirect = false, UseCookies = false, ConnectTimeout = TimeSpan.FromSeconds(15),
            ConnectCallback = async (context, ct) =>
            {
                if (context.DnsEndPoint.Port != 443) throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
                var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, ct);
                if (addresses.Length == 0 || addresses.Any(ip => !Public(ip)))
                    throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
                foreach (var ip in addresses)
                {
                    var socket = new Socket(ip.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
                    try { await socket.ConnectAsync(new IPEndPoint(ip, 443), ct); return new NetworkStream(socket, true); }
                    catch (SocketException) { socket.Dispose(); }
                    catch { socket.Dispose(); throw; }
                }
                throw new HttpRequestException("Connection failed");
            }
        };
        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Deadsmile-Games-Launcher/" + BuildInfo.Version);
        return client;
    }
    public static async Task<HttpResponseMessage> Get(HttpClient client, string value, long offset, CancellationToken ct)
    {
        var uri = Urls.Https(value) ?? throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
        for (var redirects = 0; redirects < 8; redirects++)
        {
            if (uri.Port != 443) throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
            using var req = new HttpRequestMessage(HttpMethod.Get, uri);
            if (offset > 0) req.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(offset, null);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(45));
            var result = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            if ((int)result.StatusCode is 301 or 302 or 303 or 307 or 308)
            {
                var location = result.Headers.Location; result.Dispose();
                if (location is null) throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
                uri = Urls.Https(new Uri(uri, location).AbsoluteUri) ?? throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
                continue;
            }
            return result;
        }
        throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
    }
}

