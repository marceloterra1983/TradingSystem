#!/bin/bash
# Fix Docker socket permissions in dev container
# This script needs to be run with sudo

set -e

SOCKET_PATH="/var/run/docker-host.sock"
SOCKET_GID=$(stat -c '%g' "$SOCKET_PATH")

echo "📦 Docker Socket Permission Fix"
echo "================================"
echo ""
echo "Current socket GID: $SOCKET_GID"
echo "Current user groups: $(groups)"
echo ""

# Add user to the socket's group
echo "Adding user 'vscode' to group $SOCKET_GID..."
if ! getent group "$SOCKET_GID" > /dev/null 2>&1; then
    echo "Creating group with GID $SOCKET_GID..."
    groupadd -g "$SOCKET_GID" docker-host
fi

GROUP_NAME=$(getent group "$SOCKET_GID" | cut -d: -f1)
echo "Group name: $GROUP_NAME"

usermod -aG "$GROUP_NAME" vscode

echo ""
echo "✅ User added to group successfully!"
echo ""
echo "⚠️  You need to restart your shell or run:"
echo "    newgrp $GROUP_NAME"
echo ""
echo "Then verify with:"
echo "    docker ps"
