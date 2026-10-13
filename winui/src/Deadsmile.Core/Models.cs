using System.Net;
using System.Text.Json;
using System.Reflection;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Deadsmile.Core;

public static class BuildInfo
{
    public static string Version { get; } = typeof(BuildInfo).Assembly.GetName().Version is { } v ?
        $"{v.Major}.{v.Minor}.{Math.Max(0, v.Build)}" : "2.0.0";
    public static string Revision
    {
        get
        {
            var informational = typeof(BuildInfo).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "";
            var plus = informational.LastIndexOf('+');
            var revision = plus >= 0 ? informational[(plus + 1)..] : "";
            return Regex.IsMatch(revision, "^[0-9a-fA-F]{40}$") ? revision.ToLowerInvariant() : "";
        }
    }
}

public static class J
{
    public static JsonNode? At(this JsonNode? n, params string[] keys)
    { foreach (var key in keys) if (n is JsonObject o && o[key] is { } v) return v; return null; }
    public static string S(this JsonNode? n, params string[] keys)
    {
        var v = keys.Length > 0 ? n.At(keys) : n;
        if (v is JsonValue j && j.TryGetValue<string>(out var s)) return s;
        return v is JsonValue ? v.ToJsonString() : "";
    }
    public static bool B(this JsonNode? n, params string[] keys) =>
        bool.TryParse(n.S(keys), out var v) && v;
    public static long L(this JsonNode? n, params string[] keys) =>
        long.TryParse(n.S(keys), out var v) ? v : 0;
    public static IEnumerable<JsonNode> Items(this JsonNode? n) =>
        n is JsonArray a ? a.Where(x => x is not null).Select(x => x!) : [];
    public static JsonObject Obj(params (string Key, object? Value)[] values)
    {
        var o = new JsonObject();
        foreach (var (key, value) in values) o[key] = JsonSerializer.SerializeToNode(value);
        return o;
    }
}

public sealed class LauncherException(string code, int status = 0) : Exception(code)
{
    public string Code { get; } = code;
    public int Status { get; } = status;
}

public sealed class Game(JsonNode data)
{
    // WinUI's XAML metadata generator cannot emit setters for record init-only properties.
    public JsonNode Data { get; } = data;
    public string Id => Data.S("id");
    public string Slug => Data.S("slug");
    public string Title => Data.S("title");
    public string Cover => Urls.Image(Data.S("coverImage", "cover_image")) ?? "";
    public string Engine => Data.S("engine");
    public string Description => Data.S("description");
    public string Version => Data.S("version");
    public bool InLibrary => Data.B("inLibrary");
    public bool Owned => Data.B("owned");
    public bool CanLaunch => Data.S("accessType") == "paid" ? Owned && InLibrary :
        Data.S("accessType") == "free" && InLibrary;
    public string SearchText
    {
        get
        {
            var values = new List<string>
            {
                Title, Slug, Description, Engine, Genres,
                Data.S("developer"), Data.S("publisher"), Data.S("language"),
                Data.S("supportedLanguage"), Data.S("supported_language"),
                Data.S("category"), Data.S("platform"), Data.S("releaseDate"),
                Data.S("release_date"), Data.S("searchKeywords")
            };
            foreach (var key in new[]
            {
                "languages", "supportedLanguages", "supported_languages", "categories",
                "tags", "platforms", "features", "keywords", "genres", "gameModes",
                "game_modes", "accessibilityFeatures"
            })
            {
                CollectSearchValues(Data.At(key), values);
                CollectSearchValues(Store.At(key), values);
            }
            if (Store is { } store)
            {
                values.Add(store.S("title", "productTitle"));
                values.Add(store.S("publisher", "developer"));
                CollectSearchValues(store.At("properties"), values);
            }
            return string.Join(" ", values.Where(value => !string.IsNullOrWhiteSpace(value)));
        }
    }
    private static void CollectSearchValues(JsonNode? node, List<string> values)
    {
        if (node is JsonArray array)
        {
            foreach (var item in array) CollectSearchValues(item, values);
        }
        else if (node is JsonObject obj)
        {
            foreach (var item in obj) CollectSearchValues(item.Value, values);
        }
        else if (node is not null)
        {
            var text = node.S();
            if (!string.IsNullOrWhiteSpace(text)) values.Add(text);
        }
    }
    public bool DownloadAvailable => Data.B("downloadAvailable");
    public bool CloudEnabled => Data.B("cloudSavesEnabled");
    public string SaveTemplate => Data.S("savePathTemplate");
    public string Trailer => Urls.Https(Data.S("trailerUrl", "trailer_url", "backgroundVideo", "background_video"))?.AbsoluteUri ?? "";
    public string Genres => string.Join(" · ", Data.At("genres").Items().Select(x => x.S()));
    public JsonNode? Store => Data.At("microsoftStore");
    public string[] HeroImages => Store.At("screenshots").Items().Select(x => Urls.Image(x is JsonObject ? x.S("url") : x.S()))
        .Where(x => x is not null).Select(x => x!).Distinct().ToArray() is { Length: > 0 } images ? images : [Cover];
    public string ProductIcon => Urls.Image(Store.At("images").Items().Where(x => x.L("width") == x.L("height") &&
        System.Text.RegularExpressions.Regex.IsMatch(x.S("purpose"), "square|logo|tile", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
        .OrderByDescending(x => x.L("width")).FirstOrDefault().S("url")) ?? "";
    public string Poster => Urls.Image(Store.At("images").Items()
        .Where(x => Regex.IsMatch(x.S("purpose"), "poster|boxart|cover", RegexOptions.IgnoreCase))
        .OrderBy(x => x.L("height") > x.L("width") ? 0 : 1).ThenByDescending(x => x.L("height"))
        .FirstOrDefault().S("url")) ?? Cover;
    public string BackgroundVideo => Store.At("trailers").Items()
        .Select(x => x.S("url", "videoUrl", "video_url", "streamUrl", "stream_url", "playbackUrl", "playback_url"))
        .Concat(Store.At("videos").Items().Select(x => x.S("url", "videoUrl", "video_url", "streamUrl", "stream_url")))
        .Concat(Data.At("videos").Items().Select(x => x.S("url", "videoUrl", "video_url", "streamUrl", "stream_url", "playbackUrl", "playback_url")))
        .Prepend(Trailer).OrderBy(x => x == Trailer ? 1 : 0)
        .FirstOrDefault(x => Urls.Https(x) is { } uri && (uri.AbsolutePath.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) ||
            uri.AbsolutePath.EndsWith(".mpd", StringComparison.OrdinalIgnoreCase) || uri.AbsolutePath.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase))) ?? "";
    public string[] Screenshots => Data.At("screenshots").Items()
        .Select(x => Urls.Image(x.S())).Where(x => x is not null).Select(x => x!).ToArray();
    public Game Merge(Game detail)
    {
        var data = (JsonObject)detail.Data.DeepClone();
        foreach (var key in new[] { "owned", "inLibrary", "accessType" })
            if (Data.At(key) is { } v) data[key] = v.DeepClone();
        return new Game(data);
    }
}

