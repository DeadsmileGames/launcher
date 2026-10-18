# Contributing

## Development and validation

- Use the .NET SDK version pinned by `winui/global.json` and Python 3 for source validation.
- Run `python scripts/validate-source.py` from `winui/`.
- Run `dotnet run --project tests/Deadsmile.Core.Tests -c Release` from `winui/`.
- Pull requests run the Windows MSIX build and automated installation, startup, uninstallation, and native UI validation. Run the Windows packaging checks before releases when possible.
- Review NuGet vulnerability output and keep dependencies aligned with the supported .NET SDK.

## Pull requests

Work in a branch and target `main`. Describe changes to installation, downloads, authentication, storage, overlays, or API contracts, and include tests for behavior changes. Do not add credentials, production data, built MSIX packages, logs containing personal information, or unrelated formatting changes.

Keep the application native WinUI 3/C#; do not introduce a web runtime. API access and game entitlement decisions must remain enforced by the backend.
