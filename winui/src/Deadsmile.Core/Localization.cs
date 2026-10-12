using System.Reflection;
using System.Text.Json;

namespace Deadsmile.Core;

public sealed class Localization
{
    private readonly Dictionary<string, Dictionary<string, string>> messages = Load("messages.json");
    private readonly Dictionary<string, Dictionary<string, string>> errors = Load("errors.json");
    public string Language { get; set; } = "pt-BR";
    public string T(string key) => messages.GetValueOrDefault(Language)?.GetValueOrDefault(key)
        ?? messages.GetValueOrDefault("en")?.GetValueOrDefault(key) ?? key;
    public string Error(Exception ex) => Error(ex is LauncherException le ? le.Code : ex is OperationCanceledException or HttpRequestException ? "NETWORK_ERROR" : "INTERNAL_ERROR");
    public string Error(string code) => errors.GetValueOrDefault(Language)?.GetValueOrDefault(code)
        ?? errors.GetValueOrDefault("en")?.GetValueOrDefault(code) ?? T("Something went wrong. Try again later.");
    private static Dictionary<string, Dictionary<string, string>> Load(string name)
    {
        using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("Deadsmile.Core." + name)
            ?? throw new InvalidOperationException("Missing localization resource");
        return JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(s)!;
    }
}

