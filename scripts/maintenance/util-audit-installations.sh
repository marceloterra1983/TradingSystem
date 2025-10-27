#!/usr/bin/env bash
# TradingSystem dependency inventory script

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

NODE_PROJECTS=(
  "."
  "frontend/dashboard"
  "backend/api/workspace"
  "backend/api/documentation-api"
  "apps/status"
  "apps/tp-capital"
)

PYTHON_ENVS=(".venv")

hr() {
  printf '%s\n' "------------------------------------------------------------------"
}

section() {
  local title=$1
  hr
  printf '%s\n' "$title"
  hr
}

indent() {
  sed 's/^/   /'
}

inventory_apt() {
  if ! command -v apt >/dev/null 2>&1; then
    echo "apt not found; skipping."
    return
  fi

  echo "Manual packages:"
  apt list --manual-installed 2>/dev/null | indent

  echo ""
  echo "dpkg audit:"
  dpkg --audit | indent
}

inventory_node_project() {
  local rel_path=$1
  local absolute="${PROJECT_ROOT}/${rel_path}"
  echo "Project: ${rel_path}"

  if [ ! -f "${absolute}/package.json" ]; then
    echo "   package.json not found; skipping."
    echo ""
    return
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "   node not available; skipping."
    echo ""
    return
  fi

  (
    cd "${absolute}"
    node <<'NODE'
const fs = require('fs');
const path = require('path');
const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const name = pkg.name || path.basename(path.dirname(pkgPath));
console.log(`   Name: ${name}`);
const sections = [
  ['dependencies', 'Dependencies'],
  ['devDependencies', 'Dev Dependencies'],
  ['peerDependencies', 'Peer Dependencies'],
  ['optionalDependencies', 'Optional Dependencies']
];
let printed = false;
for (const [key, label] of sections) {
  const deps = pkg[key];
  if (deps && Object.keys(deps).length > 0) {
    printed = true;
    console.log(`   ${label}:`);
    for (const dep of Object.keys(deps).sort()) {
      console.log(`     - ${dep}@${deps[dep]}`);
    }
  }
}
if (!printed) {
  console.log('   No dependencies declared.');
}
NODE
  )

  echo ""
}

inventory_python_env() {
  local rel_path=$1
  local pip_bin="${PROJECT_ROOT}/${rel_path}/bin/pip"
  echo "Environment: ${rel_path}"

  if [ ! -x "${pip_bin}" ]; then
    echo "   pip binary not found; skipping."
    echo ""
    return
  fi

  "${pip_bin}" --version | indent
  echo ""
  echo "   Installed packages:"
  "${pip_bin}" list --format=columns | indent

  echo ""
  echo "   pip check:"
  set +e
  check_output=$("${pip_bin}" check 2>&1)
  check_status=$?
  set -e
  if [ "${check_status}" -eq 0 ]; then
    echo "   All good."
  else
    printf '%s\n' "${check_output}" | indent
  fi

  echo ""
}

inventory_dotnet() {
  if ! command -v dotnet >/dev/null 2>&1; then
    echo "dotnet CLI not found; skipping."
    return
  fi

  mapfile -t cs_projects < <(find "${PROJECT_ROOT}" -name '*.csproj' -print)
  if [ "${#cs_projects[@]}" -eq 0 ]; then
    echo "No .NET projects (.csproj) found."
    return
  fi

  for project in "${cs_projects[@]}"; do
    echo "Project: ${project#${PROJECT_ROOT}/}"
    dotnet list "${project}" package | indent
    echo ""
  done
}

inventory_pipx() {
  if ! command -v pipx >/dev/null 2>&1; then
    echo "pipx not found; skipping."
    return
  fi

  pipx list | indent
}

main() {
  echo "TradingSystem Dependency Inventory"
  echo "Generated: ${NOW}"
  echo ""

  section "APT PACKAGES"
  inventory_apt
  echo ""

  section "NODE.JS PROJECTS"
  for project in "${NODE_PROJECTS[@]}"; do
    inventory_node_project "${project}"
  done

  section "PYTHON ENVIRONMENTS"
  for env in "${PYTHON_ENVS[@]}"; do
    inventory_python_env "${env}"
  done

  section "PIPX PACKAGES"
  inventory_pipx
  echo ""

  section ".NET PROJECTS"
  inventory_dotnet
}

main "$@"
