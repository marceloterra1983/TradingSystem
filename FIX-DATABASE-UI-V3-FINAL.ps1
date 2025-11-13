# WSL2 Database UI Port Forwarding - Version 3 (FINAL)
# Run as Administrator in PowerShell

Write-Host "=======================" -ForegroundColor Cyan
Write-Host "WSL2 Port Forwarding v3" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# Get WSL2 eth0 IP (not Docker bridge IPs)
Write-Host "Detecting WSL2 IP address..." -ForegroundColor Yellow
$wslIp = (wsl ip -4 addr show eth0 | wsl grep -oP 'inet \K[\d.]+')

if (-not $wslIp) {
    Write-Host "ERROR: Could not detect WSL2 eth0 IP!" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    $allIps = (wsl hostname -I).Split()
    $wslIp = $allIps[0]  # Use first IP as fallback
}

Write-Host "WSL2 IP: $wslIp" -ForegroundColor Green
Write-Host ""

# Ports to forward
$ports = @(5050, 3910, 5052, 9000)

# Clean old rules
Write-Host "Removing old port forwarding rules..." -ForegroundColor Yellow
foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null
}

Write-Host ""
Write-Host "Creating NEW port forwarding rules..." -ForegroundColor Green

# Add new rules
foreach ($port in $ports) {
    Write-Host "  Port ${port} -> ${wslIp}:${port} ..." -NoNewline

    $result = netsh interface portproxy add v4tov4 `
        listenport=$port `
        listenaddress=0.0.0.0 `
        connectport=$port `
        connectaddress=$wslIp

    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Active forwarding rules:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4

Write-Host ""
Write-Host "Adding firewall rules..." -ForegroundColor Yellow
foreach ($port in $ports) {
    $ruleName = "WSL2-DB-UI-$port"

    # Remove old rule if exists
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    # Add new rule
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $port `
        -ErrorAction SilentlyContinue | Out-Null

    Write-Host "  Firewall rule for port ${port}: OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DONE! Test in browser:" -ForegroundColor Green
Write-Host "  http://localhost:5050 - pgAdmin" -ForegroundColor White
Write-Host "  http://localhost:3910 - Adminer" -ForegroundColor White
Write-Host "  http://localhost:5052 - pgWeb" -ForegroundColor White
Write-Host "  http://localhost:9000 - QuestDB" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
