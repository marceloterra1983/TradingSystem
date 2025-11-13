# 🔧 Fix: Database UI Not Loading on Windows

## Problema

Os links do **Database Toolbox** mostram "ERR_EMPTY_RESPONSE" no Windows porque o WSL2 não faz port forwarding automaticamente.

## Solução Rápida (3 passos)

### 1. Abrir PowerShell como Administrador
- Pressione `Win + X`
- Selecione **"Terminal (Admin)"** ou **"Windows PowerShell (Admin)"**

### 2. Copiar e Colar o Script

Abra o arquivo `EXECUTE-NO-POWERSHELL.txt` e **copie TODO o conteúdo** para o PowerShell.

Ou copie diretamente daqui:

```powershell
# Obter IP do WSL2
$wslIp = (wsl hostname -I).Trim()
Write-Host "WSL2 IP: $wslIp" -ForegroundColor Green

# Portas a encaminhar
$ports = @(5050, 3910, 5052, 9000)

# Limpar regras antigas
foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null
}

# Adicionar novas regras
foreach ($port in $ports) {
    Write-Host "Forwarding port $port..." -NoNewline
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp
    Write-Host " ✓" -ForegroundColor Green
}

# Adicionar regras de firewall
foreach ($port in $ports) {
    $ruleName = "WSL2 Database UI - Port $port"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
        Write-Host "Firewall rule created for port $port" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✓ Done! Access:" -ForegroundColor Green
Write-Host "  pgAdmin:  http://localhost:5050"
Write-Host "  Adminer:  http://localhost:3910"
Write-Host "  pgWeb:    http://localhost:5052"
Write-Host "  QuestDB:  http://localhost:9000"
```

### 3. Testar no Browser

Abra no seu navegador Windows:
- ✅ http://localhost:5050 (pgAdmin)
- ✅ http://localhost:3910 (Adminer)
- ✅ http://localhost:5052 (pgWeb)
- ✅ http://localhost:9000 (QuestDB)

## Por Que Isso É Necessário?

O WSL2 usa **Hyper-V com rede isolada**. Os containers Docker rodam no IP interno do WSL2 (ex: `172.19.0.x`), que o Windows não consegue acessar diretamente.

O comando `netsh interface portproxy` cria uma **ponte** entre `localhost` do Windows e o IP do WSL2.

## Persistência

As regras **persistem após reinicialização** do Windows. Você só precisa executar este script **uma vez**.

⚠️ **Exceção:** Se o IP do WSL2 mudar (raro), você precisará executar novamente.

## Remover Port Forwarding

Se precisar remover as regras:

```powershell
# Remover todas as regras
5050, 3910, 5052, 9000 | ForEach-Object {
    netsh interface portproxy delete v4tov4 listenport=$_ listenaddress=0.0.0.0
}
```

## Verificar Status

```powershell
# Ver regras ativas
netsh interface portproxy show v4tov4

# Ver IP do WSL2
wsl hostname -I
```

## Troubleshooting

### "Access Denied"
→ Certifique-se que está executando PowerShell **como Administrador**

### "wsl command not found"
→ WSL2 não está instalado ou não está no PATH. Execute `wsl --version` para verificar.

### Portas ainda não funcionam
1. Verifique se os containers estão rodando no WSL2:
   ```bash
   wsl docker ps | grep dbui
   ```

2. Teste dentro do WSL2:
   ```bash
   wsl curl http://localhost:5050
   ```

3. Verifique o firewall do Windows não está bloqueando

---

**Documentação completa:** `scripts/windows/README-WSL2-PORT-FORWARDING.md`
