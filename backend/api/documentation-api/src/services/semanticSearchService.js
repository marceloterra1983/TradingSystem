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
    this.defaultCollection = options.collection || config.vectors.qdrantCollection;
    this.ollamaBaseUrl = options.ollamaBaseUrl || config.vectors.ollamaBaseUrl;
    this.defaultEmbeddingModel = options.embeddingModel || config.vectors.ollamaEmbeddingModel;
    this.client = new QdrantClient({ url: this.qdrantUrl });
    this.readyCollections = new Set();
  }

  getDefaultCollection() {
    return this.defaultCollection;
  }

  getDefaultEmbeddingModel() {
    return this.defaultEmbeddingModel;
  }

  async ensureReady(collectionName = this.defaultCollection) {
    if (this.readyCollections.has(collectionName)) {
      return;
    }

    try {
      const { collections } = await this.client.getCollections();
      const exists = collections?.some((c) => c.name === collectionName);
      if (!exists) {
        throw new Error(`Collection '${collectionName}' not found in Qdrant. Please index documents first.`);
      }
      this.readyCollections.add(collectionName);
    } catch (error) {
      throw new Error(`Qdrant readiness failed: ${error.message}`);
    }
  }

  async embedText(text, embeddingModel = this.defaultEmbeddingModel) {
    try {
      const resp = await axios.post(
        `${this.ollamaBaseUrl}/api/embeddings`,
        { model: embeddingModel, prompt: text },
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

  async search(query, topK = 5, filter = undefined, options = {}) {
    const targetCollection = options.collection || this.defaultCollection;
    const embeddingModel = options.embeddingModel || this.defaultEmbeddingModel;

    try {
      await this.ensureReady(targetCollection);
    } catch (readyError) {
      throw new Error(`Semantic search service not ready: ${readyError.message}`);
    }

    let queryVec;
    try {
      queryVec = await this.embedText(query, embeddingModel);
    } catch (embedError) {
      throw new Error(`Failed to generate embeddings: ${embedError.message}`);
    }

    let search;
    try {
      search = await this.client.search(targetCollection, {
        vector: queryVec,
        limit: topK,
        with_payload: true,
        filter,
        score_threshold: 0.0,
      });
    } catch (searchError) {
      // Handle Qdrant "Not Found" errors gracefully
      if (searchError.message?.includes('Not Found') || searchError.message?.includes("doesn't exist")) {
        throw new Error(`Collection '${targetCollection}' not found in Qdrant. Please index documents first.`);
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
