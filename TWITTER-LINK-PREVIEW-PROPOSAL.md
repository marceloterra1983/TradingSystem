# 🐦 Twitter/X Link Preview - Proposta de Implementação

**Data:** 2025-11-04 11:40 BRT  
**Status:** 💡 **PROPOSTA** (Aguardando aprovação)

---

## 🎯 Objetivo

Exibir preview rico de links do Twitter/X quando uma mensagem contém um tweet, incluindo:
- Texto do tweet
- Autor (nome, username, foto)
- Imagens/vídeos anexados
- Métricas (likes, retweets, replies)
- Link direto para o tweet

---

## 🔍 Detecção de Links do Twitter

### Padrões de URL

```regex
https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)
```

**Exemplos válidos:**
- `https://twitter.com/elonmusk/status/1234567890123456789`
- `https://x.com/naval/status/9876543210987654321`
- `https://twitter.com/user/status/1111111111111111111?s=20`

**Captura:**
- Username: `elonmusk`, `naval`, `user`
- Tweet ID: `1234567890123456789`

---

## 🏗️ Arquitetura de Implementação

### Opção 1: Server-Side Preview Fetch (★ Recomendada)

**Fluxo:**
```
1. Gateway MTProto captura mensagem
   ↓
2. Detecta link do Twitter no texto
   ↓
3. Busca metadata do tweet (Open Graph ou API)
   ↓
4. Salva preview no banco (JSON)
   ↓
5. Frontend renderiza preview do banco
```

**Vantagens:**
- ✅ Preview carregado uma vez (na captura)
- ✅ Sem rate limits do Twitter no frontend
- ✅ Funciona mesmo se tweet for deletado depois
- ✅ Suporta tweets privados (via sessão autenticada)

**Desvantagens:**
- ⚠️ Aumenta latência na captura (~500ms por link)
- ⚠️ Requer API do Twitter ou scraping

---

### Opção 2: Client-Side Preview Fetch

**Fluxo:**
```
1. Gateway MTProto captura mensagem
   ↓
2. Frontend detecta link do Twitter
   ↓
3. Frontend faz request para obter metadata
   ↓
4. Renderiza preview dinamicamente
```

**Vantagens:**
- ✅ Implementação mais simples
- ✅ Sem impacto na captura
- ✅ Preview sempre atualizado

**Desvantagens:**
- ❌ Rate limits do Twitter (150 req/15min)
- ❌ CORS pode bloquear
- ❌ Não funciona se tweet for deletado
- ❌ Latência na visualização

---

### Opção 3: Híbrida (Server + Client Fallback)

**Fluxo:**
```
1. Gateway tenta buscar preview (timeout 2s)
   ↓
2. Se falhar, salva apenas o link
   ↓
3. Frontend detecta preview vazio
   ↓
4. Frontend busca via proxy/API
```

**Vantagens:**
- ✅ Melhor dos dois mundos
- ✅ Robustez (fallback se servidor falhar)
- ✅ Preview rápido quando possível

---

## 🛠️ Implementação Técnica

### 1. Backend - Detecção e Captura

**Arquivo:** `apps/telegram-gateway/src/utils/linkPreview.js`

