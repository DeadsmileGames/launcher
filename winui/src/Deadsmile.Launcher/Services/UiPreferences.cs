using Microsoft.UI.Xaml;

namespace Deadsmile.Launcher.Services;

public sealed record UiPreferences
{
    public string Theme { get; init; } = "dark";
    public string Navigation { get; init; } = "compact";
    public bool Animations { get; init; } = true;
    public bool RotateBanners { get; init; } = true;
    public bool AchievementToasts { get; init; } = true;
    public bool WindowsMaterials { get; init; } = true;
    public bool CloseToTray { get; init; } = true;
    public bool Notifications { get; init; } = true;
    public bool VideoBackgrounds { get; init; } = true;
    public bool ShowNewswireOnHome { get; init; } = true;
    [System.Text.Json.Serialization.JsonIgnore]
    public ElementTheme ElementTheme => Theme switch { "light" => Microsoft.UI.Xaml.ElementTheme.Light, "system" => Microsoft.UI.Xaml.ElementTheme.Default, _ => Microsoft.UI.Xaml.ElementTheme.Dark };
}
