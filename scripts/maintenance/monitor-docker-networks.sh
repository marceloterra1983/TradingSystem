#!/usr/bin/env bash
# Monitoramento do pool de redes Docker e limpeza opcional

set -euo pipefail

THRESHOLD="${DOCKER_NETWORK_THRESHOLD:-25}"
PRUNE=false
SHOW_CONFIG=false

print_usage() {
  cat <<USAGE
Uso: $(basename "$0") [opções]

Opções:
  --prune            Executa docker network prune - remove redes não utilizadas (requer confirmação)
  --show-config      Mostra exemplo de configuração default-address-pools para /etc/docker/daemon.json
  --threshold <num>  Ajusta limite de alerta (padrão: $THRESHOLD)
  --help             Exibe esta ajuda
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prune)
      PRUNE=true
      shift
      ;;
    --show-config)
      SHOW_CONFIG=true
      shift
      ;;
    --threshold)
      THRESHOLD="$2"
      shift 2
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      echo "Opção desconhecida: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado no PATH" >&2
  exit 1
fi

NETWORKS=$(docker network ls --format '{{.Name}}' | grep -Ev '^(bridge|host|none)$' || true)
COUNT=$(echo "$NETWORKS" | sed '/^$/d' | wc -l)

echo "🕸️  Redes Docker personalizadas: $COUNT"

echo "$NETWORKS" | sed '/^$/d' | nl || true

if [ "$COUNT" -ge "$THRESHOLD" ]; then
  echo "⚠️  Limite ($THRESHOLD) ultrapassado: considere limpar redes antigas ou ajustar o default-address-pools."
else
  echo "✅ Dentro do limite configurado ($THRESHOLD)."
fi

if [ "$PRUNE" = true ]; then
  echo "⚠️  docker network prune remove redes não utilizadas. Certifique-se de que stacks críticos estejam parados."
  read -p "Deseja continuar? (y/N) " -r ANSWER
  echo
  if [[ "$ANSWER" =~ ^[Yy]$ ]]; then
    docker network prune
  else
    echo "Limpeza cancelada."
  fi
fi

if [ "$SHOW_CONFIG" = true ]; then
  cat <<JSON
📄 Exemplo de /etc/docker/daemon.json:
{
  "default-address-pools": [
    { "base": "172.30.0.0/16", "size": 24 },
    { "base": "172.31.0.0/16", "size": 24 }
  ]
}
Após editar, execute: sudo systemctl restart docker
JSON
fi
