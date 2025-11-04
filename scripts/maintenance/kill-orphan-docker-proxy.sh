#!/bin/bash

#################################################################
# Script: kill-orphan-docker-proxy.sh
# Purpose: Finalizar processos órfãos do docker-proxy na porta 3401
# Author: TradingSystem Maintenance
# Date: 2025-11-03
#################################################################

set -e

echo "=================================================="
echo "  Kill Orphan Docker-Proxy Processes"
echo "=================================================="
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Este script precisa ser executado com privilégios de administrador"
  echo "   Use: sudo bash $0"
  exit 1
fi

echo "[INFO] Procurando processos docker-proxy na porta 3401..."

# Encontrar PIDs
PIDS=$(ps aux | grep "docker-proxy.*3401" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
  echo "✅ Nenhum processo órfão encontrado na porta 3401"
  exit 0
fi

echo "[INFO] Processos encontrados:"
ps aux | grep "docker-proxy.*3401" | grep -v grep
echo ""

# Confirmar antes de matar
read -p "Deseja finalizar esses processos? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Operação cancelada pelo usuário"
  exit 0
fi

# Matar processos
echo "[INFO] Finalizando processos..."
for PID in $PIDS; do
  echo "  Killing PID $PID..."
  kill -9 "$PID" || true
done

echo ""
echo "✅ Processos finalizados com sucesso!"
echo ""

# Verificar se a porta está livre
echo "[INFO] Verificando se a porta 3401 está livre..."
if ss -tuln | grep -q ":3401"; then
  echo "⚠️  A porta 3401 ainda está em uso"
  ss -tuln | grep ":3401"
else
  echo "✅ A porta 3401 está livre agora"
fi

echo ""
echo "=================================================="
echo "  Operação concluída!"
echo "=================================================="
echo ""
echo "Você pode agora executar: start"

