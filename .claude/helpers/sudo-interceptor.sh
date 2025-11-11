#!/bin/bash
# Claude Code Sudo Interceptor
# Automatically creates scripts for sudo commands instead of executing them

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the command from CLAUDE_TOOL_INPUT (JSON format)
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

# Check if this is a Bash tool call and contains sudo
if [[ -z "$TOOL_INPUT" ]]; then
    exit 0
fi

# Extract the command from JSON (basic parsing)
COMMAND=$(echo "$TOOL_INPUT" | grep -oP '"command":\s*"\K[^"]+' || echo "")

# Check if command contains sudo
if [[ "$COMMAND" != *"sudo"* ]]; then
    exit 0
fi

# Generate script filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="/home/marce/Projetos/TradingSystem/.claude/sudo-scripts"
SCRIPT_FILE="$SCRIPT_DIR/sudo_${TIMESTAMP}.sh"

# Create directory if it doesn't exist
mkdir -p "$SCRIPT_DIR"

# Create the script
cat > "$SCRIPT_FILE" << 'EOF'
#!/bin/bash
# Auto-generated sudo script by Claude Code
# Created: $(date)
# Original command context: Claude Code execution

set -euo pipefail

echo "=================================="
echo "Claude Code Sudo Script"
echo "=================================="
echo ""
echo "This script requires administrator privileges."
echo "Commands to be executed:"
echo ""

EOF

# Add the actual command(s)
echo "# Original command from Claude Code" >> "$SCRIPT_FILE"
echo "$COMMAND" >> "$SCRIPT_FILE"

# Make script executable
chmod +x "$SCRIPT_FILE"

# Create a prompt message for Claude Code
PROMPT_FILE="$SCRIPT_DIR/PROMPT_${TIMESTAMP}.txt"
cat > "$PROMPT_FILE" << EOF
⚠️  SUDO COMMAND DETECTED ⚠️

I've created a script that requires administrator privileges.

📁 Script Location: $SCRIPT_FILE

📋 Commands to be executed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$COMMAND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 To execute, run:
   sudo bash $SCRIPT_FILE

⚠️  Review the script before running:
   cat $SCRIPT_FILE

After execution, please confirm so I can continue.
EOF

# Log the interception
mkdir -p .claude/logs
echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUDO intercepted: $COMMAND → $SCRIPT_FILE" >> .claude/logs/sudo-intercepts.log

# Output the prompt (will be visible to Claude Code)
cat "$PROMPT_FILE"

# Prevent the original sudo command from executing
# by exiting with code 130 (user interrupted)
exit 130
