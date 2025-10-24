"""
DocsAPI HTTP Client
Adapter for documentation management service
"""
import logging
from typing import Any, Dict, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ...config import settings

logger = logging.getLogger(__name__)


class DocsClient:
    """HTTP client for DocsAPI service"""
    
    def __init__(self):
        self.base_url = settings.docs_api_url
        self.timeout = settings.docs_api_timeout
        self.client: Optional[httpx.AsyncClient] = None
    
    async def setup(self):
        """Initialize HTTP client"""
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout),
            headers={"Content-Type": "application/json"}
        )
        logger.info(f"DocsAPI client initialized: {self.base_url}")
    
    async def teardown(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def get_document(self, doc_id: str) -> Dict[str, Any]:
        """Get document by ID"""
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        try:
            response = await self.client.get(f"/api/docs/{doc_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"DocsAPI get document failed: {e}")
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def search_documents(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search documents"""
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        try:
            response = await self.client.get(
                "/api/docs/search",
                params={"q": query, "limit": limit}
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except httpx.HTTPError as e:
            logger.error(f"DocsAPI search failed: {e}")
            return []
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def update_document(self, doc_id: str, content: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Update document content"""
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        payload = {
            "content": content,
            "metadata": metadata
        }
        
        try:
            response = await self.client.put(f"/api/docs/{doc_id}", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"DocsAPI update document failed: {e}")
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def create_review_report(self, doc_id: str, issues: List[str], suggestions: List[str]) -> Dict[str, Any]:
        """Create a review report for a document"""
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        payload = {
            "doc_id": doc_id,
            "issues": issues,
            "suggestions": suggestions,
            "timestamp": "now"
        }
        
        try:
            response = await self.client.post("/api/docs/reviews", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"DocsAPI create review failed: {e}")
            raise
    
    async def health_check(self) -> bool:
        """Check DocsAPI service health"""
        if not self.client:
            return False
        
        try:
            response = await self.client.get("/health")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"DocsAPI health check failed: {e}")
            return False


# Global instance
docs_client = DocsClient()

