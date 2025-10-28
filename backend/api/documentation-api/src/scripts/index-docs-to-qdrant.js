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
// From src/scripts/, go 5 levels up to reach repo root
const projectRoot = path.resolve(__dirname, '../../../../../');

const DOCS_DIR = path.join(projectRoot, 'docs/content');
const QDRANT_URL = config.vectors.qdrantUrl;
const COLLECTION = config.vectors.qdrantCollection;
const OLLAMA_URL = config.vectors.ollamaBaseUrl;
const OLLAMA_MODEL = config.vectors.ollamaEmbeddingModel;
const CHUNK_SIZE = config.vectors.chunkSize;
const CHUNK_OVERLAP = config.vectors.chunkOverlap;

function sha1(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function hexToUuid(hex) {
  const clean = hex.replace(/-/g, '').slice(0, 32).padEnd(32, '0');
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

function parseFrontmatter(raw) {
  const fm = /^---\s*\n([\s\s]*?)\n---\s*\n([\s\S]*)$/.exec(raw);
  if (!fm) return { meta: {}, body: raw };
  try {
    const meta = yaml.load(fm[1]) || {};
    const body = fm[2] || '';
    return { meta, body };
  } catch {
    return { meta: {}, body: raw };
  }
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[#*_~>\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkText(text, chunkSize = 800, overlap = 120) {
  // simple token-ish split by sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = [];
  let currentLen = 0;
  for (const s of sentences) {
    const len = Math.ceil(s.length / 4); // rough token estimate
    if (currentLen + len > chunkSize && current.length) {
      chunks.push(current.join(' '));
      // overlap
      const overlapChars = Math.floor(overlap * 4);
      const cur = current.join(' ');
      const tail = cur.slice(Math.max(0, cur.length - overlapChars));
      current = tail ? [tail] : [];
      currentLen = Math.ceil(tail.length / 4);
    }
    current.push(s);
    currentLen += len;
  }
  if (current.length) chunks.push(current.join(' '));
  return chunks.filter((c) => c.trim().length > 0);
}

async function embed(text) {
  const resp = await axios.post(
    `${OLLAMA_URL}/api/embeddings`,
    { model: OLLAMA_MODEL, prompt: text },
    { timeout: 60_000 }
  );
  const data = resp.data || {};
  if (Array.isArray(data.embedding)) return data.embedding;
  if (Array.isArray(data.embeddings) && Array.isArray(data.embeddings[0])) return data.embeddings[0];
  throw new Error('Unexpected embeddings response from Ollama');
}

async function ensureCollection(client, vectorSize) {
  const { collections } = await client.getCollections();
  const exists = collections?.some((c) => c.name === COLLECTION);
  if (!exists) {
    try {
      await client.createCollection(COLLECTION, {
        vectors: { size: vectorSize, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 },
      });
    } catch (e) {
      console.error('createCollection failed:', e?.response?.data || e.message);
      throw e;
    }
  }
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdx'))) {
      yield full;
    }
  }
}

async function indexDocs() {
  const client = new QdrantClient({ url: QDRANT_URL });

  // Determine vector dimension
  const dimProbe = await embed('probe');
  await ensureCollection(client, dimProbe.length);

  let files = 0;
  let chunks = 0;
  const batch = [];
  const BATCH_SIZE = 32;

  for await (const filepath of walk(DOCS_DIR)) {
    const rel = path.relative(DOCS_DIR, filepath).replace(/\\/g, '/');
    const raw = await fs.readFile(filepath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const title = meta.title || rel;
    const clean = stripMarkdown(body);
    const parts = chunkText(clean, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let i = 0; i < parts.length; i++) {
      const text = parts[i];
      const vec = await embed(text);
      const id = hexToUuid(sha1(`${rel}#${i}`));
      batch.push({
        id,
        vector: vec,
        payload: {
          path: rel,
          title,
          idx: i,
          url: `/docs/${rel.replace(/\.mdx?$/, '')}`,
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          domain: meta.domain || null,
          type: meta.type || null,
          content: text,
        },
      });
      chunks++;
      if (batch.length >= BATCH_SIZE) {
        try {
          await client.upsert(COLLECTION, { wait: true, batch: {
            ids: batch.map((b) => b.id),
            vectors: batch.map((b) => b.vector),
            payloads: batch.map((b) => b.payload),
          }});
          batch.length = 0;
        } catch (e) {
          console.error('upsert batch failed:', e?.response?.data || e.message);
          throw e;
        }
      }
    }
    files++;
  }

  if (batch.length) {
    try {
      await client.upsert(COLLECTION, { wait: true, batch: {
        ids: batch.map((b) => b.id),
        vectors: batch.map((b) => b.vector),
        payloads: batch.map((b) => b.payload),
      }});
    } catch (e) {
      console.error('upsert final batch failed:', e?.response?.data || e.message);
      throw e;
    }
  }

  console.log(JSON.stringify({ ok: true, files, chunks }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  indexDocs().catch((err) => {
    console.error('Indexing failed:', err.message);
    process.exit(1);
  });
}

export default indexDocs;
