#!/bin/bash
echo "Monitorando logs do forwarder em tempo real..."
echo "Pressione Ctrl+C para parar"
echo ""
tail -f /tmp/tp-capital-final.log | grep --line-buffered -E "Forwarder:|forwarded|channel_post|INFO.*Telegram"
