# WSL2 Port Forwarding for Database UI Tools
# Run this script in PowerShell as Administrator on Windows
#
# Purpose: Forward WSL2 database UI ports to Windows localhost
# Required when: Accessing database UIs from Windows browser

Write-Host "WSL2 Database UI Port Forwarding" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Get WSL2 IP address
$wslIp = (wsl hostname -I).Trim()
Write-Host "WSL2 IP Address: $wslIp" -ForegroundColor Green
Write-Host ""

# Database UI ports to forward
$ports = @(
    @{ Name = "pgAdmin";  Port = 5050 },
    @{ Name = "Adminer";  Port = 3910 },
    @{ Name = "pgWeb";    Port = 5052 },
    @{ Name = "QuestDB";  Port = 9000 }
)

# Remove existing port forwarding rules (cleanup)
Write-Host "Cleaning up existing port forwarding rules..." -ForegroundColor Yellow
foreach ($portConfig in $ports) {
    $port = $portConfig.Port
    try {
        netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
    } catch {
        # Ignore errors if rule doesn't exist
    }
}

Write-Host ""
Write-Host "Adding new port forwarding rules..." -ForegroundColor Yellow

# Add new port forwarding rules
foreach ($portConfig in $ports) {
    $name = $portConfig.Name
    $port = $portConfig.Port

    Write-Host "  → Forwarding port $port ($name)..." -NoNewline

    try {
        netsh interface portproxy add v4tov4 `
            listenport=$port `
            listenaddress=0.0.0.0 `
            connectport=$port `
            connectaddress=$wslIp | Out-Null

        Write-Host " ✓" -ForegroundColor Green
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Port forwarding rules:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4 | Select-String -Pattern "(5050|3910|5052|9000)"

Write-Host ""
Write-Host "✓ Port forwarding configured!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now access:" -ForegroundColor Cyan
Write-Host "  → pgAdmin:  http://localhost:5050" -ForegroundColor White
Write-Host "  → Adminer:  http://localhost:3910" -ForegroundColor White
Write-Host "  → pgWeb:    http://localhost:5052" -ForegroundColor White
Write-Host "  → QuestDB:  http://localhost:9000" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: These rules persist until you delete them or restart Windows." -ForegroundColor Yellow
Write-Host "To remove: Run this script with '-Remove' flag" -ForegroundColor Yellow
Write-Host ""

# Add firewall rules if needed
Write-Host "Checking Windows Firewall rules..." -ForegroundColor Yellow
foreach ($portConfig in $ports) {
    $port = $portConfig.Port
    $ruleName = "WSL2 Database UI - Port $port"

    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if (-not $existingRule) {
        Write-Host "  → Creating firewall rule for port $port..." -NoNewline
        New-NetFirewallRule `
            -DisplayName $ruleName `
            -Direction Inbound `
            -Action Allow `
            -Protocol TCP `
            -LocalPort $port | Out-Null
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host "  → Firewall rule for port $port already exists ✓" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✓ All done! Try accessing the database UIs now." -ForegroundColor Green