public sealed record InstallRecord(string GameId, string Executable, string? Version);
public sealed record InstalledGame(string Id, string Path, string FolderPath, string? Version);
public sealed record DownloadMetadata(string Url, string Filename, long Size, string? Sha256, string? Version)
{
    public static DownloadMetadata Parse(JsonNode? n)
    {
        var url = n.S("downloadUrl"); var filename = n.S("filename"); var size = n.L("sizeBytes");
        if (n.S("delivery") != "archive" || Urls.Https(url) is null ||
            !filename.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) || size <= 0 || size > 20L * 1024 * 1024 * 1024)
            throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
        var hash = n.S("sha256");
        if (hash.Length > 0 && !Regex.IsMatch(hash, "^[a-fA-F0-9]{64}$"))
            throw new LauncherException("DOWNLOAD_NOT_AUTHORIZED");
        return new(url, filename, size, hash.Length > 0 ? hash.ToLowerInvariant() : null,
            string.IsNullOrWhiteSpace(n.S("version")) ? Versions.FromFilename(filename) : n.S("version"));
    }
}

public static class Versions
{
    public static string? FromFilename(string value) =>
        Regex.Match(value, @"(?:^|[-_ v])(\d+(?:\.\d+){1,3})(?:[-_ .]|$)").Groups[1].Value is { Length: > 0 } v ? v : null;
    public static int Compare(string? a, string? b)
    {
        var x = Regex.Matches(a ?? "", @"\d+").Select(m => int.TryParse(m.Value, out var n) ? n : 0).Take(4).ToArray();
        var y = Regex.Matches(b ?? "", @"\d+").Select(m => int.TryParse(m.Value, out var n) ? n : 0).Take(4).ToArray();
        for (var i = 0; i < Math.Max(x.Length, y.Length); i++)
        { var c = (i < x.Length ? x[i] : 0).CompareTo(i < y.Length ? y[i] : 0); if (c != 0) return c; }
        return 0;
    }
}

public static class Urls
{
    public const string Website = "https://deadsmilegames.vercel.app";
    public static Uri? Https(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            !uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase) ||
            !string.IsNullOrEmpty(uri.UserInfo) || uri.Port != 443)
            return null;
        var host = uri.IdnHost.TrimEnd('.').ToLowerInvariant();
        if (host is "localhost" or "localhost.localdomain" ||
            host.EndsWith(".localhost", StringComparison.Ordinal) ||
            host.EndsWith(".local", StringComparison.Ordinal) ||
            host.EndsWith(".internal", StringComparison.Ordinal) ||
            host.EndsWith(".test", StringComparison.Ordinal))
            return null;
        if (IPAddress.TryParse(host, out var address) && !SafeNetwork.Public(address))
            return null;
        return uri;
    }
    public static string? Image(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (value.StartsWith('/') && !value.StartsWith("//") && !value.Contains('\\') &&
            !value.Any(char.IsControl)) return Https(Website + value)?.AbsoluteUri;
        return Https(value)?.AbsoluteUri;
    }
    public static Uri? ItchOAuth(string? value) =>
        Https(value) is { Host: "itch.io", AbsolutePath: "/user/oauth" } u ? u : null;
    public static string Id(string id) => Guid.TryParseExact(id, "D", out _) ? id.ToLowerInvariant() :
        throw new LauncherException("GAME_INVALID");
    public static string Slug(string slug) => Regex.IsMatch(slug, "^[a-z0-9-]{1,120}$") ? slug :
        throw new LauncherException("GAME_INVALID");
    public static string? LaunchId(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var u) || u.Scheme != "deadsmile" || u.Host != "launch") return null;
        return Guid.TryParseExact(u.AbsolutePath.Trim('/'), "D", out var id) ? id.ToString() : null;
    }
}

