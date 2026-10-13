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

manifest = ET.parse(root / "installer" / "AppxManifest.template.xml")
for element in manifest.iter():
    for key, value in element.attrib.items():
        if key in {"Logo", "Square150x150Logo", "Square44x44Logo", "Wide310x150Logo", "Image"}:
            check((launcher / value.replace("\\", "/")).is_file(), f"Missing manifest asset: {value}")
ns = {
    "p": "http://schemas.microsoft.com/appx/manifest/foundation/windows10",
    "desktop": "http://schemas.microsoft.com/appx/manifest/desktop/windows10",
    "com": "http://schemas.microsoft.com/appx/manifest/com/windows10",
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
texts = {k: json.loads((core / k).read_text()) for k in ["messages.json", "errors.json"]}
for name, catalog in texts.items():
    check(set(catalog) == {"en", "pt-BR", "es"}, f"{name}: missing language")
    for lang in ["pt-BR", "es"]:
        check(set(catalog["en"]).issubset(catalog[lang]), f"{name}: incomplete {lang}")

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

