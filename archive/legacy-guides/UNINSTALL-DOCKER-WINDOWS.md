# Uninstall Docker Desktop from Windows

## ⚠️ Important Notice

**Your containers will continue to exist and be managed by Portainer.** This uninstall only removes Docker Desktop from your local Windows machine.

---

## Step-by-Step Uninstall Instructions

### 1. Close Docker Desktop
- Right-click the Docker icon in the system tray
- Select **Quit Docker Desktop**
- Wait for it to fully shut down

### 2. Uninstall via Windows Settings (Recommended)

**Windows 11:**
1. Press `Win + I` to open Settings
2. Go to **Apps** → **Installed apps**
3. Search for "Docker Desktop"
4. Click the three dots `⋮` next to Docker Desktop
5. Select **Uninstall**
6. Confirm the uninstall

**Windows 10:**
1. Press `Win + I` to open Settings
2. Go to **Apps** → **Apps & features**
3. Search for "Docker Desktop"
4. Click on it and select **Uninstall**
5. Confirm the uninstall

### 3. Alternative: Uninstall via Control Panel

1. Press `Win + R`
2. Type `appwiz.cpl` and press Enter
3. Find **Docker Desktop** in the list
4. Right-click and select **Uninstall**
5. Follow the prompts

### 4. Clean Up Remaining Files (Optional)

After uninstalling, you may want to remove leftover files:

**Delete Docker Desktop data:**
```powershell
# Run PowerShell as Administrator
Remove-Item -Path "$env:APPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:ProgramData\Docker" -Recurse -Force -ErrorAction SilentlyContinue
```

**Or manually delete these folders:**
- `C:\Users\<YourUsername>\AppData\Roaming\Docker`
- `C:\Users\<YourUsername>\AppData\Local\Docker`
- `C:\ProgramData\Docker`
- `C:\Program Files\Docker`

### 5. Remove WSL 2 Backend (Optional)

If you only used Docker and don't need WSL2 for other purposes:

```powershell
# Run PowerShell as Administrator
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data
```

### 6. Verify Removal

Open PowerShell and run:
```powershell
docker --version
```

You should see an error: `docker : The term 'docker' is not recognized...`

---

## 🌐 Accessing Your Containers via Portainer

Your containers are still running and accessible via Portainer:

1. **Open Portainer Web UI:**
   - URL: `http://your-server-ip:9000`
   - Or: `https://your-portainer-domain.com`

2. **Login with your credentials**

3. **Select your environment:**
   - Click on "Environments" or "Endpoints"
   - Select your Docker host

4. **Manage containers:**
   - View running containers
   - Start/stop containers
   - View logs
   - Execute commands
   - Monitor resources

---

## 📦 What Happens to My Containers?

✅ **Containers remain running** - They're hosted on the remote Docker host
✅ **Data persists** - All volumes and data are preserved
✅ **Networks intact** - Container networking continues to work
✅ **Portainer still manages everything** - Full control via web UI

---

## 🔄 If You Need Docker Again

You can always reinstall Docker Desktop from:
- https://www.docker.com/products/docker-desktop

Or use Docker CLI directly in WSL without Docker Desktop.

---

## 🆘 Troubleshooting

### Uninstall fails with "Application is still running"
1. Open Task Manager (`Ctrl + Shift + Esc`)
2. End these processes:
   - `Docker Desktop.exe`
   - `com.docker.backend.exe`
   - `com.docker.service`
3. Try uninstalling again

### "Access Denied" errors
- Run the uninstaller as Administrator
- Right-click → "Run as administrator"

### WSL2 errors after uninstall
- WSL2 will continue to work normally
- Only Docker-specific WSL distributions are removed

---

## 📧 Need Help?

If you encounter issues:
1. Check the Docker Desktop uninstall logs at:
   - `%TEMP%\Docker Desktop Installer*.log`
2. Restart your computer and try again
3. Use the official Docker uninstall guide:
   - https://docs.docker.com/desktop/uninstall/

---

**Last Updated:** 2025-10-13
**Applies To:** Docker Desktop for Windows (all versions)
