# Laucher Script
# Usage: .\launch-service.ps1 -ServiceName "Dashboard" -WorkingDir "path" -Command "npm run dev"

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceName,

    [Parameter(Mandatory=$true)]
    [string]$WorkingDir,

    [Parameter(Mandatory=$true)]
    [string]$Command
)

Write-Host "Launching $ServiceName..." -ForegroundColor Cyan
Write-Host "Working Directory: $WorkingDir" -ForegroundColor Gray
Write-Host "Command: $Command" -ForegroundColor Gray

# Validate working directory exists
if (-not (Test-Path -Path $WorkingDir)) {
    Write-Host "ERROR: Working directory does not exist: $WorkingDir" -ForegroundColor Red
    exit 1
}

# Check if Windows Terminal is available
$wtExists = Get-Command wt.exe -ErrorAction SilentlyContinue

if ($wtExists) {
    # Launch in Windows Terminal (preferred)
    Write-Host "Using Windows Terminal" -ForegroundColor Green

    # Create the PowerShell command to run inside the new tab
    $innerCommand = "Set-Location -LiteralPath '$WorkingDir'; `$host.ui.RawUI.WindowTitle='$ServiceName'; $Command"

    # Launch Windows Terminal with new tab
    Start-Process wt.exe -ArgumentList "-w","0","new-tab","--title","$ServiceName","powershell.exe","-NoExit","-Command",$innerCommand

    Write-Host "Launched in Windows Terminal" -ForegroundColor Green
} else {
    # Fallback to regular PowerShell
    Write-Host "Using PowerShell (Windows Terminal not found)" -ForegroundColor Yellow

    # Create the command
    $psCommand = "Set-Location -LiteralPath '$WorkingDir'; `$host.ui.RawUI.WindowTitle='$ServiceName'; $Command"

    # Start PowerShell window
    Start-Process powershell.exe -ArgumentList "-NoExit","-Command",$psCommand

    Write-Host "Launched in PowerShell" -ForegroundColor Green
}

Write-Host "Service $ServiceName launched successfully!" -ForegroundColor Green
