[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:OS -ne 'Windows_NT') {
 throw 'Run installer smoke tests only in an isolated GitHub Actions Windows runner.'
}
$projectRoot = Split-Path $PSScriptRoot -Parent
$artifacts = Join-Path $projectRoot 'artifacts'
$testRoot = Join-Path $env:RUNNER_TEMP ('Deadsmile-WinUI-smoke-' + [guid]::NewGuid().ToString('N'))
$installDir = Join-Path $testRoot 'app'
$setup = (Get-ChildItem $artifacts -Filter '*Setup*.exe' -File | Select-Object -First 1).FullName
$msix = (Get-ChildItem $artifacts -Filter '*.msix' -File | Select-Object -First 1).FullName
$certificate = Join-Path $artifacts 'Deadsmile-Development.cer'
if (!$setup -or !$msix -or !(Test-Path $certificate)) { throw 'Installer artifacts are missing.' }
$setupPri = Join-Path $artifacts 'setup-publish/resources.pri'
if (!(Test-Path $setupPri) -or (Get-Item $setupPri).Length -lt 1024) {
 throw 'Native WinUI setup resource index (resources.pri) is missing or invalid.'
}

function RunSetup([string]$File, [string[]]$Arguments) {
 $process = Start-Process -FilePath $File -ArgumentList $Arguments -PassThru
 if (!$process.WaitForExit(240000)) {
  Stop-Process -Id $process.Id -Force
  throw "Installer timeout: $File"
 }
 if ($process.ExitCode -ne 0) { throw "Installer failed: $File (exit $($process.ExitCode))" }
}
function CheckSetupUi([string]$File) {
 $diagnosticLog = Join-Path $env:TEMP 'Deadsmile.Setup-startup.log'
 Remove-Item $diagnosticLog -Force -ErrorAction SilentlyContinue
 $previousDiagnostics = $env:DEADSMILE_SETUP_DIAGNOSTICS
 $env:DEADSMILE_SETUP_DIAGNOSTICS = '1'
 $wrapper = $null
 $setupProcess = $null
 $startedAt = Get-Date
 try {
  $wrapper = Start-Process -FilePath $File -PassThru
  $deadline = (Get-Date).AddSeconds(25)
  do {
   Start-Sleep -Milliseconds 250
   $wrapper.Refresh()
   $setupProcess = Get-Process -Name "Deadsmile.Setup" -ErrorAction SilentlyContinue |
    Where-Object { try { $_.StartTime -ge $startedAt.AddSeconds(-2) } catch { $false } } |
    Sort-Object StartTime -Descending | Select-Object -First 1
   if ($setupProcess) { $setupProcess.Refresh() }
   if ($wrapper.HasExited -and !$setupProcess) {
    if (Test-Path $diagnosticLog) { Write-Host 'Setup startup diagnostics:'; Get-Content $diagnosticLog | Write-Host }
    throw "Setup wrapper exited before starting Deadsmile.Setup (exit $($wrapper.ExitCode))."
   }
   if ($setupProcess -and $setupProcess.MainWindowHandle -ne 0) { break }
  } until ((Get-Date) -gt $deadline)
  if (!$setupProcess -or $setupProcess.HasExited -or $setupProcess.MainWindowHandle -eq 0) {
   if (Test-Path $diagnosticLog) { Write-Host 'Setup startup diagnostics:'; Get-Content $diagnosticLog | Write-Host }
   throw 'Backup EXE did not open the native WinUI 3 setup window.'
  }
  if ($setupProcess.MainWindowTitle -notmatch 'Deadsmile.*Setup|Setup.*Deadsmile') {
   throw "Unexpected setup window title: $($setupProcess.MainWindowTitle)"
  }
  Write-Host "PASS backup EXE launches native WinUI setup: $($setupProcess.MainWindowTitle)"
 } finally {
  if ($setupProcess -and !$setupProcess.HasExited) { Stop-Process -Id $setupProcess.Id -Force -ErrorAction SilentlyContinue }
  if ($wrapper -and !$wrapper.HasExited) { Stop-Process -Id $wrapper.Id -Force -ErrorAction SilentlyContinue }
  if ($null -eq $previousDiagnostics) { Remove-Item Env:DEADSMILE_SETUP_DIAGNOSTICS -ErrorAction SilentlyContinue }
  else { $env:DEADSMILE_SETUP_DIAGNOSTICS = $previousDiagnostics }
 }
}

