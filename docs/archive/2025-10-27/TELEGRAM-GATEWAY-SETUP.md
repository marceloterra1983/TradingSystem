# Telegram Gateway - Guia de Configuração Rápida

## 📋 Visão Geral

O Telegram Gateway agora está **integrado ao script de inicialização universal** do TradingSystem. Ele será iniciado automaticamente junto com os outros serviços locais.

## 🚀 Como Iniciar

### Primeira Vez (Configuração Inicial)

1. **Configure as variáveis de ambiente**:
   ```bash
   cd apps/telegram-gateway
   # Crie o arquivo .env baseado nas configurações necessárias
   ```

2. **Variáveis de Ambiente Essenciais**:
   ```env
   # Obtenha suas credenciais em: https://my.telegram.org/apps
   TELEGRAM_API_ID=seu_api_id
   TELEGRAM_API_HASH=seu_api_hash
   TELEGRAM_PHONE_NUMBER=+5511999999999
   
   # URL do banco de dados (TimescaleDB)
   TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY
   
   # Token de segurança para a API
   API_SECRET_TOKEN=seu_token_seguro_aqui
   
   # Endpoints para onde as mensagens serão enviadas
   API_ENDPOINTS=http://localhost:4005/ingest
   ```

3. **Inicie o sistema completo**:
   ```bash
   # Do diretório raiz do projeto
   bash scripts/universal/start.sh
   ```

4. **Autenticação do Telegram** (apenas primeira vez):
   - Na primeira execução, o gateway pedirá:
     - Código de verificação (enviado via SMS)
     - Senha 2FA (se habilitada na sua conta)
   - A sessão será salva em `apps/telegram-gateway/.session` para uso futuro

### Execuções Subsequentes

Simplesmente execute o script de start:
```bash
bash scripts/universal/start.sh
```

O Telegram Gateway será iniciado automaticamente junto com:
- Dashboard (porta 3103)
- Docusaurus (porta 3205)
- Status API (porta 3500)

## 📊 Verificando o Status

### Via Script Universal
```bash
bash scripts/universal/status.sh
```

### Via Navegador
Acesse os endpoints de saúde:
- **Health Check**: http://localhost:4006/health
- **Métricas**: http://localhost:4006/metrics

## 🛑 Parando os Serviços

```bash
# Para todos os serviços (incluindo Telegram Gateway)
bash scripts/universal/stop.sh

# Ou com limpeza de logs
bash scripts/universal/stop.sh --clean-logs
```

## 📁 Estrutura de Arquivos

```
apps/telegram-gateway/
├── .env                    # Suas configurações (NÃO commitar)
├── .session/              # Sessão do Telegram (criada após autenticação)
├── data/                  # Fila de falhas e dados temporários
├── src/                   # Código fonte
└── README.md              # Documentação completa
```

## 🔍 Logs

Os logs do serviço são salvos em:
```bash
/tmp/tradingsystem-logs/telegram-gateway.log
```

Para visualizar em tempo real:
```bash
tail -f /tmp/tradingsystem-logs/telegram-gateway.log
```

## ⚙️ Configurações Avançadas

### Retry e Timeout
```env
MAX_RETRIES=3
BASE_RETRY_DELAY_MS=5000
API_TIMEOUT_MS=10000
```

### Logging
```env
LOG_LEVEL=info  # Opções: debug, info, warn, error
```

### Banco de Dados
O gateway persiste mensagens no TimescaleDB:
```env
TELEGRAM_GATEWAY_DB_SCHEMA=telegram_gateway
TELEGRAM_GATEWAY_DB_TABLE=messages
```

## 🐛 Troubleshooting

### Gateway não inicia
1. Verifique se a porta 4006 está livre:
   ```bash
   lsof -i :4006
   ```

2. Verifique as variáveis de ambiente:
   ```bash
   cd apps/telegram-gateway
   cat .env
   ```

3. Verifique os logs:
   ```bash
   tail -50 /tmp/tradingsystem-logs/telegram-gateway.log
   ```

### Erro de autenticação
1. Remova a sessão antiga:
   ```bash
   rm -rf apps/telegram-gateway/.session
   ```

2. Reinicie o serviço:
   ```bash
   bash scripts/universal/stop.sh
   bash scripts/universal/start.sh
   ```

### Banco de dados não conecta
1. Certifique-se de que o TimescaleDB está rodando:
   ```bash
   docker ps | grep timescale
   ```

2. Teste a conexão:
   ```bash
   psql "$TELEGRAM_GATEWAY_DB_URL" -c "SELECT 1;"
   ```

## 📚 Documentação Adicional

Para mais detalhes, consulte:
- [README do Telegram Gateway](apps/telegram-gateway/README.md)
- [Script de inicialização dedicado](tools/scripts/start-local-telegram-gateway.sh)
- [Documentação de autenticação](apps/telegram-gateway/AUTENTICACAO.md)

## 🔗 Integração com TP Capital

O Telegram Gateway encaminha mensagens para o TP Capital API automaticamente:
- **Gateway**: recebe mensagens do Telegram (porta 4006)
- **TP Capital**: processa as mensagens (porta 4005)

Certifique-se de que ambos os serviços estejam rodando e que o `API_SECRET_TOKEN` esteja configurado corretamente em ambos.

## 💡 Dicas

1. **Primeira execução**: Mantenha o terminal aberto para completar a autenticação do Telegram
2. **Produção**: Use systemd para auto-start (veja `telegram-gateway.service`)
3. **Desenvolvimento**: Use `npm run dev` no diretório do gateway para hot-reload
4. **Monitoramento**: Acesse as métricas Prometheus em `/metrics` para observabilidade

## 🎯 Próximos Passos

Após configurar o gateway:
1. ✅ Verifique o health check: `curl http://localhost:4006/health`
2. ✅ Teste enviar uma mensagem para o Telegram
3. ✅ Verifique se a mensagem foi processada no TP Capital
4. ✅ Configure alertas e monitoramento (opcional)


