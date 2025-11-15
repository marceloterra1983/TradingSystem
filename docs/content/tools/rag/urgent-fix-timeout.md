---
title: "RAG Collections Timeout Fix"
slug: /tools/rag/urgent-fix-timeout
sidebar_position: 9
description: "Mitigation plan for the computeCollectionMetrics scroll timeout in Qdrant."
tags:
  - rag
  - bugfix
  - qdrant
owner: ArchitectureGuild
lastReviewed: '2025-11-02'
---
# CORREÇÃO URGENTE - Timeout no Endpoint Collections

## Problema Encontrado

O endpoint `GET /api/v1/rag/collections` está travando devido ao método `computeCollectionMetrics` que faz scroll de TODOS os pontos no Qdrant para cada requisição.

**Localização**: `tools/rag-services/src/services/collectionManager.ts:373-453`

**Código Problemático**:
```typescript
do {
  const response = await axios.post(
    `${this.qdrantUrl}/collections/${collection.name}/points/scroll`,
    payload,
    { timeout: 5000 }
  );

  const points = response.data?.result?.points ?? [];
  chunkCount += points.length;

  // Process each point to find orphans...

  offset = response.data?.result?.next_page_offset ?? null;
} while (offset);  // ❌ Loop infinito com milhares de pontos!
```

**Impacto**:
- Collection com 1247 chunks = 3 requisições de scroll (512 chunks cada)
- Tempo total: ~2-5 minutos por requisição
- Dashboard fica travado aguardando resposta

## Solução Temporária (Quick Fix)

Comentar o loop de scroll e usar apenas os valores reportados pelo Qdrant:

```typescript
private async computeCollectionMetrics(
  collection: CollectionConfig,
  qdrantStats: any | null
): Promise<CollectionMetrics> {
  const files = await this.collectFiles(collection);

  // Use Qdrant reported counts (fast)
  const chunkCount =
    qdrantStats?.result?.points_count ??
    qdrantStats?.result?.vectors_count ??
    0;

  const totalFiles = files.length;
  const indexedFiles = totalFiles; // Assume all files indexed
  const pendingFiles = 0;
  const orphanChunks = 0;  // Skip orphan detection for performance

  return {
    totalFiles,
    indexedFiles,
    pendingFiles,
    orphanChunks,
    chunkCount
  };
}
```

## Solução Definitiva (Para Implementar)

1. **Cache de Métricas**: Calcular métricas em background e cachear por 5-10 minutos
2. **Endpoint Separado**: `/collections/:name/stats` para cálculo sob demanda
3. **Worker Assíncrono**: Job que atualiza métricas periodicamente
4. **Streaming/Paginação**: Retornar estimativas primeiro, dados completos depois

## Ação Imediata

Como estamos com timeout crítico, vou aplicar a solução temporária agora:

```bash
# Editar collectionManager.ts
# Comentar o loop de scroll (linhas 391-434)
# Usar apenas valores reportados

# Rebuild container
cd tools/rag-services
docker build -t img-rag-collections-service:latest .
docker restart rag-collections-service
```

## Status

- ✅ Problema identificado (scroll loop)
- ⏳ Solução temporária pronta
- ❌ Ainda não aplicada (aguardando confirmação)

**Recomendação**: Aplicar quick fix AGORA para desbloquear dashboard, depois implementar solução definitiva com cache.
