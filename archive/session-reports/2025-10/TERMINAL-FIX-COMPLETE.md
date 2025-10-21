# 🔧 Fix Terminal Error - Solução Completa

## ❌ Erro Persistente:

```
The terminal process failed to launch: Invalid starting directory
"\\wsl.localhost\home\marce\projetos\TradingSystem"
```

## ✅ Soluções (teste uma por vez):

### 🚀 Solução 1: Reset Configuração

**1. Fechar Cursor completamente**

**2. Deletar configurações problemáticas:**
```bash
# No WSL
rm -f .vscode/settings.json
```

**3. Abrir Cursor novamente**

**4. Configurar manualmente:**
```
Ctrl+Shift+P → "Terminal: Select Default Profile" → Ubuntu (WSL)
```

---

### 🔧 Solução 2: Usar PowerShell + WSL

**1. Alterar para PowerShell:**
```
Ctrl+Shift+P → "Terminal: Select Default Profile" → PowerShell
```

**2. No PowerShell, digitar:**
```powershell
wsl -d Ubuntu
cd /home/marce/projetos/TradingSystem
```

---

### 🐧 Solução 3: Configuração Manual WSL

**1. Abrir Command Palette:**
```
Ctrl+Shift+P
```

**2. Digitar:**
```
Terminal: Select Default Profile
```

**3. Escolher:**
```
Ubuntu (WSL)
```

**4. Se não aparecer, criar perfil manual:**
```
Terminal: Configure Terminal Settings
```

---

### 🛠️ Solução 4: Configuração Alternativa

**Substituir `.vscode/settings.json` por:**

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "source": "PowerShell",
      "icon": "terminal-powershell"
    },
    "WSL": {
      "path": "C:\\Windows\\System32\\wsl.exe",
      "args": ["-d", "Ubuntu"],
      "icon": "terminal-linux"
    }
  },
  "terminal.integrated.cwd": "${workspaceFolder}"
}
```

---

## 🔍 Diagnóstico

### Verificar WSL:
```powershell
# No PowerShell do Windows
wsl --list
wsl -d Ubuntu pwd
```

### Verificar Diretório:
```bash
# No WSL
ls -la /home/marce/projetos/
```

### Verificar Cursor:
```
Ctrl+Shift+P → "Developer: Toggle Developer Tools"
```

---

## ⚡ Solução Mais Rápida

**Se nada funcionar, use PowerShell + WSL:**

### 1. Terminal PowerShell
```
Ctrl+Shift+P → "Terminal: Select Default Profile" → PowerShell
```

### 2. Comando WSL
```powershell
wsl -d Ubuntu
```

### 3. Navegar
```bash
cd /home/marce/projetos/TradingSystem
```

### 4. Executar Scripts
```bash
./infrastructure/scripts/start-trading-system-dev.sh
```

---

## 🎯 Configuração Final Recomendada

**Se WSL continuar com problemas, use esta configuração mínima:**

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.cwd": "${workspaceFolder}",
  "files.eol": "\n",
  "files.encoding": "utf8"
}
```

**E sempre execute WSL manualmente:**
```powershell
wsl -d Ubuntu
cd /home/marce/projetos/TradingSystem
```

---

## ✅ Verificação Final

**Terminal funcionando se:**
- [ ] Abre sem erro
- [ ] `pwd` mostra diretório Linux
- [ ] `ls` mostra arquivos do projeto
- [ ] Scripts executam: `./infrastructure/scripts/start-trading-system-dev.sh`

---

## 🆘 Se Nada Funcionar

**Use WSL diretamente:**

1. **Abrir WSL Ubuntu** (não pelo Cursor)
2. **Navegar ao projeto:**
   ```bash
   cd /home/marce/projetos/TradingSystem
   ```
3. **Executar scripts:**
   ```bash
   ./infrastructure/scripts/start-trading-system-dev.sh
   ```
4. **Abrir Cursor separadamente** para editar código

---

**🎯 Recomendação:** Use Solução 2 (PowerShell + WSL) - mais confiável!




