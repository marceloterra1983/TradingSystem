# 🎥 YouTube Link Preview - Proposta de Implementação

**Data:** 2025-11-04 12:00 BRT  
**Status:** 💡 **PROPOSTA** (Aprovação pendente)

---

## 🎯 Objetivo

Exibir preview rico de vídeos do YouTube quando uma mensagem contém um link, incluindo:
- Thumbnail do vídeo
- Título
- Nome do canal
- Duração
- Views (opcional)
- Player embed (opcional - pode ser iframe)

---

## 🔍 Detecção de Links do YouTube

### Padrões de URL

```regex
https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})
```

**Exemplos válidos:**
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=60s` (com timestamp)

**Captura:**
- Video ID: `dQw4w9WgXcQ` (sempre 11 caracteres)

---

## 🏗️ Arquitetura de Implementação

### Opção Recomendada: YouTube oEmbed API ⭐

**Endpoint:** `https://www.youtube.com/oembed?url={VIDEO_URL}&format=json`

**Vantagens:**
- ✅ Completamente grátis
- ✅ Sem autenticação necessária
- ✅ Sem rate limits agressivos
- ✅ Retorna metadata rica (título, autor, thumbnail)
- ✅ Retorna HTML embed pronto

**Desvantagens:**
- ⚠️ Não retorna views, duração, descrição completa

**Response Example:**
```json
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "author_name": "Rick Astley",
  "author_url": "https://www.youtube.com/@RickAstley",
  "type": "video",
  "height": 113,
  "width": 200,
  "version": "1.0",
  "provider_name": "YouTube",
  "provider_url": "https://www.youtube.com/",
  "thumbnail_height": 360,
  "thumbnail_width": 480,
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "html": "<iframe width=\"200\" height=\"113\" src=\"https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Rick Astley - Never Gonna Give You Up\"></iframe>"
}
```

---

### Alternativa: YouTube Data API v3

**Vantagens:**
- ✅ Metadata completa (views, likes, duração, descrição)
- ✅ Dados estruturados

**Desvantagens:**
- ❌ Requer API key (Google Cloud)
- ❌ Rate limit: 10.000 queries/dia (grátis)
- ❌ Mais complexo de configurar

**Decisão:** Usar oEmbed API primeiro, migrar para Data API se necessário.

---

## 🛠️ Implementação Técnica

### 1. Backend - Adicionar ao linkPreview.js

**Arquivo:** `apps/telegram-gateway/src/utils/linkPreview.js`

```javascript
const YOUTUBE_URL_REGEX = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

/**
 * Extract YouTube links from text
 */
export function extractYouTubeLinks(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const links = [];
  let match;
  
  YOUTUBE_URL_REGEX.lastIndex = 0;
  
  while ((match = YOUTUBE_URL_REGEX.exec(text)) !== null) {
    const videoId = match[3];
    links.push({
      url: match[0],
      videoId: videoId
    });
  }
  
  return links;
}

/**
 * Fetch YouTube preview using oEmbed API
 */
export async function fetchYouTubePreview(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const OEMBED_API_URL = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  
  try {
    logger.info({ videoId }, 'Fetching YouTube preview via oEmbed');
    
    const response = await axios.get(OEMBED_API_URL, {
      headers: {
        'User-Agent': 'TelegramGateway/1.0 (compatible; link preview bot)'
      },
      timeout: 5000
    });
    
    if (!response.data) {
      logger.warn({ videoId }, 'YouTube oEmbed returned invalid response');
      return null;
    }
    
    const data = response.data;
    
    // Build preview object
    const preview = {
      type: 'youtube',
      url: videoUrl,
      videoId: videoId,
      title: data.title || '',
      author: {
        name: data.author_name || '',
        url: data.author_url || ''
      },
      thumbnail: {
        url: data.thumbnail_url || '',
        width: data.thumbnail_width || 480,
        height: data.thumbnail_height || 360
      },
      embedHtml: data.html || null,
      fetchedAt: new Date().toISOString()
    };
    
    logger.info({ 
      videoId, 
      title: preview.title,
      author: preview.author.name
    }, 'Successfully fetched YouTube preview');
    
    return preview;
    
  } catch (error) {
    if (error.response?.status === 404) {
      logger.warn({ videoId }, 'YouTube video not found (404)');
    } else if (error.response?.status === 401) {
      logger.warn({ videoId }, 'YouTube video private/unavailable (401)');
    } else if (error.code === 'ECONNABORTED') {
      logger.error({ videoId }, 'YouTube oEmbed API timeout');
    } else {
      logger.error({ 
        videoId, 
        error: error.message,
        status: error.response?.status
      }, 'Failed to fetch YouTube preview');
    }
    
    return null;
  }
}
```

---

### 2. Backend - Atualizar extractLinkPreviews

