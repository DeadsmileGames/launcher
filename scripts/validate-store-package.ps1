param(
  [Parameter(Mandatory = $true)]
  [string]$PackagePath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PackagePath -PathType Leaf)) {
  throw "Microsoft Store package was not found."
}

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
  $capabilities = $manifest.SelectNodes("//*[local-name()='Capability']")
  $protocols = $manifest.SelectNodes("//*[local-name()='Protocol']")

  if ($identity.Name -cne $env:MICROSOFT_STORE_IDENTITY_NAME) {
    throw "The package identity does not match Partner Center."
  }
  if ($identity.Publisher -cne $env:MICROSOFT_STORE_PUBLISHER) {
    throw "The package publisher does not match Partner Center."
  }
  if ($identity.ProcessorArchitecture -ne "x64") {
    throw "The package architecture is not x64."
  }
  if ($identity.Version -notmatch '^\d+\.\d+\.\d+\.\d+$') {
    throw "The package version is invalid."
  }
  if ($application.EntryPoint -ne "Windows.FullTrustApplication") {
    throw "The desktop full-trust entry point is missing."
  }
  if (-not ($capabilities | Where-Object { $_.Name -eq "runFullTrust" })) {
    throw "The runFullTrust capability is missing."
  }
  if (-not ($protocols | Where-Object { $_.Name -eq "deadsmile" })) {
    throw "The deadsmile protocol is missing."
  }

  $executable = Join-Path $inspectionPath $application.Executable
  if (-not (Test-Path $executable -PathType Leaf)) {
    throw "The launcher executable is missing from the package."
  }

  @(
    "StoreLogo.png",
    "Square150x150Logo.png",
    "Square44x44Logo.png",
    "Wide310x150Logo.png"
  ) | ForEach-Object {
    if (-not (Test-Path (Join-Path $inspectionPath "assets\$_") -PathType Leaf) {
      throw "A required Microsoft Store asset is missing."
    }
  }

  Write-Output "MSIX package validation passed."
} finally {
  Remove-Item $inspectionPath -Recurse -Force -ErrorAction SilentlyContinue
}
