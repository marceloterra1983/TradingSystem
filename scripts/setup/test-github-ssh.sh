#!/bin/bash
# Test GitHub SSH connection
# Usage: bash scripts/setup/test-github-ssh.sh

echo "🔐 Testing GitHub SSH connection..."
echo ""

ssh -T git@github.com 2>&1

if [ $? -eq 1 ]; then
    echo ""
    echo "✅ GitHub SSH authentication successful!"
    echo "You can now push to your repositories."
else
    echo ""
    echo "❌ GitHub SSH authentication failed."
    echo ""
    echo "Please ensure:"
    echo "1. Your SSH public key is added to GitHub: https://github.com/settings/keys"
    echo "2. Your SSH agent is running with: eval \"\$(ssh-agent -s)\""
    echo "3. Your key is added to the agent: ssh-add ~/.ssh/id_ed25519"
fi

