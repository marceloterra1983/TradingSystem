"""
Firecrawl Proxy HTTP Client
Adapter for web scraping and enrichment
"""
import logging
from typing import Any, Dict, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ...config import settings

logger = logging.getLogger(__name__)


class FirecrawlClient:
    """HTTP client for Firecrawl Proxy service"""
    
    def __init__(self):
        self.base_url = settings.firecrawl_proxy_url
        self.timeout = settings.firecrawl_proxy_timeout
        self.client: Optional[httpx.AsyncClient] = None
    
    async def setup(self):
        """Initialize HTTP client"""
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout),
            headers={"Content-Type": "application/json"}
        )
        logger.info(f"Firecrawl client initialized: {self.base_url}")
    
    async def teardown(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=2, max=10))
    async def scrape_url(self, url: str, formats: List[str] = None) -> Dict[str, Any]:
        """
        Scrape single URL
        POST /api/v1/scrape
        """
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        payload = {
            "url": url,
            "formats": formats or ["markdown", "html"]
        }
        
        try:
            response = await self.client.post("/api/v1/scrape", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Firecrawl scrape failed for {url}: {e}")
            raise
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=2, max=10))
    async def crawl_site(self, url: str, max_pages: int = 10) -> Dict[str, Any]:
        """
        Crawl entire site
        POST /api/v1/crawl
        """
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        payload = {
            "url": url,
            "limit": max_pages,
            "scrapeOptions": {
                "formats": ["markdown"]
            }
        }
        
        try:
            response = await self.client.post("/api/v1/crawl", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Firecrawl crawl failed for {url}: {e}")
            raise
    
    async def extract_references(self, url: str) -> List[str]:
        """Extract external references from a URL"""
        try:
            result = await self.scrape_url(url, formats=["html"])
            
            if result.get("success"):
                # Simple extraction (could be enhanced with BeautifulSoup)
                content = result.get("data", {}).get("html", "")
                # Extract links - simplified version
                references = []
                # TODO: Parse HTML and extract href attributes
                return references
            
            return []
        except Exception as e:
            logger.error(f"Failed to extract references from {url}: {e}")
            return []
    
    async def health_check(self) -> bool:
        """Check Firecrawl service health"""
        if not self.client:
            return False
        
        try:
            response = await self.client.get("/health")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Firecrawl health check failed: {e}")
            return False


# Global instance
firecrawl_client = FirecrawlClient()

