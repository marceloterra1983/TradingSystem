import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import crypto from 'crypto';
import axios from 'axios';
import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/appConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../../');

const DOCS_DIR = path.join(projectRoot, 'docs/content');
const QDRANT_URL = config.vectors.qdrantUrl;
const COLLECTION = config.vectors.qdrantCollection;
const OLLAMA_URL = config.vectors.ollamaBaseUrl;
const OLLAMA_MODEL = config.vectors.ollamaEmbeddingModel;
const CHUNK_SIZE = config.vectors.chunkSize;
const CHUNK_OVERLAP = config.vectors.chunkOverlap;

function sha1(input) { return crypto.createHash('sha1').update(input).digest('hex'); }
function hexToUuid(hex) {
  const clean = hex.replace(/-/g, '').slice(0, 32).padEnd(32, '0');
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}
function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseFrontmatter(raw) {
  const fm = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(raw);
  if (!fm) return { meta: {}, body: raw };
  try { return { meta: yaml.load(fm[1]) || {}, body: fm[2] || '' }; }
  catch { return { meta: {}, body: raw }; }
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { yield* walk(full); }
    else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) { yield full; }
  }
}

async function embed(text) {
  const resp = await axios.post(`${OLLAMA_URL}/api/embeddings`, { model: OLLAMA_MODEL, prompt: text }, { timeout: 60_000 });
  const d = resp.data || {};
  if (Array.isArray(d.embedding)) return d.embedding;
  if (Array.isArray(d.embeddings) && Array.isArray(d.embeddings[0])) return d.embeddings[0];
  throw new Error('Unexpected embeddings response from Ollama');
}

async function ensureCollection(client, vectorSize) {
  const { collections } = await client.getCollections();
  const exists = collections?.some((c) => c.name === COLLECTION);
  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: vectorSize, distance: 'Cosine' },
      optimizers_config: { default_segment_number: 2 },
    });
  }
}

async function chunkWithLlamaIndex(text) {
  let li;
  try { li = await import('llamaindex'); }
  catch (e) { throw new Error('llamaindex package not installed. Run: npm i llamaindex'); }

  const { MarkdownNodeParser, Document: LIDocument } = li;
  const parser = new MarkdownNodeParser({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP });
  const doc = new LIDocument({ text });
  const nodes = await parser.getNodesFromDocuments([doc]);
  return nodes.map((n, i) => ({
    text: n.getContent ? n.getContent() : n.text || '',
    // common metadata names seen across versions
    heading: n.metadata?.heading || n.metadata?.Header || n.metadata?.section || null,
    idx: i,
  })).filter((x) => (x.text || '').trim().length > 0);
}

async function indexDocs() {
  const client = new QdrantClient({ url: QDRANT_URL });

  // Determine vector dimension from model
  const vec = await embed('probe');
  await ensureCollection(client, vec.length);

  let files = 0; let chunks = 0;
  const batch = []; const BATCH_SIZE = 32;

  for await (const filepath of walk(DOCS_DIR)) {
    const rel = path.relative(DOCS_DIR, filepath).replace(/\\/g, '/');
    const raw = await fs.readFile(filepath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const title = meta.title || rel;
    const baseUrl = `/docs/${rel.replace(/\.mdx?$/, '')}`;

    const liChunks = await chunkWithLlamaIndex(body);
    for (const part of liChunks) {
      const text = part.text.trim();
      if (!text) continue;
      const vec = await embed(text);
      const anchor = part.heading ? `#${slugify(part.heading)}` : '';
      const url = `${baseUrl}${anchor}`;
      const id = hexToUuid(sha1(`${rel}#${part.idx}`));
      batch.push({
        id,
        vector: vec,
        payload: {
          path: rel,
          title,
          idx: part.idx,
          url,
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          domain: meta.domain || null,
          type: meta.type || null,
          content: text,
        },
      });
      chunks++;
      if (batch.length >= BATCH_SIZE) {
        await client.upsert(COLLECTION, { wait: true, batch: {
          ids: batch.map((b) => b.id),
          vectors: batch.map((b) => b.vector),
          payloads: batch.map((b) => b.payload),
        }});
        batch.length = 0;
      }
    }
    files++;
  }

  if (batch.length) {
    await client.upsert(COLLECTION, { wait: true, batch: {
      ids: batch.map((b) => b.id),
      vectors: batch.map((b) => b.vector),
      payloads: batch.map((b) => b.payload),
    }});
  }

  console.log(JSON.stringify({ ok: true, files, chunks, indexer: 'llamaindex' }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  indexDocs().catch((err) => {
    console.error('Indexing (llamaindex) failed:', err?.response?.data || err.message);
    process.exit(1);
  });
}

export default indexDocs;

