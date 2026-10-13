#!/usr/bin/env python3
"""Portable structural checks. Does not replace MSBuild, C# tests or Windows UI verification."""
from pathlib import Path
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
checks = 0
errors = []
def check(value, message):
    global checks
    checks += 1
    if not value: errors.append(message)

for pattern in ["*.xaml", "*.csproj", "*.props", "*.xml", "*.manifest"]:
    for path in root.rglob(pattern):
        try: ET.parse(path); check(True, str(path))
        except ET.ParseError as ex: check(False, f"{path}: {ex}")

for path in root.rglob("*.json"):
    try: json.loads(path.read_text(encoding="utf-8")); check(True, str(path))
    except ValueError as ex: check(False, f"{path}: {ex}")

# Every XAML event handler must exist in its code-behind.
events = {"Click", "Loaded", "SelectionChanged", "TextChanged", "ItemClick", "Checked", "Unchecked", "Toggled", "KeyDown", "BackRequested", "PaneToggleRequested", "QuerySubmitted", "PointerPressed", "PointerMoved", "PointerReleased", "PointerCanceled", "PointerCaptureLost"}
for path in root.rglob("*.xaml"):
    document = ET.parse(path)
    code_file = Path(str(path) + ".cs")
    if not code_file.exists(): continue
    # Partial window implementations also contain XAML handlers.
    code = "\n".join(p.read_text() for p in path.parent.glob(path.stem + "*.cs"))
    for element in document.iter():
        for name, value in element.attrib.items():
            if name in events: check(bool(re.search(r"\b" + re.escape(value) + r"\s*\(", code)), f"{path}: missing {value}")

launcher = root / "src" / "Deadsmile.Launcher"
for path in launcher.rglob("*.xaml"):
    for resource in re.findall(r"(?:Assets/[A-Za-z0-9_./-]+\.(?:png|svg|ttf|ico))", path.read_text()):
        check((launcher / resource).is_file(), f"Missing XAML asset: {resource}")

manifest = ET.parse(root / "packaging" / "AppxManifest.template.xml")
for element in manifest.iter():
    for key, value in element.attrib.items():
        if key in {"Logo", "Square150x150Logo", "Square44x44Logo", "Wide310x150Logo", "Image"}:
            check((launcher / value.replace("\\", "/")).is_file(), f"Missing manifest asset: {value}")
ns = {
    "p": "http://schemas.microsoft.com/appx/manifest/foundation/windows10",
    "desktop": "http://schemas.microsoft.com/appx/manifest/desktop/windows10",
    "com": "http://schemas.microsoft.com/appx/manifest/com/windows10",
    "uap10": "http://schemas.microsoft.com/appx/manifest/uap/windows10/10",
}
family = manifest.find("p:Dependencies/p:TargetDeviceFamily", ns)
check(family is not None and family.attrib["MinVersion"] == "10.0.19041.0", "Unexpected minimum OS")
toast_activation = manifest.find(".//desktop:ToastNotificationActivation", ns)
com_server = manifest.find(".//com:ExeServer", ns)
notification_clsid = "51A9F4F5-4389-401A-8D67-4626C47B505D"
check(toast_activation is not None and toast_activation.attrib.get("ToastActivatorCLSID") == notification_clsid,
      "MSIX manifest has the documented app-notification activation CLSID")
check(com_server is not None and com_server.attrib.get("Executable") == "Deadsmile.Launcher.exe" and
      com_server.attrib.get("Arguments") == "----AppNotificationActivated:", "MSIX notification COM activation targets the launcher")
packaged_app = manifest.find(".//p:Application", ns)
check(packaged_app is not None and
      packaged_app.attrib.get("{http://schemas.microsoft.com/appx/manifest/uap/windows10/10}RuntimeBehavior") == "packagedClassicApp" and
      packaged_app.attrib.get("{http://schemas.microsoft.com/appx/manifest/uap/windows10/10}TrustLevel") == "mediumIL",
      "MSIX declares a packaged WinUI desktop app using RuntimeBehavior and TrustLevel")
check(packaged_app is not None and "EntryPoint" not in packaged_app.attrib,
      "MSIX does not redundantly combine EntryPoint with RuntimeBehavior")

