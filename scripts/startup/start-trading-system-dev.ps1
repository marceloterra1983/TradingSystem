<#
  Starts the TradingSystem dev services (Workspace, Dashboard, Documentation)
  Each service is launched in its own PowerShell window and dependencies are installed on first run.
#>
param(
  [switch]$SkipFrontend,
  [switch]$SkipIdeaBank,
  [switch]$SkipWorkspace,
  [switch]$SkipDocs,
  [switch]$StartMonitoring,
  [switch]$StartDocsDocker,
  [switch]$SkipServiceLauncher
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$infrastructureDirectory = Split-Path -Parent $scriptDirectory
$repoRoot = Split-Path -Parent $infrastructureDirectory

if (-not $SkipServiceLauncher) {
  $statusScript = Join-Path $scriptDirectory 'start-status.ps1'
  if (Test-Path -LiteralPath $statusScript) {
    Write-Host '[Init] Ensuring Status API is running (port 3500)...' -ForegroundColor Cyan
    & $statusScript
  } else {
    Write-Warning "[Init] Status script not found at $statusScript"
  }
}

function Invoke-ServiceStartup {
  param(
    [Parameter(Mandatory)]
    [string]$Name,

    [Parameter(Mandatory)]
    [string]$WorkingDirectory,

    [Parameter(Mandatory)]
    [string]$StartCommand
  )

  if (-not (Test-Path -LiteralPath $WorkingDirectory)) {
    Write-Warning "[$Name] Skipping (directory not found): $WorkingDirectory"
    return
  }

  $commandBlock = @"
Set-Location -LiteralPath '$WorkingDirectory'
if (-not (Test-Path -LiteralPath 'node_modules')) {
  Write-Host '[$Name] Installing dependencies (npm install)...'
  npm install
}
Write-Host '[$Name] Starting service...'
$StartCommand
"@

  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoLogo',
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command', $commandBlock
  )

  Write-Host "[$Name] launch command dispatched."
}

if (-not ($SkipIdeaBank -or $SkipWorkspace)) {
  Invoke-ServiceStartup -Name 'Workspace' `
    -WorkingDirectory (Join-Path $repoRoot 'frontend\apps\workspace') `
    -StartCommand 'npm start'
}

if (-not $SkipFrontend) {
  Invoke-ServiceStartup -Name 'Dashboard Frontend' `
    -WorkingDirectory (Join-Path $repoRoot 'frontend\apps\dashboard') `
    -StartCommand 'npm run dev'
}

if (-not $SkipDocs) {
  Invoke-ServiceStartup -Name 'Docs (Docusaurus)' `
    -WorkingDirectory (Join-Path $repoRoot 'docs') `
    -StartCommand 'npm run start -- --port 3004 --host 0.0.0.0'
}

if ($StartMonitoring) {
  $monitoringPath = Join-Path $repoRoot 'infrastructure\monitoring'
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Warning '[Monitoring] Docker is not available on PATH. Skipping monitoring stack startup.'
  } elseif (-not (Test-Path -LiteralPath $monitoringPath)) {
    Write-Warning "[Monitoring] Directory not found: $monitoringPath"
  } else {
    $envFile = Join-Path $repoRoot '.env'
    $composeFile = Join-Path $repoRoot 'infrastructure\monitoring\docker-compose.yml'
    $monitoringCommand = @"
Write-Host '[Monitoring] Starting Prometheus stack (docker compose up -d)...'
docker compose --env-file '$envFile' -f '$composeFile' up -d --build
"@
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoLogo',
      '-NoExit',
      '-ExecutionPolicy', 'Bypass',
      '-Command', $monitoringCommand
    )
    Write-Host '[Monitoring] launch command dispatched.'
  }
}

if ($StartDocsDocker) {
  $docsDockerPath = Join-Path $repoRoot 'docs'
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Warning '[Docs Docker] Docker is not available on PATH. Skipping documentation container startup.'
  } elseif (-not (Test-Path -LiteralPath $docsDockerPath)) {
    Write-Warning "[Docs Docker] Directory not found: $docsDockerPath"
  } else {
    $envFile = Join-Path $repoRoot '.env'
    $composeFile = Join-Path $repoRoot 'infrastructure\compose\docker-compose.docs.yml'
    $docsDockerCommand = @"
Write-Host '[Docs Docker] Starting stack (docker compose up -d docs-api)...'
docker compose --env-file '$envFile' -f '$composeFile' up -d --build docs-api
"@
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoLogo',
      '-NoExit',
      '-ExecutionPolicy', 'Bypass',
      '-Command', $docsDockerCommand
    )
    Write-Host '[Docs Docker] launch command dispatched.'
  }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'All requested services were triggered!' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Services running:' -ForegroundColor Yellow
if (-not ($SkipIdeaBank -or $SkipWorkspace)) { Write-Host '  - Workspace:          http://localhost:3100' -ForegroundColor White }
if (-not $SkipFrontend) { Write-Host '  - Dashboard:          http://localhost:5173' -ForegroundColor White }
if (-not $SkipDocs) { Write-Host '  - Docs (Docusaurus):  http://localhost:3004' -ForegroundColor White }
if ($StartDocsDocker) { Write-Host '  - Docs (Docker):      http://localhost:3004' -ForegroundColor White }
Write-Host ''
Write-Host 'Close this window to exit.' -ForegroundColor Gray
