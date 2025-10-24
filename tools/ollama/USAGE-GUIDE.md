---
title: 📘 Guia de Uso do Ollama com GPU
sidebar_position: 1
tags: [documentation]
domain: ops
type: guide
summary: "- **Container:** Rodando com suporte a GPU (NVIDIA RTX 5090 - 32GB VRAM)"
status: active
last_review: "2025-10-23"
---

# 📘 Guia de Uso do Ollama com GPU

## ✅ Status Atual
- **Container:** Rodando com suporte a GPU (NVIDIA RTX 5090 - 32GB VRAM)
- **Modelos Instalados:** 4 modelos (95GB total)
  - 🔥 **gpt-oss:120b** (65GB) - MONSTRO! Máxima qualidade
  - 🎯 **gpt-oss:20b** (13GB) - Equilibrado e eficiente  
  - ⚡ **gemma2:27b** (15GB) - Google, multilíngue
  - 🏃 **llama3.2** (2GB) - Rápido para respostas simples
- **Endpoint:** http://localhost:11434
- **Uso de VRAM:** ~30GB quando modelo 120B carregado

---

## 🎯 Qual Modelo Usar Quando?

| Situação | Modelo | Motivo |
|----------|--------|--------|
| **Análise profunda de mercado** | 🔥 gpt-oss:120b | Máxima qualidade, raciocínio complexo |
| **Geração de código** | 🔥 gpt-oss:120b | Melhor para lógica complexa |
| **Análise técnica detalhada** | 🔥 gpt-oss:120b | Nuances e precisão |
| **Perguntas gerais** | 🎯 gpt-oss:20b | Equilibrado, rápido e bom |
| **Tradução/Multilíngue** | ⚡ gemma2:27b | Especializado |
| **Respostas rápidas** | 🏃 llama3.2 | Instantâneo |
| **Testes/Experimentação** | 🏃 llama3.2 | Econômico |

**💡 Dica:** Use gpt-oss:120b quando precisar da melhor qualidade, gpt-oss:20b para uso geral!

---

## 🚀 Formas de Usar

### 1️⃣ Via Linha de Comando (Shell)

```bash
# Listar modelos instalados
docker exec ollama ollama list

# Conversar com cada modelo (modo interativo)
docker exec -it ollama ollama run gpt-oss:120b    # MONSTRO (65GB)
docker exec -it ollama ollama run gpt-oss:20b     # Equilibrado (13GB)
docker exec -it ollama ollama run gemma2:27b      # Google (15GB)
docker exec -it ollama ollama run llama3.2        # Rápido (2GB)

# Fazer perguntas diretamente
docker exec ollama ollama run gpt-oss:120b "Análise profunda sobre trading"
docker exec ollama ollama run gpt-oss:20b "Explique machine learning"
docker exec ollama ollama run llama3.2 "Olá, como vai?"

# Remover um modelo (liberar espaço)
docker exec ollama ollama rm llama3.2

# Baixar outros modelos (se quiser)
docker exec ollama ollama pull codellama:13b  # Code Llama (7.3GB)
docker exec ollama ollama pull mistral:7b     # Mistral (4.1GB)
docker exec ollama ollama pull llama3.1:70b   # LLaMA 3.1 (40GB)
```

---

### 2️⃣ Via API REST (cURL)

