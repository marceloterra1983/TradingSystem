<#!
  Ensures the Status API (frontend/apps/status) is running.
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
$statusPath = Join-Path $repoRoot 'frontend\apps\status'

if (-not (Test-Path -LiteralPath $statusPath)) {
  throw "Status directory not found at '$statusPath'."
}

function Get-StatusProcess {
  Get-Process -Name node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like '*frontend\apps\status*' }
}

$existing = Get-StatusProcess
if ($ForceRestart -and $existing) {
  Write-Host '[Status] Stopping existing instance...' -ForegroundColor Yellow
  $existing | Stop-Process -Force
  Start-Sleep -Seconds 1
  $existing = $null
}

if ($existing) {
  Write-Host '[Status] Already running.' -ForegroundColor Green
  return
}

Push-Location $statusPath
try {
  if (-not (Test-Path -LiteralPath 'node_modules')) {
    Write-Host '[Status] Installing npm dependencies...' -ForegroundColor Cyan
    npm install | Out-Null
  }
} finally {
  Pop-Location
}

$commandBlock = @"
& {
  Set-Location -LiteralPath '$statusPath'
  Write-Host '[Status] Starting API (npm start)...'
  if (-not $env:STATUS_PORT) {
    $env:STATUS_PORT = '3500'
  }
  Write-Host '[Status] Using port ' + $env:STATUS_PORT -ForegroundColor Cyan
  npm start
}
"@

Write-Host '[Status] Launching hidden background window...' -ForegroundColor Cyan
Start-Process -FilePath 'powershell.exe' -ArgumentList @(
  '-NoLogo',
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-WindowStyle', 'Hidden',
  '-Command', $commandBlock
) -WindowStyle Hidden

Write-Host '[Status] Startup command dispatched.' -ForegroundColor Green
