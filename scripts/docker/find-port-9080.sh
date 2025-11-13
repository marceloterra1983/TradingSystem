#!/usr/bin/env bash
# Diagnostic script to find what's using port 9080

echo "=== Verificando porta 9080 ==="
echo ""

if command -v lsof &> /dev/null; then
    echo "Usando lsof:"
    lsof -i :9080 2>&1 || echo "Nada encontrado ou precisa de permissões elevadas"
elif command -v ss &> /dev/null; then
    echo "Usando ss:"
    ss -tulpn | grep :9080 2>&1 || echo "Nada encontrado"
elif command -v netstat &> /dev/null; then
    echo "Usando netstat:"
    netstat -tulpn | grep :9080 2>&1 || echo "Nada encontrado"
fi

echo ""
