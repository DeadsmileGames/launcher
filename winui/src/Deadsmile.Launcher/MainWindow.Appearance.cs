using Deadsmile.Launcher.Services;
using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Animation;
using Windows.UI.ViewManagement;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    public UiPreferences Preferences { get; private set; } = new();
    public bool MotionEnabled => Preferences.Animations && new UISettings().AnimationsEnabled;
    public ElementTheme UiTheme => Root.RequestedTheme;
    private bool applyingAppearance;
    private readonly UISettings systemUi = new();

    private void ApplyAppearance()
    {
        applyingAppearance = true;
        try
        {
            Root.RequestedTheme = Preferences.Theme == "system" ?
                (systemUi.GetColorValue(UIColorType.Background).R > 128 ? ElementTheme.Light : ElementTheme.Dark) : Preferences.ElementTheme;
            ThemeChoice.SelectedIndex = Preferences.Theme == "light" ? 1 : Preferences.Theme == "system" ? 2 : 0;
            NavigationChoice.SelectedIndex = Preferences.Navigation == "expanded" ? 1 : 0;
            AnimationToggle.IsOn = Preferences.Animations; BannerToggle.IsOn = Preferences.RotateBanners;
            MaterialsToggle.IsOn = Preferences.WindowsMaterials; ToastToggle.IsOn = Preferences.AchievementToasts;
            TrayToggle.IsOn = Preferences.CloseToTray; NotificationsToggle.IsOn = Preferences.Notifications; VideoToggle.IsOn = Preferences.VideoBackgrounds;
            NewswireToggle.IsOn = Preferences.ShowNewswireOnHome;
            Shell.PaneDisplayMode = Preferences.Navigation == "expanded" ? NavigationViewPaneDisplayMode.Left : NavigationViewPaneDisplayMode.LeftCompact;
            Shell.IsPaneOpen = Preferences.Navigation == "expanded" && Root.ActualWidth >= 1008;
            foreach (var surface in new FrameworkElement[] { LoginLayout, CatalogPanel, DetailPanel, DownloadsPanel, SettingsPanel })
                surface.Transitions = MotionEnabled ? new TransitionCollection { new EntranceThemeTransition { FromVerticalOffset = 24, IsStaggeringEnabled = false } } : null;
            DetailContent.ChildrenTransitions = MotionEnabled ? new TransitionCollection { new ContentThemeTransition() } : null;
            GameGrid.ItemContainerTransitions = MotionEnabled ? new TransitionCollection { new EntranceThemeTransition(), new RepositionThemeTransition() } : null;
            ApplyCaptionColors(); overlay?.ApplyPreferences();
        }
        finally { applyingAppearance = false; }
    }
    private void ApplyCaptionColors()
    {
        if (!Microsoft.UI.Windowing.AppWindowTitleBar.IsCustomizationSupported()) return;
        var light = Root.ActualTheme == ElementTheme.Light;
        AppWindow.TitleBar.ButtonBackgroundColor = light ? Windows.UI.Color.FromArgb(255, 243, 243, 243) : Windows.UI.Color.FromArgb(255, 32, 32, 32);
        AppWindow.TitleBar.ButtonForegroundColor = light ? Colors.Black : Colors.White;
    }
    private void SystemColorsChanged(UISettings sender, object args) => DispatcherQueue.TryEnqueue(() =>
    {
        if (Preferences.Theme == "system") { ApplyAppearance(); if (selected is not null) RenderDetail(selected); }
    });
    private void AppearanceChanged(object sender, SelectionChangedEventArgs e) => SaveAppearance();
    private void AppearanceToggled(object sender, RoutedEventArgs e) => SaveAppearance();
    private void SaveAppearance()
    {
        if (!ready || applyingAppearance) return;
        Preferences = new UiPreferences
        {
            Theme = (ThemeChoice.SelectedItem as ComboBoxItem)?.Tag?.ToString() ?? "dark",
            Navigation = (NavigationChoice.SelectedItem as ComboBoxItem)?.Tag?.ToString() ?? "compact",
            Animations = AnimationToggle.IsOn, RotateBanners = BannerToggle.IsOn,
            WindowsMaterials = MaterialsToggle.IsOn, AchievementToasts = ToastToggle.IsOn,
            CloseToTray = TrayToggle.IsOn, Notifications = NotificationsToggle.IsOn, VideoBackgrounds = VideoToggle.IsOn,
            ShowNewswireOnHome = NewswireToggle.IsOn
        };
        storage.Write("winui-appearance.json", Preferences); ApplyAppearance();
        if (selected is not null) RenderDetail(selected);
    }
    private void AppearanceLabels()
    {
        ThemeChoice.Header = null; NavigationChoice.Header = null;
        var themeLabels = new[] { "Dark", "Light", "Use system setting" };
        for (var i = 0; i < themeLabels.Length; i++) ((ComboBoxItem)ThemeChoice.Items[i]).Content = Locale.T(themeLabels[i]);
        ((ComboBoxItem)NavigationChoice.Items[0]).Content = Locale.T("Compact");
        ((ComboBoxItem)NavigationChoice.Items[1]).Content = Locale.T("Expanded");
        foreach (var (toggle, label) in new[] { (AnimationToggle, "Animations"), (BannerToggle, "Rotate featured images"),
            (MaterialsToggle, "Windows visual effects"), (ToastToggle, "Achievement notifications"),
            (TrayToggle, "Keep running when closed"), (NotificationsToggle, "Update and release notifications"), (VideoToggle, "Play video backgrounds"),
            (NewswireToggle, "Show Newswire on Home") })
        { toggle.Header = null; toggle.OnContent = Locale.T("On"); toggle.OffContent = Locale.T("Off"); }
    }
}
