using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Deadsmile.Core;

public sealed class ApiClient : IDisposable
{
    public static readonly Uri BaseUri = new("https://api-ust8.onrender.com/api/");
    private readonly HttpClient http;
    private readonly SemaphoreSlim csrfGate = new(1, 1);
    private readonly Action<CookieContainer>? saveCookies;
    private string? csrf;
    private long authGeneration;
    public CookieContainer Cookies { get; }
    public Localization Locale { get; }
    public event Action? Invalidated;
    private static readonly Regex Routes = new(
        @"^(GET csrf|GET auth/me|POST auth/(mobile-login|verify-2fa|logout|resend-email)|GET games/[a-z0-9-]{1,120}|GET integrations/itch|POST integrations/itch/connect|DELETE integrations/itch|GET library(/catalog)?|POST library/sync|POST library/[0-9a-f-]{36}(/install-metadata)?|GET platform/achievements/[0-9a-f-]{36}|POST platform/achievements/[0-9a-f-]{36}/[a-z0-9_]{2,80}/unlock|GET platform/saves/[0-9a-f-]{36}(/default)?|PUT platform/saves/[0-9a-f-]{36}/default|POST platform/sessions|POST platform/sessions/[0-9a-f-]{36}/end|GET platform/live-ticket|GET platform/events(\?after=\d+&limit=100)?)$", RegexOptions.Compiled);
    private static readonly Regex ContentRoutes = new(
        @"^(GET games\?page=[1-9][0-9]{0,2}&limit=48|GET launcher|GET newswire\?limit=24&offset=[0-9]{1,5}|GET newswire/[a-z0-9-]{1,160}|GET videos\?limit=24|GET wishlist|POST wishlist|DELETE wishlist/[0-9a-f-]{36}|GET account|GET account/privacy|PUT account/privacy|GET account/sessions|GET account/totp/status|PATCH account)$", RegexOptions.Compiled);

