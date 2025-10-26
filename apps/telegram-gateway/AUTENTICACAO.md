# Autenticação do Telegram Gateway

Este guia explica como autenticar o Telegram Gateway pela primeira vez.

## 🚀 Autenticação Rápida (Recomendado)

### Passo 1: Execute o script interativo

```bash
cd /home/marce/Projetos/TradingSystem/apps/telegram-gateway
bash authenticate-interactive.sh
```

### Passo 2: Aguarde a conexão

O Gateway vai conectar ao Telegram e você verá:

```
[INFO] - [Connecting to 149.154.167.91:80/TCPFull...]
[INFO] - [Connection complete!]
? Please enter the code you received:
```

### Passo 3: Digite o código

1. Você receberá um SMS no celular **+55 67 99190-8000**
2. Digite o código de 5 dígitos (exemplo: `12345`)
3. Pressione ENTER

### Passo 4: Aguarde a autenticação

Se a autenticação for bem-sucedida, você verá:

```
[INFO] - Successfully logged in!
[INFO] - Session saved
```

### Passo 5: Interrompa o Gateway

Pressione `Ctrl+C` para parar o Gateway.

### Passo 6: Inicie o sistema completo

```bash
cd /home/marce/Projetos/TradingSystem
bash scripts/universal/start.sh
```

---

## 📝 Método Manual (Alternativo)

Se preferir fazer manualmente:

```bash
cd /home/marce/Projetos/TradingSystem/apps/telegram-gateway

# Inicie o Gateway
node src/index.js

# Quando solicitar o código:
# 1. Verifique o SMS no celular
# 2. Digite o código
# 3. Pressione ENTER
# 4. Após autenticação, pressione Ctrl+C
```

---

## ⚠️ Problemas Comuns

### Código inválido (PHONE_CODE_INVALID)

**Causa**: O código expirou (válido por 1-2 minutos)

**Solução**:
1. Pare o Gateway (Ctrl+C)
2. Execute novamente
3. Digite o código **imediatamente** quando receber

### Porta 4006 já em uso

**Solução**:
```bash
# Mate o processo na porta 4006
lsof -ti :4006 | xargs -r kill -9

# Execute o script novamente
bash authenticate-interactive.sh
```

### Múltiplas tentativas de código

Telegram pode bloquear temporariamente após várias tentativas incorretas.

**Solução**: Aguarde 5-10 minutos e tente novamente.

---

## 📞 Informações de Configuração

- **Telefone**: +55 67 99190-8000
- **API ID**: 23522437
- **Gateway Port**: 4006
- **Forward To**: TP Capital API (http://localhost:4005/webhook/telegram)

---

## ✅ Como Verificar se Funcionou

Após autenticar e iniciar o sistema:

```bash
# Verificar se o Gateway está rodando
curl http://localhost:4006/health

# Deve retornar:
{
  "status": "ok",
  "telegram": "connected"
}
```

---

## 🔄 Autenticação Futura

Você só precisa autenticar **uma vez**. A sessão é salva em:
```
/home/marce/Projetos/TradingSystem/apps/telegram-gateway/.session/
```

Nas próximas vezes, o Gateway vai usar a sessão salva automaticamente.

---

**Criado**: 2025-10-25
**Última Atualização**: 2025-10-25
