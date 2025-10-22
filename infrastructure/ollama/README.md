# 🤖 Ollama Multi-Model Setup

## ✅ Status Atual

**Container Ollama rodando com GPU (RTX 5090 - 32GB VRAM)**

### 🎯 Modelos Instalados (95GB total):

```
🔥 gpt-oss:120b  (65GB) - MONSTRO! Máxima qualidade
🎯 gpt-oss:20b   (13GB) - Equilibrado, uso geral
⚡ gemma2:27b    (15GB) - Google, multilíngue
🏃 llama3.2      (2GB)  - Rápido para respostas simples
```

**Endpoint:** http://localhost:11434

---

## ⚡ Início Rápido

### Teste Rápido
```bash
# Testar modelo 120B
curl -s http://localhost:11434/api/generate -d '{
  "model": "gpt-oss:120b",
  "prompt": "Olá! Me dê uma dica de trading",
  "stream": false
}' | jq -r '.response'
```

### Comparar Todos os Modelos
```bash
# Executar script de comparação
./test-all-models.sh
```

### Serviço Python
```bash
# Usar o serviço multi-modelo
python3 ollama-multi-model-service.py
```

---

## 📋 Comandos Essenciais

```bash
# Ver modelos instalados
docker exec ollama ollama list

# Conversar (modo interativo)
docker exec -it ollama ollama run gpt-oss:120b

# Ver uso de GPU
nvidia-smi

# Ver logs do container
docker logs -f ollama

# Reiniciar container
docker restart ollama

# Parar/Iniciar
docker stop ollama
docker start ollama
```

---

## 🎯 Quando Usar Cada Modelo

| Tarefa | Modelo | Motivo |
|--------|--------|--------|
| **Análise profunda** | gpt-oss:120b | Máxima inteligência |
| **Uso diário** | gpt-oss:20b | Equilibrado |
| **Tradução** | gemma2:27b | Multilíngue |
| **Testes rápidos** | llama3.2 | Velocidade |

---

## 📚 Documentação

- **[USAGE-GUIDE.md](USAGE-GUIDE.md)** - Guia completo de uso
- **[ollama-multi-model-service.py](ollama-multi-model-service.py)** - Serviço Python
- **[test-all-models.sh](test-all-models.sh)** - Script de testes comparativos
- **[setup-ollama-docker-gpu.sh](setup-ollama-docker-gpu.sh)** - Script de instalação

---

## 🔥 Exemplo Prático no TradingSystem

```typescript
// frontend/apps/dashboard/src/services/ollamaService.ts

export class OllamaService {
  private baseUrl = 'http://localhost:11434/api';
  
  // Análise profunda (usa modelo 120B)
  async analyzeMarket(data: string): Promise<string> {
    return this.generate(data, 'gpt-oss:120b');
  }
  
  // Uso geral (usa modelo 20B)
  async askQuestion(question: string): Promise<string> {
    return this.generate(question, 'gpt-oss:20b');
  }
  
  // Respostas rápidas (usa llama3.2)
  async quickResponse(prompt: string): Promise<string> {
    return this.generate(prompt, 'llama3.2');
  }
  
  private async generate(prompt: string, model: string) {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    const data = await response.json();
    return data.response;
  }
}
```

---

## 🆘 Troubleshooting

### Modelo está lento
- Modelos grandes (120B) são naturalmente mais lentos
- Use gpt-oss:20b ou llama3.2 para respostas mais rápidas
- Verifique GPU: `nvidia-smi`

### Falta de memória
- Remova modelos não usados: `docker exec ollama ollama rm llama3.2`
- O modelo 120B usa ~30GB de VRAM

### Container não responde
```bash
docker restart ollama
docker logs ollama
```

---

## 🚀 Setup Completo

O setup foi feito usando:
- ✅ Docker com suporte a GPU (`--gpus all`)
- ✅ NVIDIA Container Toolkit instalado
- ✅ Volume persistente para modelos
- ✅ 4 modelos instalados (95GB)
- ✅ RTX 5090 com 32GB VRAM

**Criado em:** 2025-10-18  
**Sistema:** WSL2 + Ubuntu + Docker + NVIDIA









