# WSL2 Port Forwarding for Database UI Tools (Version 2)
# Run this script in PowerShell as Administrator on Windows
#
# Improvement: Uses WSL2 eth0 IP instead of first docker network IP

Write-Host "WSL2 Database UI Port Forwarding (v2)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Get WSL2 eth0 IP address (not docker networks)
$wslIp = (wsl ip addr show eth0 | wsl grep -oP '(?<=inet\s)\d+(\.\d+){3}').Trim()

if (-not $wslIp) {
    Write-Host "ERROR: Could not detect WSL2 IP address" -ForegroundColor Red
    Write-Host "Trying fallback method..." -ForegroundColor Yellow
    $wslIp = (wsl hostname -I).Split()[0].Trim()
}

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

    Write-Host "  → Forwarding port $port ($name) to $wslIp..." -NoNewline

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
Write-Host "Current port forwarding rules:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4

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
Write-Host "✓ All done! Refresh your browser and try the Database page links." -ForegroundColor Green
Write-Host ""

# Test connectivity
Write-Host "Testing connectivity from Windows to WSL2..." -ForegroundColor Yellow
foreach ($portConfig in $ports) {
    $port = $portConfig.Port
    $name = $portConfig.Name

    Write-Host "  → Testing $name (port $port)..." -NoNewline

    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.ReceiveTimeout = 2000
        $tcpClient.SendTimeout = 2000
        $tcpClient.Connect("127.0.0.1", $port)

        if ($tcpClient.Connected) {
            Write-Host " ✓ Connected" -ForegroundColor Green
            $tcpClient.Close()
        } else {
            Write-Host " ✗ Cannot connect" -ForegroundColor Red
        }
    } catch {
        Write-Host " ✗ Cannot connect (timeout)" -ForegroundColor Red
    }
}

Write-Host ""
