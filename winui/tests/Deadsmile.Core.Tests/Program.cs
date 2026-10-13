using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Deadsmile.Core;

var tests = new List<(string, Func<Task>)>();
var skipped = 0;
void Add(string name, Action action) => tests.Add((name, () => { action(); return Task.CompletedTask; }));
void Async(string name, Func<Task> action) => tests.Add((name, action));
void Check(bool value) { if (!value) throw new Exception("Assertion failed"); }
void Reject(Action action) { try { action(); } catch (LauncherException) { return; } throw new Exception("Expected rejection"); }
async Task RejectAsync(Func<Task> action) { try { await action(); } catch (LauncherException) { return; } throw new Exception("Expected rejection"); }
const string id = "c24ddf96-8bea-46f5-9707-d6997d996c2b";
var root = Path.Combine(Path.GetTempPath(), "deadsmile-tests-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);

Add("Catalog artwork resolves both current and legacy API field names", () =>
{
    Check(new Game(J.Obj(("coverImage", "https://example.com/current.png"))).Cover == "https://example.com/current.png");
    Check(new Game(J.Obj(("cover_image", "https://example.com/legacy.png"))).Cover == "https://example.com/legacy.png");
});
Add("Alternate achievement fields preserve the original API contract", () =>
{
    var metadata = J.Obj(("unlockedAt", "2026-10-12"), ("error", J.Obj(("code", "UNAUTHENTICATED"))));
    Check(metadata.At("unlocked_at", "unlockedAt").S() == "2026-10-12");
    Check(metadata.At("error").S("code") == "UNAUTHENTICATED");
});
Add("Private IPv4 and mapped IPv6 cannot be download targets", () =>
{
    foreach (var ip in new[] { "127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254",
        "100.64.0.1", "198.18.1.1", "0.0.0.0", "::ffff:127.0.0.1" }) Check(!SafeNetwork.Public(IPAddress.Parse(ip)));
    Check(SafeNetwork.Public(IPAddress.Parse("8.8.8.8")));
});
Add("Non-global IPv6 is blocked", () =>
{
    foreach (var ip in new[] { "::1", "::", "fe80::1", "fc00::1", "ff02::1", "2001:db8::1" }) Check(!SafeNetwork.Public(IPAddress.Parse(ip)));
    Check(SafeNetwork.Public(IPAddress.Parse("2606:4700:4700::1111")));
});
Add("Links require HTTPS and reject user credentials", () =>
{
    Check(Urls.Https("https://itch.io/game") is not null);
    Check(Urls.Https("https://user:pass@itch.io/game") is null);
    Check(Urls.Https("file:///secret") is null); Check(Urls.Https("http://itch.io") is null);
    Check(Urls.ItchOAuth("https://itch.io/user/oauth") is not null);
    Check(Urls.ItchOAuth("https://evil.invalid/user/oauth") is null);
});
Add("Deep links validate scheme, host and game identity", () =>
{
    Check(Urls.LaunchId("deadsmile://launch/" + id) == id);
    Check(Urls.LaunchId("https://launch/" + id) is null); Check(Urls.LaunchId("deadsmile://launch/not-id") is null);
});
Add("Metadata enforces archive authorization and size", () =>
{
    var valid = J.Obj(("delivery", "archive"), ("downloadUrl", "https://example.com/game.zip"), ("filename", "game.zip"), ("sizeBytes", 100));
    Check(DownloadMetadata.Parse(valid).Size == 100);
    valid["sizeBytes"] = -1; Reject(() => DownloadMetadata.Parse(valid));
    valid["sizeBytes"] = 100; valid["sha256"] = "bad"; Reject(() => DownloadMetadata.Parse(valid));
    valid["sha256"] = null; valid["delivery"] = "store"; Reject(() => DownloadMetadata.Parse(valid));
});
Add("PICO data decodes signed fixed point values", () =>
{
    var data = new string('0', 8) + "00010000" + new string('0', 496);
    Check(CloudSaveService.Number(Encoding.ASCII.GetBytes(data), 1) == 1);
    Check(CloudSaveService.Number(Encoding.ASCII.GetBytes("ffff0000" + new string('0', 504)), 0) == -1);
    Check(CloudSaveService.Number(Encoding.ASCII.GetBytes("bad"), 0) is null);
});
Add("Cloud save accepts only the PICO save format and matching hashes", () =>
{
    var valid = Encoding.ASCII.GetBytes(string.Join("\n", Enumerable.Repeat(new string('0', 64), 8)) + "\n");
    Check(CloudSaveService.Validate(valid).Length == 520);
    Reject(() => CloudSaveService.Validate(Encoding.ASCII.GetBytes("not a save")));
    Reject(() => CloudSaveService.Validate(valid, new string('a', 64)));
    var remote = J.Obj(("payload", Convert.ToBase64String(valid)));
    Check(CloudSaveService.RemoteBytes(remote).SequenceEqual(valid));
});
Add("Storage paths cannot escape settings", () =>
{
    var s = new Storage(Path.Combine(root, "storage"));
    Reject(() => PathGuard.RequireInside(s.Games, Path.Combine(s.Root, "outside.exe")));
    try { s.FilePath("../escape"); throw new Exception("Expected rejection"); } catch (ArgumentException) { }
    s.Write("sample.json", new { value = 42 }); Check(s.Read<JsonObject>("sample.json", new()).L("value") == 42);
});
Add("Version comparison is numeric", () =>
{
    Check(Versions.Compare("1.10", "1.9") > 0); Check(Versions.Compare("2.0", "2.0.0") == 0);
    Check(Versions.FromFilename("abby-v1.2.3.zip") == "1.2.3");
});
Async("ZIP extraction rejects traversal", async () =>
{
    var zip = Path.Combine(root, "traversal.zip");
    using (var archive = ZipFile.Open(zip, ZipArchiveMode.Create))
    { using var w = new StreamWriter(archive.CreateEntry("../escaped.exe").Open()); w.Write("bad"); }
    await RejectAsync(() => InstallationService.Extract(zip, Path.Combine(root, "extract-traversal"), default));
    Check(!File.Exists(Path.Combine(root, "escaped.exe")));
});
Async("ZIP extraction rejects Windows devices and alternate streams", async () =>
{
    foreach (var name in new[] { "CON.txt", "game.exe:payload", "folder/trailing. /game.exe" })
    {
        var zip = Path.Combine(root, Guid.NewGuid() + ".zip");
        using (var archive = ZipFile.Open(zip, ZipArchiveMode.Create))
        { using var w = new StreamWriter(archive.CreateEntry(name).Open()); w.Write("bad"); }
        await RejectAsync(() => InstallationService.Extract(zip, Path.Combine(root, Guid.NewGuid().ToString()), default));
    }
});
Async("A failed update leaves the prior installation intact", async () =>
{
    var s = new Storage(Path.Combine(root, "commit")); var service = new InstallationService(s);
    var original = service.Folder(id); Directory.CreateDirectory(original); File.WriteAllText(Path.Combine(original, "game.exe"), "old");
    InstallationService.WriteRecord(original, new(id, "game.exe", "1.0"));
    var staging = Path.Combine(s.Games, ".deadsmile-staging", "invalid"); Directory.CreateDirectory(staging);
    await RejectAsync(() => service.Commit(id, staging, "2.0", _ => false));
    Check(File.ReadAllText(Path.Combine(original, "game.exe")) == "old");
});
Async("Commit installs a verified identity record and retains its version", async () =>
{
    var s = new Storage(Path.Combine(root, "commit-success")); var service = new InstallationService(s);
    var staging = Path.Combine(s.Games, ".deadsmile-staging", "valid"); Directory.CreateDirectory(staging);
    File.WriteAllText(Path.Combine(staging, "game.exe"), "new");
    var installed = await service.Commit(id, staging, "2.0", _ => false);
    Check(File.Exists(installed.Path)); Check(InstallationService.ReadRecord(service.Folder(id), id)?.Version == "2.0");
});
Async("A running game prevents commit and uninstall", async () =>
{
    var s = new Storage(Path.Combine(root, "running")); var service = new InstallationService(s);
    var staging = Path.Combine(s.Games, ".deadsmile-staging", "valid"); Directory.CreateDirectory(staging);
    File.WriteAllText(Path.Combine(staging, "game.exe"), "new");
    await RejectAsync(() => service.Commit(id, staging, "2.0", _ => true));
    await RejectAsync(() => service.Uninstall(id, _ => true));
    Check(File.Exists(Path.Combine(staging, "game.exe")));
});
Async("Orphan backup recovery identifies the correct game", async () =>
{
    var s = new Storage(Path.Combine(root, "recovery")); var service = new InstallationService(s);
    var backup = service.Folder(id) + ".backup"; Directory.CreateDirectory(backup);
    File.WriteAllText(Path.Combine(backup, "game.exe"), "old"); InstallationService.WriteRecord(backup, new(id, "game.exe", "1.0"));
    await service.Refresh([new Game(J.Obj(("id", id), ("slug", "abby")))], _ => false);
    Check(service.Installed.ContainsKey(id)); Check(!Directory.Exists(backup));
});
Async("Unsafe installation records cannot authorize execution", async () =>
{
    var s = new Storage(Path.Combine(root, "bad-record")); var service = new InstallationService(s);
    var folder = service.Folder(id); Directory.CreateDirectory(folder);
    File.WriteAllText(Path.Combine(s.Games, "outside.exe"), "outside");
    InstallationService.WriteRecord(folder, new(id, "../outside.exe", "1.0"));
    Check(InstallationService.ReadRecord(folder, id) is null);
    await RejectAsync(() => service.Uninstall(id, _ => false));
    Check(File.Exists(Path.Combine(s.Games, "outside.exe")));
});
Async("API requests cannot escape the configured origin or route set", async () =>
{
    using var api = new ApiClient(new Localization(), testHandler: new FakeHttp(_ => throw new Exception("Must not send")));
    await RejectAsync(() => api.Get("https://evil.invalid/"));
    await RejectAsync(() => api.Get("/../csrf"));
});
Async("CSRF refresh retries one write with a fresh token", async () =>
{
    var tokens = 0; var writes = 0;
    using var api = new ApiClient(new Localization(), testHandler: new FakeHttp(req =>
    {
        Check(req.RequestUri!.Host == "api-ust8.onrender.com");
        if (req.Method == HttpMethod.Get) return Reply(200, "{\"data\":{\"token\":\"token" + (++tokens) + "\"}}");
        writes++; Check(req.Headers.GetValues("X-CSRF-Token").Single() == "token" + tokens);
        return writes == 1 ? Reply(403, "{\"error\":{\"code\":\"CSRF_VALIDATION_FAILED\"}}") : Reply(200, "{\"data\":{\"id\":\"user\"}}");
    }));
    Check((await api.Post("/auth/mobile-login", new { email = "test", password = "test" })).S("id") == "user");
    Check(tokens == 2 && writes == 2);
});
Async("API unauthorized responses notify session invalidation", async () =>
{
    using var api = new ApiClient(new Localization(), testHandler: new FakeHttp(_ => Reply(401, "{\"error\":{\"code\":\"UNAUTHENTICATED\"}}")));
    var fired = false; api.Invalidated += () => fired = true;
    await RejectAsync(() => api.Get("/auth/me")); Check(fired);
});
Async("Symlink installation is rejected", async () =>
{
    var s = new Storage(Path.Combine(root, "links")); var service = new InstallationService(s);
    var outside = Path.Combine(root, "outside-link"); Directory.CreateDirectory(outside); File.WriteAllText(Path.Combine(outside, "game.exe"), "outside");
    var folder = service.Folder(id);
    try { Directory.CreateSymbolicLink(folder, outside); }
    catch (UnauthorizedAccessException) { skipped++; Console.WriteLine("SKIP symlink privilege unavailable"); return; }
    catch (IOException ex) when (OperatingSystem.IsWindows() && (ex.HResult & 0xffff) == 1314)
    { skipped++; Console.WriteLine("SKIP symlink privilege unavailable"); return; }
    Reject(() => PathGuard.RequireInside(s.Games, Path.Combine(folder, "game.exe")));
    Check(InstallationService.ReadRecord(folder, id) is null);
    await Task.CompletedTask;
});
Async("Visitor catalog uses public endpoints and does not request a private library", async () =>
{
    using var api = new ApiClient(new Localization(), testHandler: new FakeHttp(req =>
    {
        Check(req.RequestUri!.AbsolutePath.EndsWith("/games"));
        Check(req.RequestUri.Query == "?page=1&limit=48");
        return Reply(200, new JsonObject { ["data"] = J.Obj(("items", new[] { J.Obj(("id", id), ("slug", "demo"), ("title", "Demo"), ("accessType", "free")) }), ("pagination", J.Obj(("totalPages", 1)))) }.ToJsonString());
    }));
    var games = await PublicCatalog.Load(api, false); Check(games.Length == 1 && !games[0].InLibrary && !games[0].CanLaunch);
});
Async("Authenticated catalog merges ownership without mutating public data", async () =>
{
    var source = J.Obj(("id", id), ("slug", "demo"), ("title", "Demo"), ("accessType", "paid"));
    using var api = new ApiClient(new Localization(), testHandler: new FakeHttp(req => Reply(200,
        new JsonObject { ["data"] = req.RequestUri!.AbsolutePath.EndsWith("/games") ?
            J.Obj(("items", new[] { source }), ("pagination", J.Obj(("totalPages", 1)))) :
            J.Obj(("items", new[] { J.Obj(("id", id), ("owned", true), ("inLibrary", true)) })) }.ToJsonString())));
    var games = await PublicCatalog.Load(api, true); Check(games[0].Owned && games[0].InLibrary && games[0].CanLaunch); Check(source.At("owned") is null);
});
Add("Paid games require ownership and library membership", () =>
{
    var outside = new Game(J.Obj(("id", id), ("accessType", "paid"), ("owned", true), ("inLibrary", false)));
    var inLibrary = new Game(J.Obj(("id", id), ("accessType", "paid"), ("owned", true), ("inLibrary", true)));
    var unowned = new Game(J.Obj(("id", id), ("accessType", "paid"), ("owned", false), ("inLibrary", true)));
    Check(!outside.CanLaunch);
    Check(inLibrary.CanLaunch);
    Check(!unowned.CanLaunch);
});
Add("Search text includes languages and catalog tags", () =>
{
    var game = new Game(J.Obj(("id", id), ("title", "Demo"), ("genres", new[] { "Platformer" }),
        ("languages", new[] { "Português", "English" }), ("supported_languages", new[] { "Español" }),
        ("tags", new[] { "metroidvania", "controller" }), ("categories", new[] { "single-player" })));
    Check(game.SearchText.Contains("Português", StringComparison.OrdinalIgnoreCase));
    Check(game.SearchText.Contains("metroidvania", StringComparison.OrdinalIgnoreCase));
    Check(game.SearchText.Contains("single-player", StringComparison.OrdinalIgnoreCase));
});
Add("Store poster, product icon and direct trailer remain distinct", () =>
{
    var game = new Game(J.Obj(("coverImage", "https://example.com/fallback.png"), ("microsoftStore", J.Obj(
        ("images", new[] { J.Obj(("purpose", "logo"), ("width", 150), ("height", 150), ("url", "https://example.com/icon.png")),
            J.Obj(("purpose", "Poster"), ("width", 1440), ("height", 2160), ("url", "https://example.com/cover.png")) }),
        ("trailers", new[] { J.Obj(("url", "https://example.com/trailer.mpd")) })))));
    Check(game.Poster.EndsWith("cover.png") && game.ProductIcon.EndsWith("icon.png") && game.BackgroundVideo.EndsWith("trailer.mpd"));
    Check(new Game(J.Obj(("coverImage", "https://example.com/fallback.png"))).Poster.EndsWith("fallback.png"));
});
Add("Boot error codes stay local and independent of sensitive exception messages", () =>
{
    Check(LauncherErrors.Number(new LauncherException("NETWORK_ERROR")) == 6794);
    Check(LauncherErrors.Number(new Exception("sensitive message")) == 6802);
});
Async("Public content routes reject arbitrary query strings and non-local paths", async () =>
{
    using var api = new ApiClient(new Localization(), testHandler: new FakeHttp(_ => throw new Exception("Must not send")));
    await RejectAsync(() => api.Get("/games?page=1&limit=48&url=https://evil.invalid"));
    await RejectAsync(() => api.Get("/newswire/../account"));
    await RejectAsync(() => api.Put("/account/sessions", new { }));
});
Async("A stale unauthorized response cannot invalidate a newer login", async () =>
{
    var pending = new TaskCompletionSource<HttpResponseMessage>();
    using var api = new ApiClient(new Localization(), testHandler: new AsyncFakeHttp(req =>
        req.RequestUri!.AbsolutePath.EndsWith("/auth/me") ? pending.Task :
        Task.FromResult(Reply(200, req.RequestUri.AbsolutePath.EndsWith("/csrf") ? "{\"data\":{\"token\":\"csrf\"}}" : "{\"data\":{\"id\":\"new-session\"}}"))));
    var invalidated = false; api.Invalidated += () => invalidated = true;
    var stale = api.Get("/auth/me"); await api.Post("/auth/mobile-login", new { email = "fixture", password = "fixture" });
    pending.SetResult(Reply(401, "{\"error\":{\"code\":\"UNAUTHENTICATED\"}}"));
    await RejectAsync(async () => await stale); Check(!invalidated);
});
var failed = 0;
try
{
    foreach (var (name, run) in tests)
    { try { await run(); Console.WriteLine("PASS " + name); } catch (Exception e) { failed++; Console.WriteLine("FAIL " + name + ": " + e.Message); } }
}
finally { try { Directory.Delete(root, true); } catch { } }
Console.WriteLine($"Total: {tests.Count}, passed: {tests.Count - failed - skipped}, skipped: {skipped}, failed: {failed}"); return failed == 0 ? 0 : 1;

static HttpResponseMessage Reply(int status, string body) => new((HttpStatusCode)status)
{ Content = new StringContent(body, Encoding.UTF8, "application/json") };
sealed class FakeHttp(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(respond(request));
}


sealed class AsyncFakeHttp(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => respond(request);
}
