# 📥 Course Crawler - Proposta de Download de Vídeos e Arquivos

**Data:** 2025-11-11
**Status:** 📝 **PROPOSTA**
**Objetivo:** Fazer download de vídeos e arquivos anexos de cada aula do curso

---

## 🎯 Funcionalidades Atuais

### ✅ O que já funciona:
- **Extração de URLs** de vídeos e attachments (linhas 150-192 de `extraction-pipeline.ts`)
- **Salvamento de links** no Markdown de cada aula
- **Estruturas de dados** prontas (`VideoResource`, `AttachmentResource`)

### 📝 Exemplo de Output Atual:

```markdown
---
title: "02-ecossistema-do-metatrader-5"
order: 2
confidence: 88
---

## Videos
- [Video 1](https://player.vimeo.com/video/12345678)

## Attachments
- [Slides.pdf](https://example.com/files/slides.pdf)

## Content
[Markdown do conteúdo da aula...]
```

**Problema:** Os arquivos **não são baixados**, apenas os links são salvos.

---

## 🚀 Proposta de Implementação

### Fase 1: Download de Attachments (Arquivos) ⭐ **Mais Fácil**

#### Características:
- ✅ **Tamanho previsível** - PDFs, slides, código-fonte (< 50MB)
- ✅ **Download direto** - Apenas HTTP GET
- ✅ **Sem DRM** - Arquivos públicos

#### Implementação Sugerida:

```typescript
// apps/course-crawler/src/pipeline/download-manager.ts

import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';

export interface DownloadOptions {
  maxRetries: number;
  timeoutMs: number;
  maxFileSizeMB: number;
}

export async function downloadAttachment(
  url: string,
  outputDir: string,
  filename: string,
  options: DownloadOptions = {
    maxRetries: 3,
    timeoutMs: 30000,
    maxFileSizeMB: 100,
  }
): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: options.timeoutMs,
      maxContentLength: options.maxFileSizeMB * 1024 * 1024,
    });

    const filePath = path.join(outputDir, sanitizeFilename(filename));
    await fs.writeFile(filePath, response.data);

    return filePath;
  } catch (error) {
    console.error(`[Download] Failed to download ${url}:`, error);
    return null;
  }
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 200); // Limit filename length
}
```

#### Uso em `extraction-pipeline.ts`:

```typescript
// Linha ~180 - Após extrair attachments
for (const attachment of cls.attachments) {
  const filename = attachment.name || path.basename(attachment.url);
  const localPath = await downloadAttachment(
    attachment.url,
    path.join(courseDir, 'attachments'),
    filename
  );

  if (localPath) {
    attachment.localPath = localPath; // Adicionar campo na interface
  }
}
```

---

### Fase 2: Download de Vídeos 🎥 **Mais Complexo**

#### Características:
- ⚠️ **Tamanho grande** - 100MB a 5GB por vídeo
- ⚠️ **Pode ter DRM** - Proteção contra download
- ⚠️ **Streaming complexo** - HLS (m3u8), DASH
- ⚠️ **Tempo de download** - Pode levar minutos por vídeo

#### Opções de Implementação:

##### **Opção A: youtube-dl / yt-dlp** ⭐ **Recomendado**

```typescript
// apps/course-crawler/src/pipeline/video-downloader.ts

import { spawn } from 'node:child_process';
import path from 'node:path';

export async function downloadVideo(
  url: string,
  outputDir: string,
  filename: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${filename}.mp4`);

    // yt-dlp suporta Vimeo, YouTube, Panda Video, etc.
    const ytdlp = spawn('yt-dlp', [
      url,
      '-o', outputPath,
      '--no-playlist',
      '--format', 'best[ext=mp4]',
      '--cookies-from-browser', 'chrome', // Usa cookies para auth
      '--progress',
    ]);

    ytdlp.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}
```

**Prós:**
- ✅ Suporta centenas de plataformas (Vimeo, YouTube, Panda, Hotmart)
- ✅ Lida com autenticação automaticamente
- ✅ Baixa melhor qualidade disponível
- ✅ Retoma downloads interrompidos

**Contras:**
- ❌ Dependência externa (precisa instalar `yt-dlp`)
- ❌ Pode ser bloqueado por plataformas

##### **Opção B: Playwright + Video Capture**

```typescript
// Usa Playwright para reproduzir vídeo e capturar stream
export async function captureVideo(
  page: Page,
  videoSelector: string,
  outputPath: string
): Promise<void> {
  // Interceptar requisições de vídeo
  await page.route('**/*.m3u8', async (route) => {
    const response = await route.fetch();
    const m3u8Content = await response.text();
    // Parse m3u8 e baixar segmentos...
  });

  await page.click(videoSelector); // Play
  // Aguardar download completo...
}
```

**Prós:**
- ✅ Usa contexto autenticado do Playwright
- ✅ Funciona mesmo com DRM leve

**Contras:**
- ❌ Muito complexo de implementar
- ❌ Lento (precisa "reproduzir" o vídeo)
- ❌ Não funciona com DRM forte

---

## 📋 Estrutura de Diretórios Proposta

```
outputs/course-crawler/
└── 9f66a917-.../
    └── 2025-11-11T19-55-39-095Z/
        └── course_6881721aeb7c/
            ├── 01-comece-por-aqui.md
            ├── 02-ecossistema-do-metatrader-5.md
            ├── attachments/           # ✅ NOVO
            │   ├── 01-slides.pdf
            │   ├── 01-codigo-fonte.zip
            │   ├── 02-apostila.pdf
            │   └── ...
            ├── videos/                # ✅ NOVO
            │   ├── 01-introducao.mp4
            │   ├── 02-ecossistema.mp4
            │   └── ...
            └── run-report.json
