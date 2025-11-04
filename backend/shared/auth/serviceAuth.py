"""
Inter-Service Authentication for FastAPI
Validates service-to-service requests using shared secret token
"""

import os
import logging
from typing import Optional
from fastapi import Header, HTTPException, Request

logger = logging.getLogger(__name__)

INTER_SERVICE_SECRET = os.getenv("INTER_SERVICE_SECRET")

if not INTER_SERVICE_SECRET:
    logger.warning("INTER_SERVICE_SECRET not set - service authentication disabled")


def verify_service_token(token: Optional[str] = Header(None, alias="x-service-token")) -> str:
    """
    Dependency to verify service-to-service authentication.
    
    Args:
        token: X-Service-Token header value
    
    Returns:
        Validated token string
    
    Raises:
        HTTPException: 403 if token missing or invalid
    """
    if not INTER_SERVICE_SECRET:
        # Authentication disabled (development mode)
        logger.debug("Service auth disabled (INTER_SERVICE_SECRET not set)")
        return "disabled"
    
    if not token:
        logger.warning("Missing X-Service-Token header")
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": "Missing service authentication token",
                "details": {
                    "required_header": "X-Service-Token",
                    "description": "Internal endpoints require service-to-service authentication",
                },
            }
        )
    
    if token != INTER_SERVICE_SECRET:
        logger.error("Invalid X-Service-Token provided")
        
        # Audit log
        logger.error(
            "Unauthorized service-to-service attempt",
            extra={
                "event": "unauthorized_service_access",
                "token_provided": token[:8] + "***",  # Log first 8 chars only
            }
        )
        
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": "Invalid service authentication token",
                "details": {
                    "description": "The provided service token is invalid",
                },
            }
        )
    
    return token


def get_service_auth_header() -> dict:
    """
    Get service authentication header for outgoing requests.
    
    Returns:
        Dict with X-Service-Token header
    
    Raises:
        ValueError: If INTER_SERVICE_SECRET not set
    """
    if not INTER_SERVICE_SECRET:
        raise ValueError("INTER_SERVICE_SECRET not set")
    
    return {
        "X-Service-Token": INTER_SERVICE_SECRET,
    }


def verify_service_token_value(token: str) -> bool:
    """
    Verify service token value (utility function).
    
    Args:
        token: Token to verify
    
    Returns:
        True if valid, False otherwise
    """
    if not INTER_SERVICE_SECRET:
        return True  # Auth disabled
    
    return token == INTER_SERVICE_SECRET

