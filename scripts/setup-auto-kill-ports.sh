#!/bin/bash
# Script para adicionar auto-kill de porta em todos os serviços Node.js
# Uso: ./scripts/setup-auto-kill-ports.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Configurando auto-kill de porta em serviços Node.js..."
echo ""

# Mapa de serviços e suas portas
declare -A SERVICES=(
  ["apps/tp-capital"]=4005
  ["apps/telegram-gateway"]=4006
  ["backend/api/documentation-api"]=4007
  ["backend/api/workspace"]=4008
)

# Função para criar script kill-port.sh
create_kill_port_script() {
  local service_dir=$1
  local port=$2
  local script_path="$service_dir/scripts/kill-port.sh"
  
  mkdir -p "$service_dir/scripts"
  
  cat > "$script_path" << 'EOF'
#!/bin/bash
# Kill process using specified port

PORT=${1:-PORT_PLACEHOLDER}

echo "🔍 Verificando processos na porta $PORT..."

PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "✅ Porta $PORT está livre"
  exit 0
fi

echo "⚠️  Porta $PORT em uso pelo processo $PID"
echo "🔪 Matando processo..."

kill -9 $PID 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Processo $PID encerrado com sucesso"
else
  echo "❌ Falha ao encerrar processo $PID"
  exit 1
fi

exit 0
EOF

  # Substituir placeholder pela porta real
  sed -i "s/PORT_PLACEHOLDER/$port/g" "$script_path"
  chmod +x "$script_path"
  
  echo "  ✅ Criado: $script_path"
}

# Função para atualizar package.json
update_package_json() {
  local service_dir=$1
  local port=$2
  local package_json="$service_dir/package.json"
  
  if [ ! -f "$package_json" ]; then
    echo "  ⏭️  Não encontrado: $package_json"
    return
  fi
  
  # Verificar se já tem o script kill-port
  if grep -q '"kill-port"' "$package_json"; then
    echo "  ⏭️  Script kill-port já existe em package.json"
    return
  fi
  
  # Backup
  cp "$package_json" "$package_json.backup"
  
  # Adicionar scripts usando Node.js (mais confiável que sed para JSON)
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$package_json', 'utf8'));
    
    if (!pkg.scripts) pkg.scripts = {};
    
    // Adicionar kill-port
    pkg.scripts['kill-port'] = 'lsof -ti:$port | xargs kill -9 2>/dev/null || true';
    
    // Atualizar dev para incluir kill-port
    if (pkg.scripts.dev && !pkg.scripts.dev.includes('kill-port')) {
      pkg.scripts.dev = 'npm run kill-port && ' + pkg.scripts.dev;
    }
    
    fs.writeFileSync('$package_json', JSON.stringify(pkg, null, 2) + '\n');
  "
  
  echo "  ✅ Atualizado: $package_json"
  echo "     - Adicionado script 'kill-port'"
  echo "     - Atualizado script 'dev'"
}

# Processar cada serviço
for service in "${!SERVICES[@]}"; do
  port="${SERVICES[$service]}"
  service_path="$PROJECT_ROOT/$service"
  
  echo "📦 $service (porta $port)"
  
  if [ ! -d "$service_path" ]; then
    echo "  ⚠️  Diretório não encontrado: $service_path"
    echo ""
    continue
  fi
  
  create_kill_port_script "$service_path" "$port"
  update_package_json "$service_path" "$port"
  
  echo ""
done

echo "✅ Configuração concluída!"
echo ""
echo "📝 Backups criados com extensão .backup"
echo "🧪 Teste com: cd <serviço> && npm run dev"
echo ""
echo "Para reverter:"
echo "  find . -name 'package.json.backup' -exec sh -c 'mv \"\$1\" \"\${1%.backup}\"' _ {} \\;"


