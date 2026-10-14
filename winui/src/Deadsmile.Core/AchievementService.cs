using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Deadsmile.Core;

public sealed record AchievementDefinition(string Key, int Index, string Title, string Description, int Points, bool Hidden = false);
public sealed record PendingAchievement(string GameId, string Key, string UserId, int Attempts, DateTimeOffset NextAttemptAt);

public sealed class AchievementService(ApiClient api, Storage storage)
{
    public static readonly AchievementDefinition[] Abby =
    [
        new("finish_story", 1, "Restless no more", "Reach the end of Abby's journey.", 100),
        new("first_checkpoint", 4, "Keep moving", "Reach your first checkpoint.", 20),
        new("first_coin", 5, "A little spark", "Collect your first coin.", 20),
        new("all_coins", 6, "Every little piece", "Collect every coin in a run.", 75),
        new("no_death_finish", 7, "Unbroken Heart", "Finish Abby's journey without dying.", 150, true)
    ];
    private readonly SemaphoreSlim gate = new(1, 1);
    private readonly HashSet<string> shown = new();
    public event Action<string, JsonNode>? Unlocked;
    private CancellationTokenSource? syncStop;
    private readonly Dictionary<string, (DateTimeOffset Time, JsonNode[] Items)> catalogCache = new();
    public void Start(string userId)
    {
        Stop(); syncStop = new(); _ = Loop(userId, syncStop.Token);
    }
    public void Stop() { syncStop?.Cancel(); syncStop?.Dispose(); syncStop = null; }
    private async Task Loop(string userId, CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                try { await Sync(userId); }
                catch (Exception ex) { LauncherLog.Error("Achievements", "sync attempt failed; retry will continue", ex); }
                await Task.Delay(30000, ct);
            }
        }
        catch (OperationCanceledException) { }
    }
    public async Task Detect(Game game, string? target, string? liveFile, string userId)
    {
        if (!CloudSaveService.IsAbby(game.Title, game.SaveTemplate)) return;
        var keys = new HashSet<string>();
        if (target is not null && File.Exists(target))
        {
            PathGuard.CheckAncestors(target);
            var bytes = await File.ReadAllBytesAsync(target);
            foreach (var d in Abby) if (CloudSaveService.Number(bytes, d.Index) >= 1) keys.Add(d.Key);
        }
        if (liveFile is not null && File.Exists(liveFile))
        {
            PathGuard.CheckAncestors(liveFile);
            if (new FileInfo(liveFile).Length < 1024 * 1024)
                foreach (var key in (await File.ReadAllLinesAsync(liveFile)).Select(x => x.Trim()))
                    if (Abby.Any(x => x.Key == key)) keys.Add(key);
        }
        if (keys.Count == 0) return;
        await gate.WaitAsync();
        try
        {
            var cacheKey = userId + ":" + game.Id;
            if (!catalogCache.TryGetValue(cacheKey, out var cached) || cached.Time < DateTimeOffset.UtcNow.AddSeconds(-30))
            { cached = (DateTimeOffset.UtcNow, (await api.Get("/platform/achievements/" + Urls.Id(game.Id))).Items().ToArray()); catalogCache[cacheKey] = cached; }
            var catalog = cached.Items;
            var queue = storage.Read("achievement-sync.json", new List<PendingAchievement>());
            var queueChanged = false;
            foreach (var key in keys)
            {
                if (catalog.Any(x => x.S("key") == key && (x.At("unlocked_at", "unlockedAt") is not null))) continue;
                if (!queue.Any(x => x.GameId == game.Id && x.Key == key && x.UserId == userId))
                {
                    queue.Add(new(game.Id, key, userId, 0, DateTimeOffset.UtcNow));
                    queueChanged = true;
                }
                var d = Abby.First(x => x.Key == key);
                if (shown.Add(userId + ":" + game.Id + ":" + key))
                    Unlocked?.Invoke(game.Id, J.Obj(("key", d.Key), ("title", d.Title), ("description", d.Description),
                        ("points", d.Points), ("hidden", d.Hidden), ("unlocked_at", DateTimeOffset.UtcNow.ToString("O"))));
            }
            if (queueChanged) storage.Write("achievement-sync.json", queue);
        }
        finally { gate.Release(); }
        await Sync(userId);
    }
    public async Task Sync(string userId)
    {
        await gate.WaitAsync();
        try
        {
            var queue = storage.Read("achievement-sync.json", new List<PendingAchievement>());
            var due = queue.Where(x => x.UserId == userId && x.NextAttemptAt <= DateTimeOffset.UtcNow)
                .Take(2).ToArray();
            if (due.Length == 0) return;
            if ((await api.Get("/auth/me")).S("id") != userId) return;
            foreach (var item in due)
            {
                if (!Guid.TryParse(item.GameId, out _) || !Regex.IsMatch(item.Key, "^[a-z0-9_]{2,80}$"))
                { queue.Remove(item); continue; }
                try
                {
                    await api.Post("/platform/achievements/" + item.GameId + "/" + item.Key + "/unlock",
                        new { expectedUserId = userId });
                    queue.Remove(item); catalogCache.Remove(userId + ":" + item.GameId);
                }
                catch (LauncherException ex) when (ex.Status is 400 or 404)
                { queue.Remove(item); storage.Log("ACHIEVEMENT_REJECTED"); }
                catch
                {
                    queue.Remove(item); var attempts = item.Attempts + 1;
                    queue.Add(item with { Attempts = attempts, NextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(
                        Math.Min(1800, 30 * Math.Pow(2, Math.Min(attempts, 6)))) });
                }
            }
            storage.Write("achievement-sync.json", queue);
        }
        finally { gate.Release(); }
    }
}

