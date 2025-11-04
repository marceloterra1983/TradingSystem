# 📱 Como Conectar Sua Sessão do Telegram

**Guia rápido para autenticar sua conta do Telegram no Gateway**

---

## 📋 Pré-requisitos

### 1️⃣ Obter Credenciais da API do Telegram

Você precisa criar um "App" no Telegram para obter as credenciais:

1. **Acesse:** https://my.telegram.org/auth
2. **Faça login** com seu número de telefone
3. Vá em **"API development tools"**
4. **Crie um novo app** (se não tiver):
   - **App title:** "TradingSystem Gateway" (ou qualquer nome)
   - **Short name:** "tradingsystem"
   - **Platform:** Desktop
5. **Copie os valores:**
   - **api_id** (número, ex: `12345678`)
   - **api_hash** (string, ex: `abcdef1234567890abcdef1234567890`)

---

## ⚙️ Configuração

### 2️⃣ Adicionar Credenciais ao `.env`

Adicione estas variáveis ao arquivo `.env` na raiz do projeto:

```bash
# Telegram MTProto API Credentials
TELEGRAM_API_ID=12345678                              # Seu api_id
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890   # Seu api_hash
TELEGRAM_PHONE_NUMBER=+5511999999999                  # Seu telefone (formato internacional)

# Opcional: 2FA Password (se você tiver autenticação de 2 fatores)
# TELEGRAM_2FA_PASSWORD=sua_senha_2fa
```

**⚠️ IMPORTANTE:**
- Use formato internacional: `+55` (Brasil) + DDD + Número
- Exemplo: `+5511987654321` (São Paulo)
- **NÃO compartilhe** essas credenciais!

---

## 🔐 Autenticação (2 Opções)

### **Opção 1: Via Dashboard (Recomendado)**

1. **Acesse o Dashboard:**
   ```
   http://localhost:3103/#/telegram-gateway
   ```

2. **Procure o botão "Conectar Telegram"** ou **"Autenticar Sessão"**
   - Deve estar na seção "Sessão" do dashboard

3. **Siga o fluxo interativo:**
   - Digite o código que você receberá via SMS
   - Se tiver 2FA, digite sua senha

4. **Pronto!** A sessão será salva de forma **criptografada**

---

### **Opção 2: Via CLI (Terminal)** ⭐ **RECOMENDADO**

Use o script wrapper melhorado:

```bash
cd /home/marce/Projetos/TradingSystem
bash AUTENTICAR-TELEGRAM.sh
```

**Por que usar este script:**
- ✅ Verifica automaticamente se porta 4006 está livre
- ✅ Libera porta automaticamente se estiver ocupada
- ✅ Valida credenciais do `.env` antes de iniciar
- ✅ Trata erros comuns automaticamente

**O que acontecerá:**
1. Script solicitará o código SMS
2. Se tiver 2FA, solicitará a senha
3. Sessão será salva em: `~/.config/telegram-gateway/session.enc` (criptografada)

**Alternativa (método direto):**
```bash
cd /home/marce/Projetos/TradingSystem/apps/telegram-gateway
bash authenticate-interactive.sh
```

---

## 🎯 Verificação

### Confirmar que a sessão está ativa:

```bash
# Via API
curl http://localhost:4010/api/telegram-gateway/auth/status

# Esperado:
{
  "authenticated": true,
  "phoneNumber": "+5511999999999",
  "sessionCreatedAt": "2025-11-04T00:35:00.000Z"
}
```

### Via Dashboard:
- **Status do Sistema** → **Sessão:** deve mudar de "Ausente" para **"Ativa"** ✅
- **Telegram:** deve mudar para **"Conectado"** ✅

---

## 📂 Onde a Sessão é Salva?

```
~/.config/telegram-gateway/
├── session.enc          # Sessão criptografada (AES-256-GCM)
└── session.enc.salt     # Salt para descriptografia
```

**Segurança:**
- ✅ Arquivos com permissão `0600` (somente você pode ler)
- ✅ Criptografia AES-256-GCM
- ✅ Nunca commitados no Git

---

## 🔄 Reconectar ou Trocar Conta

### Desconectar sessão atual:
```bash
curl -X POST http://localhost:4010/api/telegram-gateway/auth/logout
```

### Ou apagar o arquivo de sessão:
```bash
rm ~/.config/telegram-gateway/session.enc*
```

### Depois, refaça o processo de autenticação.

---

## 🛠️ Troubleshooting

### ❌ Erro: "TELEGRAM_API_ID is required"
**Solução:** Adicione `TELEGRAM_API_ID` e `TELEGRAM_API_HASH` ao `.env`

### ❌ Erro: "Invalid phone number"
**Solução:** Use formato internacional: `+5511987654321`

### ❌ Erro: "Session file not found"
**Solução:** Normal na primeira vez. Faça a autenticação via CLI ou Dashboard.

### ❌ Erro: "FloodWaitError"
**Solução:** Telegram bloqueou temporariamente. Aguarde alguns minutos e tente novamente.

### ❌ Dashboard ainda mostra "Ausente"
**Solução:** 
1. Faça HARD RELOAD: `Ctrl + Shift + R`
2. Verifique se a API está rodando: `lsof -i :4010`
3. Verifique logs: `tail -f logs/telegram-gateway-api.log`

### ❌ Erro: "EADDRINUSE: address already in use :::4006"
**Causa:** Já existe um processo usando a porta 4006.

**Solução:**
```bash
# Opção 1: Use o script wrapper (recomendado)
bash AUTENTICAR-TELEGRAM.sh
# Ele libera a porta automaticamente!

# Opção 2: Liberar porta manualmente
lsof -ti :4006 | xargs kill -9

# Depois tente novamente
cd apps/telegram-gateway
bash authenticate-interactive.sh
```

---

## 📞 Próximos Passos

Após conectar a sessão:

1. **Adicione canais para monitorar:**
   - No Dashboard → **"Canais Monitorados"** → **"+ Adicionar"**
   - Insira o Channel ID (ex: `-1001234567890`)

2. **As mensagens dos canais aparecerão automaticamente** na tabela

3. **Configure parsing de sinais** (se necessário):
   - Veja: `docs/content/apps/tp-capital/signal-parsing.mdx`

---

## 🔗 Links Úteis

- **Criar API App:** https://my.telegram.org/auth
- **Documentação Telegram API:** https://core.telegram.org/api
- **GramJS (biblioteca usada):** https://gram.js.org/

---

*Última atualização: 2025-11-04*

