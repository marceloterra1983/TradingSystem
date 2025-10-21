---
title: Instalação do Google Gemini no WSL
sidebar_position: 90
tags: [gemini, ai, wsl, installation, authentication, oauth, deprecated]
domain: backend
type: guide
summary: Guia completo para instalar e configurar o Google Gemini no WSL usando autenticação por conta de usuário (OAuth)
status: deprecated
last_review: 2025-10-17
deprecated_date: 2025-10-15
deprecated_reason: Integração Gemini removida do projeto (backend/shared/gemini eliminado)
---

> ⚠️ **DEPRECATED** - Este guia está obsoleto  
> **Data de descontinuação:** 2025-10-15  
> **Motivo:** Integração Gemini foi removida do projeto  
> **Pasta removida:** `backend/shared/gemini/`  
> **Alternativas:** LangGraph, LlamaIndex, Agent-MCP para funcionalidades AI

---

# Instalação do Google Gemini no WSL [DEPRECATED]

Este guia fornece instruções completas para instalar e configurar o Google Gemini AI no WSL (Windows Subsystem for Linux) para uso no TradingSystem.

## 📋 Pré-requisitos

- ✅ WSL2 instalado (você está usando: `linux 6.6.87.2-microsoft-standard-WSL2`)
- ✅ Python 3.11+ (você tem: `Python 3.12.3`)
- ✅ pip e venv instalados
- ✅ Conta Google ativa
- ✅ Acesso à Internet

## 🔧 Instalação

### 1. Criar ambiente virtual Python (recomendado)

```bash
# Criar diretório para o ambiente Gemini
mkdir -p ~/gemini-env
cd ~/gemini-env

# Criar ambiente virtual
python3 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate
```

### 2. Instalar SDK do Google Generative AI

```bash
# Instalar o SDK oficial do Google Gemini
pip install google-generativeai

# Instalar dependências adicionais úteis
pip install google-auth google-auth-oauthlib google-auth-httplib2

# Instalar ferramentas de desenvolvimento (opcional)
pip install python-dotenv ipython
```

### 3. Verificar instalação

```bash
python3 -c "import google.generativeai as genai; print(f'✅ Google Generative AI instalado: {genai.__version__}')"
```

## 🔐 Configuração de Autenticação

### Opção 1: Autenticação por Conta de Usuário (OAuth) - RECOMENDADO

Esta é a opção preferida para o TradingSystem [[memory:6450847]].

#### 1.1. Configurar projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. Habilite a API do Gemini:
   - Navegue até: **APIs & Services > Library**
   - Pesquise: "Generative Language API"
   - Clique em "Enable"

#### 1.2. Criar credenciais OAuth 2.0

1. Vá para: **APIs & Services > Credentials**
2. Clique em: **Create Credentials > OAuth client ID**
3. Configure:
   - Application type: **Desktop app**
   - Name: `TradingSystem Gemini Client`
4. Baixe o arquivo JSON das credenciais
5. Salve como: `~/gemini-env/client_secrets.json`

#### 1.3. Configurar autenticação no código

Crie um script de autenticação inicial:

```bash
cat > ~/gemini-env/auth_setup.py << 'EOF'
#!/usr/bin/env python3
"""
Script de configuração inicial para autenticação OAuth do Gemini
"""
import os
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pickle

# Escopos necessários para o Gemini
SCOPES = ['https://www.googleapis.com/auth/generative-language']

def authenticate():
    """Autentica com OAuth e salva credenciais"""
    creds = None
    token_file = 'token.pickle'
    
    # Verificar se já existe token salvo
    if os.path.exists(token_file):
        with open(token_file, 'rb') as token:
            creds = pickle.load(token)
    
    # Se não houver credenciais válidas, fazer login
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Renovando token expirado...")
            creds.refresh(Request())
        else:
            print("🔐 Iniciando autenticação OAuth...")
            flow = InstalledAppFlow.from_client_secrets_file(
                'client_secrets.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Salvar credenciais para próximas execuções
        with open(token_file, 'wb') as token:
            pickle.dump(creds, token)
        print("✅ Credenciais salvas com sucesso!")
    else:
        print("✅ Credenciais já válidas!")
    
    return creds

if __name__ == '__main__':
    creds = authenticate()
    print(f"\n✅ Autenticação concluída!")
    print(f"📝 Token salvo em: {os.path.abspath('token.pickle')}")
EOF

chmod +x ~/gemini-env/auth_setup.py
```

#### 1.4. Executar autenticação

```bash
cd ~/gemini-env
python3 auth_setup.py
```

Isso abrirá um navegador para você fazer login com sua conta Google e autorizar o acesso.

### Opção 2: Autenticação por API Key (Alternativa)

Se você preferir usar API key (não recomendado para produção):

1. Acesse: https://aistudio.google.com/app/apikey
2. Crie uma API key
3. Configure no ambiente:

```bash
# Adicionar ao ~/.bashrc ou ~/.zshrc
echo 'export GOOGLE_API_KEY="sua-api-key-aqui"' >> ~/.bashrc
source ~/.bashrc
```

## 🧪 Testar instalação

### Teste básico com API Key

