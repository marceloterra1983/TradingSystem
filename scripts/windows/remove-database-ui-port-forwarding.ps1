# Remove WSL2 Port Forwarding for Database UI Tools
# Run this script in PowerShell as Administrator on Windows

Write-Host "Removing WSL2 Database UI Port Forwarding" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Database UI ports
$ports = @(5050, 3910, 5052, 9000)

Write-Host "Removing port forwarding rules..." -ForegroundColor Yellow
foreach ($port in $ports) {
    Write-Host "  → Removing port $port..." -NoNewline
    try {
        netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
        Write-Host " ✓" -ForegroundColor Green
    } catch {
        Write-Host " ✗ (not found)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Removing firewall rules..." -ForegroundColor Yellow
foreach ($port in $ports) {
    $ruleName = "WSL2 Database UI - Port $port"
    Write-Host "  → Removing firewall rule for port $port..." -NoNewline

    $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($rule) {
        Remove-NetFirewallRule -DisplayName $ruleName
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ✗ (not found)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✓ Port forwarding removed!" -ForegroundColor Green
Write-Host ""
Write-Host "Remaining port forwarding rules:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4
