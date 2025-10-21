"""
Tests for the ingestion service.
"""

import os
import pytest
from fastapi.testclient import TestClient

from ingestion_service.processors import DocumentProcessor
from ingestion_service.main import app

def test_health_check(test_client_ingestion):
    """Test health check endpoint."""
    response = test_client_ingestion.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_document_processor(tmp_path, mock_openai_embeddings):
    """Test document processor functionality."""
    # Create test markdown file
    test_file = tmp_path / "test.md"
    test_file.write_text("""---
title: Test Document
author: Test Author
---
# Test Content
This is a test document.""")
    
    processor = DocumentProcessor()
    chunks = await processor.process_file(str(test_file))
    
    assert len(chunks) > 0
    assert chunks[0]["content"].strip().startswith("# Test Content")
    assert chunks[0]["metadata"]["title"] == "Test Document"
    assert chunks[0]["metadata"]["author"] == "Test Author"

@pytest.mark.asyncio
async def test_directory_ingestion(tmp_path, test_client_ingestion):
    """Test directory ingestion endpoint."""
    # Create test files
    test_dir = tmp_path / "test_docs"
    test_dir.mkdir()
    
    (test_dir / "doc1.md").write_text("# Test Document 1")
    (test_dir / "doc2.md").write_text("# Test Document 2")
    
    response = test_client_ingestion.post(
        "/ingest/directory",
        json={"directory_path": str(test_dir)}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert data["documents_processed"] == 2

@pytest.mark.asyncio
async def test_single_document_ingestion(tmp_path, test_client_ingestion):
    """Test single document ingestion endpoint."""
    # Create test file
    test_file = tmp_path / "test.md"
    test_file.write_text("# Test Document")
    
    response = test_client_ingestion.post(
        "/ingest/document",
        json={"file_path": str(test_file)}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert data["documents_processed"] == 1

@pytest.mark.asyncio
async def test_error_handling(test_client_ingestion):
    """Test error handling for invalid inputs."""
    # Test non-existent directory
    response = test_client_ingestion.post(
        "/ingest/directory",
        json={"directory_path": "/nonexistent/path"}
    )
    assert response.status_code == 500
    
    # Test non-existent file
    response = test_client_ingestion.post(
        "/ingest/document",
        json={"file_path": "/nonexistent/file.md"}
    )
    assert response.status_code == 500

@pytest.mark.asyncio
async def test_collection_management(
    test_client_ingestion,
    qdrant_test_client
):
    """Test collection management endpoints."""
    # Test collection deletion
    response = test_client_ingestion.delete(
        "/documents/test_collection"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True

def test_monitoring_metrics(test_client_ingestion):
    """Test monitoring endpoints and metrics."""
    # Make some requests to generate metrics
    test_client_ingestion.get("/health")
    test_client_ingestion.get("/metrics")
    
    # Verify metrics endpoint
    response = test_client_ingestion.get("/metrics")
    assert response.status_code == 200
    metrics_text = response.text
    
    # Check for expected metrics
    assert "document_ingestion_seconds" in metrics_text
    assert "documents_ingested_total" in metrics_text