```bash
cat > ~/gemini-env/test_gemini.py << 'EOF'
#!/usr/bin/env python3
"""
Script de teste do Google Gemini
"""
import os
import google.generativeai as genai

def test_with_api_key():
    """Testa com API key"""
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("❌ GOOGLE_API_KEY não configurada")
        return False
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    response = model.generate_content("Diga olá em uma frase curta.")
    print(f"✅ Gemini respondeu: {response.text}")
    return True

def test_with_oauth():
    """Testa com OAuth (implementar após configuração)"""
    # TODO: Implementar teste com OAuth
    print("⚠️ Teste OAuth ainda não implementado")
    return False

if __name__ == '__main__':
    print("🧪 Testando Google Gemini...")
    
    # Tentar com API key primeiro
    if not test_with_api_key():
        print("\n⚠️ API Key não configurada, tentando OAuth...")
        test_with_oauth()
EOF

chmod +x ~/gemini-env/test_gemini.py
```

Execute o teste:

```bash
cd ~/gemini-env
python3 test_gemini.py
```

## 🔗 Integração com TradingSystem

### 1. Adicionar ao projeto

Crie um módulo de integração no projeto:

```bash
# Criar estrutura no backend
mkdir -p /home/marce/projetos/TradingSystem/backend/shared/gemini
```

### 2. Instalar no ambiente do projeto

Se você usa Poetry no TradingSystem:

```bash
cd /home/marce/projetos/TradingSystem
poetry add google-generativeai google-auth google-auth-oauthlib
```

Se você usa pip/requirements.txt:

```bash
# Adicionar ao requirements.txt
echo "google-generativeai>=0.8.0" >> backend/requirements.txt
echo "google-auth>=2.34.0" >> backend/requirements.txt
echo "google-auth-oauthlib>=1.2.0" >> backend/requirements.txt

# Instalar
pip install -r backend/requirements.txt
```

### 3. Configurar variáveis de ambiente

Adicione ao arquivo `.env` do projeto:

```bash
cat >> /home/marce/projetos/TradingSystem/.env.local << 'EOF'

# Google Gemini Configuration
GEMINI_AUTH_TYPE=oauth  # ou 'api_key'
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_CREDENTIALS_PATH=/home/marce/gemini-env/token.pickle
GOOGLE_API_KEY=  # Deixar vazio se usar OAuth
EOF
```

## 📚 Exemplos de Uso

### Análise de Gráficos de Trading

```python
import google.generativeai as genai
from PIL import Image

# Configurar modelo
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Analisar gráfico
image = Image.open('chart.png')
prompt = """
Analise este gráfico de trading e forneça:
- Preço de entrada
- Stop loss
- Take profit
- Timeframe
- Ativo (ticker)
- Direção (compra/venda)
"""

response = model.generate_content([prompt, image])
print(response.text)
```

### Extração de Sinais de Texto

```python
def extract_trading_signal(text: str) -> dict:
    """Extrai sinal de trading de texto"""
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    prompt = f"""
    Analise o seguinte texto e extraia informações de trading:
    
    {text}
    
    Retorne em JSON:
    {{
        "asset": "ticker do ativo",
        "direction": "buy ou sell",
        "entry_price": preço de entrada,
        "stop_loss": preço de stop,
        "take_profit": preço de take profit,
        "timeframe": "timeframe sugerido"
    }}
    """
    
    response = model.generate_content(prompt)
    return response.text
```

## 🔧 Comandos Úteis

```bash
# Ativar ambiente virtual
source ~/gemini-env/venv/bin/activate

# Atualizar SDK
pip install --upgrade google-generativeai

# Listar modelos disponíveis
python3 -c "import google.generativeai as genai; genai.configure(api_key='YOUR_KEY'); [print(m.name) for m in genai.list_models()]"

# Verificar versão instalada
pip show google-generativeai

# Desativar ambiente virtual
deactivate
```

## 🚨 Solução de Problemas

### Erro: "API key not valid"

```bash
# Verificar se a variável está configurada
echo $GOOGLE_API_KEY

# Re-exportar se necessário
export GOOGLE_API_KEY="sua-chave-aqui"
```

### Erro: "Module not found: google.generativeai"

```bash
# Reinstalar o pacote
pip uninstall google-generativeai
pip install google-generativeai
```

### Erro de autenticação OAuth

```bash
# Remover token antigo e refazer autenticação
rm ~/gemini-env/token.pickle
cd ~/gemini-env
python3 auth_setup.py
```

### Problemas com WSL

```bash
# Verificar se o WSL tem acesso à Internet
ping -c 3 google.com

# Atualizar pip
python3 -m pip install --upgrade pip

# Limpar cache do pip
pip cache purge
```

## 📖 Recursos Adicionais

- **Documentação oficial**: https://ai.google.dev/docs
- **Python SDK**: https://github.com/google/generative-ai-python
- **Exemplos de código**: https://ai.google.dev/tutorials
- **API Studio**: https://aistudio.google.com/
- **Modelos disponíveis**: https://ai.google.dev/models/gemini

## ⚠️ Notas Importantes

1. **Limites de uso**: Verifique os limites de quota do plano gratuito
2. **Segurança**: NUNCA commite `client_secrets.json` ou `token.pickle` no Git
3. **Custos**: Monitore o uso para evitar cobranças inesperadas
4. **Performance**: Use modelos mais leves (flash) para análises rápidas
5. **Fallback**: Implemente fallback para quando a API estiver indisponível

## 🔄 Próximos Passos

1. ✅ Instalar SDK do Gemini
2. ✅ Configurar autenticação OAuth
3. ✅ Testar conexão básica
4. 📝 Integrar com análise de gráficos do TradingSystem
5. 📝 Criar serviço de análise de sinais com Gemini
6. 📝 Adicionar cache de respostas para otimização
7. 📝 Implementar retry logic para robustez

---

**Última atualização**: 2025-10-14  
**Autor**: TradingSystem Team  
**Versão**: 1.0.0

