"""GPU orchestration utilities shared across LlamaIndex services."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, Iterator, Mapping, Optional

logger = logging.getLogger("llamaindex.gpu")

_FALSE_VALUES = {"0", "false", "off", "no", "n", ""}


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in _FALSE_VALUES


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Invalid int for %s=%s. Using default %s.", name, value, default)
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("Invalid float for %s=%s. Using default %s.", name, value, default)
        return default


def _first_present_env(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value not in (None, ""):
            return value
    return None


GPU_FORCE_ENABLED: bool = _env_bool("LLAMAINDEX_FORCE_GPU", True)
_GPU_NUM = max(
    1,
    _env_int("LLAMAINDEX_GPU_NUM", _env_int("OLLAMA_NUM_GPU", 1)),
)

_RAW_GPU_OPTIONS: Dict[str, Any] = {}
if GPU_FORCE_ENABLED:
    _RAW_GPU_OPTIONS["num_gpu"] = _GPU_NUM

    _gpu_layers = _first_present_env("LLAMAINDEX_GPU_LAYERS", "OLLAMA_GPU_LAYERS")
    if _gpu_layers:
        try:
            _RAW_GPU_OPTIONS["gpu_layers"] = int(_gpu_layers)
        except ValueError:
            _RAW_GPU_OPTIONS["gpu_layers"] = _gpu_layers

    _gpu_split = _first_present_env("LLAMAINDEX_GPU_SPLIT", "OLLAMA_GPU_SPLIT")
    if _gpu_split:
        _RAW_GPU_OPTIONS["gpu_split"] = _gpu_split

    _main_gpu = _first_present_env("LLAMAINDEX_GPU_MAIN", "OLLAMA_MAIN_GPU")
    if _main_gpu:
        try:
            _RAW_GPU_OPTIONS["main_gpu"] = int(_main_gpu)
        except ValueError:
            _RAW_GPU_OPTIONS["main_gpu"] = _main_gpu

    _low_vram = _first_present_env("LLAMAINDEX_GPU_LOW_VRAM", "OLLAMA_LOW_VRAM")
    if _low_vram is not None:
        _RAW_GPU_OPTIONS["low_vram"] = _env_bool("LLAMAINDEX_GPU_LOW_VRAM", _env_bool("OLLAMA_LOW_VRAM", False))

GPU_MAX_CONCURRENCY: int = max(
    1,
    _env_int("LLAMAINDEX_GPU_MAX_CONCURRENCY", _env_int("OLLAMA_GPU_MAX_CONCURRENCY", 1)),
)
GPU_COOLDOWN_SECONDS: float = max(
    0.0,
    _env_float("LLAMAINDEX_GPU_COOLDOWN_SECONDS", _env_float("OLLAMA_GPU_COOLDOWN_SECONDS", 0.0)),
)
GPU_WAIT_LOG_THRESHOLD: float = max(
    0.0,
    _env_float("LLAMAINDEX_GPU_WAIT_LOG_THRESHOLD", 0.5),
)

_LOCK_PATH = os.getenv("LLAMAINDEX_GPU_LOCK_PATH", "/tmp/llamaindex-gpu.lock")
_LOCK_POLL_SECONDS = max(
    0.05,
    _env_float("LLAMAINDEX_GPU_LOCK_POLL_SECONDS", 0.25),
)
_USE_FILE_LOCK = (
    _env_bool("LLAMAINDEX_GPU_USE_FILE_LOCK", True)
    and GPU_MAX_CONCURRENCY == 1
)

_semaphore = asyncio.Semaphore(GPU_MAX_CONCURRENCY)


def get_ollama_gpu_options() -> Dict[str, Any]:
    """Return a copy of the GPU options to forward to Ollama calls."""
    return dict(_RAW_GPU_OPTIONS)


def describe_gpu_policy() -> Mapping[str, Any]:
    """Expose a read-only snapshot of the GPU coordination policy."""
    return {
        "forced": GPU_FORCE_ENABLED,
        "num_gpu": _RAW_GPU_OPTIONS.get("num_gpu"),
        "max_concurrency": GPU_MAX_CONCURRENCY,
        "cooldown_seconds": GPU_COOLDOWN_SECONDS,
        "has_additional_options": bool(_RAW_GPU_OPTIONS),
        "interprocess_lock_enabled": _USE_FILE_LOCK,
        "lock_path": _LOCK_PATH if _USE_FILE_LOCK else None,
        "lock_poll_seconds": _LOCK_POLL_SECONDS if _USE_FILE_LOCK else None,
    }


def build_gpu_metadata(
    wait_time: float,
    operation: str | None = None,
    lock_owner: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a structured metadata payload about GPU usage for API responses."""
    metadata: Dict[str, Any] = {
        "waitTimeSeconds": round(wait_time, 6),
        "policy": dict(describe_gpu_policy()),
        "maxConcurrency": GPU_MAX_CONCURRENCY,
        "cooldownSeconds": GPU_COOLDOWN_SECONDS,
        "options": get_ollama_gpu_options(),
    }
    if operation:
        metadata["operation"] = operation
    metadata["lock"] = {
        "enabled": _USE_FILE_LOCK,
        "path": _LOCK_PATH if _USE_FILE_LOCK else None,
        "pollSeconds": _LOCK_POLL_SECONDS if _USE_FILE_LOCK else None,
        "owner": lock_owner,
    }
    return metadata


