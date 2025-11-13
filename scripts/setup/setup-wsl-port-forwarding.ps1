# PowerShell script to setup port forwarding from WSL2 to Windows
# Run this on Windows PowerShell as Administrator

# Get WSL2 IP address
$wslIp = (wsl hostname -I).Trim().Split()[0]

Write-Host "WSL2 IP Address: $wslIp" -ForegroundColor Green

# Ports to forward
$ports = @(
    9082,  # API Gateway HTTP
    9083,  # Traefik Dashboard
    8092   # Dashboard UI (if accessed directly)
)

Write-Host ""
Write-Host "Setting up port forwarding..." -ForegroundColor Yellow

foreach ($port in $ports) {
    # Remove existing port proxy if exists
    $existing = netsh interface portproxy show v4tov4 | Select-String "0.0.0.0.*$port"

    if ($existing) {
        Write-Host "Removing existing port forward for $port..." -ForegroundColor Gray
        netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0
    }

    # Add new port proxy
    Write-Host "Forwarding port $port..." -ForegroundColor Cyan
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp

    # Add firewall rule
    $ruleName = "WSL2-Port-$port"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if ($existingRule) {
        Write-Host "Firewall rule already exists for port $port" -ForegroundColor Gray
    } else {
        Write-Host "Creating firewall rule for port $port..." -ForegroundColor Cyan
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Action Allow -Protocol TCP
    }
}

Write-Host ""
Write-Host "Current port forwarding:" -ForegroundColor Yellow
netsh interface portproxy show v4tov4

Write-Host ""
Write-Host "✅ Port forwarding setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now access:" -ForegroundColor Cyan
Write-Host "  - Dashboard:        http://localhost:9082/" -ForegroundColor White
Write-Host "  - Traefik Dashboard: http://localhost:9083/dashboard/" -ForegroundColor White
Write-Host "  - TP Capital API:   http://localhost:9082/api/tp-capital/signals" -ForegroundColor White
Write-Host ""
Write-Host "Note: You may need to run this script again if WSL2 IP changes!" -ForegroundColor Yellow
