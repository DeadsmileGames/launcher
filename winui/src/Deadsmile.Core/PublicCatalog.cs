using System.Text.Json.Nodes;

namespace Deadsmile.Core;

public static class PublicCatalog
{
    public static async Task<Game[]> Load(ApiClient api, bool authenticated, CancellationToken ct = default)
    {
        var items = new List<Game>(); var pages = 1;
        for (var page = 1; page <= pages; page++)
        {
            var data = await api.Get($"/games?page={page}&limit=48", ct);
            if (data.At("items") is not JsonArray) throw new LauncherException("INVALID_RESPONSE");
            pages = (int)Math.Clamp(data.At("pagination").L("totalPages"), 1, 999);
            foreach (var item in data.At("items").Items())
            {
                if (!Guid.TryParse(item.S("id"), out _) || item.S("title").Length == 0 || !System.Text.RegularExpressions.Regex.IsMatch(item.S("slug"), "^[a-z0-9-]{1,120}$"))
                    throw new LauncherException("INVALID_RESPONSE");
                items.Add(new Game(item));
            }
            if (items.Count > 10000) throw new LauncherException("INVALID_RESPONSE");
        }
        var owned = authenticated
            ? (await api.Get("/library/catalog", ct)).At("items").Items()
                .Where(x => Guid.TryParse(x.S("id"), out _))
                .GroupBy(x => Urls.Id(x.S("id")), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, JsonNode>(StringComparer.OrdinalIgnoreCase);
        using var gate = new SemaphoreSlim(4);
        var tasks = items.Select(async game =>
        {
            var data = (JsonObject)game.Data.DeepClone();
            if (authenticated && owned.TryGetValue(Urls.Id(game.Id), out var entry))
            {
                data["owned"] = false;
                data["inLibrary"] = false;
                foreach (var key in new[] { "owned", "inLibrary", "accessType", "version" })
                    if (entry.At(key) is { } value) data[key] = value.DeepClone();
            }
            else
            {

                data["owned"] = false;
                data["inLibrary"] = false;
            }

            if (game.Data.At("microsoftStoreBadge") is not null)
            {
                await gate.WaitAsync(ct);
                try
                {
                    var detail = await api.Get("/games/" + Urls.Slug(game.Slug), ct);
                    if (detail.S("id") == game.Id && detail.At("microsoftStore") is { } store) data["microsoftStore"] = store.DeepClone();
                }
                catch (LauncherException ex) when (ex.Code is "MICROSOFT_STORE_UNAVAILABLE" or "GAME_NOT_FOUND") { }
                finally { gate.Release(); }
            }
            return new Game(data);
        });
        return await Task.WhenAll(tasks);
    }
}
