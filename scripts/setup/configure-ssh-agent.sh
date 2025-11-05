#!/bin/bash
# Configure SSH agent to start automatically
# Usage: bash scripts/setup/configure-ssh-agent.sh

BASHRC="$HOME/.bashrc"
SSH_AGENT_CONFIG='
# SSH Agent Auto-start (TradingSystem)
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)" > /dev/null 2>&1
    ssh-add ~/.ssh/id_ed25519 > /dev/null 2>&1
fi
'

echo "🔧 Configuring SSH agent auto-start..."

# Check if already configured
if grep -q "SSH Agent Auto-start (TradingSystem)" "$BASHRC"; then
    echo "⚠️  SSH agent auto-start is already configured in ~/.bashrc"
    echo ""
    read -p "Do you want to reconfigure? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Configuration cancelled."
        exit 0
    fi
    
    # Remove old configuration
    sed -i '/# SSH Agent Auto-start (TradingSystem)/,/^fi$/d' "$BASHRC"
fi

# Add configuration
echo "$SSH_AGENT_CONFIG" >> "$BASHRC"

echo ""
echo "✅ SSH agent auto-start configured successfully!"
echo ""
echo "To apply changes, run:"
echo "  source ~/.bashrc"
echo ""
echo "Or restart your terminal."

