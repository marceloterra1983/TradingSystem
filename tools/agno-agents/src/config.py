import os
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
    )

    agno_port: int = Field(8200, alias="AGNO_PORT")
    agno_log_level: str = Field("INFO", alias="AGNO_LOG_LEVEL")
    agno_model_provider: str = Field("openai", alias="AGNO_MODEL_PROVIDER")
    agno_model_name: str = Field("gpt-4o", alias="AGNO_MODEL_NAME")
    openai_api_key: str | None = Field(None, alias="OPENAI_API_KEY")
    cors_origins: List[str] | str = Field(
        default_factory=lambda: ["http://localhost:3103", "http://localhost:3205"],
        alias="AGNO_CORS_ORIGINS",
    )
    enable_metrics: bool = Field(True, alias="AGNO_ENABLE_METRICS")
    rate_limit_requests: int = Field(100, alias="AGNO_RATE_LIMIT_REQUESTS")
    rate_limit_period: int = Field(60, alias="AGNO_RATE_LIMIT_PERIOD")
    enable_tracing: bool = Field(False, alias="AGNO_ENABLE_TRACING")
    agno_enable_llm: bool = Field(False, alias="AGNO_ENABLE_LLM")
    enable_b3_websocket: bool = Field(False, alias="AGNO_ENABLE_B3_WEBSOCKET")
    workspace_api_url: str = Field("http://localhost:3100", alias="WORKSPACE_API_URL")
    tp_capital_api_url: str = Field("http://localhost:3200", alias="TP_CAPITAL_API_URL")
    b3_api_url: str = Field("http://localhost:3302", alias="B3_API_URL")
    b3_websocket_url: str = Field("ws://localhost:3302/ws", alias="B3_WEBSOCKET_URL")
    http_timeout: int = Field(10, alias="HTTP_TIMEOUT")
    health_check_timeout: int = Field(5, alias="AGNO_HEALTH_CHECK_TIMEOUT")
    retry_max_attempts: int = Field(4, alias="RETRY_MAX_ATTEMPTS")
    retry_delays: List[int] = Field(
        default_factory=lambda: [500, 1500, 3000],
        alias="RETRY_DELAYS",
    )
    circuit_breaker_failure_threshold: int = Field(
        5, alias="CIRCUIT_BREAKER_FAILURE_THRESHOLD"
    )
    circuit_breaker_timeout: int = Field(60, alias="CIRCUIT_BREAKER_TIMEOUT")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: Optional[str | List[str]]):
        fallback = (
            os.getenv("AGNO_CORS_ORIGIN")
            or os.getenv("CORS_ORIGINS")
            or os.getenv("CORS_ORIGIN")
        )
        if (value is None or value == "") and fallback:
            value = fallback
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        return []

    @field_validator("enable_metrics", mode="before")
    @classmethod
    def _load_metrics_flag(cls, value: Optional[bool | str]):
        if value not in (None, ""):
            return value
        legacy = os.getenv("ENABLE_METRICS")
        return legacy if legacy is not None else value

    @field_validator("rate_limit_requests", mode="before")
    @classmethod
    def _load_rate_limit_requests(cls, value: Optional[int | str]):
        if value not in (None, ""):
            return value
        legacy = os.getenv("RATE_LIMIT_REQUESTS")
        return legacy if legacy is not None else value

    @field_validator("rate_limit_period", mode="before")
    @classmethod
    def _load_rate_limit_period(cls, value: Optional[int | str]):
        if value not in (None, ""):
            return value
        legacy = os.getenv("RATE_LIMIT_PERIOD")
        return legacy if legacy is not None else value

    @field_validator("enable_tracing", mode="before")
    @classmethod
    def _load_tracing_flag(cls, value: Optional[bool | str]):
        if value not in (None, ""):
            return value
        legacy = os.getenv("ENABLE_TRACING")
        return legacy if legacy is not None else value

    @field_validator("retry_delays", mode="before")
    @classmethod
    def _parse_retry_delays(cls, value: Optional[str | List[int]]):
        if isinstance(value, str):
            return [int(item.strip()) for item in value.split(",") if item.strip()]
        return value


def _detect_project_root() -> Path:
    """
    Walk up the filesystem hierarchy searching for the project root (directory
    containing a `.env` file). Falls back to the current file's parent if not
    found.
    """
    current_path = Path(__file__).resolve()
    for parent in [current_path.parent, *current_path.parents]:
        if (parent / ".env").exists():
            return parent
    # Default to /app when running inside the container
    return Path("/app")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    project_root = _detect_project_root()
    env_path = project_root / ".env"
    kwargs: dict[str, object] = {}
    if env_path.exists():
        kwargs["_env_file"] = env_path
        kwargs["_env_file_encoding"] = "utf-8"
    return Settings(**kwargs)


settings = get_settings()