for path in (launcher / "Assets" / "Fonts").glob("*.ttf"):
    header = path.read_bytes()[:12]
    check(len(header) == 12 and header[:4] in [b"\x00\x01\x00\x00", b"OTTO"], f"Invalid font signature: {path}")

for path in (root / "src").rglob("*.csproj"):
    doc = ET.parse(path)
    for ref in doc.findall(".//ProjectReference"):
        check((path.parent / ref.attrib["Include"]).is_file(), f"Missing project reference: {ref.attrib['Include']}")

# Lexical delimiter check, respecting comments, normal/verbatim strings and characters.
# This deliberately does not claim to type-check C#.
def delimiter_errors(source):
    i = 0; stack = []
    while i < len(source):
        if source.startswith("//", i):
            end = source.find("\n", i); i = len(source) if end < 0 else end; continue
        if source.startswith("/*", i):
            end = source.find("*/", i + 2)
            if end < 0: return ["Unclosed comment"]
            i = end + 2; continue
        if source.startswith('@"', i) or source.startswith('$@"', i) or source.startswith('@$"', i):
            i = source.find('"', i) + 1
            while i < len(source):
                if source.startswith('""', i): i += 2; continue
                if source[i] == '"': i += 1; break
                i += 1
            else: return ["Unclosed verbatim string"]
            continue
        if source[i] in ['"', "'"]:
            quote = source[i]; i += 1
            while i < len(source):
                if source[i] == "\\": i += 2; continue
                if source[i] == quote: i += 1; break
                i += 1
            else: return ["Unclosed literal"]
            continue
        c = source[i]
        if c in "([{": stack.append(c)
        elif c in ")]}":
            if not stack or "([{".index(stack.pop()) != ")]}".index(c): return [f"Unmatched delimiter at {i}"]
        i += 1
    return ["Unclosed delimiters"] if stack else []

for path in root.rglob("*.cs"):
    problems = delimiter_errors(path.read_text())
    check(not problems, f"{path}: {problems}")

core = root / "src" / "Deadsmile.Core"
texts = {k: json.loads((core / k).read_text(encoding="utf-8")) for k in ["messages.json", "errors.json"]}
for name, catalog in texts.items():
    check(set(catalog) == {"en", "pt-BR", "es"}, f"{name}: missing language")
    english_keys = set(catalog["en"])
    for lang in ["pt-BR", "es"]:
        check(set(catalog[lang]) == english_keys, f"{name}: {lang} must have exactly the same keys as en")
    for lang, entries in catalog.items():
        check(all(isinstance(value, str) and value.strip() for value in entries.values()),
              f"{name}: blank/non-text translation in {lang}")

messages = texts["messages.json"]
message_keys = set(messages["en"])
# Audit literal localization calls and action labels so missing keys cannot silently fall back to English.
for path in launcher.rglob("*.cs"):
    if path.name == "UiValidation.cs":
        continue
    source = path.read_text(encoding="utf-8")
    for match in re.finditer(r'\bLocale\.T\(\s*"((?:\\.|[^"\\])*)"', source):
        key = json.loads('"' + match.group(1) + '"')
        check(key in message_keys, f"{path}: Locale.T key missing from messages.json: {key}")
    for match in re.finditer(r'\bAction\(\s*"((?:\\.|[^"\\])*)"', source):
        key = json.loads('"' + match.group(1) + '"')
        check(key in message_keys, f"{path}: Action label missing from messages.json: {key}")

# Visible XAML literals are expected to carry a Tag that matches a translated key.
for path in launcher.rglob("*.xaml"):
    document = ET.parse(path)
    for element in document.iter():
        tag = element.attrib.get("Tag")
        if not tag:
            continue
        visible = any(element.attrib.get(name) == tag for name in ("Text", "Content", "Header", "PlaceholderText"))
        if visible:
            check(tag in message_keys, f"{path}: visible XAML string missing translation key: {tag}")

# Audit all static phrase choices inside localization expressions, including ternary/switch labels.
for path in launcher.rglob("*.cs"):
    if path.name == "UiValidation.cs":
        continue
    source = path.read_text(encoding="utf-8")
    for call in re.finditer(r'\bLocale\.T\(((?:[^()]|\([^()]*\))*)\)', source, re.S):
        argument = call.group(1)
        for literal in re.finditer(r'"((?:\\.|[^"\\])*)"', argument):
            key = json.loads('"' + literal.group(1) + '"')
            # Lowercase slugs, IDs, enum values and protocol keys are data, not visible phrases.
            if re.fullmatch(r'[a-z0-9][a-z0-9_.:/-]*', key):
                continue
            check(key in message_keys, f"{path}: string choice in Locale.T is missing from messages.json: {key}")

