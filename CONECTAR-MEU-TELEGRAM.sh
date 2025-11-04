#!/bin/bash
# Script helper para conectar sua sessão do Telegram

cat << 'INSTRUCTIONS'

╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║          📱 CONECTAR SUA SESSÃO DO TELEGRAM - 3 PASSOS               ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

PASSO 1️⃣  - OBTER CREDENCIAIS
═══════════════════════════════

1. Acesse: https://my.telegram.org/auth
2. Faça login com SEU telefone
3. Vá em "API development tools"
4. Crie um app (ou use existente):
   - App title: "TradingSystem" (qualquer nome)
   - Short name: "trading"
   - Platform: Desktop
5. COPIE:
   ✅ api_id (número, ex: 12345678)
   ✅ api_hash (string alfanumérica)

PASSO 2️⃣  - ADICIONAR AO .env
════════════════════════════════

Adicione estas 3 linhas ao arquivo .env na raiz do projeto:

TELEGRAM_API_ID=SEU_API_ID_AQUI
TELEGRAM_API_HASH=SEU_API_HASH_AQUI
TELEGRAM_PHONE_NUMBER=+5511999999999

⚠️  ATENÇÃO:
- Telefone no formato internacional: +55 (Brasil) + DDD + Número
- Exemplo: +5511987654321

PASSO 3️⃣  - AUTENTICAR VIA TERMINAL
════════════════════════════════════════

Execute o comando abaixo e siga as instruções:

cd /home/marce/Projetos/TradingSystem/apps/telegram-gateway
bash authenticate-interactive.sh

O QUE VAI ACONTECER:
1. Script solicitará o código SMS enviado ao seu telefone
2. Se você tiver 2FA, solicitará sua senha
3. Sessão será salva de forma CRIPTOGRAFADA em:
   ~/.config/telegram-gateway/session.enc

PRONTO! ✅

Após isso, recarregue o Dashboard:
http://localhost:3103/#/telegram-gateway

Status esperado:
• Sessão: Ativa (REAL) ✅
• Telegram: Conectado (REAL) ✅
• Agora você pode adicionar canais para monitorar!

═══════════════════════════════════════════════════════════════════════

❓ DÚVIDAS?

Leia o guia completo:
cat /home/marce/Projetos/TradingSystem/GUIA-CONECTAR-TELEGRAM.md

═══════════════════════════════════════════════════════════════════════

INSTRUCTIONS

echo ""
read -p "Deseja adicionar as credenciais ao .env agora? (s/n): " resposta

if [[ "$resposta" =~ ^[Ss]$ ]]; then
  echo ""
  read -p "Digite seu TELEGRAM_API_ID: " api_id
  read -p "Digite seu TELEGRAM_API_HASH: " api_hash
  read -p "Digite seu TELEGRAM_PHONE_NUMBER (ex: +5511987654321): " phone
  
  echo "" >> .env
  echo "# Telegram MTProto Credentials ($(date +%Y-%m-%d))" >> .env
  echo "TELEGRAM_API_ID=$api_id" >> .env
  echo "TELEGRAM_API_HASH=$api_hash" >> .env
  echo "TELEGRAM_PHONE_NUMBER=$phone" >> .env
  
  echo ""
  echo "✅ Credenciais adicionadas ao .env!"
  echo ""
  echo "Agora execute:"
  echo "  cd apps/telegram-gateway"
  echo "  bash authenticate-interactive.sh"
else
  echo ""
  echo "OK! Adicione manualmente ao .env quando estiver pronto."
fi

