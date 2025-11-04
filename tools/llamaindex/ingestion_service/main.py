"""
LlamaIndex Ingestion Service
Handles document ingestion, processing, and vector storage management.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from qdrant_client import QdrantClient
from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    Settings,
    Document,
)
from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter
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


def _int_env(var_name: str, default: int) -> int:
    raw = os.getenv(var_name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except ValueError:
        logger.warning("Invalid int for %s: %s. Using default %s", var_name, raw, default)
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
CHUNK_SIZE = _int_env("LLAMAINDEX_CHUNK_SIZE", 512)
CHUNK_OVERLAP = _int_env("LLAMAINDEX_CHUNK_OVERLAP", 96)

logger.info(
    "Ingestion filters - allowed_exts=%s, excluded_dirs=%s, skip_hidden_dirs=%s, skip_hidden_files=%s, max_file_size_mb=%s, chunk_size=%s, chunk_overlap=%s",
    "ALL" if ALLOWED_EXTENSIONS is None else sorted(ALLOWED_EXTENSIONS),
    sorted(EXCLUDED_DIRECTORIES),
    SKIP_HIDDEN_DIRS,
    SKIP_HIDDEN_FILES,
    MAX_FILE_SIZE_MB,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)

# Ensure shared helpers are importable when running as a script
CURRENT_DIR = Path(__file__).resolve().parent
SHARED_DIR = CURRENT_DIR.parent / "shared"
if SHARED_DIR.exists() and str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))

try:
    from collection_config import CollectionConfigManager  # type: ignore
except Exception as config_err:  # pragma: no cover - defensive fallback
    CollectionConfigManager = None  # type: ignore
    collection_config_manager = None
    logger.warning("Collection configuration unavailable: %s", config_err)
else:
    collection_config_manager = CollectionConfigManager()

from gpu import (  # type: ignore # pylint: disable=wrong-import-position
    acquire_gpu_slot,
    build_gpu_metadata,
    get_ollama_gpu_options,
    GPU_COOLDOWN_SECONDS,
    GPU_FORCE_ENABLED,
    GPU_MAX_CONCURRENCY,
)
from qdrant_utils import ensure_payload_on_search  # type: ignore # pylint: disable=wrong-import-position

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
            prefer_grpc=False,
        )
        ensure_payload_on_search(default_vector_store)
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


def ensure_qdrant_ready(force: bool = False) -> bool:
    """
    Ensure Qdrant client and default storage context are ready.

    This is called lazily by ingestion routes and the health check so the service
    can recover automatically when Qdrant finishes booting after this process.
    """
    global qdrant_client  # pylint: disable=global-statement
    global default_vector_store  # pylint: disable=global-statement
    global default_storage_context  # pylint: disable=global-statement

    if not force and qdrant_client is not None and default_vector_store is not None:
        return True

    try:
        logger.info(
            "Attempting %sinitialize Qdrant client at %s:%s",
            "re" if force or qdrant_client is not None else "",
            QDRANT_HOST,
            QDRANT_PORT,
        )
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        client.get_collections()

        vector_store = QdrantVectorStore(
            client=client,
            collection_name=QDRANT_COLLECTION,
            prefer_grpc=False,
        )
        ensure_payload_on_search(vector_store)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error(
            "Failed to %sinitialize Qdrant client or vector store: %s",
            "re" if force or qdrant_client is not None else "",
            exc,
        )
        return False

    # Replace previous caches to avoid stale clients
    vector_store_cache.clear()
    storage_context_cache.clear()

    qdrant_client = client
    default_vector_store = vector_store
    default_storage_context = storage_context
    vector_store_cache[QDRANT_COLLECTION] = vector_store
    storage_context_cache[QDRANT_COLLECTION] = storage_context

    logger.info("Qdrant connection ready for collection: %s", QDRANT_COLLECTION)
    return True


def _normalize_collection_name(value: Optional[str]) -> str:
    name = (value or "").strip()
    return name or QDRANT_COLLECTION


def get_or_create_storage_context(collection_name: Optional[str]) -> StorageContext:
    """Return a storage context for the requested collection, creating it if necessary."""
    if not ensure_qdrant_ready():
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
            prefer_grpc=False,
        )
        ensure_payload_on_search(vector_store_local)
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


def _resolve_embedding_model_name(
    collection_name: Optional[str],
    model_hint: Optional[str],
) -> str:
    """Determine which embedding model should be used for a collection."""
    candidate = (model_hint or "").strip()
    if candidate:
        return candidate

    resolved_collection = _resolve_collection_for_config(collection_name)
    if resolved_collection and collection_config_manager is not None:
        try:
            info = collection_config_manager.get_collection(resolved_collection)
        except Exception as err:  # pragma: no cover - defensive logging
            logger.debug("Failed to load collection info for %s: %s", resolved_collection, err)
        else:
            if info and getattr(info, "embedding_model", None):
                return info.embedding_model

    return OLLAMA_EMBED_MODEL


def _format_size(size_bytes: int) -> str:
    """Return human-readable size for logging."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    kb = size_bytes / 1024
    if kb < 1024:
        return f"{kb:.1f} KiB"
    mb = kb / 1024
    if mb < 1024:
        return f"{mb:.2f} MiB"
    gb = mb / 1024
    return f"{gb:.2f} GiB"


