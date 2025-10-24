import logging
from typing import Any

import httpx
from aiobreaker import CircuitBreaker, CircuitBreakerError, CircuitBreakerListener
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
)
from tenacity.wait import wait_base

from datetime import timedelta

from ..config import settings

logger = logging.getLogger("agno-agents.resilience")

class _WaitDelays(wait_base):
    def __init__(self, delays_ms: list[int]):
        self.delays = [delay / 1000.0 for delay in delays_ms]

    def __call__(self, retry_state) -> float:
        index = min(retry_state.attempt_number - 1, len(self.delays) - 1)
        return self.delays[index]


class _CircuitBreakerLogger(CircuitBreakerListener):
    def __init__(self, name: str):
        self.name = name

    def state_change(  # type: ignore[override]
        self,
        breaker: CircuitBreaker,
        old_state: Any,
        new_state: Any,
    ) -> None:
        logger.warning(
            "Circuit breaker state change",
            extra={
                "breaker": self.name,
                "from_state": getattr(old_state, "name", str(old_state)),
                "to_state": getattr(new_state, "name", str(new_state)),
            },
        )

    def failure(  # type: ignore[override]
        self,
        breaker: CircuitBreaker,
        exc: BaseException,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        logger.error(
            "Circuit breaker recorded failure",
            extra={"breaker": self.name, "error": exc.__class__.__name__},
        )

    def success(  # type: ignore[override]
        self,
        breaker: CircuitBreaker,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        logger.info(
            "Circuit breaker recorded success",
            extra={"breaker": self.name},
        )

    def before_call(  # type: ignore[override]
        self,
        breaker: CircuitBreaker,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        logger.debug(
            "Circuit breaker before call",
            extra={"breaker": self.name},
        )


def _before_sleep_log(retry_state) -> None:
    error = retry_state.outcome.exception() if retry_state.outcome else None
    logger.warning(
        "Retrying request after failure",
        extra={
            "attempt": retry_state.attempt_number,
            "retry_in_seconds": getattr(retry_state, "idle_for", None),
            "error": error.__class__.__name__ if error else None,
        },
    )


def create_retry_decorator():
    delays = settings.retry_delays or [500, 1500, 3000]
    wait_strategy = _WaitDelays(delays)
    return retry(
        reraise=True,
        stop=stop_after_attempt(settings.retry_max_attempts),
        wait=wait_strategy,
        retry=retry_if_exception_type(
            (httpx.HTTPError, httpx.TimeoutException, httpx.ConnectError)
        ),
        before_sleep=_before_sleep_log,
    )


def create_circuit_breaker(name: str) -> CircuitBreaker:
    return CircuitBreaker(
        fail_max=settings.circuit_breaker_failure_threshold,
        timeout_duration=timedelta(seconds=settings.circuit_breaker_timeout),
        name=name,
        listeners=[_CircuitBreakerLogger(name)],
    )
