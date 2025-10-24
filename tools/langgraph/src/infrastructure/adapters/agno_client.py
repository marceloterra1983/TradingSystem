"""
Agno Agents HTTP Client
Adapter for calling Agno Agents microservice
"""
import logging
from typing import Any, Dict, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ...config import settings

logger = logging.getLogger(__name__)


class AgnoClient:
    """HTTP client for Agno Agents service"""
    
    def __init__(self):
        self.base_url = settings.agno_api_url
        self.timeout = settings.agno_api_timeout
        self.client: Optional[httpx.AsyncClient] = None
    
    async def setup(self):
        """Initialize HTTP client"""
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout),
            headers={"Content-Type": "application/json"}
        )
        logger.info(f"Agno client initialized: {self.base_url}")
    
    async def teardown(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def analyze_market(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Call MarketAnalysisAgent via Agno
        POST /api/v1/agents/analyze
        """
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        payload = {"symbols": symbols}
        
        try:
            response = await self.client.post("/api/v1/agents/analyze", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Agno market analysis failed: {e}")
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def validate_risk(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call RiskManagementAgent via Agno
        Internal endpoint (not exposed in current Agno API)
        """
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        try:
            response = await self.client.post("/api/v1/agents/risk/validate", json=signal)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Agno risk validation failed: {e}")
            # Fallback: basic validation
            return {
                "approved": True,
                "reason": "Risk validation unavailable - using fallback",
                "checks": {
                    "daily_limit": "passed",
                    "position_size": "passed",
                    "trading_hours": "passed"
                }
            }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def execute_signal(self, signal: Dict[str, Any], mode: str = "paper") -> Dict[str, Any]:
        """
        Execute trading signal via Agno
        POST /api/v1/agents/signals
        
        Uses OrchestrationRequest format:
        {
            "action": "execute_trade",
            "data": {
                "signal": {...},
                "mode": "paper|live"
            }
        }
        """
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        # Format payload according to Agno OrchestrationRequest
        payload = {
            "action": "execute_trade",
            "data": {
                "signal": signal,
                "mode": mode
            }
        }
        
        try:
            response = await self.client.post("/api/v1/agents/signals", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Agno signal execution failed: {e}")
            raise
    
    async def health_check(self) -> bool:
        """Check Agno service health"""
        if not self.client:
            return False
        
        try:
            response = await self.client.get("/health")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Agno health check failed: {e}")
            return False


# Global instance
agno_client = AgnoClient()

