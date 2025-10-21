#!/bin/bash
# Configurar sudo sem senha APENAS para comandos Docker
# AVISO: Execute este script MANUALMENTE para manter segurança

echo "════════════════════════════════════════════════════════"
echo "  Configurar Sudo Sem Senha (APENAS comandos Docker)"
echo "════════════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANTE: Por segurança, você deve executar este script!"
echo ""
echo "Este script permite executar APENAS estes comandos sem senha:"
echo "  - sudo usermod (adicionar usuário ao grupo docker)"
echo "  - sudo chmod (ajustar permissões do socket)"
echo "  - sudo systemctl (iniciar/habilitar Docker)"
echo ""
echo "Todos os outros comandos sudo ainda exigirão senha."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Para configurar, execute os comandos abaixo:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat << 'EOF'
# 1. Criar arquivo de configuração sudo
sudo tee /etc/sudoers.d/docker-nopasswd << 'SUDOERS'
# Permitir comandos Docker sem senha
marce ALL=(ALL) NOPASSWD: /usr/sbin/usermod -aG docker *
marce ALL=(ALL) NOPASSWD: /usr/bin/chmod 666 /var/run/docker.sock
marce ALL=(ALL) NOPASSWD: /usr/bin/systemctl start docker
marce ALL=(ALL) NOPASSWD: /usr/bin/systemctl enable docker
marce ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart docker
marce ALL=(ALL) NOPASSWD: /usr/bin/systemctl status docker
SUDOERS

# 2. Ajustar permissões do arquivo
sudo chmod 0440 /etc/sudoers.d/docker-nopasswd

# 3. Validar configuração
sudo visudo -c

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "Agora você pode executar:"
echo "  sudo usermod -aG docker $USER    # Sem senha"
echo "  sudo systemctl start docker      # Sem senha"
echo ""
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ATENÇÃO: Você AINDA precisará de senha na primeira vez!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
