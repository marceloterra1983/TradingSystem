#!/bin/bash
# Terminal emulator detection and management
# Usage: source "$(dirname "$0")/lib/terminal.sh"
#
# Provides:
#   - Terminal emulator detection
#   - Terminal command launchers
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

# Prevent multiple sourcing
[[ -n "${_TERMINAL_SH_LOADED:-}" ]] && return 0
readonly _TERMINAL_SH_LOADED=1

# Source common if not already loaded
if [[ -z "${_COMMON_SH_LOADED:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/common.sh"
fi

# Detect available terminal emulator
# Returns: terminal name (gnome-terminal, konsole, xterm, none)
detect_terminal() {
    if command_exists gnome-terminal; then
        echo "gnome-terminal"
    elif command_exists konsole; then
        echo "konsole"
    elif command_exists xterm; then
        echo "xterm"
    else
        echo "none"
    fi
}

# Launch command in new terminal tab/window
# Args: $1 - title, $2 - working directory, $3 - command to run
# Returns: 0 on success, 1 on failure
launch_in_terminal() {
    local title=$1
    local workdir=$2
    local command=$3
    local terminal
    terminal=$(detect_terminal)
    
    case "$terminal" in
        gnome-terminal)
            gnome-terminal --tab --title="$title" --working-directory="$workdir" -- bash -c "$command; exec bash" &
            ;;
        konsole)
            konsole --new-tab --workdir "$workdir" -e bash -c "$command; exec bash" &
            ;;
        xterm)
            xterm -T "$title" -e bash -c "cd '$workdir' && $command; exec bash" &
            ;;
        none)
            log_error "No terminal emulator found (gnome-terminal, konsole, xterm)"
            log_error "Install one or run manually: cd '$workdir' && $command"
            return 1
            ;;
    esac
    
    log_success "Launched '$title' in $terminal"
    return 0
}

# Launch command in background (no terminal)
# Args: $1 - name, $2 - working directory, $3 - command, $4 - log file
# Returns: PID of background process
launch_in_background() {
    local name=$1
    local workdir=$2
    local command=$3
    local log_file=${4:-/dev/null}
    
    (
        cd "$workdir" || exit 1
        exec bash -c "$command" > "$log_file" 2>&1
    ) &
    
    local pid=$!
    log_success "Launched '$name' in background (PID: $pid)"
    echo "$pid"
}

# Check if running in interactive terminal
is_interactive() {
    [[ -t 0 ]]
}

# Check if running in a screen/tmux session
is_in_multiplexer() {
    [[ -n "${STY:-}" ]] || [[ -n "${TMUX:-}" ]]
}

# Get terminal width
get_terminal_width() {
    tput cols 2>/dev/null || echo 80
}

# Get terminal height
get_terminal_height() {
    tput lines 2>/dev/null || echo 24
}

# Open URL in browser
# Args: $1 - URL
open_url() {
    local url=$1
    
    if is_wsl; then
        # WSL: use Windows explorer
        explorer.exe "$url" &
    elif command_exists xdg-open; then
        # Linux: use xdg-open
        xdg-open "$url" &
    elif command_exists open; then
        # macOS: use open
        open "$url" &
    else
        log_warning "Cannot open URL automatically: $url"
        log_warning "Please open manually in your browser"
        return 1
    fi
    
    log_success "Opened URL: $url"
}

# Export functions
export -f detect_terminal launch_in_terminal launch_in_background
export -f is_interactive is_in_multiplexer
export -f get_terminal_width get_terminal_height open_url

