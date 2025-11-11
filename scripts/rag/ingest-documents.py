#!/usr/bin/env python3
"""
Quick document ingestion script for Qdrant
Loads all .md/.mdx files from docs/content and creates embeddings
"""

import os
from pathlib import Path
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.ollama import OllamaEmbedding
from qdrant_client import QdrantClient

# Configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "rag-qdrant")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://rag-ollama:11434")
DOCS_PATH = "/app/docs/content"
COLLECTION_NAME = "documentation"

print("=" * 60)
print("🚀 DOCUMENT INGESTION SCRIPT")
print("=" * 60)
print(f"📍 Qdrant: {QDRANT_HOST}:{QDRANT_PORT}")
print(f"📍 Ollama: {OLLAMA_URL}")
print(f"📍 Docs: {DOCS_PATH}")
print(f"📍 Collection: {COLLECTION_NAME}")
print("=" * 60)

# Configure embedding model
print("\n1️⃣ Configurando embedding model (mxbai-embed-large)...")
Settings.embed_model = OllamaEmbedding(
    model_name="mxbai-embed-large",
    base_url=OLLAMA_URL,
    request_timeout=120.0
)
print("   ✅ Embedding model configurado")

# Connect to Qdrant
print(f"\n2️⃣ Conectando ao Qdrant ({QDRANT_HOST}:{QDRANT_PORT})...")
client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
print("   ✅ Qdrant conectado")

# Load documents
print(f"\n3️⃣ Carregando documentos de {DOCS_PATH}...")
docs_path = Path(DOCS_PATH)
if not docs_path.exists():
    print(f"   ❌ Path não encontrado: {DOCS_PATH}")
    exit(1)

documents = SimpleDirectoryReader(
    str(docs_path),
    recursive=True,
    required_exts=[".md", ".mdx"],
    exclude_hidden=True,
).load_data()

print(f"   ✅ {len(documents)} documentos carregados")

if len(documents) == 0:
    print("   ⚠️  Nenhum documento encontrado!")
    exit(1)

# Create vector store
print(f"\n4️⃣ Configurando vector store (collection: {COLLECTION_NAME})...")
vector_store = QdrantVectorStore(
    client=client,
    collection_name=COLLECTION_NAME
)
storage_context = StorageContext.from_defaults(vector_store=vector_store)
print("   ✅ Vector store configurado")

# Create index and embeddings
print("\n5️⃣ Criando embeddings e indexando (isso pode levar 5-10 minutos)...")
print("   ⏳ Processando documentos...")

try:
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True
    )
    print("   ✅ Index criado com sucesso!")
except Exception as e:
    print(f"   ❌ Erro ao criar index: {e}")
    exit(1)

# Verify
print("\n6️⃣ Verificando ingestão...")
collection_info = client.get_collection(COLLECTION_NAME)
print(f"   ✅ Vectors na collection: {collection_info.vectors_count}")

print("\n" + "=" * 60)
print("🎉 INGESTÃO COMPLETA!")
print("=" * 60)
print(f"📊 Total de documentos: {len(documents)}")
print(f"📊 Total de vectors: {collection_info.vectors_count}")
print("=" * 60)