```bash
# 🔥 MONSTRO - Análise profunda (gpt-oss:120b)
curl http://localhost:11434/api/generate -d '{
  "model": "gpt-oss:120b",
  "prompt": "Faça uma análise detalhada sobre estratégias de trading algorítmico",
  "stream": false
}'

# 🎯 EQUILIBRADO - Uso geral (gpt-oss:20b)
curl http://localhost:11434/api/generate -d '{
  "model": "gpt-oss:20b",
  "prompt": "Explique o que é machine learning",
  "stream": false
}'

# ⚡ GOOGLE - Multilíngue (gemma2:27b)
curl http://localhost:11434/api/generate -d '{
  "model": "gemma2:27b",
  "prompt": "Translate to English: Como funcionam os mercados financeiros?",
  "stream": false
}'

# 🏃 RÁPIDO - Respostas simples (llama3.2)
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Olá! Como vai?",
  "stream": false
}'

# Chat (conversação com contexto)
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "Olá! Como você está?"
    }
  ],
  "stream": false
}'

# Chat com streaming (respostas em tempo real)
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "Conte uma história curta"
    }
  ],
  "stream": true
}'

# Listar modelos via API
curl http://localhost:11434/api/tags

# Verificar se está rodando
curl http://localhost:11434/api/version
```

---

### 3️⃣ Via Python

```python
import requests
import json

# Configuração
OLLAMA_API = "http://localhost:11434/api"

# Função para gerar texto
def generate_text(prompt, model="llama3.2"):
    response = requests.post(
        f"{OLLAMA_API}/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json()["response"]

# Função para chat
def chat(messages, model="llama3.2"):
    response = requests.post(
        f"{OLLAMA_API}/chat",
        json={
            "model": model,
            "messages": messages,
            "stream": False
        }
    )
    return response.json()["message"]["content"]

# Exemplo de uso
if __name__ == "__main__":
    # Gerar texto simples
    result = generate_text("Explique o que é trading algorítmico")
    print("Resposta:", result)
    
    # Chat com contexto
    messages = [
        {"role": "user", "content": "Olá! Você pode me ajudar com Python?"},
        {"role": "assistant", "content": "Claro! Como posso ajudar?"},
        {"role": "user", "content": "Como criar uma API REST?"}
    ]
    reply = chat(messages)
    print("Chat:", reply)
```

**Com Streaming (respostas em tempo real):**

```python
import requests
import json

def chat_streaming(prompt, model="llama3.2"):
    """Recebe respostas em tempo real (streaming)"""
    response = requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True
        },
        stream=True
    )
    
    print("Resposta: ", end="", flush=True)
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            if "message" in data:
                content = data["message"]["content"]
                print(content, end="", flush=True)
    print()  # Nova linha no final

# Exemplo
chat_streaming("Conte uma piada sobre programadores")
```

---

### 4️⃣ Via JavaScript/Node.js

```javascript
// Instalar axios: npm install axios

const axios = require('axios');

const OLLAMA_API = 'http://localhost:11434/api';

// Gerar texto
async function generateText(prompt, model = 'llama3.2') {
  const response = await axios.post(`${OLLAMA_API}/generate`, {
    model,
    prompt,
    stream: false
  });
  return response.data.response;
}

// Chat
async function chat(messages, model = 'llama3.2') {
  const response = await axios.post(`${OLLAMA_API}/chat`, {
    model,
    messages,
    stream: false
  });
  return response.data.message.content;
}

// Exemplo de uso
(async () => {
  // Texto simples
  const result = await generateText('O que é machine learning?');
  console.log('Resposta:', result);
  
  // Chat
  const messages = [
    { role: 'user', content: 'Olá! Pode me ajudar?' },
    { role: 'assistant', content: 'Claro! Como posso ajudar?' },
    { role: 'user', content: 'Explique React Hooks' }
  ];
  const reply = await chat(messages);
  console.log('Chat:', reply);
})();
```

---

### 5️⃣ Integração com TradingSystem (React)

Crie um serviço para usar no Dashboard:

```typescript
// frontend/dashboard/src/services/ollamaService.ts

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OllamaService {
  private baseUrl = 'http://localhost:11434/api';
  private model = 'llama3.2';

  async generate(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.response;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.message.content;
  }

  async *chatStreaming(messages: ChatMessage[]): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true
      })
    });

    if (!response.body) throw new Error('No response body');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      }
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/tags`);
    const data = await response.json();
    return data.models.map((m: any) => m.name);
  }
}

