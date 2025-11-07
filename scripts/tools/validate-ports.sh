#!/bin/bash
# =============================================================================
# Port Conflict Detection Script
# =============================================================================
# Purpose: Detect port conflicts across Docker Compose files before deployment
# Usage:   bash scripts/tools/validate-ports.sh
# Exit:    0 = no conflicts, 1 = conflicts detected
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_DIR="$PROJECT_ROOT/tools/compose"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load .env if exists
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

declare -A port_usage
declare -A port_service_map
conflict_found=0

echo -e "${BLUE}=== Port Conflict Detection ===${NC}"
echo -e "Scanning compose files in: $COMPOSE_DIR"
echo ""

# Function to resolve port variable
resolve_port() {
    local port_expr="$1"

    # Remove quotes and spaces
    port_expr=$(echo "$port_expr" | sed 's/[" ]//g')

    # Extract host port (left side of colon)
    local host_port=$(echo "$port_expr" | cut -d':' -f1)

    # Check if it's a variable reference
    if [[ $host_port =~ \$\{([A-Z_0-9]+)(:-([0-9]+))?\} ]]; then
        local var_name="${BASH_REMATCH[1]}"
        local default_val="${BASH_REMATCH[3]}"

        # Try to get value from environment
        if [[ -n "${!var_name:-}" ]]; then
            echo "${!var_name}"
        elif [[ -n "$default_val" ]]; then
            echo "$default_val"
        else
            echo ""
        fi
    else
        # It's a literal value
        echo "$host_port"
    fi
}

# Extract container name from compose file
get_container_name() {
    local file="$1"
    local port_line_num="$2"

    # Search backwards from port line to find container_name
    local container_name=$(awk -v line="$port_line_num" '
        NR < line && /container_name:/ { name=$2; gsub(/"/, "", name) }
        NR == line { print name; exit }
    ' "$file")

    # If no container_name, try to find service name
    if [[ -z "$container_name" ]]; then
        container_name=$(awk -v line="$port_line_num" '
            NR < line && /^[[:space:]]+[a-z0-9_-]+:$/ {
                name=$1;
                gsub(/:/, "", name);
                gsub(/^[[:space:]]+/, "", name)
            }
            NR == line { print name; exit }
        ' "$file")
    fi

    echo "$container_name"
}

# Scan all compose files
while IFS= read -r file; do
    # Skip generated files
    if [[ "$file" =~ generated ]]; then
        continue
    fi

    # Extract port mappings
    grep -n -E '^\s+- ".*:[0-9]+' "$file" 2>/dev/null | while IFS=: read -r line_num port_line; do
        # Clean the line
        port_mapping=$(echo "$port_line" | sed 's/^[[:space:]]*- "//' | sed 's/"$//' | sed 's/#.*//')

        # Resolve port
        host_port=$(resolve_port "$port_mapping")

        # Skip if couldn't resolve
        if [[ -z "$host_port" ]] || [[ ! "$host_port" =~ ^[0-9]+$ ]]; then
            continue
        fi

        # Get container/service name
        container_name=$(get_container_name "$file" "$line_num")
        if [[ -z "$container_name" ]]; then
            container_name="unknown"
        fi

        # Build service identifier
        service_id="$container_name ($(basename "$file"))"

        # Check for conflict
        if [[ -n "${port_usage[$host_port]:-}" ]]; then
            if [[ $conflict_found -eq 0 ]]; then
                echo -e "${RED}❌ PORT CONFLICTS DETECTED${NC}"
                echo ""
            fi
            echo -e "${RED}Port $host_port conflict:${NC}"
            echo -e "  ${YELLOW}1.${NC} ${port_service_map[$host_port]}"
            echo -e "  ${YELLOW}2.${NC} $service_id"
            echo ""
            conflict_found=1
        else
            port_usage[$host_port]=1
            port_service_map[$host_port]="$service_id"
        fi
    done
done < <(find "$COMPOSE_DIR" -maxdepth 1 -name "*.yml" -type f)

# Summary
echo ""
echo -e "${BLUE}=== Summary ===${NC}"
echo "Total ports scanned: ${#port_usage[@]}"

if [[ $conflict_found -eq 0 ]]; then
    echo -e "${GREEN}✅ No port conflicts detected${NC}"
    exit 0
else
    echo -e "${RED}❌ Port conflicts detected - resolve before deployment${NC}"
    echo ""
    echo "Recommended actions:"
    echo "  1. Check .env file for duplicate port assignments"
    echo "  2. Ensure each service has unique port variable"
    echo "  3. Use internal networks to avoid exposing unnecessary ports"
    echo "  4. See: outputs/DOCKER-COMPOSE-PORT-AUDIT-2025-11-07.md"
    exit 1
fi