```javascript
export async function extractLinkPreviews(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Check for Twitter links (priority 1)
  const twitterLinks = extractTwitterLinks(text);
  if (twitterLinks.length > 0) {
    const firstLink = twitterLinks[0];
    const preview = await fetchTwitterPreview(firstLink.username, firstLink.tweetId);
    if (preview) return preview;
  }
  
  // Check for YouTube links (priority 2)
  const youtubeLinks = extractYouTubeLinks(text);
  if (youtubeLinks.length > 0) {
    const firstLink = youtubeLinks[0];
    logger.info({ 
      totalLinks: youtubeLinks.length, 
      processing: firstLink 
    }, 'YouTube links detected, fetching preview for first link');
    
    const preview = await fetchYouTubePreview(firstLink.videoId);
    if (preview) return preview;
  }
  
  return null;
}
```

---

### 3. Frontend - Componente YouTubePreview

**Arquivo:** `frontend/dashboard/src/components/telegram/YouTubePreview.tsx`

```typescript
import React, { useState } from 'react';
import { Youtube, Play, ExternalLink } from 'lucide-react';

interface YouTubePreviewProps {
  preview: {
    type: 'youtube';
    url: string;
    videoId: string;
    title: string;
    author: {
      name: string;
      url: string;
    };
    thumbnail: {
      url: string;
      width: number;
      height: number;
    };
    embedHtml?: string;
    fetchedAt: string;
  };
}

export const YouTubePreview: React.FC<YouTubePreviewProps> = ({ preview }) => {
  const [showEmbed, setShowEmbed] = useState(false);

  // Render embedded player
  if (showEmbed) {
    return (
      <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50">
        {/* Header with close button */}
        <div className="p-3 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-white">
              Reproduzindo vídeo
            </span>
          </div>
          <button
            onClick={() => setShowEmbed(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* YouTube iframe */}
        <div className="relative pb-[56.25%]"> {/* 16:9 aspect ratio */}
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${preview.videoId}?autoplay=1`}
            title={preview.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Render thumbnail with play button
  return (
    <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 hover:border-red-500 transition-colors">
      {/* Thumbnail */}
      <div 
        className="relative cursor-pointer group"
        onClick={() => setShowEmbed(true)}
      >
        <img
          src={preview.thumbnail.url}
          alt={preview.title}
          className="w-full aspect-video object-cover"
          onError={(e) => {
            // Fallback thumbnail
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${preview.videoId}/hqdefault.jpg`;
          }}
        />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
          <div className="w-20 h-20 rounded-full bg-red-600/90 group-hover:bg-red-600 flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </div>
        </div>
        
        {/* Duration badge (se disponível) */}
        {/* <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-semibold">
          5:30
        </div> */}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          <Youtube className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white mb-1 line-clamp-2 leading-snug">
              {preview.title}
            </h4>
            <a
              href={preview.author.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              {preview.author.name}
            </a>
          </div>
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
            title="Abrir no YouTube"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
};
```

---

### 4. Frontend - Integração no Dialog

**Arquivo:** `frontend/dashboard/src/components/pages/TelegramGatewayFinal.tsx`

```typescript
import { YouTubePreview } from '../telegram/YouTubePreview';

// ... no dialog "Ver Mensagem"

{/* YouTube Link Preview */}
{selectedMessage.metadata?.linkPreview?.type === 'youtube' && (
  <div>
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
      Vídeo do YouTube
    </p>
    <YouTubePreview preview={selectedMessage.metadata.linkPreview} />
  </div>
)}
```

---

## 📊 Comparação: Twitter vs YouTube

| Feature | Twitter | YouTube |
|---------|---------|---------|
| **API** | FixTweet (grátis) | oEmbed (grátis) |
| **Rate Limits** | Nenhum | Moderados |
| **Metadata** | Rica (métricas, mídia) | Boa (título, autor, thumbnail) |
| **Embed** | Não | Sim (iframe) |
| **Setup** | Simples | Simples |

---

## 🎯 Resultado Final

**Ao receber mensagem com link do YouTube:**

```
┌─────────────────────────────────────────────────┐
│  💬 Detalhes da Mensagem                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  📝 Texto da Mensagem:                          │
│  ┌───────────────────────────────────────────┐ │
│  │ Assista esse vídeo!                       │ │
│  │ https://youtube.com/watch?v=dQw4w9WgXcQ   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  🎥 Vídeo do YouTube:                           │
│  ┌───────────────────────────────────────────┐ │
│  │  [Thumbnail com play button]              │ │
│  │                                             │ │
│  │  🎬 Rick Astley - Never Gonna Give You Up  │ │
│  │  Rick Astley (canal)              🔗       │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  (Clicar abre player embed inline)              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ⏱️ Estimativa de Tempo

**Total: 1-1.5 horas**

- Backend (detecção + API): 30min
- Frontend (componente): 30min
- Testes + ajustes: 30min

---

## 🚀 Quer que eu implemente agora?

Podemos:
1. ✅ **Implementar YouTube agora** (1h)
2. ✅ **Testar ambos** (Twitter + YouTube)
3. ✅ **Documentar** tudo

**Começamos?** 🎯

