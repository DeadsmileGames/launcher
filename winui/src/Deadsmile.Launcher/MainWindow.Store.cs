using System.Globalization;
using Deadsmile.Core;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    private void AddStoreInformation(Game game, StackPanel target)
    {
        var store = game.Store;
        var system = Locale.Language == "pt-BR" ? "DJCTQ" : Locale.Language == "es" ? "PEGI" : "ESRB";
        var ratings = store.At("ratings").Items().ToList();
        if (store.At("primaryRating") is { } primary) ratings.Insert(0, primary);
        var rating = ratings.FirstOrDefault(x => x.S("system") == system || x.S("id").StartsWith(system + ":"));
        var ratingPanel = new StackPanel { Spacing = 14 };
        ratingPanel.Children.Add(Text(Locale.T("Age rating"), 24, true));
        if (rating is not null)
        {
            if (Urls.Image(rating.S("imageUrl")) is { } url)
            { var image = new Image { Height = 80, HorizontalAlignment = HorizontalAlignment.Left }; SetImage(image, url); ratingPanel.Children.Add(image); }
            ratingPanel.Children.Add(Text(rating.First("description", "label").S()));
        }
        else
        {
            ratingPanel.Children.Add(new Image { Height = 80, HorizontalAlignment = HorizontalAlignment.Left,
                Source = new SvgImageSource(new Uri("ms-appx:///Assets/RatingPending.svg")) });
            ratingPanel.Children.Add(Text(Locale.T("Rating information is unavailable on Microsoft Store.")));
            ratingPanel.Children.Add(Action("Visit esrb.org for rating information.", () =>
            { Services.DesktopIntegration.Open("https://www.esrb.org/ratings-guide/"); return Task.CompletedTask; }));
        }
        target.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"], Child = ratingPanel });
        if (store is null) return;
        var info = new StackPanel { Spacing = 14 };
        if (store.B("stale")) info.Children.Add(Text(Locale.T("Showing the last available Store information.")));
        if (store.S("version").Length > 0) info.Children.Add(Text(Locale.T("Store package version") + ": " + store.S("version")));
        if (DateTimeOffset.TryParse(store.S("updatedAt"), out var date))
            info.Children.Add(Text(Locale.T("Last update") + ": " + date.UtcDateTime.ToString("D",
                CultureInfo.GetCultureInfo(Locale.Language == "en" ? "en-US" : Locale.Language == "es" ? "es-ES" : "pt-BR"))));
        var notes = store.At("releaseNotes").Items().Select(x => x.S()).ToArray();
        if (notes.Length > 0) { info.Children.Add(Text(Locale.T("What’s new"), 22, true)); foreach (var note in notes) info.Children.Add(Text(note)); }
        var actions = new List<Button>();
        var publisher = store.First("publisher", "developer").S();
        var publisherUrl = publisher.Length == 0 ? "" : "https://apps.microsoft.com/search/publisher?name=" + Uri.EscapeDataString(publisher) +
            "&hl=" + Uri.EscapeDataString(Locale.Language) + "&gl=" + (Locale.Language == "pt-BR" ? "BR" : Locale.Language == "es" ? "ES" : "US");
        foreach (var (key, value) in new[] { ("Privacy policy", store.S("privacyUrl")), ("More from this publisher", publisherUrl),
            ("View current information on Microsoft Store", store.S("storeUrl")) })
        {
            var url = Urls.Https(value);
            if (url is not null) actions.Add(Action(key, () => { Services.DesktopIntegration.Open(url.AbsoluteUri); return Task.CompletedTask; }));
        }
        info.Children.Add(WrapActions(actions));
        target.Children.Add(new Expander { Header = Locale.T("Microsoft Store information"), Content = info,
            HorizontalAlignment = HorizontalAlignment.Stretch, HorizontalContentAlignment = HorizontalAlignment.Stretch });
    }
}

