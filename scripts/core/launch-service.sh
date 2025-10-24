#!/bin/bash
# Laucher Script
# Usage: ./launch-service.sh --name "Dashboard" --dir "path" --command "npm run dev"

set -e

# Parse arguments
SERVICE_NAME=""
WORKING_DIR=""
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --name|-n)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --dir|-d)
            WORKING_DIR="$2"
            shift 2
            ;;
        --command|-c)
            COMMAND="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 --name SERVICE_NAME --dir WORKING_DIR --command COMMAND"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$SERVICE_NAME" ] || [ -z "$WORKING_DIR" ] || [ -z "$COMMAND" ]; then
    echo "❌ Missing required parameters"
    echo "Usage: $0 --name SERVICE_NAME --dir WORKING_DIR --command COMMAND"
    exit 1
fi

echo "Launching $SERVICE_NAME..."
echo "Working Directory: $WORKING_DIR"
echo "Command: $COMMAND"

# Validate working directory exists
if [ ! -d "$WORKING_DIR" ]; then
    echo "❌ ERROR: Working directory does not exist: $WORKING_DIR"
    exit 1
fi

# Determine which terminal emulator to use
if command -v gnome-terminal &> /dev/null; then
    echo "Using gnome-terminal"
    gnome-terminal --tab --title="$SERVICE_NAME" -- bash -c "
        cd '$WORKING_DIR'
        $COMMAND
        exec bash
    "
    echo "✅ Launched in gnome-terminal"
elif command -v konsole &> /dev/null; then
    echo "Using Konsole (KDE)"
    konsole --new-tab --workdir "$WORKING_DIR" -e bash -c "
        $COMMAND
        exec bash
    " &
    echo "✅ Launched in Konsole"
elif command -v xterm &> /dev/null; then
    echo "Using xterm (fallback)"
    xterm -T "$SERVICE_NAME" -e bash -c "
        cd '$WORKING_DIR'
        $COMMAND
        exec bash
    " &
    echo "✅ Launched in xterm"
else
    echo "⚠️  No suitable terminal emulator found"
    echo "Install gnome-terminal, konsole, or xterm"
    echo "Falling back to background execution..."
    cd "$WORKING_DIR"
    nohup bash -c "$COMMAND" > /dev/null 2>&1 &
    echo "✅ Launched in background (PID: $!)"
fi

echo "✅ Service $SERVICE_NAME launched successfully!"




