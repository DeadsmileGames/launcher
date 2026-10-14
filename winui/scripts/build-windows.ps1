[CmdletBinding()]
param(
 [string]$IdentityName = "DeadsmileGames.DeadsmileGamesLauncher",
 [string]$Publisher = "CN=A4BCCCEE-CD9B-459A-A0BC-BFDD3D7DBDFE",
 [string]$PublisherDisplayName = "Deadsmile Games",
 [string]$CertificateThumbprint = "",
 [string]$PackageVersion = "",
 [switch]$DevelopmentCertificate
)
$ErrorActionPreference = "Stop"
if ($env:OS -ne "Windows_NT") { throw "This build requires Windows." }
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

function Native([string]$Command, [string[]]$Arguments) {
 & $Command @Arguments
 if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE." }
}
function FindTool([string]$Name) {
 $command = Get-Command $Name -ErrorAction SilentlyContinue
 if ($command) { return $command.Source }
 $programFiles32 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
 $roots = @("$programFiles32\Windows Kits\10\bin", "$env:USERPROFILE\.nuget\packages\microsoft.windows.sdk.buildtools")
 foreach ($root in $roots) {
  if (!(Test-Path $root)) { continue }
  $file = Get-ChildItem $root -Filter $Name -File -Recurse | Where-Object { $_.FullName -match '\\x64\\' } |
   Sort-Object FullName -Descending | Select-Object -First 1
  if ($file) { return $file.FullName }
 }
 throw "Install the Windows SDK; $Name was not found."
}

$version = ([xml](Get-Content "Directory.Build.props" -Raw)).Project.PropertyGroup.Version
if ($version -notmatch "^\d+\.\d+\.\d+$") { throw "Version must use major.minor.patch." }
$sourceRevision = if ($env:SOURCE_SHA -match "^[0-9a-fA-F]{40}$") { $env:SOURCE_SHA } elseif ($env:GITHUB_SHA -match "^[0-9a-fA-F]{40}$") { $env:GITHUB_SHA } else { "" }
$revisionArguments = @()
if ($sourceRevision) {
 $revisionArguments = @("-p:SourceRevisionId=$sourceRevision", "-p:IncludeSourceRevisionInInformationalVersion=true")
}
$packageVersion = if ([string]::IsNullOrWhiteSpace($PackageVersion)) { "$version.0" } else { $PackageVersion }
if ($packageVersion -notmatch "^[1-9]\d*\.\d+\.\d+\.0$") {
 throw "PackageVersion must use major.minor.build.0 for Microsoft Store packaging."
}

$artifacts = Join-Path $projectRoot "artifacts"
if (Test-Path $artifacts) { Remove-Item $artifacts -Recurse -Force }
New-Item $artifacts -ItemType Directory -Force | Out-Null

Native "dotnet" @("run", "--project", "tests/Deadsmile.Core.Tests", "--configuration", "Release")
$publish = Join-Path $artifacts "app-x64"
$publishArguments = @(
 "publish", "src/Deadsmile.Launcher/Deadsmile.Launcher.csproj", "-c", "Release", "-r", "win-x64",
 "--self-contained", "true", "-p:Platform=x64", "-p:WindowsPackageType=None", "-p:WindowsAppSDKSelfContained=true",
 "-p:PublishTrimmed=false", "-p:PublishSingleFile=false", "-bl:$artifacts/publish.binlog", "-o", $publish
) + $revisionArguments
Native "dotnet" $publishArguments
if (!(Test-Path "$publish\Deadsmile.Launcher.exe") -or !(Test-Path "$publish\Microsoft.UI.Xaml.dll")) {
 throw "Published app or bundled WinUI runtime is missing."
}
Get-ChildItem $publish -Recurse -File | Where-Object { $_.Extension -eq ".pdb" } | Remove-Item -Force

$signTool = $null
if ($DevelopmentCertificate) {
 $options = @{
  Type = "Custom"
  Subject = $Publisher
  KeyUsage = "DigitalSignature"
  KeyAlgorithm = "RSA"
  KeyLength = 3072
  FriendlyName = "Deadsmile WinUI Development"
  CertStoreLocation = "Cert:\CurrentUser\My"
  TextExtension = @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}CA=false")
 }
 $certificate = New-SelfSignedCertificate @options
 $CertificateThumbprint = $certificate.Thumbprint
 Export-Certificate -Cert $certificate -FilePath "$artifacts\Deadsmile-Development.cer" | Out-Null
}
elseif ($CertificateThumbprint) {
 $certificate = Get-Item "Cert:\CurrentUser\My\$CertificateThumbprint"
 if ($certificate.Subject -ne $Publisher) {
  throw "The signing certificate Subject must match the MSIX manifest Publisher."
 }
}
if ($CertificateThumbprint) {
 $signTool = FindTool "signtool.exe"
 Native $signTool @("sign", "/fd", "SHA256", "/sha1", $CertificateThumbprint, "$publish\Deadsmile.Launcher.exe")
}

$packageDir = Join-Path $artifacts "msix-content"
New-Item $packageDir -ItemType Directory -Force | Out-Null
Copy-Item "$publish\*" $packageDir -Recurse -Force
$manifest = [xml](Get-Content "packaging/AppxManifest.template.xml" -Raw)
$identity = $manifest.DocumentElement.SelectSingleNode("*[local-name()='Identity']")
$identity.SetAttribute("Name", $IdentityName)
$identity.SetAttribute("Publisher", $Publisher)
$identity.SetAttribute("Version", $packageVersion)
$properties = $manifest.DocumentElement.SelectSingleNode("*[local-name()='Properties']")
$properties.SelectSingleNode("*[local-name()='PublisherDisplayName']").InnerText = $PublisherDisplayName
$manifestPath = Join-Path $packageDir "AppxManifest.xml"
$manifest.Save($manifestPath)

$msix = Join-Path $artifacts "Deadsmile-Games-Launcher-WinUI-$version-x64.msix"
Native (FindTool "makeappx.exe") @("pack", "/d", $packageDir, "/p", $msix, "/o")
if ($CertificateThumbprint) {
 Native $signTool @("sign", "/fd", "SHA256", "/sha1", $CertificateThumbprint, $msix)
}
else {
 Write-Warning "The MSIX is unsigned for Microsoft Store Partner Center submission. The Store signs it after certification."
}
if (!(Test-Path $msix) -or (Get-Item $msix).Length -lt 1MB) {
 throw "MSIX was not generated or is unexpectedly small."
}
Write-Host "MSIX artifact: $msix"
Write-Host "Package identity: $IdentityName"
Write-Host "Package publisher: $Publisher"
Write-Host "Package version: $packageVersion"
