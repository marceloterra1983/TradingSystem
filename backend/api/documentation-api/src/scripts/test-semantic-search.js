import axios from 'axios';
import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/appConfig.js';

async function embed(text) {
  const resp = await axios.post(`${config.vectors.ollamaBaseUrl}/api/embeddings`, {
    model: config.vectors.ollamaEmbeddingModel,
    prompt: text,
  });
  const d = resp.data;
  return d.embedding || (Array.isArray(d.embeddings) ? d.embeddings[0] : null);
}

async function main() {
  const q = process.argv.slice(2).join(' ') || 'docker';
  const vec = await embed(q);
  const client = new QdrantClient({ url: config.vectors.qdrantUrl });
  const resp = await client.search(config.vectors.qdrantCollection, {
    vector: vec,
    limit: 5,
    with_payload: true,
  });
  console.log(JSON.stringify(resp, null, 2));
}

main().catch((e) => {
  console.error('Test search failed:', e?.response?.data || e.message);
  process.exit(1);
});