```javascript
import axios from 'axios';
import cheerio from 'cheerio';

const TWITTER_URL_REGEX = /https?:\/\/(www\.)?(twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/gi;

export async function extractTwitterLinks(text) {
  const links = [];
  let match;
  
  while ((match = TWITTER_URL_REGEX.exec(text)) !== null) {
    links.push({
      url: match[0],
      username: match[3],
      tweetId: match[4]
    });
  }
  
  return links;
}

export async function fetchTwitterPreview(tweetUrl) {
  try {
    // Opção A: Usar Open Graph tags (via scraping)
    const response = await axios.get(tweetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramGateway/1.0)'
      },
      timeout: 5000
    });
    
    const $ = cheerio.load(response.data);
    
    const preview = {
      type: 'twitter',
      url: tweetUrl,
      title: $('meta[property="og:title"]').attr('content'),
      description: $('meta[property="og:description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      author: $('meta[name="twitter:creator"]').attr('content'),
      siteName: 'Twitter/X',
      timestamp: new Date().toISOString()
    };
    
    return preview;
    
  } catch (error) {
    console.error('Failed to fetch Twitter preview:', error);
    return null;
  }
}

// Opção B: Usar Twitter API v2 (requer bearer token)
export async function fetchTwitterPreviewViaAPI(tweetId) {
  const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
  
  if (!TWITTER_BEARER_TOKEN) {
    console.warn('Twitter API token not configured');
    return null;
  }
  
  try {
    const response = await axios.get(
      `https://api.twitter.com/2/tweets/${tweetId}`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
        },
        params: {
          'tweet.fields': 'author_id,created_at,public_metrics,entities',
          'expansions': 'author_id,attachments.media_keys',
          'media.fields': 'url,preview_image_url'
        }
      }
    );
    
    const tweet = response.data.data;
    const author = response.data.includes?.users?.[0];
    const media = response.data.includes?.media?.[0];
    
    return {
      type: 'twitter',
      tweetId: tweet.id,
      text: tweet.text,
      author: {
        id: author.id,
        name: author.name,
        username: author.username,
        profileImage: author.profile_image_url
      },
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics,
      media: media ? {
        type: media.type,
        url: media.url || media.preview_image_url
      } : null,
      url: `https://twitter.com/${author.username}/status/${tweet.id}`
    };
    
  } catch (error) {
    console.error('Twitter API error:', error.response?.data || error.message);
    return null;
  }
}

// Opção C: Usar serviço de preview (linkpreview.net, etc)
export async function fetchTwitterPreviewViaService(tweetUrl) {
  const LINKPREVIEW_API_KEY = process.env.LINKPREVIEW_API_KEY;
  
  try {
    const response = await axios.post(
      'https://api.linkpreview.net',
      { q: tweetUrl, key: LINKPREVIEW_API_KEY },
      { timeout: 5000 }
    );
    
    return {
      type: 'twitter',
      url: tweetUrl,
      title: response.data.title,
      description: response.data.description,
      image: response.data.image,
      siteName: response.data.site
    };
    
  } catch (error) {
    console.error('LinkPreview API error:', error);
    return null;
  }
}
```

---

### 2. Backend - Integração na Captura

**Arquivo:** `apps/telegram-gateway/src/routes.js` (syncChannel)

```javascript
import { extractTwitterLinks, fetchTwitterPreview } from './utils/linkPreview.js';

// ... dentro do loop de mensagens

if (msg.message && msg.message.length > 0) {
  messageText = msg.message;
  
  // Detectar links do Twitter
  const twitterLinks = await extractTwitterLinks(messageText);
  
  if (twitterLinks.length > 0) {
    logger.info({ 
      twitterLinks: twitterLinks.length 
    }, 'Twitter links detected in message');
    
    // Buscar preview do primeiro link (limite 1 por mensagem)
    const preview = await fetchTwitterPreview(twitterLinks[0].url);
    
    if (preview) {
      metadata.linkPreview = preview;
    }
  }
}

// Salvar metadata no banco (já existe)
// metadata.linkPreview será salvo no campo JSONB
```

---

### 3. Database - Schema Update

**Arquivo:** `backend/data/timescaledb/telegram-gateway/08_link_preview.sql`

```sql
-- Adicionar campo para armazenar previews de links
-- O campo metadata já existe (JSONB), apenas documentar estrutura

COMMENT ON COLUMN telegram_gateway.messages.metadata IS 
'JSONB field containing:
- linkPreview: {
    type: "twitter" | "youtube" | "generic",
    url: string,
    title: string,
    description: string,
    image: string,
    author: object (twitter-specific),
    metrics: object (twitter-specific)
  }
- photoData: { ... }
- videoData: { ... }
';

-- Criar índice para queries de mensagens com previews
CREATE INDEX IF NOT EXISTS idx_messages_link_preview 
ON telegram_gateway.messages ((metadata->'linkPreview'->'type'))
WHERE metadata ? 'linkPreview';
```

---

### 4. Frontend - Componente TwitterPreview

**Arquivo:** `frontend/dashboard/src/components/telegram/TwitterPreview.tsx`

```typescript
import React from 'react';
import { Twitter, Heart, Repeat2, MessageCircle, ExternalLink } from 'lucide-react';

