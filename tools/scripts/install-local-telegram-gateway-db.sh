#!/usr/bin/env bash
# install-local-telegram-gateway-db.sh
#
# Provision a local PostgreSQL + TimescaleDB instance for the Telegram Gateway
# and point the gateway to it (no Docker dependencies).
set -euo pipefail

print_step() {
  printf '\n\033[1;34m▶ %s\033[0m\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: command '$1' not found. Please install it and rerun." >&2
    exit 1
  fi
}

# 1. Install PostgreSQL + TimescaleDB packages if missing
install_packages() {
  local packages=(postgresql postgresql-contrib)

  if ! command -v apt >/dev/null 2>&1; then
    echo "warning: apt not found; please install PostgreSQL and TimescaleDB manually." >&2
    return
  fi

  # Detect installed PostgreSQL major version (default to 16)
  local pg_major
  if command -v psql >/dev/null 2>&1; then
    pg_major=$(psql -V | awk '{print $3}' | cut -d'.' -f1)
  fi
  if [[ -z "${pg_major:-}" || "${pg_major}" -lt 12 ]]; then
    pg_major=16
  fi

  local timescale_pkg="timescaledb-2-postgresql-${pg_major}"
  if ! apt-cache show "$timescale_pkg" >/dev/null 2>&1; then
    # Fall back to latest Timescale package that matches the installed cluster (default 16)
    timescale_pkg="timescaledb-2-postgresql-16"
  fi

  local extension_dir="/usr/share/postgresql/${pg_major}/extension"
  local control_version=""
  if [[ -f "${extension_dir}/timescaledb.control" ]]; then
    control_version=$(awk -F"'" '/default_version/ {print $2}' "${extension_dir}/timescaledb.control" 2>/dev/null || true)
  fi

  local legacy_timescale_pkg=""
  legacy_timescale_pkg=$(
    dpkg -l 2>/dev/null |
      awk '/^ii\s+timescaledb-2-[0-9].*-postgresql-'"${pg_major}"'\s/ {print $2; exit}'
  )
  if [[ -n "$legacy_timescale_pkg" && -n "$control_version" && ! -f "${extension_dir}/timescaledb--${control_version}.sql" ]]; then
    print_step "Removing legacy TimescaleDB package ${legacy_timescale_pkg}"
    sudo apt remove -y "$legacy_timescale_pkg"
  fi

  local timescale_installed_pkg=""
  timescale_installed_pkg=$(
    dpkg -l 2>/dev/null |
      awk '/^ii\s+timescaledb-2-postgresql-'"${pg_major}"'\s/ {print $2; exit}'
  )
  if [[ -z "$timescale_installed_pkg" ]]; then
    packages+=("$timescale_pkg")
  else
    echo "info: TimescaleDB already installed via package ${timescale_installed_pkg}; skipping reinstall."
  fi

  local missing_packages=()
  for pkg in "${packages[@]}"; do
    local status
    status=$(dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null || true)
    if [[ "$status" != *"install ok installed"* ]]; then
      missing_packages+=("$pkg")
    fi
  done

  if ((${#missing_packages[@]} > 0)); then
    print_step "Installing PostgreSQL + TimescaleDB (requires sudo password)"
    sudo apt update
    if ! sudo apt install -y "${missing_packages[@]}"; then
      echo "warning: package installation reported errors; ensure PostgreSQL and TimescaleDB are installed before continuing." >&2
    fi
  else
    print_step "PostgreSQL + TimescaleDB already installed"
  fi
  if command -v timescaledb-tune >/dev/null 2>&1; then
    print_step "Applying TimescaleDB tuning"
    sudo timescaledb-tune --quiet --yes || true
  fi
  print_step "Restarting PostgreSQL"
  sudo systemctl restart postgresql
}

# 2. Create database, user and schema
provision_database() {
  print_step "Provisioning database APPS-TELEGRAM-GATEWAY"
  local role_exists
  role_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'timescale'" || true)
  if [[ -z "${role_exists// }" ]]; then
    sudo -u postgres psql -c "CREATE ROLE timescale WITH LOGIN PASSWORD 'changeme';"
  else
    sudo -u postgres psql -c "ALTER ROLE timescale WITH LOGIN PASSWORD 'changeme';"
  fi

  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'APPS-TELEGRAM-GATEWAY'" | grep -q 1; then
    sudo -u postgres psql -c 'CREATE DATABASE "APPS-TELEGRAM-GATEWAY" OWNER timescale;'
  fi

  sudo -u postgres psql -d "APPS-TELEGRAM-GATEWAY" -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE SCHEMA IF NOT EXISTS telegram_gateway AUTHORIZATION timescale;
GRANT ALL ON SCHEMA telegram_gateway TO timescale;
SQL
}

# 3. Apply migrations
apply_migrations() {
  print_step "Applying telegram gateway migrations"
  local conn="postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY"
  psql "$conn" -v ON_ERROR_STOP=1 -f backend/data/timescaledb/telegram-gateway/01_telegram_gateway_messages.sql
  psql "$conn" -v ON_ERROR_STOP=1 -f backend/data/timescaledb/telegram-gateway/02_telegram_gateway_channels.sql
}

# 4. Update .env with DB URL
update_env() {
  print_step "Adding TELEGRAM_GATEWAY_DB_URL to .env"
  if [ ! -f .env ]; then
    cp .env.example .env
  fi
  if grep -q '^TELEGRAM_GATEWAY_DB_URL=' .env; then
    sed -i "s|^TELEGRAM_GATEWAY_DB_URL=.*|TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY|" .env
  else
    printf '\nTELEGRAM_GATEWAY_DB_URL=postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY\n' >> .env
  fi
  if ! grep -q '^TELEGRAM_GATEWAY_DB_SCHEMA=' .env; then
    printf 'TELEGRAM_GATEWAY_DB_SCHEMA=telegram_gateway\n' >> .env
  fi
  if ! grep -q '^TELEGRAM_GATEWAY_DB_TABLE=' .env; then
    printf 'TELEGRAM_GATEWAY_DB_TABLE=messages\n' >> .env
  fi
}

# 5. Install gateway dependencies
prepare_gateway() {
  print_step "Installing gateway dependencies"
  pushd apps/telegram-gateway >/dev/null
  npm install
  popd >/dev/null
}

# 6. Reminder for authentication script
print_final_instructions() {
  cat <<'EOF'

All done! Next steps:
  1. Go to the gateway folder:
     cd apps/telegram-gateway
  2. Authenticate with Telegram (if needed):
     ./authenticate-interactive.sh
  3. Start the gateway:
     npm run dev   # or npm start

Check the database with:
  psql "postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY" \
    -c "SELECT channel_id, message_id, status, received_at FROM telegram_gateway.messages ORDER BY received_at DESC LIMIT 10;"
EOF
}

main() {
  require_cmd npm
  install_packages
  require_cmd psql
  provision_database
  apply_migrations
  update_env
  prepare_gateway
  print_final_instructions
}

main "$@"
