param(
  [Parameter(Mandatory = $true)]
  [string]$PackagePath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PackagePath -PathType Leaf)) {
  throw "Microsoft Store package was not found."
}

$packageJsonPath = Join-Path $PSScriptRoot "..\package.json"
if (-not (Test-Path $packageJsonPath -PathType Leaf)) {
  throw "package.json was not found."
}
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$semver = [string]$packageJson.version
if ($semver -notmatch '^(\d+)\.(\d+)\.(\d+)$') {
  throw "package.json version is not compatible with Microsoft Store package versioning."
}
$expectedVersion = "$semver.0"

$makeAppx = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\makeappx.exe" |
  Sort-Object FullName |
  Select-Object -Last 1

if (-not $makeAppx) {
  throw "MakeAppx.exe was not found."
}

$inspectionPath = Join-Path ([System.IO.Path]::GetTempPath()) "deadsmile-msix-$([guid]::NewGuid())"

try {
  & $makeAppx.FullName unpack /p $PackagePath /d $inspectionPath /o | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "The MSIX package could not be opened."
  }

  $manifestPath = Join-Path $inspectionPath "AppxManifest.xml"
  if (-not (Test-Path $manifestPath -PathType Leaf)) {
    throw "AppxManifest.xml is missing."
  }

  [xml]$manifest = Get-Content $manifestPath -Raw
  $identity = $manifest.Package.Identity
  $application = $manifest.Package.Applications.Application
  $properties = $manifest.Package.Properties
  $targetDeviceFamily = $manifest.Package.Dependencies.TargetDeviceFamily
  $capabilities = @($manifest.SelectNodes("//*[local-name()='Capability']"))
  $protocols = @($manifest.SelectNodes("//*[local-name()='Protocol']"))
  $resources = @($manifest.SelectNodes("//*[local-name()='Resource']"))

  if ($identity.Name -cne $env:MICROSOFT_STORE_IDENTITY_NAME) {
    throw "The package identity does not match Partner Center."
  }
  if ($identity.Publisher -cne $env:MICROSOFT_STORE_PUBLISHER) {
    throw "The package publisher does not match Partner Center."
  }
  if ($identity.ProcessorArchitecture -ne "x64") {
    throw "The package architecture is not x64."
  }
  if ($identity.Version -cne $expectedVersion) {
    throw "The package version '$($identity.Version)' does not match '$expectedVersion'."
  }
  if ($application.Id -cne "DeadsmileGamesLauncher") {
    throw "The application identity is invalid."
  }
  if ($application.EntryPoint -ne "Windows.FullTrustApplication") {
    throw "The desktop full-trust entry point is missing."
  }
  if ($properties.DisplayName -cne "Deadsmile Games Launcher") {
    throw "The package display name is invalid."
  }
  if ($properties.PublisherDisplayName -cne $env:MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME) {
    throw "The publisher display name does not match Partner Center."
  }
  if ($targetDeviceFamily.Name -cne "Windows.Desktop") {
    throw "The package must target Windows.Desktop."
  }
  if ($targetDeviceFamily.MinVersion -cne "10.0.17763.0") {
    throw "The package minimum Windows version changed unexpectedly."
  }
  if ($targetDeviceFamily.MaxVersionTested -cne "10.0.26100.0") {
    throw "The package MaxVersionTested changed unexpectedly."
  }

  $capabilityNames = @($capabilities | ForEach-Object { [string]$_.Name } | Sort-Object -Unique)
  foreach ($requiredCapability in @("internetClient", "runFullTrust")) {
    if ($requiredCapability -notin $capabilityNames) {
      throw "The required capability '$requiredCapability' is missing."
    }
  }
  $unexpectedCapabilities = @($capabilityNames | Where-Object { $_ -notin @("internetClient", "runFullTrust") })
  if ($unexpectedCapabilities.Count -gt 0) {
    throw "Unexpected package capabilities: $($unexpectedCapabilities -join ', ')."
  }

  $protocolNames = @($protocols | ForEach-Object { [string]$_.Name } | Sort-Object -Unique)
  if ($protocolNames.Count -ne 1 -or $protocolNames[0] -cne "deadsmile") {
    throw "The package must expose only the deadsmile protocol."
  }

  $requiredLanguages = @("pt-BR", "en-US", "es-ES")
  $languageNames = @($resources | ForEach-Object { [string]$_.Language })
  foreach ($language in $requiredLanguages) {
    if ($language -notin $languageNames) {
      throw "The package is missing the '$language' resource language."
    }
  }

  $executable = Join-Path $inspectionPath $application.Executable
  if (-not (Test-Path $executable -PathType Leaf)) {
    throw "The launcher executable is missing from the package."
  }

  @(
    "StoreLogo.png",
    "Square150x150Logo.png",
    "Square44x44Logo.png",
    "Wide310x150Logo.png",
    "SmallTile.png",
    "SplashScreen.png",
    "LargeTile.png"
  ) | ForEach-Object {
    if (-not (Test-Path (Join-Path $inspectionPath "assets\$_") -PathType Leaf)) {
      throw "A required Microsoft Store asset is missing: $_."
    }
  }

  if (Test-Path (Join-Path $inspectionPath "AppxSignature.p7x") -PathType Leaf) {
    throw "The Microsoft Store workflow must produce an unsigned MSIX; the Store signs it on submission."
  }

  Write-Output "MSIX package validation passed."
  Write-Output "Identity: $($identity.Name)"
  Write-Output "Publisher: $($identity.Publisher)"
  Write-Output "Version: $($identity.Version)"
  Write-Output "Capabilities: $($capabilityNames -join ', ')"
} finally {
  Remove-Item $inspectionPath -Recurse -Force -ErrorAction SilentlyContinue
}