interface TwitterPreviewProps {
  preview: {
    type: 'twitter';
    url: string;
    text?: string;
    author?: {
      name: string;
      username: string;
      profileImage: string;
    };
    createdAt?: string;
    metrics?: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
    };
    media?: {
      type: 'photo' | 'video';
      url: string;
    };
    image?: string; // Fallback (Open Graph)
    title?: string;
    description?: string;
  };
}

export const TwitterPreview: React.FC<TwitterPreviewProps> = ({ preview }) => {
  // Renderização rica (se tivermos dados da API)
  if (preview.author && preview.text) {
    return (
      <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50">
        {/* Header */}
        <div className="p-3 flex items-start gap-3">
          <img
            src={preview.author.profileImage}
            alt={preview.author.name}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate">
                {preview.author.name}
              </span>
              <Twitter className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm text-slate-400">
              @{preview.author.username}
            </span>
          </div>
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-blue-400 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-white whitespace-pre-wrap">{preview.text}</p>
        </div>

        {/* Media */}
        {preview.media && (
          <div className="px-3 pb-3">
            <img
              src={preview.media.url}
              alt="Tweet media"
              className="rounded-lg w-full max-h-96 object-cover"
            />
          </div>
        )}

        {/* Metrics */}
        {preview.metrics && (
          <div className="px-3 pb-3 flex gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{preview.metrics.like_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Repeat2 className="w-4 h-4" />
              <span>{preview.metrics.retweet_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{preview.metrics.reply_count.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Timestamp */}
        {preview.createdAt && (
          <div className="px-3 pb-3 text-xs text-slate-500">
            {new Date(preview.createdAt).toLocaleString('pt-BR')}
          </div>
        )}
      </div>
    );
  }

  // Renderização simples (Open Graph fallback)
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 hover:border-blue-500 transition-colors"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || 'Tweet'}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Twitter className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-slate-400">Twitter/X</span>
        </div>
        {preview.title && (
          <h4 className="font-semibold text-white mb-1 line-clamp-2">
            {preview.title}
          </h4>
        )}
        {preview.description && (
          <p className="text-sm text-slate-400 line-clamp-3">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
};
```

---

### 5. Frontend - Integração no Dialog

**Arquivo:** `frontend/dashboard/src/components/pages/TelegramGatewayFinal.tsx`

```typescript
import { TwitterPreview } from '../telegram/TwitterPreview';

// ... dentro do Dialog "Ver Mensagem"

{/* Texto da mensagem */}
{selectedMessage.text && (
  <div className="space-y-2">
    <label className="text-sm font-medium text-slate-300">
      Mensagem:
    </label>
    <div className="p-3 bg-slate-800/50 rounded-lg">
      <p className="text-white whitespace-pre-wrap">
        {selectedMessage.text}
      </p>
    </div>
  </div>
)}

{/* Twitter Preview (NOVO!) */}
{selectedMessage.metadata?.linkPreview?.type === 'twitter' && (
  <div className="space-y-2">
    <label className="text-sm font-medium text-slate-300">
      Link do Twitter:
    </label>
    <TwitterPreview preview={selectedMessage.metadata.linkPreview} />
  </div>
)}
```

---

## 📊 Comparação de Opções de Busca

| Método | Custo | Rate Limit | Qualidade | Setup |
|--------|-------|------------|-----------|-------|
| **Open Graph (Scraping)** | Grátis | Ilimitado* | Básica | Simples |
| **Twitter API v2** | $100/mês | 500k/mês | Rica | Médio |
| **LinkPreview.net** | $15/mês | 100k/mês | Boa | Simples |
| **FixTweet** | Grátis | Ilimitado | Rica | Muito Simples |

*Twitter pode bloquear IPs com alto volume

---

## 🚀 Recomendação de Implementação

### **Opção 1: FixTweet (Grátis e Rico)** ⭐⭐⭐

**URL:** `https://api.fxtwitter.com/username/status/tweet_id`

**Vantagens:**
- ✅ Completamente grátis
- ✅ Sem rate limits
- ✅ Retorna metadata rica (texto, autor, métricas, media)
- ✅ Sem autenticação necessária
- ✅ API documentada e estável

**Exemplo de request:**
```javascript
const response = await axios.get(
  `https://api.fxtwitter.com/elonmusk/status/1234567890123456789`
);

// Response:
{
  "tweet": {
    "id": "1234567890123456789",
    "text": "Hello World!",
    "author": {
      "name": "Elon Musk",
      "screen_name": "elonmusk",
      "avatar_url": "https://..."
    },
    "likes": 12345,
    "retweets": 6789,
    "replies": 4567,
    "created_at": "2024-01-01T12:00:00.000Z",
    "media": {
      "photos": ["https://..."],
      "videos": []
    }
  }
}
```

---

### Implementação Recomendada (Passo a Passo)

#### **Fase 1: Backend - Detecção e Captura** (1-2 horas)

1. ✅ Criar `apps/telegram-gateway/src/utils/linkPreview.js`
2. ✅ Implementar `extractTwitterLinks()`
3. ✅ Implementar `fetchTwitterPreviewViaFixTweet()`
4. ✅ Integrar em `apps/telegram-gateway/src/routes.js` (syncChannel)
5. ✅ Adicionar índice no banco (`08_link_preview.sql`)

#### **Fase 2: Frontend - Componente de Preview** (2-3 horas)

1. ✅ Criar `TwitterPreview.tsx`
2. ✅ Integrar no dialog "Ver Mensagem"
3. ✅ Adicionar loading state
4. ✅ Adicionar error handling (fallback para link simples)

#### **Fase 3: Testes e Ajustes** (1 hora)

1. ✅ Testar com mensagens contendo links do Twitter
2. ✅ Verificar preview salvo no banco
3. ✅ Validar renderização no frontend
4. ✅ Ajustar estilos e responsividade

---

## 🎯 Resultado Final

**Ao receber mensagem com link do Twitter:**

```
┌─────────────────────────────────────────────────┐
│  💬 Detalhes da Mensagem                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  📝 Mensagem:                                   │
│  ┌───────────────────────────────────────────┐ │
│  │ Olha esse tweet interessante!             │ │
│  │ https://twitter.com/elonmusk/status/123   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  🐦 Link do Twitter:                            │
│  ┌───────────────────────────────────────────┐ │
│  │  [Avatar] Elon Musk        🔗 Twitter      │ │
│  │  @elonmusk                                 │ │
│  │                                             │ │
│  │  Hello World! This is a test tweet.        │ │
│  │                                             │ │
│  │  [Imagem do tweet]                         │ │
│  │                                             │ │
│  │  ❤️ 12.3K  🔁 6.7K  💬 4.5K               │ │
│  │  01/01/2024, 12:00                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📋 Checklist de Implementação

### Backend
- [ ] Instalar dependências: `npm install axios cheerio`
- [ ] Criar `utils/linkPreview.js`
- [ ] Integrar em `routes.js` (syncChannel)
- [ ] Adicionar migration SQL (`08_link_preview.sql`)
- [ ] Testar captura de mensagens com links

### Frontend
- [ ] Criar componente `TwitterPreview.tsx`
- [ ] Integrar no dialog "Ver Mensagem"
- [ ] Adicionar loading/error states
- [ ] Testar renderização
- [ ] Ajustar estilos dark mode

### Documentação
- [ ] Documentar feature no README
- [ ] Adicionar exemplos de uso
- [ ] Documentar estrutura do metadata.linkPreview

---

## ⏱️ Estimativa de Tempo

**Total: 4-6 horas**

- Backend (detecção + captura): 1-2h
- Frontend (componente): 2-3h
- Testes + ajustes: 1h

---

## 🚀 Quer que eu implemente agora?

Se aprovar, posso começar pela **Opção 1 (FixTweet)** que é:
- ✅ Grátis
- ✅ Rico em informações
- ✅ Sem rate limits
- ✅ Fácil de implementar

**Começamos?** 🎯

