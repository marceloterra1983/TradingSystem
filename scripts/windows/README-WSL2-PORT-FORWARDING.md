# WSL2 Port Forwarding for Database UI Tools

## The Problem

When running Docker containers inside WSL2, the ports are exposed **only inside WSL2**, not automatically on Windows `localhost`. This causes "ERR_EMPTY_RESPONSE" when trying to access database UIs from Windows browser.

## Affected Services

- **pgAdmin** - Port 5050
- **Adminer** - Port 3910
- **pgWeb** - Port 5052
- **QuestDB** - Port 9000

## The Solution

Run the PowerShell port forwarding script **on Windows as Administrator**.

### Step 1: Open PowerShell as Administrator

1. Press `Win + X`
2. Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

### Step 2: Navigate to Scripts Directory

```powershell
# From Windows, access WSL2 filesystem
cd \\wsl$\Ubuntu\home\marce\Projetos\TradingSystem\scripts\windows
```

Or if you have the project mapped to a drive:

```powershell
cd C:\path\to\TradingSystem\scripts\windows
```

### Step 3: Run the Forwarding Script

```powershell
.\forward-database-ui-ports.ps1
```

### Expected Output

```
WSL2 Database UI Port Forwarding
=================================

WSL2 IP Address: 172.x.x.x

Cleaning up existing port forwarding rules...

Adding new port forwarding rules...
  → Forwarding port 5050 (pgAdmin)... ✓
  → Forwarding port 3910 (Adminer)... ✓
  → Forwarding port 5052 (pgWeb)... ✓
  → Forwarding port 9000 (QuestDB)... ✓

✓ Port forwarding configured!

You can now access:
  → pgAdmin:  http://localhost:5050
  → Adminer:  http://localhost:3910
  → pgWeb:    http://localhost:5052
  → QuestDB:  http://localhost:9000
```

### Step 4: Test in Browser

Open your Windows browser and navigate to:
- http://localhost:5050 - pgAdmin
- http://localhost:3910 - Adminer
- http://localhost:5052 - pgWeb
- http://localhost:9000 - QuestDB

## Removing Port Forwarding

If you need to remove the port forwarding rules:

```powershell
.\remove-database-ui-port-forwarding.ps1
```

## Troubleshooting

### "Access Denied"
- Make sure you're running PowerShell **as Administrator**

### "Cannot find path"
- Verify WSL2 is running: `wsl --list --running`
- Check the path exists: `wsl ls -la /home/marce/Projetos/TradingSystem/scripts/windows`

### Ports Still Not Working
1. Verify containers are running in WSL2:
   ```bash
   wsl docker ps | grep dbui
   ```

2. Check WSL2 IP address:
   ```bash
   wsl hostname -I
   ```

3. Verify ports are listening in WSL2:
   ```bash
   wsl docker port dbui-pgadmin-proxy
   ```

4. Test from WSL2 itself:
   ```bash
   wsl curl http://localhost:5050
   ```

### Firewall Blocking
- Check Windows Firewall settings
- The script automatically adds firewall rules, but verify they're enabled

## Why This Happens

WSL2 uses **Hyper-V virtualization** with its own network stack. Unlike WSL1 (which shared Windows network), WSL2 has:
- Its own IP address (172.x.x.x range)
- Separate network interface
- No automatic port forwarding to Windows

The `netsh interface portproxy` command creates a **bridge** between Windows `localhost` and WSL2's internal IP.

## Persistence

These port forwarding rules **persist across reboots** until you:
1. Manually remove them (using the removal script)
2. Windows updates and resets network configuration
3. WSL2 IP address changes (rare, but possible)

If the Database UI pages stop working after a Windows restart, the WSL2 IP might have changed. Just re-run the forwarding script.

## Alternative: Access from WSL2 Browser

If you don't want to set up port forwarding, you can:
1. Install a browser inside WSL2 (e.g., `wsl sudo apt install firefox`)
2. Use X11 forwarding or WSLg
3. Access the UIs directly using WSL2's internal IP

But the port forwarding approach is **simpler and more native** for Windows users.
