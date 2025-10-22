#!/bin/bash
set -e

echo "=========================================="
echo "Ollama Docker GPU Setup Script"
echo "=========================================="
echo ""

# 1. Parar e remover Ollama nativo
echo "[1/7] Parando Ollama nativo..."
sudo systemctl stop ollama 2>/dev/null || true
sudo systemctl disable ollama 2>/dev/null || true
sudo killall ollama 2>/dev/null || true

echo "[2/7] Removendo instalação nativa do Ollama..."
sudo rm -f /usr/local/bin/ollama
sudo rm -rf /usr/share/ollama
sudo rm -f /etc/systemd/system/ollama.service
sudo systemctl daemon-reload

# 2. Limpar repositório corrompido
echo "[3/7] Limpando repositórios corrompidos..."
sudo rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# 3. Instalar NVIDIA Container Toolkit (método correto para Ubuntu)
echo "[4/7] Instalando NVIDIA Container Toolkit..."

# Detectar versão do Ubuntu
. /etc/os-release
if [ "$ID" = "ubuntu" ]; then
    echo "Ubuntu detectado: $VERSION_ID"
    
    # Adicionar repositório NVIDIA
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
        sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
else
    echo "Distribuição: $ID - Usando repositório genérico DEB"
    
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
        sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    
    echo "deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/deb/\$(ARCH) /" | \
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
fi

echo "[5/7] Atualizando lista de pacotes..."
sudo apt-get update

echo "[6/7] Instalando nvidia-container-toolkit..."
sudo apt-get install -y nvidia-container-toolkit

echo "[7/7] Configurando Docker para usar GPU..."
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

echo ""
echo "=========================================="
echo "✅ Instalação concluída!"
echo "=========================================="
echo ""
echo "Testando acesso à GPU no Docker..."
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi || {
    echo "⚠️  Erro ao acessar GPU. Verifique se os drivers NVIDIA estão instalados no Windows."
    echo "    Execute 'nvidia-smi' no Windows para confirmar."
}

echo ""
echo "Iniciando Ollama com GPU via docker compose..."
docker compose -f "${ROOT_DIR}/infrastructure/docker-compose.cache.yml" up -d ollama

echo ""
echo "Aguardando Ollama iniciar..."
sleep 5

echo ""
echo "✅ Ollama rodando em http://localhost:11434"
echo ""
echo "Comandos úteis:"
echo "  docker exec -it ollama ollama list              # Listar modelos"
echo "  docker exec -it ollama ollama pull llama3.2     # Baixar modelo"
echo "  docker logs -f ollama                           # Ver logs"
echo "  docker stop ollama                              # Parar"
echo "  docker start ollama                             # Iniciar"
echo ""