function CheckStartup([string]$File) {
 $process = Start-Process -FilePath $File -PassThru
 try {
  Start-Sleep -Seconds 8
  $process.Refresh()
  if ($process.HasExited) { throw "Launcher exited during startup with code $($process.ExitCode)." }
  if ($process.MainWindowHandle -eq 0) { throw 'Launcher did not create a main window.' }
  Write-Host "PASS Installed application startup: $($process.MainWindowTitle)"
 } finally {
  if (!$process.HasExited) { Stop-Process -Id $process.Id -Force }
 }
}

$userData = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Deadsmile Games Launcher'
$sentinel = Join-Path $userData ('ci-preserve-' + [guid]::NewGuid().ToString('N') + '.txt')
$package = $null
$trustedCertificate = $null
try {
 New-Item $testRoot -ItemType Directory -Force | Out-Null
 New-Item $userData -ItemType Directory -Force | Out-Null
 [IO.File]::WriteAllText($sentinel, 'Installer must preserve user data.')
 CheckSetupUi $setup
 RunSetup $setup @('--silent', '--target', $installDir)
 if (!(Test-Path "$installDir\deadsmile.install") -or !(Test-Path "$installDir\Microsoft.UI.Xaml.dll")) {
  throw 'WinUI setup did not deploy the app and bundled runtime.'
 }
 $registered = (Get-ItemProperty 'HKCU:\Software\Deadsmile Games Launcher').InstallDir
 if ($registered -ne $installDir) { throw 'EXE installation registration is incorrect.' }
 if (!(Test-Path "$installDir\Uninstall\Deadsmile.Setup.exe")) { throw 'Native uninstaller is missing.' }
 Write-Host 'PASS native WinUI setup installs and registers the app'
 CheckStartup "$installDir\Deadsmile.Launcher.exe"
 RunSetup "$installDir\Uninstall\Deadsmile.Setup.exe" @('--silent', '--uninstall', '--target', $installDir)
 Start-Sleep -Seconds 3
 if (Test-Path "$installDir\Deadsmile.Launcher.exe") { throw 'EXE uninstallation left the application installed.' }
 if (Test-Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI') {
  throw 'EXE uninstall left its uninstall registration.'
 }
 if (!(Test-Path $sentinel)) { throw 'EXE uninstall removed user data.' }
 Write-Host 'PASS native uninstall preserves user data'

 $trustedCertificate = Import-Certificate -FilePath $certificate -CertStoreLocation 'Cert:\LocalMachine\TrustedPeople'
 Add-AppxPackage -Path $msix
 $identity = ([xml](Get-Content (Join-Path $artifacts 'msix-content/AppxManifest.xml') -Raw)).Package.Identity.Name
 $package = Get-AppxPackage -Name $identity
 if (!$package -or $package.Status -ne 'Ok') { throw 'MSIX package did not register successfully.' }
 Write-Host "PASS MSIX installation: $($package.PackageFullName)"
 Remove-AppxPackage -Package $package.PackageFullName
 $package = $null
 if (Get-AppxPackage -Name $identity) { throw 'MSIX uninstallation failed.' }
 if (!(Test-Path $sentinel)) { throw 'MSIX uninstall removed user data.' }
 Write-Host 'PASS MSIX uninstallation preserves user data'
} catch {
 Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=(Get-Date).AddMinutes(-5)} -ErrorAction SilentlyContinue |
  Where-Object { $_.ProviderName -in @('Application Error', '.NET Runtime') } |
  Select-Object TimeCreated, ProviderName, Message | Format-List | Out-String | Write-Host
 throw
} finally {
 if ($package) { Remove-AppxPackage -Package $package.PackageFullName -ErrorAction SilentlyContinue }
 if ($trustedCertificate) { Remove-Item $trustedCertificate.PSPath -Force -ErrorAction SilentlyContinue }
 Remove-Item $sentinel -Force -ErrorAction SilentlyContinue
 Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
