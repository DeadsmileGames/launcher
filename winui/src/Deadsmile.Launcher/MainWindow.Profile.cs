using System.Net.Http;
using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Storage.Pickers;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    private bool privacyLoaded;
    private bool twoFactorEnabled;

    private async Task LoadProfileSettings()
    {
        if (profileLoading) return;
        if (User is null)
        {
            ProfileFields.Visibility = Visibility.Collapsed;
            ProfileSignInPrompt.Visibility = Visibility.Visible;
            ProfileEmailSection.Visibility = ProfilePrivacySection.Visibility = ProfileSecuritySection.Visibility = Visibility.Collapsed;
            ProfileDisplayName.Text = Locale.T("My profile");
            ProfileDisplayEmail.Text = Locale.T("Sign in to manage your profile.");
            return;
        }
        if (profileLoaded) return;
        profileLoading = true;
        try
        {
            var account = await Api.Get("/account");
            if (account is null) throw new LauncherException("INVALID_RESPONSE");
            ProfileUsername.Text = account.S("username"); ProfileBio.Text = account.S("bio");
            ProfileWebsite.Text = account.S("websiteUrl"); ProfileLocation.Text = account.S("location");
            ProfileAvatarUrl.Text = account.S("avatarUrl"); ProfileDisplayName.Text = account.S("username");
            ProfileDisplayEmail.Text = account.S("email");
            await SetProfilePicture(ProfileSettingsAvatar, account.S("avatarUrl"));
            ProfileFields.Visibility = Visibility.Visible; ProfileSignInPrompt.Visibility = Visibility.Collapsed;
            ProfileEmailSection.Visibility = ProfilePrivacySection.Visibility = ProfileSecuritySection.Visibility = Visibility.Visible;
            if (!privacyLoaded)
            {
                var privacy = await Api.Get("/account/privacy");
                ShareGameActivityToggle.IsOn = privacy.B("shareGameActivity"); SharePlaytimeToggle.IsOn = privacy.B("sharePlaytime");
                ShareAchievementsToggle.IsOn = privacy.B("shareAchievements"); privacyLoaded = true;
            }
            try
            {
                var totp = await Api.Get("/account/totp/status"); twoFactorEnabled = totp.B("enabled");
                TwoFactorStatus.Text = Locale.T(twoFactorEnabled ? "Two-step verification is enabled." : "Two-step verification is disabled.");
                TwoFactorActionButton.Content = Locale.T(twoFactorEnabled ? "Disable two-step verification" : "Set up two-step verification");
            }
            catch (LauncherException ex) when (ex.Status is 404 or 405)
            { TwoFactorStatus.Text = Locale.T("Two-step verification status is unavailable."); TwoFactorActionButton.IsEnabled = false; }
            var sessions = await Api.Get("/account/sessions");
            SessionsRows.Children.Clear();
            foreach (var session in sessions.At("sessions").Items())
            {
                var sessionId = session.S("id", "deviceId");
                var label = session.S("deviceName", "device", "userAgent");
                if (label.Length == 0) label = Locale.T("Signed-in device");
                var row = new Grid { ColumnSpacing = 12 };
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                var heading = new TextBlock { Text = label, TextWrapping = TextWrapping.Wrap, VerticalAlignment = VerticalAlignment.Center };
                if (session.B("isCurrent")) heading.Text += " · " + Locale.T("Current session");
                row.Children.Add(heading);
                if (!session.B("isCurrent"))
                {
                    var revoke = Action("Sign out device", async () =>
                    {
                        await Api.Delete("/account/sessions/" + Uri.EscapeDataString(sessionId));
                        profileLoaded = false; await LoadProfileSettings();
                        Notify(Locale.T("The selected device has been disconnected."), InfoBarSeverity.Success);
                    });
                    Grid.SetColumn(revoke, 1); row.Children.Add(revoke);
                }
                SessionsRows.Children.Add(new Border { Style = (Style)Application.Current.Resources["Panel"], Padding = new Thickness(12), Child = row });
            }
            if (SessionsRows.Children.Count == 0) SessionsRows.Children.Add(Text(Locale.T("No other active sessions.")));
            User = account.DeepClone(); UpdateAccount(); profileLoaded = true;
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { profileLoading = false; }
    }

    private async void ProfileSignInClick(object sender, RoutedEventArgs e)
    { if (await RequireAccount()) { profileLoaded = false; await LoadProfileSettings(); } }

    private async void ChooseProfilePhotoClick(object sender, RoutedEventArgs e)
    {
        if (User is null) { await RequireAccount(); return; }
        var picker = new FileOpenPicker();
        picker.FileTypeFilter.Add(".png"); picker.FileTypeFilter.Add(".jpg");
        picker.FileTypeFilter.Add(".jpeg"); picker.FileTypeFilter.Add(".webp");
        WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(this));
        var file = await picker.PickSingleFileAsync(); if (file is null) return;
        var properties = await file.GetBasicPropertiesAsync();
        if (properties.Size > 350_000) { Notify(Locale.T("The profile photo must be smaller than 350 KB.")); return; }
        try
        {
            using var stream = await file.OpenStreamForReadAsync();
            var bytes = new byte[(int)stream.Length]; await stream.ReadExactlyAsync(bytes);
            var mime = Path.GetExtension(file.Name).ToLowerInvariant() switch
            { ".png" => "image/png", ".webp" => "image/webp", _ => "image/jpeg" };
            ProfileAvatarUrl.Text = "data:" + mime + ";base64," + Convert.ToBase64String(bytes);
            await SetProfilePicture(ProfileSettingsAvatar, ProfileAvatarUrl.Text);
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
    }

    private async void SaveProfileClick(object sender, RoutedEventArgs e)
    {
        if (User is null || profileLoading) return;
        profileLoading = true; SaveProfileButton.IsEnabled = false;
        try
        {
            var result = await Api.Patch("/account", new
            {
                username = ProfileUsername.Text.Trim(), bio = ProfileBio.Text,
                websiteUrl = ProfileWebsite.Text.Trim(), location = ProfileLocation.Text.Trim(),
                avatarUrl = ProfileAvatarUrl.Text.Trim()
            });
            if (result is null) throw new LauncherException("INVALID_RESPONSE");
            User = result.DeepClone();
            ProfileDisplayName.Text = result.S("username"); ProfileDisplayEmail.Text = result.S("email");
            await SetProfilePicture(ProfileSettingsAvatar, result.S("avatarUrl"));
            await SetProfilePicture(Avatar, result.S("avatarUrl"));
            profileLoaded = true; Notify(Locale.T("Profile updated."), InfoBarSeverity.Success);
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { profileLoading = false; SaveProfileButton.IsEnabled = true; }
    }

    private async void SaveAccountEmailClick(object sender, RoutedEventArgs e)
    {
        if (User is null) { await RequireAccount(); return; }
        AccountEmailSaveButton.IsEnabled = false; AccountEmailStatus.Visibility = Visibility.Visible; AccountEmailStatus.Text = "";
        try
        {
            await Api.Post("/account/email/change", new { email = AccountNewEmail.Text.Trim().ToLowerInvariant(), password = AccountEmailPassword.Password });
            AccountEmailPassword.Password = "";
            AccountEmailStatus.Text = Locale.T("A confirmation link has been sent. Your current address remains active until confirmation.");
            Notify(Locale.T("Email confirmation requested."), InfoBarSeverity.Success);
        }
        catch (Exception ex) { AccountEmailStatus.Text = Locale.Error(ex); }
        finally { AccountEmailSaveButton.IsEnabled = true; }
    }

    private async void SavePrivacyClick(object sender, RoutedEventArgs e)
    {
        if (User is null) { await RequireAccount(); return; }
        SavePrivacyButton.IsEnabled = false;
        try
        {
            var result = await Api.Put("/account/privacy", new
            {
                shareGameActivity = ShareGameActivityToggle.IsOn,
                sharePlaytime = ShareGameActivityToggle.IsOn && SharePlaytimeToggle.IsOn,
                shareAchievements = ShareAchievementsToggle.IsOn
            });
            ShareGameActivityToggle.IsOn = result.B("shareGameActivity");
            SharePlaytimeToggle.IsOn = result.B("sharePlaytime");
            ShareAchievementsToggle.IsOn = result.B("shareAchievements");
            privacyLoaded = true; Notify(Locale.T("Your privacy preferences have been saved."), InfoBarSeverity.Success);
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { SavePrivacyButton.IsEnabled = true; }
    }

    private async void TwoFactorActionClick(object sender, RoutedEventArgs e)
    {
        if (User is null) { await RequireAccount(); return; }
        try
        {
            if (!twoFactorEnabled)
            {
                var setup = await Api.Post("/account/totp/setup", new { });
                TwoFactorSecret.Text = setup.S("secret"); TwoFactorSecretPanel.Visibility = Visibility.Visible;
                TwoFactorTokenBox.Visibility = Visibility.Visible; TwoFactorConfirmButton.Visibility = Visibility.Visible;
                TwoFactorActionButton.Content = Locale.T("Start over");
                TwoFactorStatus.Text = Locale.T("Add the secret to your authenticator app, then enter the code to confirm.");
            }
            else
            {
                if (TwoFactorTokenBox.Text.Trim().Length == 0) { TwoFactorStatus.Text = Locale.T("Enter the current authentication code first."); return; }
                await Api.Request(HttpMethod.Delete, "/account/totp/disable", new { token = TwoFactorTokenBox.Text.Trim() }, CancellationToken.None);
                twoFactorEnabled = false; TwoFactorTokenBox.Text = "";
                TwoFactorSecretPanel.Visibility = TwoFactorConfirmButton.Visibility = TwoFactorTokenBox.Visibility = Visibility.Collapsed;
                TwoFactorActionButton.Content = Locale.T("Set up two-step verification");
                TwoFactorStatus.Text = Locale.T("Two-step verification is disabled.");
            }
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
    }

    private async void TwoFactorConfirmClick(object sender, RoutedEventArgs e)
    {
        try
        {
            await Api.Post("/account/totp/enable", new { token = TwoFactorTokenBox.Text.Trim() });
            twoFactorEnabled = true; TwoFactorTokenBox.Text = "";
            TwoFactorSecretPanel.Visibility = TwoFactorConfirmButton.Visibility = TwoFactorTokenBox.Visibility = Visibility.Collapsed;
            TwoFactorActionButton.Content = Locale.T("Disable two-step verification");
            TwoFactorStatus.Text = Locale.T("Two-step verification is enabled.");
            Notify(Locale.T("Two-step verification is enabled."), InfoBarSeverity.Success);
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
    }

    private void OpenSupportClick(object sender, RoutedEventArgs e) => DesktopIntegration.Open(Urls.Website + "/support");
    private void SocialLinkClick(object sender, RoutedEventArgs e)
    { if (sender is Button { Tag: string url } && Urls.Https(url) is { } safe) DesktopIntegration.Open(safe.AbsoluteUri); }
}
