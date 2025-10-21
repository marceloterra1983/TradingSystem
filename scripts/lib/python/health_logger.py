#!/usr/bin/env python3
"""
Structured Logging Module for Health Monitoring Scripts

Provides:
- Structured JSON logging
- Log rotation
- Progress bars
- Context managers for timing
- Safe file operations with timeouts

Usage:
    from scripts.lib.python.health_logger import HealthLogger, progress_bar
    
    logger = HealthLogger("script-name")
    logger.info("Processing files", count=10)
    
    for item in progress_bar(items, desc="Processing"):
        process(item)
"""

import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Iterator
from logging.handlers import RotatingFileHandler
import signal
from contextlib import contextmanager

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        
        return json.dumps(log_data, ensure_ascii=False)


class HealthLogger:
    """
    Structured logger with progress tracking and safety features.
    
    Features:
    - JSON structured logging
    - Automatic log rotation
    - Progress tracking
    - Timeout protection
    - Graceful shutdown
    """
    
    def __init__(
        self,
        name: str,
        log_dir: Optional[Path] = None,
        log_level: str = "INFO",
        enable_console: bool = True,
        enable_file: bool = True,
        max_bytes: int = 10 * 1024 * 1024,  # 10MB
        backup_count: int = 5
    ):
        """
        Initialize health logger.
        
        Args:
            name: Logger name
            log_dir: Directory for log files
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
            enable_console: Enable console output
            enable_file: Enable file output
            max_bytes: Max log file size before rotation
            backup_count: Number of backup files to keep
        """
        self.name = name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, log_level.upper()))
        
        # Clear existing handlers
        self.logger.handlers.clear()
        
        # Console handler (human-readable)
        if enable_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(getattr(logging, log_level.upper()))
            console_formatter = logging.Formatter(
                '%(asctime)s - %(levelname)s - %(message)s',
                datefmt='%H:%M:%S'
            )
            console_handler.setFormatter(console_formatter)
            self.logger.addHandler(console_handler)
        
        # File handler (structured JSON)
        if enable_file and log_dir:
            log_dir = Path(log_dir)
            log_dir.mkdir(parents=True, exist_ok=True)
            
            log_file = log_dir / f"{name}.log"
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=max_bytes,
                backupCount=backup_count
            )
            file_handler.setLevel(logging.DEBUG)  # Always log everything to file
            file_handler.setFormatter(StructuredFormatter())
            self.logger.addHandler(file_handler)
        
        # Track execution time
        self.start_time = time.time()
        
        # Setup signal handlers for graceful shutdown
        self._setup_signal_handlers()
    
    def _setup_signal_handlers(self):
        """Setup handlers for SIGINT and SIGTERM."""
        def signal_handler(signum, frame):
            self.warning(f"Received signal {signum}, shutting down gracefully...")
            self.cleanup()
            sys.exit(1)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def cleanup(self):
        """Cleanup and flush logs."""
        elapsed = time.time() - self.start_time
        self.info(f"Script execution time: {elapsed:.2f}s")
        logging.shutdown()
    
    def debug(self, message: str, **kwargs):
        """Log debug message with optional structured data."""
        self.logger.debug(message, extra={'extra': kwargs})
    
    def info(self, message: str, **kwargs):
        """Log info message with optional structured data."""
        self.logger.info(message, extra={'extra': kwargs})
    
    def warning(self, message: str, **kwargs):
        """Log warning message with optional structured data."""
        self.logger.warning(message, extra={'extra': kwargs})
    
    def error(self, message: str, **kwargs):
        """Log error message with optional structured data."""
        self.logger.error(message, extra={'extra': kwargs})
    
    def critical(self, message: str, **kwargs):
        """Log critical message with optional structured data."""
        self.logger.critical(message, extra={'extra': kwargs})
    
    @contextmanager
    def timer(self, operation: str):
        """
        Context manager for timing operations.
        
        Usage:
            with logger.timer("Processing files"):
                process_files()
        """
        start = time.time()
        self.info(f"Starting: {operation}")
        try:
            yield
        finally:
            elapsed = time.time() - start
            self.info(f"Completed: {operation}", elapsed_seconds=elapsed)


class TimeoutException(Exception):
    """Raised when operation exceeds timeout."""
    pass


def timeout_handler(signum, frame):
    """Signal handler for timeout."""
    raise TimeoutException("Operation timed out")


@contextmanager
def timeout(seconds: int):
    """
    Context manager for timeout protection.
    
    Usage:
        try:
            with timeout(30):
                long_running_operation()
        except TimeoutException:
            print("Operation timed out!")
    """
    # Setup alarm
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    
    try:
        yield
    finally:
        # Disable alarm
        signal.alarm(0)


def progress_bar(
    iterable,
    desc: str = "Processing",
    total: Optional[int] = None,
    disable: bool = False
) -> Iterator:
    """
    Create a progress bar for iterables.
    
    Args:
        iterable: Iterable to wrap
        desc: Description to display
        total: Total number of items (if known)
        disable: Disable progress bar
    
    Returns:
        Iterator with progress tracking
    
    Usage:
        for item in progress_bar(items, desc="Processing files"):
            process(item)
    """
    if HAS_TQDM and not disable:
        return tqdm(iterable, desc=desc, total=total, unit="item")
    else:
        # Fallback: simple counter
        if total:
            print(f"{desc}: 0/{total}", end='', flush=True)
            for i, item in enumerate(iterable, 1):
                yield item
                print(f"\r{desc}: {i}/{total}", end='', flush=True)
            print()  # New line
        else:
            for item in iterable:
                yield item


def safe_file_read(file_path: Path, encoding: str = 'utf-8', timeout_seconds: int = 5) -> Optional[str]:
    """
    Safely read file with timeout protection.
    
    Args:
        file_path: Path to file
        encoding: File encoding
        timeout_seconds: Maximum time to wait
    
    Returns:
        File contents or None on error
    """
    try:
        with timeout(timeout_seconds):
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
    except TimeoutException:
        logging.error(f"Timeout reading file: {file_path}")
        return None
    except Exception as e:
        logging.error(f"Error reading file {file_path}: {e}")
        return None


def check_kill_switch(kill_switch_file: str = "/tmp/health-dashboard-STOP") -> bool:
    """
    Check if kill switch file exists.
    
    Usage:
        if check_kill_switch():
            print("Emergency stop requested!")
            sys.exit(1)
    
    Args:
        kill_switch_file: Path to kill switch file
    
    Returns:
        True if kill switch is active
    """
    return Path(kill_switch_file).exists()


def create_kill_switch(kill_switch_file: str = "/tmp/health-dashboard-STOP"):
    """Create kill switch file to stop running scripts."""
    Path(kill_switch_file).touch()
    print(f"Kill switch created: {kill_switch_file}")


def remove_kill_switch(kill_switch_file: str = "/tmp/health-dashboard-STOP"):
    """Remove kill switch file."""
    try:
        Path(kill_switch_file).unlink()
        print(f"Kill switch removed: {kill_switch_file}")
    except FileNotFoundError:
        pass


# Export main classes and functions
__all__ = [
    'HealthLogger',
    'progress_bar',
    'timeout',
    'TimeoutException',
    'safe_file_read',
    'check_kill_switch',
    'create_kill_switch',
    'remove_kill_switch'
]
