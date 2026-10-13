using System.Net.Http;
using Deadsmile.Core;
using Deadsmile.Launcher.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Composition;
using System.Numerics;
using QRCoder;
using Windows.Graphics.Imaging;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;

namespace Deadsmile.Launcher;

public sealed partial class MainWindow
{
    private bool privacyLoaded;
    private bool twoFactorEnabled;
    private bool twoFactorDisabling;
    private bool twoFactorStatusAvailable = true;
    private string twoFactorStatusKey = "Two-step verification status";

    private void SetTwoFactorStatus(string key)
    {
        twoFactorStatusKey = key;
        TwoFactorStatus.Text = Locale.T(key);
    }

    private void RefreshTwoFactorLabels()
    {
        TwoFactorStatus.Text = Locale.T(twoFactorStatusKey);
        TwoFactorActionButton.IsEnabled = twoFactorStatusAvailable;
        if (!twoFactorStatusAvailable)
            TwoFactorActionButton.Content = Locale.T("Set up two-step verification");
        else if (twoFactorDisabling)
            TwoFactorActionButton.Content = Locale.T("Cancel");
        else if (twoFactorEnabled)
            TwoFactorActionButton.Content = Locale.T("Disable two-step verification");
        else
            TwoFactorActionButton.Content = Locale.T(TwoFactorSecretPanel.Visibility == Visibility.Visible ? "Start over" : "Set up two-step verification");
        TwoFactorConfirmButton.Content = Locale.T(twoFactorDisabling ? "Disable two-step verification" : "Confirm two-step verification");
        TwoFactorTokenBox.Header = Locale.T("Authentication code");
    }

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
            ProfileFullName.Text = account.S("fullName", "full_name");
            ProfileUsername.Text = account.S("username"); ProfileBio.Text = account.S("bio");
            ProfileWebsite.Text = account.S("websiteUrl"); ProfileLocation.Text = account.S("location");
            ProfileAvatarUrl.Text = account.S("avatarUrl");
            ProfileDisplayName.Text = account.S("fullName", "full_name", "username");
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
                var totp = await Api.Get("/account/totp/status");
                twoFactorEnabled = totp.B("enabled");
                twoFactorDisabling = false; twoFactorStatusAvailable = true;
                TwoFactorTokenBox.Text = "";
                TwoFactorSecretPanel.Visibility = TwoFactorTokenBox.Visibility = TwoFactorConfirmButton.Visibility = Visibility.Collapsed;
                SetTwoFactorStatus(twoFactorEnabled ? "Two-step verification is enabled." : "Two-step verification is disabled.");
                RefreshTwoFactorLabels();
            }
            catch (LauncherException ex) when (ex.Status is 404 or 405)
            {
                twoFactorStatusAvailable = false;
                SetTwoFactorStatus("Two-step verification status is unavailable.");
                RefreshTwoFactorLabels();
            }
            var sessions = await Api.Get("/account/sessions");
            SessionsRows.Children.Clear();
            foreach (var session in sessions.At("sessions").Items())
            {
                var sessionId = session.S("id", "deviceId");
                var label = string.Join(" · ", new[] { session.S("client"), session.S("platform") }.Where(value => value.Length > 0));
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
            var preview = new Image
            {
                Stretch = Stretch.Fill,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            using (var source = await file.OpenAsync(Windows.Storage.FileAccessMode.Read))
            {
                var bitmap = new BitmapImage();
                await bitmap.SetSourceAsync(source);
                if (bitmap.PixelWidth == 0 || bitmap.PixelHeight == 0 || bitmap.PixelWidth > 4096 || bitmap.PixelHeight > 4096)
                    throw new LauncherException("PROFILE_IMAGE_INVALID");
                var aspect = bitmap.PixelWidth / (double)bitmap.PixelHeight;
                preview.Width = aspect >= 1 ? 280 * aspect : 280;
                preview.Height = aspect >= 1 ? 280 : 280 / aspect;
                preview.Source = bitmap;
            }

            var transform = new CompositeTransform
            {
                CenterX = preview.Width / 2,
                CenterY = preview.Height / 2,
                ScaleX = 1,
                ScaleY = 1
            };
            preview.RenderTransform = transform;
            var viewport = new Grid
            {
                Width = 280,
                Height = 280,
                Background = new SolidColorBrush(Microsoft.UI.Colors.Transparent)
            };
            viewport.Children.Add(preview);
            // UIElement.Clip only accepts RectangleGeometry in WinUI. Use the composition
            // visual layer for a real circular mask instead of assigning an incompatible XAML geometry.
            var compositor = ElementCompositionPreview.GetElementVisual(Root).Compositor;
            var cropGeometry = compositor.CreateEllipseGeometry();
            cropGeometry.Center = new Vector2(140, 140);
            cropGeometry.Radius = new Vector2(140, 140);
            ElementCompositionPreview.GetElementVisual(viewport).Clip = compositor.CreateGeometricClip(cropGeometry);
            var zoom = new Slider
            {
                Header = Locale.T("Zoom"),
                Minimum = 1,
                Maximum = 3,
                Value = 1,
                StepFrequency = 0.05,
                Width = 300
            };
            var rotation = 0d;
            Windows.Foundation.Point? dragPoint = null;
            void ClampImage()
            {
                var quarterTurn = ((int)rotation % 180) != 0;
                var scaledWidth = (quarterTurn ? preview.Height : preview.Width) * transform.ScaleX;
                var scaledHeight = (quarterTurn ? preview.Width : preview.Height) * transform.ScaleY;
                var limitX = Math.Max(0, (scaledWidth - 280) / 2);
                var limitY = Math.Max(0, (scaledHeight - 280) / 2);
                transform.TranslateX = Math.Clamp(transform.TranslateX, -limitX, limitX);
                transform.TranslateY = Math.Clamp(transform.TranslateY, -limitY, limitY);
            }
            zoom.ValueChanged += (_, args) =>
            {
                transform.ScaleX = transform.ScaleY = args.NewValue;
                ClampImage();
            };
            viewport.PointerPressed += (_, args) =>
            {
                dragPoint = args.GetCurrentPoint(viewport).Position;
                viewport.CapturePointer(args.Pointer);
                args.Handled = true;
            };
            viewport.PointerMoved += (_, args) =>
            {
                if (dragPoint is not { } previous) return;
                var point = args.GetCurrentPoint(viewport).Position;
                transform.TranslateX += point.X - previous.X;
                transform.TranslateY += point.Y - previous.Y;
                dragPoint = point;
                ClampImage();
                args.Handled = true;
            };
            void EndDrag(object _, PointerRoutedEventArgs args)
            {
                dragPoint = null;
                viewport.ReleasePointerCaptures();
            }
            viewport.PointerReleased += EndDrag;
            viewport.PointerCanceled += EndDrag;
            viewport.PointerCaptureLost += EndDrag;

            var rotationRow = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Spacing = 8,
                HorizontalAlignment = HorizontalAlignment.Center
            };
            var rotateLeft = new Button { Content = Locale.T("Rotate left") };
            var rotateRight = new Button { Content = Locale.T("Rotate right") };
            rotateLeft.Click += (_, _) => { rotation = (rotation - 90 + 360) % 360; transform.Rotation = rotation; ClampImage(); };
            rotateRight.Click += (_, _) => { rotation = (rotation + 90) % 360; transform.Rotation = rotation; ClampImage(); };
            rotationRow.Children.Add(rotateLeft); rotationRow.Children.Add(rotateRight);
            var editor = new StackPanel
            {
                Spacing = 12,
                Width = 320,
                HorizontalAlignment = HorizontalAlignment.Center
            };
            editor.Children.Add(viewport);
            editor.Children.Add(Text(Locale.T("Drag to reposition image")));
            editor.Children.Add(zoom);
            editor.Children.Add(rotationRow);
            var dialog = new ContentDialog
            {
                XamlRoot = Root.XamlRoot,
                RequestedTheme = UiTheme,
                Title = Locale.T("Adjust profile photo"),
                Content = editor,
                PrimaryButtonText = Locale.T("Use photo"),
                CloseButtonText = Locale.T("Cancel"),
                DefaultButton = ContentDialogButton.Primary
            };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            var rendered = new RenderTargetBitmap();
            await rendered.RenderAsync(viewport, 280, 280);
            var pixels = await rendered.GetPixelsAsync();
            var bgra = new byte[pixels.Length];
            using (var reader = DataReader.FromBuffer(pixels)) reader.ReadBytes(bgra);
            using var pngStream = new InMemoryRandomAccessStream();
            var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, pngStream);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied,
                (uint)rendered.PixelWidth, (uint)rendered.PixelHeight, 96, 96, bgra);
            await encoder.FlushAsync();
            if (pngStream.Size is <= 0 or > 350000)
                throw new LauncherException("PROFILE_IMAGE_TOO_LARGE");
            pngStream.Seek(0);
            var png = new byte[(int)pngStream.Size];
            using (var reader = new DataReader(pngStream))
            {
                await reader.LoadAsync((uint)png.Length);
                reader.ReadBytes(png);
            }
            ProfileAvatarUrl.Text = "data:image/png;base64," + Convert.ToBase64String(png);
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
                fullName = ProfileFullName.Text.Trim(),
                username = ProfileUsername.Text.Trim(), bio = ProfileBio.Text,
                websiteUrl = ProfileWebsite.Text.Trim(), location = ProfileLocation.Text.Trim(),
                avatarUrl = ProfileAvatarUrl.Text.Trim()
            });
            if (result is null) throw new LauncherException("INVALID_RESPONSE");
            User = result.DeepClone();
            ProfileDisplayName.Text = result.S("fullName", "full_name", "username");
            ProfileDisplayEmail.Text = result.S("email");
            Username.Text = result.S("username");
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
        if (!twoFactorStatusAvailable) return;
        if (twoFactorEnabled && twoFactorDisabling)
        {
            twoFactorDisabling = false;
            TwoFactorTokenBox.Text = "";
            TwoFactorTokenBox.Visibility = TwoFactorConfirmButton.Visibility = Visibility.Collapsed;
            SetTwoFactorStatus("Two-step verification is enabled.");
            RefreshTwoFactorLabels();
            return;
        }
        if (twoFactorEnabled)
        {
            twoFactorDisabling = true;
            TwoFactorSecretPanel.Visibility = Visibility.Collapsed;
            TwoFactorTokenBox.Text = "";
            TwoFactorTokenBox.Visibility = TwoFactorConfirmButton.Visibility = Visibility.Visible;
            SetTwoFactorStatus("Enter the current authentication code first.");
            RefreshTwoFactorLabels();
            TwoFactorTokenBox.Focus(FocusState.Programmatic);
            return;
        }
        try
        {
            var setup = await Api.Post("/account/totp/setup", new { });
            var secret = setup.S("secret");
            if (secret.Length == 0) throw new LauncherException("INVALID_RESPONSE");
            TwoFactorSecret.Text = secret;
            var provisioningUri = setup.S("otpauthUrl", "otpauth_uri", "provisioningUri");
            if (!provisioningUri.StartsWith("otpauth://totp/", StringComparison.OrdinalIgnoreCase))
            {
                var accountLabel = Uri.EscapeDataString("Deadsmile Games:" + User.S("email", "username"));
                var issuer = Uri.EscapeDataString("Deadsmile Games");
                provisioningUri = $"otpauth://totp/{accountLabel}?secret={Uri.EscapeDataString(secret)}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";
            }
            using var generator = new QRCodeGenerator();
            using var data = generator.CreateQrCode(provisioningUri, QRCodeGenerator.ECCLevel.Q);
            var qrBytes = new PngByteQRCode(data).GetGraphic(8);
            using var qrStream = new InMemoryRandomAccessStream();
            using (var writer = new DataWriter(qrStream))
            {
                writer.WriteBytes(qrBytes);
                await writer.StoreAsync();
                await writer.FlushAsync();
                writer.DetachStream();
            }
            qrStream.Seek(0);
            var qrImage = new BitmapImage();
            await qrImage.SetSourceAsync(qrStream);
            TwoFactorQr.Source = qrImage;
            twoFactorDisabling = false;
            TwoFactorSecretPanel.Visibility = Visibility.Visible;
            TwoFactorTokenBox.Text = "";
            TwoFactorTokenBox.Visibility = TwoFactorConfirmButton.Visibility = Visibility.Visible;
            SetTwoFactorStatus("Scan this QR code with your authenticator app, or enter the secret manually.");
            RefreshTwoFactorLabels();
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
    }

    private async void TwoFactorConfirmClick(object sender, RoutedEventArgs e)
    {
        if (User is null) { await RequireAccount(); return; }
        var token = TwoFactorTokenBox.Text.Trim();
        if (token.Length == 0)
        {
            SetTwoFactorStatus("Enter the current authentication code first.");
            TwoFactorTokenBox.Focus(FocusState.Programmatic);
            return;
        }
        TwoFactorConfirmButton.IsEnabled = false;
        try
        {
            if (twoFactorEnabled && twoFactorDisabling)
            {
                await Api.Request(HttpMethod.Delete, "/account/totp/disable", new { token }, CancellationToken.None);
                twoFactorEnabled = false;
                twoFactorDisabling = false;
                TwoFactorTokenBox.Text = "";
                TwoFactorSecretPanel.Visibility = TwoFactorConfirmButton.Visibility = TwoFactorTokenBox.Visibility = Visibility.Collapsed;
                TwoFactorQr.Source = null;
                SetTwoFactorStatus("Two-step verification is disabled.");
                RefreshTwoFactorLabels();
                Notify(Locale.T("Two-step verification is disabled."), InfoBarSeverity.Success);
                return;
            }
            await Api.Post("/account/totp/enable", new { token });
            twoFactorEnabled = true;
            twoFactorDisabling = false;
            TwoFactorTokenBox.Text = "";
            TwoFactorSecretPanel.Visibility = TwoFactorConfirmButton.Visibility = TwoFactorTokenBox.Visibility = Visibility.Collapsed;
            TwoFactorQr.Source = null;
            SetTwoFactorStatus("Two-step verification is enabled.");
            RefreshTwoFactorLabels();
            Notify(Locale.T("Two-step verification is enabled."), InfoBarSeverity.Success);
        }
        catch (Exception ex) { Notify(Locale.Error(ex)); }
        finally { TwoFactorConfirmButton.IsEnabled = true; }
    }

    private void OpenSupportClick(object sender, RoutedEventArgs e) => DesktopIntegration.Open(Urls.Website + "/support");
    private void SocialLinkClick(object sender, RoutedEventArgs e)
    { if (sender is Button { Tag: string url } && Urls.Https(url) is { } safe) DesktopIntegration.Open(safe.AbsoluteUri); }
}
