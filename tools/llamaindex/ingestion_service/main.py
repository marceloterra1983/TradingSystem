"""
LlamaIndex Ingestion Service
Handles document ingestion, processing, and vector storage management.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set

from fastapi import FastAPI, HTTPException, Response
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
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _split_env_list(raw: str) -> List[str]:
    """Split an environment variable into a cleaned list."""
    return [item.strip() for item in raw.split(",") if item and item.strip()]


def _parse_extensions_env(env_value: Optional[str], default: Set[str]) -> Optional[Set[str]]:
    """Parse allowed extensions list from environment. Returns None to allow all."""
    if not env_value:
        return set(default)

    tokens = _split_env_list(env_value)
    if not tokens:
        return set(default)

    normalized: Set[str] = set()
    for token in tokens:
        lowered = token.lower()
        if lowered in {"*", "all"}:
            return None
        if not lowered.startswith('.'):
            lowered = f".{lowered}"
        normalized.add(lowered)

    return normalized if normalized else set(default)


def _parse_dir_env(base_defaults: Set[str], override_var: str, extra_var: str) -> Set[str]:
    """Parse excluded directories configuration."""
    base: Set[str] = {item.lower() for item in base_defaults}

    override_value = os.getenv(override_var)
    if override_value:
        base = {item.lower().lstrip('/') for item in _split_env_list(override_value)}

    extra_value = os.getenv(extra_var)
    if extra_value:
        base.update({item.lower().lstrip('/') for item in _split_env_list(extra_value)})

    return base


def _bool_env(var_name: str, default: bool) -> bool:
    raw = os.getenv(var_name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _float_env(var_name: str, default: Optional[float]) -> Optional[float]:
    raw = os.getenv(var_name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
        return value if value > 0 else None
    except ValueError:
        logger.warning("Invalid float for %s: %s. Using default %s", var_name, raw, default)
        return default


def _normalize_allowed_extensions(values: Optional[List[str]], fallback: Optional[Set[str]]) -> Optional[Set[str]]:
    """Normalize per-request list of extensions."""
    if values is None:
        return fallback if fallback is None else set(fallback)

    normalized: Set[str] = set()
    for token in values:
        candidate = (token or "").strip()
        if not candidate:
            continue
        lowered = candidate.lower()
        if lowered in {"*", "all"}:
            return None
        if not lowered.startswith('.'):
            lowered = f".{lowered}"
        normalized.add(lowered)

    if normalized:
        return normalized
    return fallback if fallback is None else set(fallback)


def _normalize_excluded_dirs(values: Optional[List[str]], base: Set[str]) -> Set[str]:
    """Merge per-request excluded directories with base defaults."""
    merged: Set[str] = set(base)
    if not values:
        return merged

    for token in values:
        candidate = (token or "").strip()
        if not candidate:
            continue
        merged.add(candidate.lower().lstrip('/'))

    return merged


DEFAULT_ALLOWED_EXTENSIONS: Set[str] = {".md", ".mdx", ".txt", ".pdf"}
DEFAULT_EXCLUDED_DIRECTORIES: Set[str] = {
    ".git",
    ".github",
    ".gitlab",
    ".idea",
    ".vscode",
    ".turbo",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "logs",
    "tmp",
    "temp",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".cache",
    ".next",
    ".nuxt",
    ".output",
    "out",
    "venv",
    ".venv",
    "env",
    ".env",
    "target",
}

ALLOWED_EXTENSIONS = _parse_extensions_env(
    os.getenv("LLAMAINDEX_ALLOWED_EXTENSIONS"),
    DEFAULT_ALLOWED_EXTENSIONS,
)
EXCLUDED_DIRECTORIES = _parse_dir_env(
    DEFAULT_EXCLUDED_DIRECTORIES,
    "LLAMAINDEX_EXCLUDE_DIRS",
    "LLAMAINDEX_EXCLUDE_DIRS_EXTRA",
)
SKIP_HIDDEN_DIRS = _bool_env("LLAMAINDEX_SKIP_HIDDEN_DIRS", True)
SKIP_HIDDEN_FILES = _bool_env("LLAMAINDEX_SKIP_HIDDEN_FILES", True)
MAX_FILE_SIZE_MB = _float_env("LLAMAINDEX_MAX_FILE_SIZE_MB", 8.0)
MAX_FILE_SIZE_BYTES = int(MAX_FILE_SIZE_MB * 1024 * 1024) if MAX_FILE_SIZE_MB else None

logger.info(
    "Ingestion filters - allowed_exts=%s, excluded_dirs=%s, skip_hidden_dirs=%s, skip_hidden_files=%s, max_file_size_mb=%s",
    "ALL" if ALLOWED_EXTENSIONS is None else sorted(ALLOWED_EXTENSIONS),
    sorted(EXCLUDED_DIRECTORIES),
    SKIP_HIDDEN_DIRS,
    SKIP_HIDDEN_FILES,
    MAX_FILE_SIZE_MB,
)

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

# Initialize Qdrant client with error handling
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
try:
    qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    # Try a simple operation to verify connectivity
    qdrant_client.get_collections()
    logger.info("Qdrant client initialized successfully at %s:%s", QDRANT_HOST, QDRANT_PORT)
except Exception as e:
    logger.error(
        "Failed to initialize Qdrant clients. Qdrant may be unavailable at %s:%s. Error: %s",
        QDRANT_HOST,
        QDRANT_PORT,
        str(e),
    )
    logger.warning("Service will start but ingestion operations will fail until Qdrant is available.")
    qdrant_client = None

# Initialize vector store with error handling
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "documentation").strip() or "documentation"

vector_store_cache: Dict[str, QdrantVectorStore] = {}
storage_context_cache: Dict[str, StorageContext] = {}
default_vector_store: Optional[QdrantVectorStore] = None
default_storage_context: Optional[StorageContext] = None

if qdrant_client is not None:
    try:
        default_vector_store = QdrantVectorStore(
            client=qdrant_client,
            collection_name=QDRANT_COLLECTION,
        )
        default_storage_context = StorageContext.from_defaults(vector_store=default_vector_store)
        vector_store_cache[QDRANT_COLLECTION] = default_vector_store
        storage_context_cache[QDRANT_COLLECTION] = default_storage_context
        logger.info(
            "Vector store and storage context initialized for collection: %s",
            QDRANT_COLLECTION,
        )
    except Exception as e:
        logger.error(
            "Failed to initialize vector store. Qdrant may be unavailable. Error: %s",
            str(e),
        )
        logger.warning(
            "Service will start but ingestion operations will fail until Qdrant is available. "
            "Check QDRANT_HOST=%s, QDRANT_PORT=%s",
            QDRANT_HOST,
            QDRANT_PORT,
        )
        default_vector_store = None
        default_storage_context = None
else:
    logger.warning("Qdrant client not initialized. Vector store will not be available.")
    default_vector_store = None
    default_storage_context = None


def _normalize_collection_name(value: Optional[str]) -> str:
    name = (value or "").strip()
    return name or QDRANT_COLLECTION


def get_or_create_storage_context(collection_name: Optional[str]) -> StorageContext:
    """Return a storage context for the requested collection, creating it if necessary."""
    if qdrant_client is None:
        raise HTTPException(
            status_code=503,
            detail="Qdrant vector store is not available. Service is still initializing or Qdrant is unreachable.",
        )

    name = _normalize_collection_name(collection_name)
    cached = storage_context_cache.get(name)
    if cached is not None:
        return cached

    try:
        vector_store_local = QdrantVectorStore(
            client=qdrant_client,
            collection_name=name,
        )
        storage_context_local = StorageContext.from_defaults(vector_store=vector_store_local)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to initialize vector store for collection %s: %s", name, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Failed to initialize vector store for collection '{name}': {exc}",
        ) from exc

    vector_store_cache[name] = vector_store_local
    storage_context_cache[name] = storage_context_local
    logger.info("Vector store initialized for collection: %s", name)
    return storage_context_local

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
    files_considered: Optional[int] = None
    files_ingested: Optional[int] = None
    files_skipped: Optional[int] = None
    skipped_by_extension: Optional[int] = None
    skipped_by_size: Optional[int] = None
    skipped_hidden: Optional[int] = None
    collection: Optional[str] = None
    errors: Optional[List[str]] = None
    gpu: Optional[dict] = None

class DirectoryIngestRequest(BaseModel):
    directory_path: str
    collection_name: Optional[str] = None
    allowed_extensions: Optional[List[str]] = None
    exclude_dirs: Optional[List[str]] = None
    max_file_size_mb: Optional[float] = None

class DocumentIngestRequest(BaseModel):
    file_path: str
    collection_name: Optional[str] = None
    max_file_size_mb: Optional[float] = None

@app.post("/ingest/directory", response_model=ProcessingResult)
async def ingest_directory(request: DirectoryIngestRequest):
    """
    Ingest all documents from a specified directory.
    """
    collection_name = _normalize_collection_name(request.collection_name)

    if qdrant_client is None:
        raise HTTPException(
            status_code=503,
            detail="Qdrant vector store is not available. Service is still initializing or Qdrant is unreachable.",
        )

    if not os.path.isdir(request.directory_path):
        raise HTTPException(status_code=400, detail=f"Directory not found: {request.directory_path}")

    try:
        storage_context = get_or_create_storage_context(collection_name)

        effective_allowed_exts = _normalize_allowed_extensions(request.allowed_extensions, ALLOWED_EXTENSIONS)
        effective_excluded_dirs = _normalize_excluded_dirs(request.exclude_dirs, EXCLUDED_DIRECTORIES)
        if request.max_file_size_mb is not None:
            effective_max_size_bytes = int(request.max_file_size_mb * 1024 * 1024) if request.max_file_size_mb > 0 else None
        else:
            effective_max_size_bytes = MAX_FILE_SIZE_BYTES

        excluded_names = {
            "_category_.json",
            "_category_.yml",
            "_category_.yaml",
            "category.json",
            "category.yml",
            "category.yaml",
        }

        files_to_ingest: List[str] = []
        files_considered = 0
        skipped_extension = 0
        skipped_size = 0
        skipped_hidden = 0

        for root, dirs, files in os.walk(request.directory_path):
            # Remove excluded/hidden directories in-place to avoid traversal
            filtered_dirs = []
            for directory in dirs:
                directory_lower = directory.lower()
                if SKIP_HIDDEN_DIRS and directory.startswith('.'):
                    continue
                if directory_lower in effective_excluded_dirs:
                    continue
                filtered_dirs.append(directory)
            dirs[:] = filtered_dirs

            for name in files:
                files_considered += 1
                if name in excluded_names:
                    skipped_hidden += 1
                    continue
                if SKIP_HIDDEN_FILES and name.startswith('.'):
                    skipped_hidden += 1
                    continue

                ext = os.path.splitext(name)[1].lower()
                if effective_allowed_exts is not None and ext not in effective_allowed_exts:
                    skipped_extension += 1
                    continue

                file_path = os.path.join(root, name)
                try:
                    if effective_max_size_bytes and os.path.getsize(file_path) > effective_max_size_bytes:
                        skipped_size += 1
                        continue
                except OSError as size_err:
                    logger.warning("Failed to stat %s: %s", file_path, size_err)
                    skipped_hidden += 1
                    continue

                files_to_ingest.append(file_path)

        if not files_to_ingest:
            raise HTTPException(
                status_code=400,
                detail=f"No supported documents found in {request.directory_path}",
            )

        documents = SimpleDirectoryReader(input_files=files_to_ingest).load_data()
        if not documents:
            raise HTTPException(
                status_code=400,
                detail=f"No supported documents found in {request.directory_path}",
            )

        async with acquire_gpu_slot("ingest_directory") as gpu_usage:
            VectorStoreIndex.from_documents(
                documents,
                storage_context=storage_context,
            )

        gpu_meta = build_gpu_metadata(
            gpu_usage["wait_time_seconds"],
            operation=gpu_usage.get("operation"),
            lock_owner=gpu_usage.get("lock_owner"),
        )

        files_ingested = len(files_to_ingest)
        files_skipped = max(files_considered - files_ingested, 0)

        logger.info(
            "Ingestion completed: collection=%s, directory=%s, documents=%s, files_considered=%s, skipped_ext=%s, skipped_size=%s, skipped_hidden=%s",
            collection_name,
            request.directory_path,
            len(documents),
            files_considered,
            skipped_extension,
            skipped_size,
            skipped_hidden,
        )

        return ProcessingResult(
            success=True,
            message=(
                f"Successfully processed {len(documents)} documents from {request.directory_path} "
                f"into collection '{collection_name}'"
            ),
            documents_processed=len(documents),
            files_considered=files_considered,
            files_ingested=files_ingested,
            files_skipped=files_skipped,
            skipped_by_extension=skipped_extension,
            skipped_by_size=skipped_size,
            skipped_hidden=skipped_hidden,
            collection=collection_name,
            gpu=gpu_meta,
        )

    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - diagnostics for unexpected failures
        logger.error("Error processing directory %s: %s", request.directory_path, e)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing directory: {str(e)}",
        )

@app.post("/ingest/document", response_model=ProcessingResult)
async def ingest_document(request: DocumentIngestRequest):
    """
    Ingest a single document.
    """
    collection_name = _normalize_collection_name(request.collection_name)

    if qdrant_client is None:
        raise HTTPException(
            status_code=503,
            detail="Qdrant vector store is not available. Service is still initializing or Qdrant is unreachable.",
        )

    if not os.path.isfile(request.file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {request.file_path}")

    try:
        storage_context = get_or_create_storage_context(collection_name)

        ext = os.path.splitext(request.file_path)[1].lower()
        if ALLOWED_EXTENSIONS is not None and ext not in ALLOWED_EXTENSIONS:
            allowed_str = ", ".join(sorted(ALLOWED_EXTENSIONS)) if ALLOWED_EXTENSIONS else "(none)"
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported file extension '{ext}'. Allowed extensions: {allowed_str} "
                    "(configure LLAMAINDEX_ALLOWED_EXTENSIONS to adjust)."
                ),
            )

        if request.max_file_size_mb is not None:
            effective_max_size_mb = request.max_file_size_mb if request.max_file_size_mb > 0 else None
        else:
            effective_max_size_mb = MAX_FILE_SIZE_MB

        effective_max_size_bytes = (
            int(effective_max_size_mb * 1024 * 1024)
            if effective_max_size_mb and effective_max_size_mb > 0
            else None
        )

        if effective_max_size_bytes and os.path.getsize(request.file_path) > effective_max_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File '{request.file_path}' exceeds max size of {effective_max_size_mb} MB. "
                    "Adjust LLAMAINDEX_MAX_FILE_SIZE_MB or provide max_file_size_mb in the request."
                ),
            )

        documents = SimpleDirectoryReader(input_files=[request.file_path]).load_data()
        if not documents:
            raise HTTPException(status_code=400, detail="No content found in document")

        async with acquire_gpu_slot("ingest_document") as gpu_usage:
            VectorStoreIndex.from_documents(
                documents,
                storage_context=storage_context,
            )

        gpu_meta = build_gpu_metadata(
            gpu_usage["wait_time_seconds"],
            operation=gpu_usage.get("operation"),
            lock_owner=gpu_usage.get("lock_owner"),
        )

        logger.info(
            "Document ingested: collection=%s, file=%s", collection_name, request.file_path
        )

        return ProcessingResult(
            success=True,
            message=(
                f"Successfully processed document {request.file_path} "
                f"into collection '{collection_name}'"
            ),
            documents_processed=1,
            files_considered=1,
            files_ingested=1,
            files_skipped=0,
            collection=collection_name,
            gpu=gpu_meta,
        )

    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - diagnostics for unexpected failures
        logger.error("Error processing file %s: %s", request.file_path, e)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}",
        )

@app.delete("/documents/{collection_name}")
async def delete_collection(collection_name: str):
    """
    Delete a collection and all its documents.
    """
    if qdrant_client is None:
        raise HTTPException(
            status_code=503,
            detail="Qdrant client is not available. Service is still initializing or Qdrant is unreachable."
        )
    normalized = _normalize_collection_name(collection_name)
    try:
        qdrant_client.delete_collection(normalized)

        vector_store_cache.pop(normalized, None)
        storage_context_cache.pop(normalized, None)

        # Reset defaults if the primary collection was removed.
        global default_vector_store, default_storage_context  # pylint: disable=global-statement
        if normalized == QDRANT_COLLECTION:
            default_vector_store = None
            default_storage_context = None

        return ProcessingResult(
            success=True,
            message=f"Successfully deleted collection {normalized}",
            collection=normalized,
        )
    except Exception as e:
        logger.error("Error deleting collection %s: %s", normalized, e)
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
        if qdrant_client is None or default_vector_store is None:
            return {
                "status": "degraded",
                "message": "Qdrant client or default vector store not initialized",
                "collection": QDRANT_COLLECTION,
            }
        # Check Qdrant connection
        qdrant_client.get_collections()
        return {
            "status": "healthy",
            "collection": QDRANT_COLLECTION,
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "degraded",
            "error": str(e),
            "collection": QDRANT_COLLECTION,
        }

@app.get("/metrics")
async def metrics_endpoint():
    """Expose Prometheus metrics for scraping."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
