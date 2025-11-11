#!/bin/bash
# ==============================================================================
# TP Capital - Fix PgBouncer SCRAM-SHA-256 Authentication
# ==============================================================================
# Purpose: Fix authentication between PgBouncer and PostgreSQL 16
# Issue: PgBouncer cannot authenticate with SCRAM-SHA-256 passwords
# ==============================================================================

set -euo pipefail

echo "🔧 TP Capital - Fix PgBouncer Authentication"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Diagnose the issue
echo "1️⃣  Diagnosticando problema de autenticação..."
echo ""

echo "   Verificando versão do PostgreSQL:"
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT version();" | grep PostgreSQL
echo ""

echo "   Verificando método de criptografia de senha:"
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SHOW password_encryption;"
echo ""

echo "   Verificando hash da senha do usuário:"
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT substring(rolpassword, 1, 20) || '...' as password_hash FROM pg_authid WHERE rolname = 'tp_capital';"
echo ""

# Step 2: Solution options
echo "2️⃣  Opções de solução:"
echo ""
echo -e "${YELLOW}OPÇÃO A (Recomendada):${NC} Usar PostgreSQL 16 com md5 (compatível com PgBouncer)"
echo "   - Pros: Compatível, funciona imediatamente"
echo "   - Cons: MD5 é menos seguro que SCRAM-SHA-256 (mas ainda adequado para rede interna)"
echo ""
echo -e "${YELLOW}OPÇÃO B:${NC} Trocar imagem do PgBouncer para uma que suporte SCRAM-SHA-256"
echo "   - Pros: Mantém segurança máxima"
echo "   - Cons: Requer testar nova imagem"
echo ""
echo -e "${YELLOW}OPÇÃO C:${NC} Remover PgBouncer e conectar diretamente ao TimescaleDB"
echo "   - Pros: Simples, sem camadas intermediárias"
echo "   - Cons: Perde benefícios do connection pooling"
echo ""

read -p "Escolha uma opção (A/B/C): " -n 1 -r
echo ""

case $REPLY in
  [Aa])
    echo ""
    echo "3️⃣  Aplicando OPÇÃO A: MD5 authentication"
    echo ""

    echo "   ⚠️  Esta opção irá:"
    echo "   - Alterar password_encryption para 'md5'"
    echo "   - Resetar senha do usuário tp_capital"
    echo "   - Recarregar configuração do PostgreSQL"
    echo "   - Atualizar AUTH_TYPE no PgBouncer para 'md5'"
    echo "   - Reiniciar PgBouncer e API"
    echo ""

    read -p "   Confirmar aplicação? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "   ❌ Operação cancelada"
      exit 0
    fi

    # Load password from .env
    source /home/marce/Projetos/TradingSystem/.env

    if [ -z "${TP_CAPITAL_DB_PASSWORD:-}" ]; then
      echo -e "   ${RED}❌ Erro: TP_CAPITAL_DB_PASSWORD não encontrada no .env${NC}"
      exit 1
    fi

    # Change PostgreSQL to use MD5
    echo "   📝 Alterando password_encryption para md5..."
    docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "ALTER SYSTEM SET password_encryption = 'md5';"
    docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT pg_reload_conf();"
    echo "   ✅ Configuração alterada"
    echo ""

    # Reset password to generate MD5 hash
    echo "   🔑 Resetando senha do usuário com MD5..."
    docker exec -e PGPASSWORD="$TP_CAPITAL_DB_PASSWORD" tp-capital-timescale \
      psql -U tp_capital -d postgres -c \
      "ALTER USER tp_capital WITH PASSWORD '$TP_CAPITAL_DB_PASSWORD';"
    echo "   ✅ Senha resetada com MD5"
    echo ""

    # Verify new hash
    echo "   🔍 Verificando novo hash:"
    docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT substring(rolpassword, 1, 20) || '...' as password_hash FROM pg_authid WHERE rolname = 'tp_capital';"
    echo ""

    # Update docker-compose.yml AUTH_TYPE
    echo "   📝 Atualizando docker-compose.yml..."
    cd /home/marce/Projetos/TradingSystem/tools/compose

    # Check if AUTH_TYPE is already md5
    if grep -q "AUTH_TYPE=md5" docker-compose.4-1-tp-capital-stack.yml; then
      echo "   ℹ️  AUTH_TYPE já está configurado como md5"
    else
      # Replace scram-sha-256 with md5
      sed -i 's/AUTH_TYPE=scram-sha-256/AUTH_TYPE=md5/g' docker-compose.4-1-tp-capital-stack.yml
      echo "   ✅ AUTH_TYPE alterado para md5"
    fi
    echo ""

    # Restart PgBouncer and API
    echo "   🔄 Reiniciando PgBouncer..."
    docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-pgbouncer
    sleep 5
    echo "   ✅ PgBouncer reiniciado"
    echo ""

    echo "   🔄 Reiniciando API..."
    docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-api
    sleep 10
    echo "   ✅ API reiniciada"
    echo ""

    # Check final status
    echo "4️⃣  Verificando status final..."
    echo ""
    docker ps --filter "label=com.tradingsystem.stack=tp-capital" --format "table {{.Names}}\t{{.Status}}"
    echo ""

    echo "5️⃣  Testando autenticação via PgBouncer..."
    if docker exec tp-capital-timescale psql -h tp-capital-pgbouncer -p 6432 -U tp_capital -d tp_capital_db -c "SELECT 1;" > /dev/null 2>&1; then
      echo -e "   ${GREEN}✅ Autenticação funcionando via PgBouncer!${NC}"
    else
      echo -e "   ${YELLOW}⚠️  Autenticação ainda com problemas${NC}"
      echo "   Verifique logs: docker logs tp-capital-pgbouncer"
    fi
    echo ""

    ;;

  [Bb])
    echo ""
    echo "3️⃣  OPÇÃO B: Trocar imagem do PgBouncer"
    echo ""
    echo "   Imagens alternativas com suporte a SCRAM-SHA-256:"
    echo "   1. bitnami/pgbouncer:latest"
    echo "   2. pgbouncer/pgbouncer:latest"
    echo ""
    echo "   Para implementar:"
    echo "   1. Editar docker-compose.4-1-tp-capital-stack.yml"
    echo "   2. Alterar linha: image: edoburu/pgbouncer:latest"
    echo "   3. Para: image: bitnami/pgbouncer:latest"
    echo "   4. Ajustar variáveis de ambiente conforme documentação da imagem"
    echo "   5. Reiniciar stack"
    echo ""
    echo "   Documentação Bitnami: https://hub.docker.com/r/bitnami/pgbouncer"
    echo ""
    ;;

  [Cc])
    echo ""
    echo "3️⃣  OPÇÃO C: Conectar diretamente ao TimescaleDB"
    echo ""
    echo "   Para implementar:"
    echo "   1. Editar docker-compose.4-1-tp-capital-stack.yml"
    echo "   2. Alterar TP_CAPITAL_DB_HOST=tp-capital-timescale"
    echo "   3. Alterar TP_CAPITAL_DB_PORT=5432"
    echo "   4. Reiniciar apenas API container"
    echo ""
    echo "   ⚠️  Nota: Você perderá os benefícios do connection pooling"
    echo ""
    ;;

  *)
    echo ""
    echo "   ❌ Opção inválida"
    exit 1
    ;;
esac

echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ SCRIPT CONCLUÍDO${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Próximos passos:"
echo "   1. Aguardar containers ficarem healthy (1-2 min)"
echo "   2. Verificar logs: docker logs tp-capital-api"
echo "   3. Testar API: curl http://localhost:4005/health"
echo ""
