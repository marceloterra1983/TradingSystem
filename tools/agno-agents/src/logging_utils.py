import logging
from typing import Any, Dict

from opentelemetry import trace
from pythonjsonlogger import jsonlogger
from uvicorn.config import LOGGING_CONFIG as UVICORN_LOGGING_CONFIG

SERVICE_NAME = "agno-agents"


class ServiceJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record.setdefault("timestamp", self.formatTime(record, self.datefmt))
        log_record.setdefault("service", SERVICE_NAME)
        agent = log_record.get("agent") or getattr(record, "agent", None)
        if agent:
            log_record["agent"] = agent
        decision = log_record.get("decision") or message_dict.get("decision") or getattr(record, "decision", None)
        if decision:
            log_record["decision"] = decision

        span = trace.get_current_span()
        span_context = span.get_span_context()
        if span_context.is_valid:
            log_record["trace_id"] = "{:032x}".format(span_context.trace_id)
            log_record["span_id"] = "{:016x}".format(span_context.span_id)
        else:
            log_record.setdefault("trace_id", None)
            log_record.setdefault("span_id", None)


def configure_structured_logging(log_level: str) -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)
    handler = logging.StreamHandler()
    formatter = ServiceJsonFormatter()
    handler.setFormatter(formatter)

    logging.basicConfig(level=level, handlers=[handler], force=True)

    UVICORN_LOGGING_CONFIG["formatters"]["default"]["()"] = "src.logging_utils.ServiceJsonFormatter"
    UVICORN_LOGGING_CONFIG["formatters"]["default"]["fmt"] = "%(message)s"
    UVICORN_LOGGING_CONFIG["formatters"]["default"].pop("use_colors", None)
    UVICORN_LOGGING_CONFIG["formatters"]["access"]["()"] = "src.logging_utils.ServiceJsonFormatter"
    UVICORN_LOGGING_CONFIG["formatters"]["access"]["fmt"] = "%(message)s"
    UVICORN_LOGGING_CONFIG["formatters"]["access"].pop("use_colors", None)
    UVICORN_LOGGING_CONFIG["handlers"]["default"]["formatter"] = "default"
    UVICORN_LOGGING_CONFIG["handlers"]["access"]["formatter"] = "access"
    UVICORN_LOGGING_CONFIG["loggers"]["uvicorn"]["level"] = log_level.upper()
    UVICORN_LOGGING_CONFIG["loggers"]["uvicorn.error"]["level"] = log_level.upper()
    UVICORN_LOGGING_CONFIG["loggers"]["uvicorn.access"]["level"] = log_level.upper()

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(logger_name)
        logger.handlers = [handler]
        logger.setLevel(level)
        logger.propagate = False


def get_agent_logger(agent_name: str) -> logging.LoggerAdapter:
    base_logger = logging.getLogger(f"{SERVICE_NAME}.{agent_name.lower()}")
    return logging.LoggerAdapter(base_logger, {"service": SERVICE_NAME, "agent": agent_name})
