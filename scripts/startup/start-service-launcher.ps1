<#!
  Ensures the Laucher API (frontend/apps/service-launcher) is running.
  - Installs dependencies on first run.
  - Starts the API in a hidden PowerShell window if it is not already listening on port 3500 (supports legacy 9999).
  - Optional -ForceRestart flag stops any existing instance before starting a new one.
#>
[CmdletBinding()]
param(
  [switch]$ForceRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$infrastructureDirectory = Split-Path -Parent $scriptDirectory
$repoRoot = Split-Path -Parent $infrastructureDirectory
$serviceLauncherPath = Join-Path $repoRoot 'frontend\apps\service-launcher'

if (-not (Test-Path -LiteralPath $serviceLauncherPath)) {
  throw "Service launcher directory not found at '$serviceLauncherPath'."
}

function Get-ServiceLauncherProcess {
  Get-Process -Name node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like '*frontend\apps\service-launcher*' }
}

$existing = Get-ServiceLauncherProcess
if ($ForceRestart -and $existing) {
  Write-Host '[Laucher] Stopping existing instance...' -ForegroundColor Yellow
  $existing | Stop-Process -Force
  Start-Sleep -Seconds 1
  $existing = $null
}

if ($existing) {
  Write-Host '[Laucher] Already running.' -ForegroundColor Green
  return
}

Push-Location $serviceLauncherPath
try {
  if (-not (Test-Path -LiteralPath 'node_modules')) {
    Write-Host '[Laucher] Installing npm dependencies...' -ForegroundColor Cyan
    npm install | Out-Null
  }
} finally {
  Pop-Location
}

$commandBlock = @"
& {
  Set-Location -LiteralPath '$serviceLauncherPath'
  Write-Host '[Laucher] Starting API (npm start)...'
  if (-not $env:SERVICE_LAUNCHER_PORT) {
    $env:SERVICE_LAUNCHER_PORT = '3500'
  }
  Write-Host '[Laucher] Using port ' + $env:SERVICE_LAUNCHER_PORT -ForegroundColor Cyan
  npm start
}
"@

Write-Host '[Laucher] Launching hidden background window...' -ForegroundColor Cyan
Start-Process -FilePath 'powershell.exe' -ArgumentList @(
  '-NoLogo',
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-WindowStyle', 'Hidden',
  '-Command', $commandBlock
) -WindowStyle Hidden

Write-Host '[Laucher] Startup command dispatched.' -ForegroundColor Green
