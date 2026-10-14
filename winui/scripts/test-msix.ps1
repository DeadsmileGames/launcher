[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:OS -ne 'Windows_NT') {
 throw 'Run MSIX deployment smoke tests only in an isolated GitHub Actions Windows runner.'
}
$projectRoot = Split-Path $PSScriptRoot -Parent
$artifacts = Join-Path $projectRoot 'artifacts'
$testRoot = Join-Path $env:RUNNER_TEMP ('Deadsmile-MSIX-smoke-' + [guid]::NewGuid().ToString('N'))
$msixFiles = @(Get-ChildItem $artifacts -Filter '*.msix' -File)
$certificate = Join-Path $artifacts 'Deadsmile-Development.cer'
$manifestPath = Join-Path $artifacts 'msix-content/AppxManifest.xml'
if ($msixFiles.Count -ne 1) { throw "Expected exactly one MSIX distribution package, found $($msixFiles.Count)." }
$msix = $msixFiles[0].FullName
if (!(Test-Path $certificate) -or !(Test-Path $manifestPath)) {
 throw 'The signed development MSIX or its test manifest/certificate is missing.'
}
$unexpectedPackages = @(Get-ChildItem $artifacts -File | Where-Object { $_.Extension -in @('.exe', '.msi', '.msp', '.appx', '.appxbundle') })
if ($unexpectedPackages.Count -gt 0) {
 throw "Non-MSIX distribution package found: $($unexpectedPackages.Name -join ', ')"
}
$manifest = [xml](Get-Content $manifestPath -Raw)
$identityElement = $manifest.DocumentElement.SelectSingleNode("*[local-name()='Identity']")
$appElement = $manifest.DocumentElement.SelectSingleNode("*[local-name()='Applications']/*[local-name()='Application']")
if (!$identityElement -or !$appElement) { throw 'The MSIX manifest has no package identity or application entry.' }
$identityName = $identityElement.GetAttribute('Name')
$appId = $appElement.GetAttribute('Id')
if ([string]::IsNullOrWhiteSpace($identityName) -or [string]::IsNullOrWhiteSpace($appId)) {
 throw 'The MSIX manifest identity or application ID is empty.'
}

$userData = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Deadsmile Games Launcher'
$sentinel = Join-Path $userData ('ci-preserve-' + [guid]::NewGuid().ToString('N') + '.txt')
$package = $null
$trustedCertificate = $null
$launchedProcess = $null
try {
 New-Item $testRoot -ItemType Directory -Force | Out-Null
 New-Item $userData -ItemType Directory -Force | Out-Null
 [IO.File]::WriteAllText($sentinel, 'MSIX uninstall must preserve user data.')

 $trustedCertificate = Import-Certificate -FilePath $certificate -CertStoreLocation 'Cert:\LocalMachine\TrustedPeople'
 Add-AppxPackage -Path $msix -ErrorAction Stop
 $package = Get-AppxPackage -Name $identityName
 if (!$package -or $package.Status -ne 'Ok') {
  throw "MSIX package did not register successfully for identity $identityName."
 }
 $expectedVersion = "1.0.$($env:GITHUB_RUN_NUMBER).0"
 if ($package.Version.ToString() -ne $expectedVersion) {
  throw "Expected a uniquely versioned CI MSIX ($expectedVersion), got $($package.Version)."
 }
 Write-Host "PASS MSIX installation and package registration: $($package.PackageFullName)"
 Write-Host "PASS MSIX package version advances with workflow run: $($package.Version)"

 $aumid = "$($package.PackageFamilyName)!$appId"
 $startedAt = Get-Date
 Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe') -ArgumentList "shell:AppsFolder\$aumid" | Out-Null
 $deadline = (Get-Date).AddSeconds(30)
 do {
  Start-Sleep -Milliseconds 250
  $launchedProcess = Get-Process -Name 'Deadsmile.Launcher' -ErrorAction SilentlyContinue |
   Where-Object { try { $_.StartTime -ge $startedAt.AddSeconds(-2) } catch { $false } } |
   Sort-Object StartTime -Descending | Select-Object -First 1
  if ($launchedProcess) {
   $launchedProcess.Refresh()
   if (!$launchedProcess.HasExited -and $launchedProcess.MainWindowHandle -ne 0) { break }
  }
 } until ((Get-Date) -gt $deadline)
 if (!$launchedProcess -or $launchedProcess.HasExited -or $launchedProcess.MainWindowHandle -eq 0) {
  throw 'The installed MSIX did not open the native WinUI main window.'
 }
 if ($launchedProcess.MainWindowTitle -notmatch 'Deadsmile') {
  throw "Unexpected launcher window title: $($launchedProcess.MainWindowTitle)"
 }
 Write-Host "PASS MSIX launches native WinUI window: $($launchedProcess.MainWindowTitle)"

 Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe') -ArgumentList "shell:AppsFolder\$aumid" | Out-Null
 Start-Sleep -Seconds 2
 $launchedProcess.Refresh()
 if ($launchedProcess.HasExited -or $launchedProcess.MainWindowHandle -eq 0 -or
     $launchedProcess.MainWindowTitle -notmatch 'Deadsmile') {
  throw 'A second Start-menu activation failed to reach the already-running launcher window.'
 }
 $activeLaunchers = @(Get-Process -Name 'Deadsmile.Launcher' -ErrorAction SilentlyContinue |
  Where-Object { try { !$_.HasExited -and $_.StartTime -ge $startedAt.AddSeconds(-2) } catch { $false } })
 if ($activeLaunchers.Count -ne 1) {
  throw "Expected one active launcher process after second activation, found $($activeLaunchers.Count)."
 }
 Write-Host "PASS second Start-menu activation reaches the running launcher instance"
 Stop-Process -Id $launchedProcess.Id -Force -ErrorAction SilentlyContinue
 $launchedProcess = $null

 Remove-AppxPackage -Package $package.PackageFullName -ErrorAction Stop
 $package = $null
 $uninstallDeadline = (Get-Date).AddSeconds(30)
 do {
  Start-Sleep -Milliseconds 250
  $remaining = Get-AppxPackage -Name $identityName
 } until (!$remaining -or (Get-Date) -gt $uninstallDeadline)
 if ($remaining) { throw 'MSIX uninstallation left the package registered.' }
 if (!(Test-Path $sentinel)) { throw 'MSIX uninstall removed user data.' }
 Write-Host 'PASS MSIX uninstallation preserves user data'
}
catch {
 Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=(Get-Date).AddMinutes(-5)} -ErrorAction SilentlyContinue |
  Where-Object { $_.ProviderName -in @('Application Error', '.NET Runtime') } |
  Select-Object TimeCreated, ProviderName, Message | Format-List | Out-String | Write-Host
 throw
}
finally {
 if ($launchedProcess -and !$launchedProcess.HasExited) { Stop-Process -Id $launchedProcess.Id -Force -ErrorAction SilentlyContinue }
 if ($package) { Remove-AppxPackage -Package $package.PackageFullName -ErrorAction SilentlyContinue }
 if ($trustedCertificate) { Remove-Item $trustedCertificate.PSPath -Force -ErrorAction SilentlyContinue }
 Remove-Item $sentinel -Force -ErrorAction SilentlyContinue
 Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
