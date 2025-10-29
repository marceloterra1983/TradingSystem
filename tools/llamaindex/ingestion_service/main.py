"""
LlamaIndex Ingestion Service
Handles document ingestion, processing, and vector storage management.
"""

import logging
import os
import sys
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    Settings,
)
from llama_index.core import SimpleDirectoryReader
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.ollama import OllamaEmbedding

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Ensure shared helpers are importable when running as a script
CURRENT_DIR = Path(__file__).resolve().parent
SHARED_DIR = CURRENT_DIR.parent / "shared"
if SHARED_DIR.exists() and str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))

from gpu import (  # type: ignore # pylint: disable=wrong-import-position
    acquire_gpu_slot,
    build_gpu_metadata,
    get_ollama_gpu_options,
    GPU_COOLDOWN_SECONDS,
    GPU_FORCE_ENABLED,
    GPU_MAX_CONCURRENCY,
)

# Ensure NLTK resources available (stopwords, punkt)
try:
    import nltk  # type: ignore
    nltk_data_dir = os.getenv("NLTK_DATA", "/usr/local/nltk_data")
    if nltk_data_dir not in nltk.data.path:
        nltk.data.path.append(nltk_data_dir)
    for pkg, res in [("stopwords", "corpora/stopwords"), ("punkt", "tokenizers/punkt")]:
        try:
            nltk.data.find(res)
        except LookupError:
            try:
                nltk.download(pkg, download_dir=nltk_data_dir, quiet=True)
            except Exception as de:
                logger.warning(f"NLTK download failed for {pkg}: {de}")
except Exception as e:
    logger.warning(f"NLTK setup error: {e}")

app = FastAPI(title="LlamaIndex Ingestion Service")

# Initialize Qdrant client
qdrant_client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333))
)

# Initialize vector store
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "documentation")
vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name=QDRANT_COLLECTION,
)

# Create storage context
storage_context = StorageContext.from_defaults(vector_store=vector_store)

# Configure embeddings with Ollama (local)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
# Support both OLLAMA_EMBED_MODEL (service-local) and OLLAMA_EMBEDDING_MODEL (repo-wide)
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL") or os.getenv("OLLAMA_EMBEDDING_MODEL") or "nomic-embed-text"
# Set default embed model for index operations
Settings.embed_model = OllamaEmbedding(
    model_name=OLLAMA_EMBED_MODEL,
    base_url=OLLAMA_BASE_URL,
    ollama_additional_kwargs=get_ollama_gpu_options(),
)

logger.info(
    "GPU policy: forced=%s, options=%s, max_concurrency=%s, cooldown=%s",
    GPU_FORCE_ENABLED,
    get_ollama_gpu_options(),
    GPU_MAX_CONCURRENCY,
    GPU_COOLDOWN_SECONDS,
)

class ProcessingResult(BaseModel):
    """Response model for document processing results."""
    success: bool
    message: str
    documents_processed: Optional[int] = None
    errors: Optional[List[str]] = None
    gpu: Optional[dict] = None

class DirectoryIngestRequest(BaseModel):
    directory_path: str

class DocumentIngestRequest(BaseModel):
    file_path: str

@app.post("/ingest/directory", response_model=ProcessingResult)
async def ingest_directory(request: DirectoryIngestRequest):
    """
    Ingest all documents from a specified directory.
    """
    # Validate directory path
    if not os.path.isdir(request.directory_path):
        raise HTTPException(status_code=400, detail=f"Directory not found: {request.directory_path}")
    try:
        # Load documents recursively from directory
        allowed_exts = {".md", ".mdx", ".txt", ".pdf"}
        excluded_names = {
            "_category_.json",
            "_category_.yml",
            "_category_.yaml",
            "category.json",
            "category.yml",
            "category.yaml",
        }
        files_to_ingest = []
        for root, _, files in os.walk(request.directory_path):
            for name in files:
                if name in excluded_names:
                    continue
                ext = os.path.splitext(name)[1].lower()
                if allowed_exts and ext not in allowed_exts:
                    continue
                files_to_ingest.append(os.path.join(root, name))

        if not files_to_ingest:
            raise HTTPException(
                status_code=400,
                detail=f"No supported documents found in {request.directory_path}"
            )

        documents = SimpleDirectoryReader(input_files=files_to_ingest).load_data()
        if not documents:
            raise HTTPException(status_code=400, detail=f"No supported documents found in {request.directory_path}")
        
        async with acquire_gpu_slot("ingest_directory") as gpu_usage:
            VectorStoreIndex.from_documents(
                documents,
                storage_context=storage_context
            )
        gpu_meta = build_gpu_metadata(
            gpu_usage["wait_time_seconds"],
            operation=gpu_usage.get("operation"),
            lock_owner=gpu_usage.get("lock_owner"),
        )

        return ProcessingResult(
            success=True,
            message=f"Successfully processed {len(documents)} documents from {request.directory_path}",
            documents_processed=len(documents),
            gpu=gpu_meta
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing directory {request.directory_path}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing directory: {str(e)}"
        )

@app.post("/ingest/document", response_model=ProcessingResult)
async def ingest_document(request: DocumentIngestRequest):
    """
    Ingest a single document.
    """
    # Validate file path
    if not os.path.isfile(request.file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {request.file_path}")
    try:
        allowed_exts = {".md", ".mdx", ".txt", ".pdf"}
        ext = os.path.splitext(request.file_path)[1].lower()
        if allowed_exts and ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(sorted(allowed_exts))}"
            )
        # Load single document
        documents = SimpleDirectoryReader(input_files=[request.file_path]).load_data()
        
        async with acquire_gpu_slot("ingest_document") as gpu_usage:
            VectorStoreIndex.from_documents(
                documents,
                storage_context=storage_context
            )
        gpu_meta = build_gpu_metadata(
            gpu_usage["wait_time_seconds"],
            operation=gpu_usage.get("operation"),
            lock_owner=gpu_usage.get("lock_owner"),
        )

        return ProcessingResult(
            success=True,
            message=f"Successfully processed document {request.file_path}",
            documents_processed=1,
            gpu=gpu_meta
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file {request.file_path}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@app.delete("/documents/{collection_name}")
async def delete_collection(collection_name: str):
    """
    Delete a collection and all its documents.
    """
    try:
        qdrant_client.delete_collection(collection_name)
        return ProcessingResult(
            success=True,
            message=f"Successfully deleted collection {collection_name}"
        )
    except Exception as e:
        logger.error(f"Error deleting collection {collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting collection: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    try:
        # Check Qdrant connection
        qdrant_client.get_collections()
        return {"status": "healthy"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Service unhealthy"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
