"""
LangGraph Service Configuration
Centralized settings using Pydantic
"""
from typing import List, Optional
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Service Configuration
    langgraph_port: int = 8111
    langgraph_env: str = "production"
    langgraph_log_level: str = "INFO"
    
    # Database - PostgreSQL/TimescaleDB (Checkpoints)
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "tradingsystem"
    postgres_user: str = "postgres"
    postgres_password: str = ""
    
    # Database - QuestDB (Events/Metrics)
    questdb_host: str = "localhost"
    questdb_http_port: int = 9000
    questdb_pg_port: int = 8812
    questdb_influx_port: int = 9009
    
    # Agno Agents Integration
    agno_api_url: str = "http://localhost:8200"
    agno_api_timeout: int = 30
    
    # DocsAPI Integration
    docs_api_url: str = "http://localhost:3400"
    docs_api_timeout: int = 10
    
    # Firecrawl Proxy Integration
    firecrawl_proxy_url: str = "http://localhost:3600"
    firecrawl_proxy_timeout: int = 60
    
    # LLM Configuration (Optional)
    llm_enrichment_enabled: bool = False
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.0-flash-exp"
    
    # Feature Flags
    enable_trading_workflows: bool = True
    enable_docs_workflows: bool = True
    enable_webhooks: bool = True
    enable_metrics: bool = True
    enable_tracing: bool = False  # Legacy flag, use langsmith_tracing_enabled

    # LangSmith Observability (Optional)
    langsmith_api_key: Optional[str] = None
    langsmith_project: str = "langgraph-production"
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_tracing_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "LANGSMITH_TRACING",
            "ENABLE_LANGSMITH_TRACING",
            "LANGSMITH_TRACING_ENABLED"
        )
    )
    
    # Performance & Resilience
    max_concurrent_workflows: int = 10
    workflow_timeout_seconds: int = 300
    retry_max_attempts: int = 3
    retry_delays: List[int] = [1, 2, 4]
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3103",  # Dashboard
        "http://localhost:3400",  # Docusaurus
        "https://smith.langchain.com",  # LangSmith Studio
        "http://localhost:8112",  # Self (dev environment)
    ]
    
    # Monitoring
    prometheus_port: int = 9091
    health_check_timeout: int = 5
    
    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL"""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def postgres_async_url(self) -> str:
        """Get async PostgreSQL connection URL"""
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def questdb_url(self) -> str:
        """Get QuestDB connection URL"""
        return f"http://{self.questdb_host}:{self.questdb_http_port}"


settings = Settings()