def _resolve_collection_for_config(name: Optional[str]) -> Optional[str]:
    """Resolve collection aliases using configuration when available."""
    if not name or collection_config_manager is None:
        return name
    try:
        return collection_config_manager.resolve_collection_name(name)
    except Exception as err:  # pragma: no cover - defensive logging
        logger.debug("Failed to resolve collection alias %s: %s", name, err)
        return name


def _get_context_limit_for_model(model_name: Optional[str]) -> Optional[int]:
    """Return the configured context length for an embedding model, if known."""
    if not model_name or collection_config_manager is None:
        return None
    try:
        info = collection_config_manager.get_embedding_model(model_name)
    except Exception as err:  # pragma: no cover - defensive logging
        logger.debug("Failed to load embedding model info for %s: %s", model_name, err)
        return None
    return getattr(info, "context_length", None) if info else None


def _normalize_chunk_params(
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
    model_name: Optional[str] = None,
) -> Tuple[int, int, Optional[int]]:
    """Resolve chunk parameters combining request overrides with defaults."""
    effective_size = chunk_size if chunk_size and chunk_size > 0 else CHUNK_SIZE
    effective_overlap = (
        chunk_overlap if chunk_overlap is not None and chunk_overlap >= 0 else CHUNK_OVERLAP
    )

    context_limit = _get_context_limit_for_model(model_name)
    if context_limit:
        # Apply a conservative limit to avoid hitting the embed model context cap.
        candidates = [
            int(context_limit * 0.6),
            context_limit - 128,
            context_limit // 2,
        ]
        candidates = [value for value in candidates if value is not None and value >= 64]
        if candidates:
            max_allowed = max(64, min(candidates))
        else:
            max_allowed = max(64, context_limit - 64)
        if effective_size > max_allowed:
            logger.info(
                "Adjusting chunk size from %s to %s to respect context window %s for model %s",
                effective_size,
                max_allowed,
                context_limit,
                model_name,
            )
            effective_size = max_allowed
            # Clamp overlap proportionally when chunk size shrinks.
            if effective_overlap >= effective_size:
                effective_overlap = max(effective_size // 4, 0)

    if effective_overlap >= effective_size:
        logger.warning(
            "Chunk overlap %s is greater than or equal to chunk size %s. Adjusting overlap.",
            effective_overlap,
            effective_size,
        )
        effective_overlap = max(effective_size // 4, 0)
    return effective_size, effective_overlap, context_limit


def _build_node_parser(chunk_size: int, chunk_overlap: int) -> SentenceSplitter:
    """Build a sentence splitter configured with the provided parameters."""
    return SentenceSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )


def _chunk_documents(
    documents: List[Document],
    chunk_size: int,
    chunk_overlap: int,
) -> List[Document]:
    """Split loaded documents into smaller chunks that fit embedding context."""
    if not documents:
        return documents

    splitter = _build_node_parser(chunk_size, chunk_overlap)
    chunked: List[Document] = []

    for doc in documents:
        text: Optional[str] = getattr(doc, "text", None)
        if not text and hasattr(doc, "get_content"):
            try:
                text = doc.get_content()  # type: ignore[attr-defined]
            except Exception as err:
                logger.warning("Failed to read text content for %s: %s", getattr(doc, "id_", "unknown"), err)
                text = None

        if not text:
            chunked.append(doc)
            continue

        pieces = splitter.split_text(text)
        if len(pieces) == 1:
            chunked.append(doc)
            continue

        metadata = dict(getattr(doc, "metadata", {}) or {})
        source_hint = metadata.get("source") or metadata.get("file_path") or metadata.get("path")
        doc_id = getattr(doc, "id_", None)

        for idx, piece in enumerate(pieces):
            chunk_metadata = dict(metadata)
            chunk_metadata["chunk_index"] = idx
            chunk_metadata["chunk_total"] = len(pieces)
            if source_hint:
                chunk_metadata.setdefault("source", source_hint)

            doc_kwargs: Dict[str, object] = {
                "text": piece,
                "metadata": chunk_metadata,
            }
            excluded_embed = getattr(doc, "excluded_embed_metadata_keys", None)
            excluded_llm = getattr(doc, "excluded_llm_metadata_keys", None)
            if excluded_embed:
                doc_kwargs["excluded_embed_metadata_keys"] = excluded_embed
            if excluded_llm:
                doc_kwargs["excluded_llm_metadata_keys"] = excluded_llm
            if doc_id:
                doc_kwargs["id_"] = f"{doc_id}::chunk-{idx}"

            chunked.append(Document(**doc_kwargs))

        logger.debug(
            "Document %s split into %s chunks (source=%s)",
            doc_id or source_hint or "unknown",
            len(pieces),
            source_hint,
        )

    return chunked


def _create_embed_model(model_name: Optional[str]) -> OllamaEmbedding:
    """Create an Ollama embedding model using the resolved model name or defaults."""
    resolved = (model_name or OLLAMA_EMBED_MODEL or "").strip() or OLLAMA_EMBED_MODEL
    return OllamaEmbedding(
        model_name=resolved,
        base_url=OLLAMA_BASE_URL,
        ollama_additional_kwargs=get_ollama_gpu_options(),
        request_timeout=float(os.getenv("OLLAMA_REQUEST_TIMEOUT", "120.0")),
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
    job_id: Optional[str] = None  # Job ID for tracking (optional, generated by caller)
    documents_processed: Optional[int] = None
    documents_loaded: Optional[int] = None
    chunks_generated: Optional[int] = None
    files_considered: Optional[int] = None
    files_ingested: Optional[int] = None
    files_skipped: Optional[int] = None
    skipped_by_extension: Optional[int] = None
    skipped_by_size: Optional[int] = None
    skipped_files_size: Optional[List[str]] = None
    skipped_hidden: Optional[int] = None
    collection: Optional[str] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    largest_files: Optional[List[str]] = None
    errors: Optional[List[str]] = None
    gpu: Optional[dict] = None

class DirectoryIngestRequest(BaseModel):
    directory_path: str
    collection_name: Optional[str] = None
    allowed_extensions: Optional[List[str]] = None
    exclude_dirs: Optional[List[str]] = None
    max_file_size_mb: Optional[float] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None

class DocumentIngestRequest(BaseModel):
    file_path: str
    collection_name: Optional[str] = None
    max_file_size_mb: Optional[float] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None

@app.post("/ingest/directory", response_model=ProcessingResult)
async def ingest_directory(request: DirectoryIngestRequest):
    """
    Ingest all documents from a specified directory.
    """
    collection_name = _normalize_collection_name(request.collection_name)

    if not ensure_qdrant_ready():
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
        skipped_size_files: List[str] = []
        largest_files: List[Tuple[int, str]] = []

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
                    size_bytes = os.path.getsize(file_path)
                    largest_files.append((size_bytes, file_path))
                    largest_files.sort(reverse=True)
                    if len(largest_files) > 25:
                        largest_files = largest_files[:25]

                    if effective_max_size_bytes and size_bytes > effective_max_size_bytes:
                        skipped_size += 1
                        size_label = _format_size(size_bytes)
                        skipped_size_files.append(f"{file_path} ({size_label})")
                        logger.debug(
                            "Skipping %s due to size limit (%s > %s MB)",
                            file_path,
                            size_label,
                            request.max_file_size_mb or MAX_FILE_SIZE_MB,
                        )
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

        raw_documents = SimpleDirectoryReader(input_files=files_to_ingest).load_data()
        if not raw_documents:
            raise HTTPException(
                status_code=400,
                detail=f"No supported documents found in {request.directory_path}",
            )

        resolved_model_name = _resolve_embedding_model_name(collection_name, request.embedding_model)
        effective_chunk_size, effective_chunk_overlap, context_limit = _normalize_chunk_params(
            request.chunk_size,
            request.chunk_overlap,
            resolved_model_name,
        )

        documents = _chunk_documents(
            raw_documents,
            effective_chunk_size,
            effective_chunk_overlap,
        )
        documents_loaded = len(raw_documents)
        chunks_generated = len(documents)

        if skipped_size_files:
            logger.info("Skipped %s oversized files: %s", len(skipped_size_files), skipped_size_files)

        if largest_files:
            top_display = [f"{path} ({_format_size(size)})" for size, path in largest_files[:10]]
            logger.info("Largest files considered (top 10): %s", top_display)

        logger.info(
            "Ingestion configuration: collection=%s model=%s context_limit=%s chunk_size=%s overlap=%s",
            collection_name,
            resolved_model_name,
            context_limit if context_limit is not None else "unknown",
            effective_chunk_size,
            effective_chunk_overlap,
        )

        embedding_model = _create_embed_model(resolved_model_name)
        previous_embed_model = Settings.embed_model
        previous_node_parser = getattr(Settings, "node_parser", None)

        async with acquire_gpu_slot("ingest_directory") as gpu_usage:
            try:
                Settings.embed_model = embedding_model
                try:
                    if hasattr(Settings, "node_parser"):
                        Settings.node_parser = _build_node_parser(
                            effective_chunk_size,
                            effective_chunk_overlap,
                        )
                except Exception as parser_err:
                    logger.debug("Unable to set custom node parser: %s", parser_err)
                VectorStoreIndex.from_documents(
                    documents,
                    storage_context=storage_context,
                )
            finally:
                Settings.embed_model = previous_embed_model
                if hasattr(Settings, "node_parser"):
                    Settings.node_parser = previous_node_parser

        gpu_meta = build_gpu_metadata(
            gpu_usage["wait_time_seconds"],
            operation=gpu_usage.get("operation"),
            lock_owner=gpu_usage.get("lock_owner"),
        )

        files_ingested = len(files_to_ingest)
        files_skipped = max(files_considered - files_ingested, 0)

        logger.info(
            "Ingestion completed: collection=%s, directory=%s, raw_documents=%s, chunks=%s, files_considered=%s, skipped_ext=%s, skipped_size=%s, skipped_hidden=%s",
            collection_name,
            request.directory_path,
            documents_loaded,
            chunks_generated,
            files_considered,
            skipped_extension,
            skipped_size,
            skipped_hidden,
        )

        return ProcessingResult(
            success=True,
            message=(
                f"Successfully processed {chunks_generated} chunks from {documents_loaded} documents "
                f"in {request.directory_path} into collection '{collection_name}'"
            ),
            documents_processed=chunks_generated,
            documents_loaded=documents_loaded,
            chunks_generated=chunks_generated,
            files_considered=files_considered,
            files_ingested=files_ingested,
            files_skipped=files_skipped,
            skipped_by_extension=skipped_extension,
            skipped_by_size=skipped_size,
            skipped_files_size=skipped_size_files or None,
            skipped_hidden=skipped_hidden,
            collection=collection_name,
            embedding_model=embedding_model.model_name,
            chunk_size=effective_chunk_size,
            chunk_overlap=effective_chunk_overlap,
            largest_files=[f"{path} ({_format_size(size)})" for size, path in largest_files[:10]] or None,
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

    if not ensure_qdrant_ready():
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

        raw_documents = SimpleDirectoryReader(input_files=[request.file_path]).load_data()
        if not raw_documents:
            raise HTTPException(status_code=400, detail="No content found in document")

        resolved_model_name = _resolve_embedding_model_name(collection_name, request.embedding_model)
        effective_chunk_size, effective_chunk_overlap, context_limit = _normalize_chunk_params(
            request.chunk_size,
            request.chunk_overlap,
            resolved_model_name,
        )

        documents = _chunk_documents(
            raw_documents,
            effective_chunk_size,
            effective_chunk_overlap,
        )
        documents_loaded = len(raw_documents)
        chunks_generated = len(documents)

        logger.info(
            "Document ingestion configuration: collection=%s model=%s context_limit=%s chunk_size=%s overlap=%s",
            collection_name,
            resolved_model_name,
            context_limit if context_limit is not None else "unknown",
            effective_chunk_size,
            effective_chunk_overlap,
        )

        embedding_model = _create_embed_model(resolved_model_name)
        previous_embed_model = Settings.embed_model
        previous_node_parser = getattr(Settings, "node_parser", None)

        async with acquire_gpu_slot("ingest_document") as gpu_usage:
            try:
                Settings.embed_model = embedding_model
                try:
                    if hasattr(Settings, "node_parser"):
                        Settings.node_parser = _build_node_parser(
                            effective_chunk_size,
                            effective_chunk_overlap,
                        )
                except Exception as parser_err:
                    logger.debug("Unable to set custom node parser: %s", parser_err)
                VectorStoreIndex.from_documents(
                    documents,
                    storage_context=storage_context,
                )
            finally:
                Settings.embed_model = previous_embed_model
                if hasattr(Settings, "node_parser"):
                    Settings.node_parser = previous_node_parser

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
                f"Successfully processed {chunks_generated} chunks from document "
                f"{request.file_path} into collection '{collection_name}'"
            ),
            documents_processed=chunks_generated,
            documents_loaded=documents_loaded,
            chunks_generated=chunks_generated,
            files_considered=1,
            files_ingested=1,
            files_skipped=0,
            collection=collection_name,
            embedding_model=embedding_model.model_name,
            chunk_size=effective_chunk_size,
            chunk_overlap=effective_chunk_overlap,
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
    if not ensure_qdrant_ready():
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
        if not ensure_qdrant_ready():
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
