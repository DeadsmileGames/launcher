[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:OS -ne 'Windows_NT') { throw 'Use an isolated Windows CI runner.' }
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
$artifacts = Join-Path $projectRoot 'artifacts'
$productionAssembly = Join-Path $artifacts 'app-x64/Deadsmile.Launcher.dll'
if ([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($productionAssembly)).Contains('UiValidationHandler')) {
 throw 'Production binary contains the test-only fixture.'
}
Write-Host 'PASS Production application excludes UI fixtures'
$validation = Join-Path $artifacts 'ui-validation'
dotnet publish src/Deadsmile.Launcher/Deadsmile.Launcher.csproj -c Release -r win-x64 --self-contained true -p:Platform=x64 -p:ValidateNativeUi=true "-bl:$artifacts/ui-validation.binlog" -o $validation
if ($LASTEXITCODE -ne 0) { throw 'UI validation build failed.' }
$env:DEADSMILE_UI_ARTIFACTS = Join-Path $artifacts 'ui-screenshots'
$process = Start-Process -FilePath (Join-Path $validation 'Deadsmile.Launcher.exe') -PassThru
if (!$process.WaitForExit(120000)) { Stop-Process -Id $process.Id -Force; throw 'Native UI validation timed out.' }
$resultPath = Join-Path $env:DEADSMILE_UI_ARTIFACTS 'results.json'
if (!(Test-Path $resultPath)) { throw "Native UI validator exited before recording results (exit $($process.ExitCode))." }
Get-Content $resultPath -Raw | Write-Host
$result = Get-Content $resultPath -Raw | ConvertFrom-Json
if ($process.ExitCode -ne 0 -or !$result.passed) { throw 'Native UI validation failed.' }
Write-Host "PASS Native UI: $($result.checks.Count) checks, $($result.screenshots) rendered screenshots"
