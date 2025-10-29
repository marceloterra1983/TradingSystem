"""Shared helpers for LlamaIndex services."""

from .gpu import (
    acquire_gpu_slot,
    build_gpu_metadata,
    describe_gpu_policy,
    get_ollama_gpu_options,
    GPU_FORCE_ENABLED,
    GPU_MAX_CONCURRENCY,
    GPU_COOLDOWN_SECONDS,
    GPU_WAIT_LOG_THRESHOLD,
)

__all__ = [
    "acquire_gpu_slot",
    "describe_gpu_policy",
    "get_ollama_gpu_options",
    "GPU_FORCE_ENABLED",
    "GPU_MAX_CONCURRENCY",
    "GPU_COOLDOWN_SECONDS",
    "GPU_WAIT_LOG_THRESHOLD",
    "build_gpu_metadata",
]
