import axios from 'axios';
import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/appConfig.js';

/**
 * SemanticSearchService
 * - Uses Ollama embeddings (local) and Qdrant (local) for semantic search
 */
export default class SemanticSearchService {
  constructor(options = {}) {
    this.qdrantUrl = options.qdrantUrl || config.vectors.qdrantUrl;
    this.collection = options.collection || config.vectors.qdrantCollection;
    this.ollamaBaseUrl = options.ollamaBaseUrl || config.vectors.ollamaBaseUrl;
    this.embeddingModel = options.embeddingModel || config.vectors.ollamaEmbeddingModel;
    this.client = new QdrantClient({ url: this.qdrantUrl });
    this.vectorSize = null; // Lazily determined
    this.ready = false;
  }

  async ensureReady() {
    if (this.ready) return;
    // Check if collection exists, else create with detected vector size
    try {
      const { collections } = await this.client.getCollections();
      const exists = collections?.some((c) => c.name === this.collection);
      if (!exists) {
        // Determine dimension via a small embed call
        const probe = await this.embedText('dimension probe');
        this.vectorSize = probe.length;
        await this.client.createCollection(this.collection, {
          vectors: { size: this.vectorSize, distance: 'Cosine' },
          optimizers_config: { default_segment_number: 2 },
        });
      } else {
        // Fetch vector size from existing collection
        try {
          const info = await this.client.getCollection(this.collection);
          const size = info?.result?.config?.params?.vectors?.size
            || info?.result?.status?.optimizers_status?.vector_size; // fallback if shape differs
          this.vectorSize = size || this.vectorSize;
        } catch (getCollError) {
          // Collection might not exist yet, will be created on first search if needed
          // Reset ready flag so we try again
          this.ready = false;
          throw new Error(`Collection '${this.collection}' check failed: ${getCollError.message}`);
        }
      }
      this.ready = true;
    } catch (error) {
      throw new Error(`Qdrant readiness failed: ${error.message}`);
    }
  }

  async embedText(text) {
    try {
      const resp = await axios.post(
        `${this.ollamaBaseUrl}/api/embeddings`,
        { model: this.embeddingModel, prompt: text },
        { timeout: 60_000 }
      );
      const data = resp.data || {};
      // Ollama returns { embedding: number[] }
      if (Array.isArray(data.embedding)) return data.embedding;
      // Some variants may return { embeddings: number[][] }
      if (Array.isArray(data.embeddings) && Array.isArray(data.embeddings[0])) {
        return data.embeddings[0];
      }
      throw new Error('Unexpected embeddings response');
    } catch (error) {
      throw new Error(`Ollama embedding failed: ${error.message}`);
    }
  }

  async search(query, topK = 5, filter = undefined) {
    try {
      await this.ensureReady();
    } catch (readyError) {
      throw new Error(`Semantic search service not ready: ${readyError.message}`);
    }

    let queryVec;
    try {
      queryVec = await this.embedText(query);
    } catch (embedError) {
      throw new Error(`Failed to generate embeddings: ${embedError.message}`);
    }

    let search;
    try {
      search = await this.client.search(this.collection, {
        vector: queryVec,
        limit: topK,
        with_payload: true,
        filter,
        score_threshold: 0.0,
      });
    } catch (searchError) {
      // Handle Qdrant "Not Found" errors gracefully
      if (searchError.message?.includes('Not Found') || searchError.message?.includes("doesn't exist")) {
        throw new Error(`Collection '${this.collection}' not found in Qdrant. Please index documents first.`);
      }
      throw new Error(`Qdrant search failed: ${searchError.message}`);
    }

    const items = Array.isArray(search)
      ? search
      : Array.isArray(search?.result)
        ? search.result
        : [];

    return items.map((item) => ({
      id: item.id,
      score: item.score,
      payload: item.payload,
    }));
  }
}
