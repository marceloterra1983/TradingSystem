"""Utilities for working with Qdrant from the LlamaIndex microservices."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, List, Optional, Sequence, cast

from llama_index.core.schema import TextNode
from llama_index.vector_stores.qdrant.base import (
    legacy_metadata_dict_to_node,
    metadata_dict_to_node,
)
try:
    from llama_index.vector_stores.types import VectorStoreQueryResult
except ImportError:  # pragma: no cover - compatibility with newer llama_index
    try:
        from llama_index.core.vector_stores.types import VectorStoreQueryResult  # type: ignore
    except ImportError:
        @dataclass
        class VectorStoreQueryResult:  # type: ignore
            nodes: List[Any]
            similarities: List[float]
            ids: List[str]

try:  # Qdrant typing helpers (only for IDEs)
    from qdrant_client.http.models import ScoredPoint  # type: ignore
except Exception:  # pragma: no cover - we only need duck typing at runtime
    ScoredPoint = Any  # type: ignore


def _wrap_sync_search(client: Any) -> None:
    """Ensure synchronous Qdrant searches always request payload data."""
    if client is None or getattr(client, "_payload_wrapped", False):
        return

    original_search: Callable[..., Any] = client.search

    def search_with_payload(*args: Any, **kwargs: Any) -> Any:
        kwargs.setdefault("with_payload", True)
        return original_search(*args, **kwargs)

    client.search = search_with_payload  # type: ignore[attr-defined]
    setattr(client, "_payload_wrapped", True)


def _wrap_async_search(aclient: Any) -> None:
    """Ensure async Qdrant searches always request payload data."""
    if aclient is None or getattr(aclient, "_payload_wrapped", False):
        return

    original_async_search: Callable[..., Awaitable[Any]] = aclient.search

    async def search_with_payload_async(*args: Any, **kwargs: Any) -> Any:
        kwargs.setdefault("with_payload", True)
        return await original_async_search(*args, **kwargs)

    aclient.search = search_with_payload_async  # type: ignore[attr-defined]
    setattr(aclient, "_payload_wrapped", True)


def _wrap_parse_to_query_result(vector_store: Any) -> None:
    """
    Wrap `parse_to_query_result` so points without text payload degrade gracefully.

    Older collections (e.g. `repository`) only stored file metadata. When those
    vectors surface in new queries, the upstream implementation tries to build a
    `TextNode(text=None)` which crashes Pydantic validation. We rebuild those
    points with a best-effort placeholder so the request succeeds rather than
    crashing the entire endpoint.
    """
    if getattr(vector_store, "_parse_wrapped", False):
        return

    try:
        original_parse = vector_store.parse_to_query_result  # type: ignore[attr-defined]
    except AttributeError:
        return
    except Exception as err:  # pragma: no cover - defensive guard
        logging.getLogger(__name__).debug(
            "Skipping parse_to_query_result wrapper: %s", err
        )
        # Newer adapters build query results internally; nothing to wrap.
        return

    def patched_parse(response: Sequence[ScoredPoint]) -> VectorStoreQueryResult:
        safe_response: List[ScoredPoint] = []
        for point in response:
            payload = getattr(point, "payload", {}) or {}
            # Fast path: payload already contains the serialized node
            if "_node_content" in payload:
                safe_response.append(point)
                continue

            # Build a minimal stand-in node when payload lacks content.
            placeholder_payload = dict(payload)
            text_value: Optional[str] = None

            # Try to recover text from known metadata keys before giving up.
            for candidate_key in ("text", "content", "chunk", "raw"):
                candidate = placeholder_payload.get(candidate_key)
                if isinstance(candidate, str) and candidate.strip():
                    text_value = candidate
                    break
                if candidate is not None:
                    text_value = str(candidate)
                    break

            if text_value is None:
                text_value = placeholder_payload.get("path") or ""

            placeholder_node = TextNode(
                id_=str(getattr(point, "id", "")),
                text=str(text_value),
                metadata=placeholder_payload,
            )

            placeholder_payload = dict(placeholder_payload)
            placeholder_payload["_node_content"] = placeholder_node.to_json()
            placeholder_payload["_node_type"] = TextNode.class_name()

            # Mutate the point payload so downstream parsing succeeds.
            try:
                point.payload = placeholder_payload  # type: ignore[attr-defined]
            except Exception:  # pragma: no cover - best effort, non-critical
                pass

            safe_response.append(point)

        try:
            return original_parse(safe_response)
        except Exception:
            # As a last resort, manually convert each payload to a TextNode.
            nodes = []
            similarities: List[float] = []
            ids: List[str] = []

            for point in safe_response:
                payload = getattr(point, "payload", {}) or {}
                vector = getattr(point, "vector", None)
                embedding = None
                if isinstance(vector, dict):
                    embedding = vector.get("", None)
                elif isinstance(vector, list):
                    embedding = vector

                try:
                    node = metadata_dict_to_node(payload)
                    if embedding is not None and getattr(node, "embedding", None) is None:
                        node.embedding = embedding
                except Exception:
                    metadata, node_info, relationships = legacy_metadata_dict_to_node(payload)
                    raw_text = payload.get(getattr(vector_store, "text_key", "text"))
                    text_value = raw_text if isinstance(raw_text, str) else ""
                    node = TextNode(
                        id_=str(getattr(point, "id", "")),
                        text=text_value,
                        metadata=metadata,
                        start_char_idx=node_info.get("start"),
                        end_char_idx=node_info.get("end"),
                        relationships=relationships,
                        embedding=embedding,
                    )
                nodes.append(node)
                ids.append(str(getattr(point, "id", "")))
                score = getattr(point, "score", 1.0)
                similarities.append(cast(float, score if score is not None else 1.0))

            return VectorStoreQueryResult(nodes=nodes, similarities=similarities, ids=ids)

    vector_store.parse_to_query_result = patched_parse  # type: ignore[attr-defined]
    setattr(vector_store, "_parse_wrapped", True)


def ensure_payload_on_search(vector_store: Any) -> None:
    """
    Harden a Qdrant-backed vector store for runtime queries.

    - Forces both sync/async searches to include payload data.
    - Adds a resilient parser so legacy vectors without `_node_content` do not
      crash query execution.
    """
    if vector_store is None:
        return

    logger = logging.getLogger(__name__)
    try:
        _wrap_sync_search(getattr(vector_store, "_client", None))
        _wrap_async_search(getattr(vector_store, "_aclient", None))
        _wrap_parse_to_query_result(vector_store)
    except Exception as err:  # pragma: no cover - defensive guard
        logger.debug("Skipping Qdrant payload hardening: %s", err)