# Validate every fixed visible XAML phrase, not just elements already tagged for translation.
xaml_exceptions = {"Deadsmile Games", "Deadsmile Games Launcher", "Português", "English", "Español", "0", "1", "2", "‹", "›", "−", "+"}
for path in launcher.rglob("*.xaml"):
    raw = path.read_text(encoding="utf-8")
    for attr in ("Text", "Content", "Header", "PlaceholderText", "Title", "ToolTip",
                 "AutomationProperties.Name", "AutomationProperties.HelpText", "AutomationProperties.ItemStatus",
                 "Footer", "Label"):
        for literal in re.finditer(r'\b' + re.escape(attr) + r'="([^"]+)"', raw):
            value = literal.group(1)
            if value.startswith("{") or value in xaml_exceptions:
                continue
            check(value in message_keys, f"{path}: visible XAML literal missing translation: {value}")

# Guard UX regressions for native overlay lifetime, windows and localization.
main_xaml = (launcher / "MainWindow.xaml").read_text(encoding="utf-8")
app_xaml = (launcher / "App.xaml").read_text(encoding="utf-8")
main_code = (launcher / "MainWindow.xaml.cs").read_text(encoding="utf-8")
portal_code = (launcher / "MainWindow.Portal.cs").read_text(encoding="utf-8")
profile_code = (launcher / "MainWindow.Profile.cs").read_text(encoding="utf-8")
gallery_code = (launcher / "MainWindow.Gallery.cs").read_text(encoding="utf-8")
game_view_code = (launcher / "Views" / "GameViewWindow.xaml.cs").read_text(encoding="utf-8")
tray_code = (launcher / "Services" / "TrayService.cs").read_text(encoding="utf-8")
native_code = (launcher / "Services" / "NativeWindow.cs").read_text(encoding="utf-8")
quote_array = re.search(r'private string\[\] quotes = \[(.*?)\];', portal_code, re.S)
check(quote_array is not None and "BootQuote.Text = Locale.T(quotes[index])" in portal_code,
      "Boot quotes are rendered through the localization catalog")
if quote_array is not None:
    for literal in re.finditer(r'"((?:\\.|[^"\\])*)"', quote_array.group(1)):
        key = json.loads('"' + literal.group(1) + '"')
        check(key in message_keys, f"Boot quote is missing a translation: {key}")
check('x:Name="HomeHeroPreviousButton"' in main_xaml and 'x:Name="HomeHeroNextButton"' in main_xaml and
      "HomeHeroPreviousClick" in portal_code and "HomeHeroNextClick" in portal_code,
      "Home hero provides previous/next controls with handlers")
check('Tapped="HomeHeroSurfaceTapped"' in main_xaml and "private async void HomeHeroSurfaceTapped" in main_code and
      'HomeHeroPauseButton" Width="36"' in main_xaml and
      "new SymbolIcon(homeHeroPaused ? Symbol.Play : Symbol.Pause)" in portal_code,
      "Home hero surface opens game details and pause uses an icon")
check('x:Name="SettingsMenuItem"' in main_xaml and 'x:Name="MyAccountMenuItem"' in main_xaml and
      "SettingsClick" in portal_code and "MyAccountMenuItem.Visibility" in portal_code and
      'AccountActionLabel.Text = loggedIn ? Username.Text : Locale.T("Sign in")' in portal_code and
      'page = "account"' in portal_code and 'AccountPanel.ChangeView(null, 0, null, true)' in portal_code,
      "Account menu shows the username and opens a separate My account page")
check('identity.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) })' in main_code and
      "Grid.SetColumn(heading, hasProductIcon ? 1 : 0)" in main_code and
      "internal static void ArrangeDetailColumns(Grid body, StackPanel main, StackPanel information)" in main_code and
      "if (!hasMainContent || !hasInformationContent)" in main_code,
      "Game details do not reserve empty icon or content columns")