```

---

## 🔧 Mudanças Necessárias

### 1. Atualizar Interfaces (`types.ts`)

```typescript
export interface VideoResource {
  id: string;
  title: string;
  url: string;
  localPath?: string;        // ✅ NOVO - Caminho local após download
  downloadStatus?: 'pending' | 'downloading' | 'completed' | 'failed'; // ✅ NOVO
  fileSizeBytes?: number;    // ✅ NOVO
  order: number;
  durationSeconds?: number;
  playable: boolean;
  notes?: string;
}

export interface AttachmentResource {
  id: string;
  name: string;
  url: string;
  localPath?: string;        // ✅ NOVO - Caminho local após download
  downloadStatus?: 'pending' | 'downloading' | 'completed' | 'failed'; // ✅ NOVO
  fileSizeBytes?: number;    // ✅ NOVO
  mimeType?: string;
}
```

### 2. Adicionar Variáveis de Ambiente

```bash
# .env
COURSE_CRAWLER_DOWNLOAD_ATTACHMENTS=true
COURSE_CRAWLER_DOWNLOAD_VIDEOS=false  # Desabilitado por padrão (muito pesado)
COURSE_CRAWLER_MAX_DOWNLOAD_SIZE_MB=500
COURSE_CRAWLER_DOWNLOAD_TIMEOUT_MS=300000  # 5 minutos
COURSE_CRAWLER_CONCURRENT_DOWNLOADS=2
```

### 3. Atualizar Schema Zod (`config/environment.ts`)

```typescript
const schema = z.object({
  // ... existentes ...
  COURSE_CRAWLER_DOWNLOAD_ATTACHMENTS: booleanSchema.default(true),
  COURSE_CRAWLER_DOWNLOAD_VIDEOS: booleanSchema.default(false),
  COURSE_CRAWLER_MAX_DOWNLOAD_SIZE_MB: z.coerce.number().positive().default(500),
  COURSE_CRAWLER_DOWNLOAD_TIMEOUT_MS: z.coerce.number().positive().default(300000),
  COURSE_CRAWLER_CONCURRENT_DOWNLOADS: z.coerce.number().int().min(1).max(5).default(2),
});
```

### 4. Adicionar Lógica de Download (`extraction-pipeline.ts`)

```typescript
// Linha ~180 - Após extrair attachments
if (env.download.attachments) {
  for (const attachment of classResource.attachments) {
    const filename = attachment.name || path.basename(attachment.url);
    const localPath = await downloadAttachment(
      attachment.url,
      path.join(courseDir, 'attachments'),
      filename,
      {
        maxRetries: 3,
        timeoutMs: env.download.timeoutMs,
        maxFileSizeMB: env.download.maxSizeMB,
      }
    );

    if (localPath) {
      attachment.localPath = localPath;
      attachment.downloadStatus = 'completed';
      const stats = await fs.stat(localPath);
      attachment.fileSizeBytes = stats.size;
    } else {
      attachment.downloadStatus = 'failed';
    }
  }
}

// Linha ~190 - Após extrair vídeos
if (env.download.videos) {
  for (const video of classResource.videos) {
    const filename = slugify(video.title);
    const localPath = await downloadVideo(
      video.url,
      path.join(courseDir, 'videos'),
      filename
    );

    if (localPath) {
      video.localPath = localPath;
      video.downloadStatus = 'completed';
      const stats = await fs.stat(localPath);
      video.fileSizeBytes = stats.size;
    } else {
      video.downloadStatus = 'failed';
    }
  }
}
```

### 5. Atualizar Markdown Rendering (`renderClassMarkdown`)

```typescript
function renderClassMarkdown(cls: ClassResource) {
  // ... frontmatter ...

  const attachments = cls.attachments
    .map((attachment) => {
      const localLink = attachment.localPath
        ? `[📁 ${attachment.name}](${attachment.localPath})`
        : `[🔗 ${attachment.name}](${attachment.url}) ⚠️ Download failed`;
      return `- ${localLink}`;
    })
    .join('\n');

  const videos = cls.videos
    .map((video) => {
      const localLink = video.localPath
        ? `[🎥 ${video.title}](${video.localPath})`
        : `[🔗 ${video.title}](${video.url}) ⚠️ Download failed`;
      return `- ${localLink}`;
    })
    .join('\n');

  // ... resto ...
}
```

---

## 🔒 Considerações de Segurança

### 1. Autenticação e Cookies
- ✅ Playwright já mantém sessão autenticada
- ✅ `yt-dlp` pode usar `--cookies-from-browser chrome`
- ⚠️ Nunca salvar credenciais no código

### 2. Limites de Taxa (Rate Limiting)
```typescript
// Evitar sobrecarga do servidor de origem
const DOWNLOAD_DELAY_MS = 2000; // 2 segundos entre downloads

