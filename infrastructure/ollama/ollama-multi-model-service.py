#!/usr/bin/env python3
"""
Ollama Multi-Model Service
Serviço para gerenciar múltiplos modelos Ollama no TradingSystem
"""

import requests
import json
from typing import List, Dict, Optional
from enum import Enum


class ModelSize(Enum):
    """Tipos de modelos por tamanho/uso"""
    MONSTER = "gpt-oss:120b"    # 65GB - Máxima qualidade
    LARGE = "gpt-oss:20b"       # 13GB - Equilibrado
    MEDIUM = "gemma2:27b"       # 15GB - Google multilíngue
    FAST = "llama3.2"           # 2GB - Respostas rápidas


class OllamaService:
    """Serviço para interagir com Ollama usando múltiplos modelos"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
    
    def generate(
        self,
        prompt: str,
        model: ModelSize = ModelSize.LARGE,
        stream: bool = False
    ) -> str:
        """
        Gera texto usando o modelo especificado
        
        Args:
            prompt: Texto de entrada
            model: Modelo a usar (padrão: gpt-oss:20b)
            stream: Se True, retorna generator para streaming
        
        Returns:
            Resposta gerada pelo modelo
        """
        response = requests.post(
            f"{self.api_url}/generate",
            json={
                "model": model.value,
                "prompt": prompt,
                "stream": stream
            },
            stream=stream
        )
        
        if stream:
            return self._handle_streaming(response)
        else:
            return response.json()["response"]
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: ModelSize = ModelSize.LARGE,
        stream: bool = False
    ) -> str:
        """
        Chat com contexto de conversação
        
        Args:
            messages: Lista de mensagens [{"role": "user", "content": "..."}]
            model: Modelo a usar
            stream: Se True, retorna generator
        
        Returns:
            Resposta do chat
        """
        response = requests.post(
            f"{self.api_url}/chat",
            json={
                "model": model.value,
                "messages": messages,
                "stream": stream
            },
            stream=stream
        )
        
        if stream:
            return self._handle_streaming(response)
        else:
            return response.json()["message"]["content"]
    
    def _handle_streaming(self, response):
        """Handle streaming responses"""
        for line in response.iter_lines():
            if line:
                data = json.loads(line)
                if "response" in data:
                    yield data["response"]
                elif "message" in data:
                    yield data["message"]["content"]
    
    def list_models(self) -> List[Dict]:
        """Lista todos os modelos instalados"""
        response = requests.get(f"{self.api_url}/tags")
        return response.json().get("models", [])
    
    def analyze_market(
        self,
        market_data: str,
        complexity: str = "medium"
    ) -> str:
        """
        Analisa dados de mercado usando o modelo apropriado
        
        Args:
            market_data: Dados de mercado para análise
            complexity: 'simple', 'medium', 'deep'
        
        Returns:
            Análise gerada
        """
        model_map = {
            "simple": ModelSize.FAST,      # Rápido para análises básicas
            "medium": ModelSize.LARGE,     # Equilibrado
            "deep": ModelSize.MONSTER      # Análise profunda
        }
        
        model = model_map.get(complexity, ModelSize.LARGE)
        
        prompt = f"""Analise os seguintes dados de mercado e forneça insights:

{market_data}

Forneça:
1. Tendência identificada
2. Pontos de entrada/saída
3. Nível de risco
4. Recomendação
"""
        
        return self.generate(prompt, model)
    
    def generate_code(
        self,
        description: str,
        language: str = "python"
    ) -> str:
        """
        Gera código usando o modelo mais adequado
        
        Args:
            description: Descrição do código a gerar
            language: Linguagem de programação
        
        Returns:
            Código gerado
        """
        prompt = f"""Gere código {language} para: {description}

Requisitos:
- Código limpo e bem documentado
- Seguir boas práticas
- Incluir tratamento de erros
"""
        
        # Usar modelo MONSTER para código complexo
        return self.generate(prompt, ModelSize.MONSTER)
    
    def smart_generate(
        self,
        prompt: str,
        auto_select: bool = True
    ) -> str:
        """
        Gera texto selecionando automaticamente o melhor modelo
        
        Args:
            prompt: Texto de entrada
            auto_select: Se True, escolhe modelo baseado no prompt
        
        Returns:
            Resposta gerada
        """
        if not auto_select:
            return self.generate(prompt, ModelSize.LARGE)
        
        # Heurística simples para selecionar modelo
        prompt_lower = prompt.lower()
        
        # Usar MONSTER para:
        if any(word in prompt_lower for word in [
            "análise profunda", "detalhado", "complexo",
            "código", "algoritmo", "implementação"
        ]):
            print("🔥 Usando MONSTER (120B) - Análise profunda")
            return self.generate(prompt, ModelSize.MONSTER)
        
        # Usar FAST para:
        elif any(word in prompt_lower for word in [
            "olá", "oi", "sim", "não", "rápido"
        ]) or len(prompt) < 50:
            print("🏃 Usando FAST (3.2B) - Resposta rápida")
            return self.generate(prompt, ModelSize.FAST)
        
        # Usar LARGE para o resto
        else:
            print("🎯 Usando LARGE (20B) - Equilibrado")
            return self.generate(prompt, ModelSize.LARGE)


# ========== EXEMPLOS DE USO ==========

if __name__ == "__main__":
    ollama = OllamaService()
    
    print("=" * 60)
    print("OLLAMA MULTI-MODEL SERVICE - DEMOS")
    print("=" * 60)
    print()
    
    # 1. Teste com diferentes modelos
    print("1️⃣ Testando todos os modelos com a mesma pergunta:")
    print("-" * 60)
    
    question = "O que é trading algorítmico?"
    
    for model in ModelSize:
        print(f"\n🤖 {model.name} ({model.value}):")
        try:
            response = ollama.generate(question, model)
            print(f"   {response[:150]}...")
        except Exception as e:
            print(f"   ❌ Erro: {e}")
    
    print("\n" + "=" * 60)
    
    # 2. Smart generation (auto-seleção)
    print("\n2️⃣ Smart Generation (auto-seleção de modelo):")
    print("-" * 60)
    
    prompts = [
        "Olá!",  # Deve usar FAST
        "Explique machine learning",  # Deve usar LARGE
        "Análise profunda sobre estratégias de trading"  # Deve usar MONSTER
    ]
    
    for prompt in prompts:
        print(f"\nPrompt: {prompt}")
        response = ollama.smart_generate(prompt)
        print(f"Resposta: {response[:100]}...")
    
    print("\n" + "=" * 60)
    
    # 3. Análise de mercado
    print("\n3️⃣ Análise de Mercado:")
    print("-" * 60)
    
    market_data = """
    ATIVO: WINZ25
    PREÇO: 125.500
    VOLUME: Alto
    TENDÊNCIA: Lateralização após alta de 3%
    SUPORTE: 124.800
    RESISTÊNCIA: 126.200
    """
    
    print("\nAnálise Rápida (FAST):")
    quick_analysis = ollama.analyze_market(market_data, "simple")
    print(quick_analysis[:200])
    
    print("\n" + "=" * 60)
    print("✅ Todos os testes concluídos!")
    print("=" * 60)








