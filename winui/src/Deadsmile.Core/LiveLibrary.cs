using System.Net.WebSockets;
using System.Text;
using System.Text.Json.Nodes;

namespace Deadsmile.Core;

public sealed class LiveLibrary(ApiClient api) : IDisposable
{
    private CancellationTokenSource? stop;
    private long after;
    private bool initialized;
    private readonly SemaphoreSlim gate = new(1, 1);
    public event Action? Changed;
    public event Action<JsonNode>? EventReceived;
    public void Start(bool authenticated = true)
    {
        Stop(); after = 0; initialized = false; stop = new();
        _ = PollLoop(stop.Token); if (authenticated) _ = SocketLoop(stop.Token);
    }
    public void Stop() { stop?.Cancel(); stop?.Dispose(); stop = null; }
    private async Task Poll(CancellationToken ct)
    {
        if (!await gate.WaitAsync(0, ct)) return;
        try
        {
            var changed = false;
            for (var page = 0; page < 10; page++)
            {
                var items = (await api.Get("/platform/events?after=" + after + "&limit=100", ct)).Items().ToArray();
                foreach (var item in items)
                {
                    if (item.L("id") <= after) continue;
                    after = item.L("id");
                    if (initialized)
                    {
                        EventReceived?.Invoke(item.DeepClone());
                        if (item.S("event_type") is "game.published" or "game.available" or "game.purchasable" or "game.redeemable" or "game.released" or "game.updated" or "game.version.updated" or "game.deleted" or "news.updated" or "news.published" or "news.deleted" or "launcher.updated" or "launcher.released") changed = true;
                    }
                }
                if (items.Length < 100) { initialized = true; break; }
            }
            if (changed) Changed?.Invoke();
        }
        finally { gate.Release(); }
    }
    private async Task PollLoop(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                try { await Poll(ct); }
                catch (LauncherException ex)
                {
                    LauncherLog.Warning("LiveLibrary", $"event poll failed; status={ex.Status}; code={ex.Code}");
                }
                await Task.Delay(15000, ct);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex) { LauncherLog.Error("LiveLibrary", "event poll loop failed", ex); }
    }
    private async Task SocketLoop(CancellationToken ct)
    {
        var attempt = 0;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var ticket = (await api.Get("/platform/live-ticket", ct)).S("ticket");
                if (ticket.Length == 0) throw new LauncherException("INVALID_RESPONSE");
                using var socket = new ClientWebSocket();
                using var handshake = CancellationTokenSource.CreateLinkedTokenSource(ct);
                handshake.CancelAfter(8000);
                await socket.ConnectAsync(new Uri("wss://api-ust8.onrender.com/api/live?ticket=" + Uri.EscapeDataString(ticket)), handshake.Token);
                var buffer = new byte[8192]; var authenticated = false;
                while (socket.State == WebSocketState.Open)
                {
                    using var message = new MemoryStream(); WebSocketReceiveResult result;
                    do
                    {
                        result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), authenticated ? ct : handshake.Token);
                        if (result.MessageType == WebSocketMessageType.Close) break;
                        if (message.Length + result.Count > 65536) throw new LauncherException("INVALID_RESPONSE");
                        message.Write(buffer, 0, result.Count);
                    } while (!result.EndOfMessage);
                    if (result.MessageType == WebSocketMessageType.Close) break;
                    var n = JsonNode.Parse(Encoding.UTF8.GetString(message.ToArray()));
                    if (n.S("type") == "connected")
                    {
                        authenticated = n.B("authenticated");
                        if (!authenticated) break;
                        attempt = 0;
                    }
                    if (authenticated) await Poll(ct);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                LauncherLog.Error("LiveLibrary", $"live socket failed; reconnect_attempt={attempt + 1}", ex);
            }
            try { await Task.Delay(Math.Min(30000, 1000 * (1 << Math.Min(attempt++, 5))), ct); }
            catch (OperationCanceledException) { return; }
        }
    }
    public void Dispose() => Stop();
}