for (const attachment of attachments) {
  await downloadAttachment(attachment.url, ...);
  await sleep(DOWNLOAD_DELAY_MS);
}
```

### 3. Espaço em Disco
```typescript
// Verificar espaço disponível antes de baixar
const diskSpace = await checkDiskSpace('/');
if (diskSpace.free < 5 * 1024 * 1024 * 1024) { // < 5GB
  throw new Error('Insufficient disk space');
}
```

### 4. Copyright e Termos de Uso
⚠️ **IMPORTANTE:** Fazer download de conteúdo protegido pode violar:
- Termos de Serviço da plataforma
- Leis de direitos autorais
- DRM (Digital Rights Management)

**Recomendação:** Usar apenas para:
- ✅ Cursos que você comprou/possui
- ✅ Backup pessoal
- ✅ Uso offline autorizado

---

## 📊 Estimativa de Impacto

### Tempo de Execução:
- **Sem downloads:** ~5 minutos (atual)
- **Com attachments:** +2-5 minutos (depende do tamanho)
- **Com vídeos:** +30-120 minutos (depende da quantidade/tamanho)

### Espaço em Disco:
- **Attachments:** ~50-500MB por curso
- **Vídeos:** ~2-20GB por curso

### Complexidade:
- **Attachments:** ⭐⭐ (Fácil)
- **Vídeos:** ⭐⭐⭐⭐⭐ (Muito Complexo)

---

## 🎯 Roadmap Sugerido

### Fase 1: Attachments (1-2 dias) ⭐ **Alta Prioridade**
1. ✅ Criar `download-manager.ts`
2. ✅ Atualizar interfaces com `localPath`
3. ✅ Adicionar variáveis de ambiente
4. ✅ Implementar download de attachments
5. ✅ Atualizar Markdown rendering
6. ✅ Testar com curso real

### Fase 2: Vídeos com yt-dlp (3-5 dias)
1. ✅ Instalar `yt-dlp` no Dockerfile
2. ✅ Criar `video-downloader.ts`
3. ✅ Implementar download paralelo
4. ✅ Adicionar progress tracking
5. ✅ Testar com diferentes plataformas (Vimeo, Panda, YouTube)

### Fase 3: UI de Progresso (2-3 dias)
1. ✅ WebSocket para streaming de progresso
2. ✅ Barra de progresso na UI
3. ✅ Cancelamento de downloads
4. ✅ Retry manual de falhas

---

## 🧪 Testes Necessários

### Testes Unitários:
- ✅ Download de PDF pequeno (< 1MB)
- ✅ Download de ZIP grande (> 50MB)
- ✅ Timeout em download lento
- ✅ Retry em erro HTTP
- ✅ Sanitização de nomes de arquivo

### Testes de Integração:
- ✅ Download de vídeo Vimeo
- ✅ Download de vídeo Panda
- ✅ Download com autenticação
- ✅ Download de múltiplos arquivos em paralelo

---

## 📝 Exemplos de Uso

### Exemplo 1: Apenas Attachments (Recomendado)
```bash
COURSE_CRAWLER_DOWNLOAD_ATTACHMENTS=true \
COURSE_CRAWLER_DOWNLOAD_VIDEOS=false \
node dist/index.js
```

### Exemplo 2: Tudo (Pesado)
```bash
COURSE_CRAWLER_DOWNLOAD_ATTACHMENTS=true \
COURSE_CRAWLER_DOWNLOAD_VIDEOS=true \
COURSE_CRAWLER_MAX_DOWNLOAD_SIZE_MB=1000 \
node dist/index.js
```

### Exemplo 3: Apenas URLs (Atual)
```bash
COURSE_CRAWLER_DOWNLOAD_ATTACHMENTS=false \
COURSE_CRAWLER_DOWNLOAD_VIDEOS=false \
node dist/index.js
```

---

## ✅ Próximos Passos

1. **Decisão:** Você quer implementar?
   - [ ] Apenas attachments
   - [ ] Apenas vídeos
   - [ ] Ambos

2. **Prioridade:** Quando implementar?
   - [ ] Agora (alta)
   - [ ] Próxima sprint (média)
   - [ ] Backlog (baixa)

3. **Approach:** Como implementar vídeos?
   - [ ] Opção A: `yt-dlp` (recomendado)
   - [ ] Opção B: Playwright capture
   - [ ] Não implementar ainda

---

**Status:** 📝 **AGUARDANDO APROVAÇÃO**
**Autor:** Claude Code AI Assistant
**Data:** 2025-11-11
**Última atualização:** 2025-11-11 20:15 UTC