    public ApiClient(Localization locale, CookieContainer? cookies = null, Action<CookieContainer>? persist = null,
        HttpMessageHandler? testHandler = null)
    {
        Locale = locale; Cookies = cookies ?? new CookieContainer(); saveCookies = persist;
        http = new HttpClient(testHandler ?? new HttpClientHandler
        { CookieContainer = Cookies, UseCookies = true, AllowAutoRedirect = false, AutomaticDecompression = DecompressionMethods.All });
        http.BaseAddress = BaseUri; http.Timeout = TimeSpan.FromSeconds(30);
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Deadsmile-Games-Launcher/" + BuildInfo.Version);
    }
    public Task<JsonNode?> Get(string path, CancellationToken ct = default) => Request(HttpMethod.Get, path, null, ct);
    public Task<JsonNode?> Post(string path, object? body = null, CancellationToken ct = default) =>
        Request(HttpMethod.Post, path, body, ct);
    public Task<JsonNode?> Put(string path, object body, CancellationToken ct = default) => Request(HttpMethod.Put, path, body, ct);
    public Task<JsonNode?> Patch(string path, object body, CancellationToken ct = default) => Request(HttpMethod.Patch, path, body, ct);
    public Task<JsonNode?> Delete(string path, CancellationToken ct = default) => Request(HttpMethod.Delete, path, null, ct);
    private async Task<string> Csrf(CancellationToken ct)
    {
        await csrfGate.WaitAsync(ct);
        try
        {
            if (csrf is not null) return csrf;
            var n = await Request(HttpMethod.Get, "/csrf", null, ct);
            return csrf = n.S("token") is { Length: > 0 } t ? t :
                throw new LauncherException("CSRF_INIT_FAILED");
        }
        finally { csrfGate.Release(); }
    }
    public async Task<JsonNode?> Request(HttpMethod method, string path, object? body, CancellationToken ct, bool retry = true)
    {
        using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(ct);
        lifetime.CancelAfter(TimeSpan.FromSeconds(45));
        ct = lifetime.Token;
        path = path.TrimStart('/');
        if (!Routes.IsMatch(method.Method + " " + path) && !ContentRoutes.IsMatch(method.Method + " " + path)) throw new LauncherException("BLOCKED_REQUEST");
        var authMutation = method == HttpMethod.Post && Regex.IsMatch(path, "^auth/(mobile-login|verify-2fa|logout)$");
        var generation = authMutation ? Interlocked.Increment(ref authGeneration) : Interlocked.Read(ref authGeneration);
        var token = method != HttpMethod.Get && method != HttpMethod.Head ? await Csrf(ct) : null;
        using var req = new HttpRequestMessage(method, path);
        req.Headers.TryAddWithoutValidation("Accept", "application/json");
        req.Headers.TryAddWithoutValidation("Accept-Language", Locale.Language);
        if (token is not null) req.Headers.TryAddWithoutValidation("X-CSRF-Token", token);
        if (body is not null)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(body, Storage.JsonOptions);
            if (Encoding.UTF8.GetByteCount(json) > 600000) throw new LauncherException("INVALID_RESPONSE");
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }
        HttpResponseMessage response;
        try { response = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct); }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw new LauncherException("NETWORK_ERROR"); }
        catch (HttpRequestException) { throw new LauncherException("NETWORK_ERROR"); }
        using (response)
        {
            if (response.Content.Headers.ContentLength > 8 * 1024 * 1024) throw new LauncherException("INVALID_RESPONSE");
            await using var input = await response.Content.ReadAsStreamAsync(ct);
            using var bytes = new MemoryStream(); var buffer = new byte[16384]; int count;
            while ((count = await input.ReadAsync(buffer, ct)) > 0)
            {
                if (bytes.Length + count > 8 * 1024 * 1024) throw new LauncherException("INVALID_RESPONSE");
                bytes.Write(buffer, 0, count);
            }
            JsonNode? payload;
            try { payload = bytes.Length == 0 ? null : JsonNode.Parse(bytes.ToArray()); }
            catch (System.Text.Json.JsonException) { throw new LauncherException("INVALID_RESPONSE"); }
            saveCookies?.Invoke(Cookies);
            if (!response.IsSuccessStatusCode)
            {
                var code = payload.At("error").S("code");
                if (!Regex.IsMatch(code, "^[A-Z][A-Z0-9_]{1,79}$")) code = "UNKNOWN_ERROR";
                if (response.StatusCode == HttpStatusCode.Forbidden && code == "CSRF_VALIDATION_FAILED" && retry)
                { csrf = null; return await Request(method, "/" + path, body, ct, false); }
                if (response.StatusCode == HttpStatusCode.Unauthorized && generation == Interlocked.Read(ref authGeneration))
                { csrf = null; Invalidated?.Invoke(); }
                throw new LauncherException(code.Length > 0 ? code : "UNKNOWN_ERROR", (int)response.StatusCode);
            }
            if (authMutation) Interlocked.CompareExchange(ref authGeneration, generation + 1, generation);
            return payload.At("data")?.DeepClone();
        }
    }
    public void ClearSession()
    {
        Interlocked.Increment(ref authGeneration);
        csrf = null;
        foreach (Cookie c in Cookies.GetAllCookies()) c.Expired = true;
        saveCookies?.Invoke(Cookies);
    }
    public async Task<Game> TrustedGame(string id, string slug, CancellationToken ct = default)
    {
        id = Urls.Id(id);
        if (!string.IsNullOrEmpty(slug))
        {
            var n = await Get("/games/" + Urls.Slug(slug), ct);
            if (n.S("id") == id) return new Game(n!);
        }
        var library = await Get("/library", ct);
        var item = library.At("items").Items().FirstOrDefault(n => n.S("id") == id);
        return item is null ? throw new LauncherException("GAME_METADATA_UNAVAILABLE") : new Game(item);
    }
    public async Task<DownloadMetadata> Metadata(string id, CancellationToken ct = default) =>
        DownloadMetadata.Parse(await Post("/library/" + Urls.Id(id) + "/install-metadata", null, ct));
    public void Dispose() { http.Dispose(); csrfGate.Dispose(); }
}