export const ollamaService = new OllamaService();
```

**Usar no componente React:**

```tsx
import { useState } from 'react';
import { ollamaService } from '@/services/ollamaService';

export function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await ollamaService.generate(prompt);
      setResponse(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Faça uma pergunta..."
          rows={4}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {loading ? 'Pensando...' : 'Enviar'}
        </button>
      </form>
      
      {response && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Resposta:</h3>
          <p className="whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 Seus Modelos Instalados

| Modelo | Tamanho | Qualidade | Uso Recomendado |
|--------|---------|-----------|-----------------|
| **gpt-oss:120b** 🔥 | 65GB | ⭐⭐⭐⭐⭐ | Análises complexas, código avançado, máxima qualidade |
| **gpt-oss:20b** 🎯 | 13GB | ⭐⭐⭐⭐ | Uso geral, equilibrado, ótimo custo-benefício |
| **gemma2:27b** ⚡ | 15GB | ⭐⭐⭐⭐ | Multilíngue, Google, tradução |
| **llama3.2** 🏃 | 2GB | ⭐⭐⭐ | Respostas rápidas, testes, experimentação |

---

## 📦 Outros Modelos Disponíveis

| Modelo | Tamanho | Uso | Comando |
|--------|---------|-----|---------|
| **llama3.1:70b** | 40GB | Próximo GPT-4 | `docker exec ollama ollama pull llama3.1:70b` |
| **llama3.1:8b** | 4.7GB | Rápido e bom | `docker exec ollama ollama pull llama3.1:8b` |
| **codellama:13b** | 7.3GB | Código | `docker exec ollama ollama pull codellama:13b` |
| **mistral:7b** | 4.1GB | Equilibrado | `docker exec ollama ollama pull mistral:7b` |
| **qwen2.5:32b** | 19GB | Excelente | `docker exec ollama ollama pull qwen2.5:32b` |

Lista completa: https://ollama.com/library

---

## 🔧 Gerenciamento do Container

```bash
# Ver logs
docker logs -f ollama

# Parar container
docker stop ollama

# Iniciar container
docker start ollama

# Reiniciar container
docker restart ollama

# Ver uso de GPU
docker exec ollama nvidia-smi

# Ver informações do container
docker inspect ollama

# Remover container (mantém volume de dados)
docker rm -f ollama

# Remover tudo (incluindo modelos baixados)
docker rm -f ollama && docker volume rm ollama-data
```

---

## 📊 Monitoramento de GPU

```bash
# Ver uso da GPU em tempo real
watch -n 1 nvidia-smi

# Ver uso de recursos do container
docker stats ollama
```

---

## 🆘 Troubleshooting

### Container não inicia
```bash
docker logs ollama
docker restart ollama
```

### GPU não está sendo usada
```bash
# Verificar se NVIDIA Container Toolkit está instalado
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

### Porta 11434 em uso
```bash
# Ver o que está usando a porta
sudo lsof -i :11434
ss -tuln | grep 11434
```

### Modelo muito lento
- Modelos grandes (>4GB) são mais lentos
- Use modelos menores: `llama3.2` (2GB) ou `phi3` (2.4GB)
- Verifique se a GPU está sendo usada: `docker exec ollama nvidia-smi`

---

## 📚 Documentação Oficial

- **Ollama Docs**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Modelos Disponíveis**: https://ollama.com/library
- **API Reference**: https://github.com/ollama/ollama/blob/main/docs/api.md

---

## 💡 Casos de Uso no TradingSystem

1. **Análise de Sentimento**: Analisar notícias de mercado
2. **Geração de Relatórios**: Criar relatórios automáticos de performance
3. **Assistente de Trading**: Responder perguntas sobre estratégias
4. **Documentação**: Gerar documentação de código
5. **Code Review**: Sugerir melhorias no código
6. **Data Analysis**: Interpretar dados de mercado

---

**Pronto! Agora você tem um LLM local rodando com GPU! 🚀**

