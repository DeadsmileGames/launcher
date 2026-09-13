# Microsoft Store

## Package identity

Reserve `Deadsmile Games Launcher` in Partner Center. Open the product identity page and copy these values exactly into GitHub repository variables:

| Repository variable | Partner Center value |
| --- | --- |
| `MICROSOFT_STORE_IDENTITY_NAME` | Package/Identity/Name |
| `MICROSOFT_STORE_PUBLISHER` | Package/Identity/Publisher |
| `MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME` | Package/Properties/PublisherDisplayName |

The values are case-sensitive. Do not invent or normalize them.

## Build

Run the `Build Microsoft Store MSIX` workflow manually from GitHub Actions. Download the `deadsmile-games-launcher-microsoft-store` artifact after the workflow passes.

The resulting MSIX is intentionally unsigned and is intended for Partner Center submission. Microsoft signs it after certification. It cannot be installed normally outside the Store without a trusted or locally trusted test certificate.

The existing Windows workflow and NSIS installer remain unchanged for direct distribution. The Microsoft Store build is detected at runtime and does not use the GitHub self-updater. Launcher updates are delivered by Microsoft Store. Game updates remain managed by the launcher through itch.io.

## Submission

Upload the MSIX in the Partner Center package section and complete:

- Description, short description and search terms
- Privacy policy URL
- Support URL
- Store logos and screenshots
- Age rating questionnaire
- System requirements for Windows 10 and Windows 11 x64
- Demo credentials in Notes for certification
- Instructions for linking the itch.io test account
- A test game entitlement or a free test game
- Explanation for `runFullTrust`

Suggested `runFullTrust` explanation:

> Deadsmile Games Launcher is a Win32 Electron desktop game launcher. Full trust is required to download and manage user-owned Windows game files in the user's Documents folder, invoke the itch.io butler client, start game executables selected from the controlled Deadsmile Games library directory, track local play sessions, and synchronize optional PICO-8 save data. The application does not require administrator privileges and does not modify protected system directories.

## Certification tests

Before submission, install the package with a self-signed development certificate on a clean Windows 10 or Windows 11 x64 machine and test:

- First launch and login
- `deadsmile://` protocol activation
- itch.io account connection
- Purchase verification
- Game download, pause, resume and cancel
- Game launch and close detection
- Game update and rollback
- PICO-8 saves and achievements
- Offline mode and reconnection
- Uninstall and reinstall
- Microsoft Store launcher update from one package version to a higher version

Run the Windows App Certification Kit against the final package. The Store package version must increase for every submission.

## Store policy note

Certification must be given enough information to distinguish the launcher from an individual game. The listing and certification notes must clearly explain that game ownership and game delivery are provided through the user's linked itch.io account. Do not present a downloaded game as content acquired from Microsoft Store unless its installation and updates are also handled according to Microsoft Store gaming policies.
