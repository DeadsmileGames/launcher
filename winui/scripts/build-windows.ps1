[CmdletBinding()]
param(
 [ValidateSet("All", "App", "Msix", "Installer")][string]$Target = "All",
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
if ($packageVersion -notmatch "^[1-9]\d*\.\d+\.\d+\.0$") { throw "PackageVersion must use major.minor.build.0 for Microsoft Store packaging." }
$artifacts = Join-Path $projectRoot "artifacts"
$publish = Join-Path $artifacts "app-x64"
New-Item $artifacts -ItemType Directory -Force | Out-Null
Native "dotnet" @("run", "--project", "tests/Deadsmile.Core.Tests", "--configuration", "Release")
$publishArguments = @("publish", "src/Deadsmile.Launcher/Deadsmile.Launcher.csproj", "-c", "Release", "-r", "win-x64",
 "--self-contained", "true", "-p:Platform=x64", "-p:WindowsPackageType=None", "-p:WindowsAppSDKSelfContained=true",
 "-p:PublishTrimmed=false", "-p:PublishSingleFile=false", "-bl:$artifacts/publish.binlog", "-o", $publish) + $revisionArguments
Native "dotnet" $publishArguments
if (!(Test-Path "$publish\Deadsmile.Launcher.exe") -or !(Test-Path "$publish\Microsoft.UI.Xaml.dll")) {
 throw "Published app or WinUI runtime is missing."
}
Get-ChildItem $publish -Recurse -File | Where-Object { $_.Extension -in @(".pdb", ".xml") } | Remove-Item -Force
$certificate = $null
if ($DevelopmentCertificate) {
 $options = @{
  Type = "Custom"; Subject = $Publisher; KeyUsage = "DigitalSignature"; KeyAlgorithm = "RSA"; KeyLength = 3072
  FriendlyName = "Deadsmile WinUI Development"; CertStoreLocation = "Cert:\CurrentUser\My"
  TextExtension = @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}CA=false")
 }
 $certificate = New-SelfSignedCertificate @options
 $CertificateThumbprint = $certificate.Thumbprint
 Export-Certificate -Cert $certificate -FilePath "$artifacts\Deadsmile-Development.cer" | Out-Null
}
elseif ($CertificateThumbprint) {
 $certificate = Get-Item "Cert:\CurrentUser\My\$CertificateThumbprint"
 if ($certificate.Subject -ne $Publisher) { throw "Certificate Subject must match manifest Publisher." }
}
if ($CertificateThumbprint) {
 $signTool = FindTool "signtool.exe"
 Native $signTool @("sign", "/fd", "SHA256", "/sha1", $CertificateThumbprint, "$publish\Deadsmile.Launcher.exe")
}
if ($Target -in @("All", "Msix")) {
 $packageDir = Join-Path $artifacts "msix-content"
 if (Test-Path $packageDir) { Remove-Item $packageDir -Recurse -Force }
 New-Item $packageDir -ItemType Directory | Out-Null
 Copy-Item "$publish\*" $packageDir -Recurse -Force
 $manifest = [xml](Get-Content "installer/AppxManifest.template.xml" -Raw)
 $identity = $manifest.DocumentElement.SelectSingleNode("*[local-name()='Identity']")
 $identity.SetAttribute("Name", $IdentityName)
 $identity.SetAttribute("Publisher", $Publisher)
 $identity.SetAttribute("Version", $packageVersion)
 $manifest.DocumentElement.SelectSingleNode("*[local-name()='Properties']/*[local-name()='PublisherDisplayName']").InnerText = $PublisherDisplayName
 $manifest.Save("$packageDir\AppxManifest.xml")
 $msix = Join-Path $artifacts "Deadsmile-Games-Launcher-WinUI-$version-x64.msix"
 Native (FindTool "makeappx.exe") @("pack", "/d", $packageDir, "/p", $msix, "/o")
 if ($CertificateThumbprint) { Native $signTool @("sign", "/fd", "SHA256", "/sha1", $CertificateThumbprint, $msix) }
 else { Write-Warning "This unsigned MSIX is intended for Microsoft Store submission. It cannot be sideloaded directly; the Store signs it after certification." }
}
if ($Target -in @("All", "Installer")) {
 $payload = Join-Path $artifacts "AppPayload.zip"
 if (Test-Path $payload) { Remove-Item $payload -Force }
 Compress-Archive -Path "$publish\*" -DestinationPath $payload -CompressionLevel Optimal -Force

 $setupPublish = Join-Path $artifacts "setup-publish"
 if (Test-Path $setupPublish) { Remove-Item $setupPublish -Recurse -Force }
 Native "dotnet" @("publish", "src/Deadsmile.Setup/Deadsmile.Setup.csproj", "-c", "Release", "-r", "win-x64",
  "--self-contained", "true", "-p:Platform=x64", "-p:WindowsPackageType=None", "-p:WindowsAppSDKSelfContained=true",
  "-p:PublishTrimmed=false", "-p:PublishSingleFile=false", "-bl:$artifacts/setup-publish.binlog", "-o", $setupPublish)
 if (!(Test-Path "$setupPublish\Deadsmile.Setup.exe") -or !(Test-Path "$setupPublish\AppPayload.zip")) {
  throw "The native WinUI setup app or launcher payload is missing."
 }
 # WinUI 3 unpackaged apps need a root resources.pri for ms-appx resource lookup.
  # Index app XAML/assets plus dependency PRI maps, excluding the app PRI to avoid duplicate XBF entries.
 $resourcesPri = Join-Path $setupPublish "resources.pri"
 if (!(Test-Path $resourcesPri)) {
  $makepri = FindTool "makepri.exe"
  $resourceSource = Join-Path $artifacts "setup-resource-source"
  if (Test-Path $resourceSource) { Remove-Item $resourceSource -Recurse -Force }
  New-Item $resourceSource -ItemType Directory -Force | Out-Null
  Copy-Item (Join-Path $projectRoot "src/Deadsmile.Setup/Assets") (Join-Path $resourceSource "Assets") -Recurse -Force
  $compiledXamlFiles = @(
   Get-ChildItem (Join-Path $projectRoot "src/Deadsmile.Setup") -Recurse -File -Filter "*.xbf" -ErrorAction SilentlyContinue
   Get-ChildItem $setupPublish -Recurse -File -Filter "*.xbf" -ErrorAction SilentlyContinue
  )
  if ($compiledXamlFiles.Count -eq 0) {
   throw "The WinUI XAML compiler emitted no .xbf resources; refusing to build an incomplete installer."
  }
  foreach ($xamlFile in $compiledXamlFiles) {
   $xamlDestination = Join-Path $resourceSource $xamlFile.Name
   if (!(Test-Path $xamlDestination)) { Copy-Item $xamlFile.FullName $xamlDestination -Force }
  }

  # The app PRI must include framework/library resources as well as the app's XBF and images.
  # MakePri's default PRI indexer merges dependency PRI files; copy those indexes into the project root
  # while intentionally keeping the large self-contained runtime binaries out of this indexing pass.
  $appPriName = [IO.Path]::GetFileNameWithoutExtension((Join-Path $setupPublish "Deadsmile.Setup.exe")) + ".pri"
  $dependencyPris = Get-ChildItem $setupPublish -Recurse -File -Filter "*.pri" |
   Where-Object {
    ![string]::Equals($_.FullName, $resourcesPri, [StringComparison]::OrdinalIgnoreCase) -and
    ![string]::Equals($_.Name, $appPriName, [StringComparison]::OrdinalIgnoreCase)
   }
  foreach ($dependencyPri in $dependencyPris) {
   $relative = [IO.Path]::GetRelativePath($setupPublish, $dependencyPri.FullName)
   $priDestination = Join-Path $resourceSource $relative
   New-Item (Split-Path $priDestination -Parent) -ItemType Directory -Force | Out-Null
   Copy-Item $dependencyPri.FullName $priDestination -Force
  }
  if ($dependencyPris.Count -eq 0) {
   throw "Windows App SDK dependency PRI files are missing; refusing to build an incomplete WinUI setup."
  }

  $priConfig = Join-Path $artifacts "setup-priconfig.xml"
  $generatedPri = Join-Path $artifacts "setup-resources.pri"
  Remove-Item $priConfig, $generatedPri -Force -ErrorAction SilentlyContinue
  Native $makepri @("createconfig", "/cf", $priConfig, "/dq", "en-US", "/o")
  [xml]$priXml = Get-Content $priConfig -Raw
  foreach ($packagingNode in @($priXml.SelectNodes("//*[local-name()='packaging']"))) {
   [void]$packagingNode.ParentNode.RemoveChild($packagingNode)
  }
  $priXml.Save($priConfig)
  Native $makepri @("new", "/pr", $resourceSource, "/cf", $priConfig, "/of", $generatedPri, "/o")
  if (!(Test-Path $generatedPri) -or (Get-Item $generatedPri).Length -lt 1024) {
   throw "MakePri did not generate a valid app resource index."
  }
  Copy-Item $generatedPri $resourcesPri -Force
  Remove-Item $priConfig, $generatedPri -Force -ErrorAction SilentlyContinue
  Remove-Item $resourceSource -Recurse -Force -ErrorAction SilentlyContinue
 }
 if (!(Test-Path $resourcesPri) -or (Get-Item $resourcesPri).Length -lt 1024) {
  throw "The WinUI setup resource index could not be generated."
 }
 Remove-Item $payload -Force

 $makensisCommand = Get-Command "makensis.exe" -ErrorAction SilentlyContinue
 $makensis = if ($makensisCommand) { $makensisCommand.Source } else {
  Join-Path ([Environment]::GetEnvironmentVariable("ProgramFiles(x86)")) "NSIS\makensis.exe"
 }
 if (!(Test-Path $makensis)) { throw "Install NSIS 3 to package the native WinUI setup app." }
 $setup = Join-Path $artifacts "Deadsmile-Games-Launcher-WinUI-Setup-$version-x64.exe"
 Native $makensis @("/DSETUP_DIR=$setupPublish", "/DOUT_FILE=$setup", "/DAPP_VERSION=$version", "installer/launcher.nsi")
 if ($CertificateThumbprint) { Native $signTool @("sign", "/fd", "SHA256", "/sha1", $CertificateThumbprint, $setup) }
}
Get-ChildItem $artifacts -File | Where-Object { $_.Extension -in @(".msix", ".exe") } | ForEach-Object {
 $digest = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
 [IO.File]::WriteAllText($_.FullName + ".sha256", "$digest  $($_.Name)" + [Environment]::NewLine)
}
Write-Host "Artifacts: $artifacts"