check("HorizontalContentAlignment = HorizontalAlignment.Center" in portal_code and
      "var host = new Grid { Width = width + 16, HorizontalAlignment = HorizontalAlignment.Center }" in portal_code,
      "Newswire dialog centers its scrolling content")
check('var host = new Grid { Width = dialogWidth, HorizontalAlignment = HorizontalAlignment.Center }' in gallery_code and
      "Root.XamlRoot.Size.Height - 260" in gallery_code and
      'dialog.Resources["ContentDialogMinWidth"] = host.Width' in gallery_code,
      "Screenshot dialog centers its viewport and reserves room for navigation and zoom controls")
check("EllipseGeometry" in profile_code and "viewport.PointerMoved" in profile_code and
      "CenterX = preview.Width / 2" in profile_code and "CenterY = preview.Height / 2" in profile_code,
      "Profile-photo editor uses centered circular crop, zoom and pointer-drag positioning")
check("twoFactorDisabling" in profile_code and
      'Api.Request(HttpMethod.Delete, "/account/totp/disable", new { token }' in profile_code and
      "TwoFactorTokenBox.Visibility = TwoFactorConfirmButton.Visibility = Visibility.Visible" in profile_code,
      "Disabling two-step verification presents a token field and requires the current code")
check('"Zoom out"' in gallery_code and '"Zoom in"' in gallery_code and
      '"Reset zoom"' in gallery_code and "image.Width = viewportWidth * value" in gallery_code,
      "Screenshot gallery includes zoom and reset controls")
check("ShouldDismissOverlay(bool processRunning, bool gameMinimized, bool gameFocused, bool focusLossGraceElapsed)" in game_view_code and
      "owner.IsGameFocusedFor(game.Game.Id)" in game_view_code and
      "NativeWindow.Minimized(gameWindow)" in game_view_code and
      "FocusLossGrace" in game_view_code and "!processRunning || gameMinimized" in game_view_code,
      "DeadBar closes on game exit, minimization or sustained loss of focus")
check("TrackPopupMenu" in tray_code and "AppendMenuW" in tray_code and "PostMessage" in tray_code,
      "Notification-area menu uses native Windows popup menu APIs")
check("ApplyRoundedRegion" in native_code and "SetWindowRgn" in native_code,
      "Floating native toasts have a true rounded HWND region to avoid black corner artifacts")
check('OrderInstalledGames(Catalog, installs.Installed.Keys)' in main_code and
      'Locale.T("Installed games")' in main_code and
      'LauncherMutedTextBrush' in app_xaml and 'LauncherMutedTextBrush' in main_xaml,
      "Downloads retain installed-game cards and the new contrast brush is used by UI text")

# Review regression checks: remote save integrity, extraction size limits, recovery and localized dynamic text.
cloud_code = (core / "CloudSaveService.cs").read_text(encoding="utf-8")
capture_code = (launcher / "Services" / "GameCapture.cs").read_text(encoding="utf-8")
share_code = (launcher / "Services" / "CaptureShare.cs").read_text(encoding="utf-8")
share_ui_code = (launcher / "Views" / "GameViewWindow.Capture.cs").read_text(encoding="utf-8")
install_code = (core / "InstallationService.cs").read_text(encoding="utf-8")
catalog_code = (core / "PublicCatalog.cs").read_text(encoding="utf-8")
storage_code = (core / "Storage.cs").read_text(encoding="utf-8")
desktop_integration_code = (launcher / "Services" / "DesktopIntegration.cs").read_text(encoding="utf-8")
main_window_code = (launcher / "MainWindow.xaml.cs").read_text(encoding="utf-8")
check('if (!Regex.IsMatch(hash, "^[a-fA-F0-9]{64}$"))' in cloud_code and
      'throw new LauncherException("CLOUD_SAVE_INVALID_PAYLOAD")' in cloud_code,
      "Malformed supplied cloud-save hashes are rejected")
check("long actualTotal = 0;" in install_code and
      "if (entryWritten > entry.Length || actualTotal > 40L * 1024 * 1024 * 1024)" in install_code,
      "ZIP extraction enforces actual decompressed size, not only archive metadata")
check('Storage.Log("INSTALL_BACKUP_CLEANUP_PENDING")' in install_code and
      "ReadRecord(folder, id) is not null && ReadRecord(backup, id) is not null" in install_code,
      "Interrupted update recovery cleans only a valid stale backup")