async def _acquire_file_lock(operation: str) -> Optional[str]:
    if not _USE_FILE_LOCK:
        return None

    owner_id = f"{os.getpid()}-{time.time():.6f}-{operation}"
    attempts = 0
    while True:
        try:
            os.mkdir(_LOCK_PATH)
            owner_file = os.path.join(_LOCK_PATH, "owner")
            with open(owner_file, "w", encoding="utf-8") as handle:
                handle.write(owner_id)
            if attempts:
                logger.info("GPU lock acquired for %s after %s attempts.", operation, attempts)
            return owner_id
        except FileExistsError:
            attempts += 1
            await asyncio.sleep(_LOCK_POLL_SECONDS)
        except Exception as exc:  # pragma: no cover - unexpected filesystem errors
            logger.warning("Failed to acquire GPU lock (%s): %s", operation, exc)
            await asyncio.sleep(_LOCK_POLL_SECONDS)


def _release_file_lock(owner_id: Optional[str]) -> None:
    if not owner_id or not _USE_FILE_LOCK:
        return

    owner_file = os.path.join(_LOCK_PATH, "owner")
    try:
        try:
            os.remove(owner_file)
        except FileNotFoundError:
            pass
        os.rmdir(_LOCK_PATH)
    except FileNotFoundError:
        pass
    except OSError as exc:
        logger.debug("Ignoring GPU lock release error: %s", exc)


@asynccontextmanager
async def acquire_gpu_slot(operation: str = "task") -> Iterator[Dict[str, Any]]:
    """
    Serialize GPU workloads with an async semaphore.

    Yields a dict containing timing data that callers can log or attach to responses.
    """
    start = time.perf_counter()
    await _semaphore.acquire()
    wait_time = time.perf_counter() - start

    if wait_time >= GPU_WAIT_LOG_THRESHOLD:
        logger.info(
            "GPU slot acquired for %s after %.2fs wait (max=%s).",
            operation,
            wait_time,
            GPU_MAX_CONCURRENCY,
        )

    lock_owner = await _acquire_file_lock(operation)

    try:
        yield {
            "wait_time_seconds": wait_time,
            "operation": operation,
            "max_concurrency": GPU_MAX_CONCURRENCY,
            "lock_owner": lock_owner,
        }
    finally:
        _release_file_lock(lock_owner)
        if GPU_COOLDOWN_SECONDS > 0:
            await asyncio.sleep(GPU_COOLDOWN_SECONDS)
        _semaphore.release()
