"""
LlamaIndex Ingestion Service
Handles document ingestion, processing, and vector storage management.
"""

import logging
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from llama_index import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
    ServiceContext,
    VectorStoreIndex
)
from llama_index.vector_stores.qdrant import QdrantVectorStore

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="LlamaIndex Ingestion Service")

# Initialize Qdrant client
qdrant_client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333))
)

# Initialize vector store
vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name="documentation"
)

# Create storage context
storage_context = StorageContext.from_defaults(vector_store=vector_store)

class ProcessingResult(BaseModel):
    """Response model for document processing results."""
    success: bool
    message: str
    documents_processed: Optional[int] = None
    errors: Optional[List[str]] = None

@app.post("/ingest/directory", response_model=ProcessingResult)
async def ingest_directory(directory_path: str):
    """
    Ingest all documents from a specified directory.
    """
    try:
        # Load documents
        documents = SimpleDirectoryReader(directory_path).load_data()
        
        # Create index from documents
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context
        )
        
        return ProcessingResult(
            success=True,
            message=f"Successfully processed {len(documents)} documents",
            documents_processed=len(documents)
        )
    
    except Exception as e:
        logger.error(f"Error processing directory {directory_path}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing directory: {str(e)}"
        )

@app.post("/ingest/document", response_model=ProcessingResult)
async def ingest_document(file_path: str):
    """
    Ingest a single document.
    """
    try:
        # Load single document
        documents = SimpleDirectoryReader(input_files=[file_path]).load_data()
        
        # Create index from document
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context
        )
        
        return ProcessingResult(
            success=True,
            message="Successfully processed document",
            documents_processed=1
        )
    
    except Exception as e:
        logger.error(f"Error processing file {file_path}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@app.delete("/documents/{collection_name}")
async def delete_collection(collection_name: str):
    """
    Delete a collection and all its documents.
    """
    try:
        qdrant_client.delete_collection(collection_name)
        return ProcessingResult(
            success=True,
            message=f"Successfully deleted collection {collection_name}"
        )
    except Exception as e:
        logger.error(f"Error deleting collection {collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting collection: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    try:
        # Check Qdrant connection
        qdrant_client.get_collections()
        return {"status": "healthy"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Service unhealthy"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)