check('Storage.Log("INSTALL_INDEX_RECOVERY_PENDING")' in install_code,
      "Uninstall tolerates an already-completed removal if index writing fails")
check('if (authenticated && owned.TryGetValue(Urls.Id(game.Id), out var entry))' in catalog_code and
      'data["owned"] = false' in catalog_code and
      'data["inLibrary"] = false' in catalog_code,
      "Only a private library record can authorize game ownership/launch")
check('GroupBy(x => Urls.Id(x.S("id")), StringComparer.OrdinalIgnoreCase)' in catalog_code and
      'ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase)' in catalog_code,
      "Authenticated library merge normalizes GUID format, case, and duplicate IDs")
check('or ArgumentException or NotSupportedException' in install_code,
      "Malformed installation records are ignored safely")
check('try { Storage.Write("winui-installed.json", indexed); }' in install_code and
      'Storage.Log("INSTALL_INDEX_RECOVERY_PENDING")' in install_code,
      "An unwritable installation index cannot abort startup/refresh")
check('catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }' in storage_code,
      "Best-effort local logging cannot throw on inaccessible log storage")
check('PROTOCOL_REGISTRATION_UNAVAILABLE' in main_window_code and 'try { DesktopIntegration.RegisterProtocol(); }' in main_window_code,
      "Optional protocol registration failure cannot abort app startup")
check('try\n        {\n            foreach (var file in Directory.EnumerateFiles(desktop, "*.url"))' in desktop_integration_code,
      "A bad desktop shortcut cannot abort successful game uninstallation")
check("result.TrySetCanceled()" in capture_code and "result.Task.Result.Dispose()" in capture_code,
      "A late Direct3D capture frame is released after capture timeout")
check("missingScreenshotMessage" in share_code and
      'owner.Locale.T("Choose a screenshot first.")' in share_ui_code,
      "Screenshot share failure text uses localization")
check('Locale.HasKey(rawTitle) ? Locale.T(rawTitle) : rawTitle' in main_code,
      "Achievement titles use translations when a localized key exists")
check(not (root / "src" / "Deadsmile.Setup").exists(), "Separate setup EXE project must not remain in the MSIX-only pipeline")
check(not (launcher / "Services" / "UpdateService.cs").exists(), "Standalone EXE-based launcher updater must not remain in the MSIX-only pipeline")
check(all("UpdateService" not in p.read_text() for p in launcher.rglob("*.cs")), "Launcher source must not reference the removed EXE updater")
check(not list(root.rglob("*.nsi")), "NSIS EXE installer scripts must not be present")
build_script = (root / "scripts" / "build-windows.ps1").read_text()
check("makensis" not in build_script.lower() and ".nsi" not in build_script.lower(), "MSIX build must not invoke NSIS")
build_workflow = (root.parent / ".github" / "workflows" / "build-winui.yml").read_text()
release_workflow = (root.parent / ".github" / "workflows" / "release-winui.yml").read_text()
check("*.exe" not in build_workflow.lower() and "setup-x64" not in build_workflow.lower(), "CI distribution artifacts must not include an EXE installer")
check("*.exe" not in release_workflow.lower() and "Setup EXE" not in release_workflow, "Production release must not depend on an EXE installer")
check(not (root / "scripts" / "test-installers.ps1").exists(), "Installer smoke tests must be replaced by MSIX-only tests")

csproj = ET.parse(launcher / "Deadsmile.Launcher.csproj")
check(csproj.findtext(".//UseWinUI") == "true", "WinUI must be enabled")
check(csproj.findtext(".//PublishTrimmed") == "false", "Trimming must remain disabled until runtime tested")
check(csproj.findtext(".//WindowsAppSDKSelfContained") == "true", "Missing bundled Windows App SDK")
check(csproj.findtext(".//SelfContained") == "true", "Missing bundled .NET")
check(not list(root.rglob("*.pfx")), "Private certificates must not be included")
print(f"Structural checks: {checks}; failures: {len(errors)}")
for error in errors: print("FAIL", error)
print("C# compilation, C# tests, packaging and Windows UI tests: NOT RUN by this validator.")
sys.exit(1 if errors else 0)

