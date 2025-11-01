"""
Collection Configuration Manager

Manages multiple collections with different embedding models.
Loads configuration from collection-config.json and provides utilities
for collection management.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class EmbeddingModelInfo:
    """Information about an embedding model"""
    name: str
    full_name: str
    dimensions: int
    context_length: int
    provider: str
    description: str
    use_cases: List[str]
    performance: Dict[str, str]


@dataclass
class CollectionInfo:
    """Information about a collection"""
    name: str
    display_name: str
    embedding_model: str
    dimensions: int
    description: str
    source: str
    enabled: bool
    priority: int
    metadata: Dict[str, str]


class CollectionConfigManager:
    """Manages collection configuration"""
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize the collection config manager
        
        Args:
            config_path: Path to collection-config.json. If None, uses default location.
        """
        if config_path is None:
            # Default to ../collection-config.json relative to this file
            current_dir = Path(__file__).parent.parent
            config_path = current_dir / "collection-config.json"
        
        self.config_path = Path(config_path)
        self._config: Dict = {}
        self._collections: Dict[str, CollectionInfo] = {}
        self._models: Dict[str, EmbeddingModelInfo] = {}
        self._aliases: Dict[str, str] = {}
        
        if self.config_path.exists():
            self.load_config()
    
    def load_config(self) -> None:
        """Load configuration from JSON file"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self._config = json.load(f)
            
            # Parse collections
            for col_data in self._config.get('collections', []):
                col = CollectionInfo(
                    name=col_data['name'],
                    display_name=col_data['displayName'],
                    embedding_model=col_data['embeddingModel'],
                    dimensions=col_data['dimensions'],
                    description=col_data['description'],
                    source=col_data['source'],
                    enabled=col_data.get('enabled', True),
                    priority=col_data.get('priority', 999),
                    metadata=col_data.get('metadata', {})
                )
                self._collections[col.name] = col
            
            # Parse embedding models
            for model_data in self._config.get('embeddingModels', []):
                model = EmbeddingModelInfo(
                    name=model_data['name'],
                    full_name=model_data['fullName'],
                    dimensions=model_data['dimensions'],
                    context_length=model_data['contextLength'],
                    provider=model_data['provider'],
                    description=model_data['description'],
                    use_cases=model_data['useCases'],
                    performance=model_data['performance']
                )
                self._models[model.name] = model
            
            # Parse aliases
            self._aliases = self._config.get('aliases', {})
            
        except Exception as e:
            print(f"Warning: Failed to load collection config from {self.config_path}: {e}")
    
    def get_default_collection(self) -> str:
        """Get the default collection name"""
        return self._config.get('defaultCollection', 'documentation')
    
    def get_collection(self, name: str) -> Optional[CollectionInfo]:
        """Get collection info by name
        
        Args:
            name: Collection name (supports aliases)
        
        Returns:
            CollectionInfo or None if not found
        """
        # Check if it's an alias
        actual_name = self._aliases.get(name, name)
        return self._collections.get(actual_name)
    
    def get_all_collections(self, enabled_only: bool = False) -> List[CollectionInfo]:
        """Get all collections
        
        Args:
            enabled_only: If True, only return enabled collections
        
        Returns:
            List of CollectionInfo sorted by priority
        """
        collections = list(self._collections.values())
        if enabled_only:
            collections = [c for c in collections if c.enabled]
        return sorted(collections, key=lambda c: c.priority)
    
    def get_embedding_model(self, name: str) -> Optional[EmbeddingModelInfo]:
        """Get embedding model info by name
        
        Args:
            name: Model name
        
        Returns:
            EmbeddingModelInfo or None if not found
        """
        return self._models.get(name)
    
    def get_all_embedding_models(self) -> List[EmbeddingModelInfo]:
        """Get all embedding models
        
        Returns:
            List of EmbeddingModelInfo
        """
        return list(self._models.values())
    
    def resolve_collection_name(self, name: Optional[str]) -> str:
        """Resolve collection name (handles aliases and defaults)
        
        Args:
            name: Collection name or alias (or None for default)
        
        Returns:
            Actual collection name
        """
        if not name:
            return self.get_default_collection()
        
        # Check if it's an alias
        return self._aliases.get(name, name)
    
    def get_model_for_collection(self, collection_name: str) -> Optional[str]:
        """Get the embedding model name for a collection
        
        Args:
            collection_name: Collection name
        
        Returns:
            Embedding model name or None
        """
        collection = self.get_collection(collection_name)
        return collection.embedding_model if collection else None
    
    def get_dimensions_for_collection(self, collection_name: str) -> Optional[int]:
        """Get vector dimensions for a collection
        
        Args:
            collection_name: Collection name
        
        Returns:
            Number of dimensions or None
        """
        collection = self.get_collection(collection_name)
        return collection.dimensions if collection else None
    
    def create_collection_name(self, source: str, model_short: str) -> str:
        """Create a collection name following the naming convention
        
        Args:
            source: Source identifier (e.g., 'documentation', 'repository')
            model_short: Short model name (e.g., 'nomic', 'mxbai', 'gemma')
        
        Returns:
            Collection name (e.g., 'documentation')
        """
        return f"{source}__{model_short}"
    
    def to_dict(self) -> Dict:
        """Export configuration as dictionary"""
        return {
            'defaultCollection': self.get_default_collection(),
            'collections': [
                {
                    'name': c.name,
                    'displayName': c.display_name,
                    'embeddingModel': c.embedding_model,
                    'dimensions': c.dimensions,
                    'description': c.description,
                    'source': c.source,
                    'enabled': c.enabled,
                    'priority': c.priority,
                    'metadata': c.metadata
                }
                for c in self.get_all_collections()
            ],
            'embeddingModels': [
                {
                    'name': m.name,
                    'fullName': m.full_name,
                    'dimensions': m.dimensions,
                    'contextLength': m.context_length,
                    'provider': m.provider,
                    'description': m.description,
                    'useCases': m.use_cases,
                    'performance': m.performance
                }
                for m in self.get_all_embedding_models()
            ],
            'aliases': self._aliases
        }


# Global instance
_config_manager: Optional[CollectionConfigManager] = None


def get_config_manager() -> CollectionConfigManager:
    """Get or create global config manager instance"""
    global _config_manager
    if _config_manager is None:
        _config_manager = CollectionConfigManager()
    return _config_manager
