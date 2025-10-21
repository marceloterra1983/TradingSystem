"""
Integration tests for LlamaIndex services.
Tests the complete flow from document ingestion to querying.
"""

import os
import pytest
import time
from pathlib import Path
from fastapi.testclient import TestClient

@pytest.fixture
def test_docs(tmp_path):
    """Create test documentation files."""
    docs_dir = tmp_path / "test_docs"
    docs_dir.mkdir()
    
    # Create various test documents
    markdown_doc = docs_dir / "test.md"
    markdown_doc.write_text("""---
title: Python Programming Guide
author: Test Author
---
# Python Programming

Python is a high-level programming language known for its simplicity and readability.
It supports multiple programming paradigms including:

1. Object-oriented programming
2. Functional programming
3. Procedural programming

## Key Features

- Easy to learn and read
- Large standard library
- Extensive third-party packages
- Cross-platform compatibility
""")
    
    pdf_doc = docs_dir / "architecture.md"
    pdf_doc.write_text("""---
title: Software Architecture Guide
author: Test Author
---
# Software Architecture

Software architecture refers to the fundamental structures of a software system.
Key architectural patterns include:

1. Microservices
2. Monolithic
3. Event-driven
4. Layered architecture

## Best Practices

- Separation of concerns
- Single responsibility principle
- Don't repeat yourself (DRY)
- SOLID principles
""")
    
    return docs_dir

@pytest.mark.asyncio
async def test_full_workflow(
    test_client_ingestion,
    test_client_query,
    test_token,
    test_docs,
    mock_openai_embeddings
):
    """
    Test complete workflow:
    1. Ingest documents
    2. Query the knowledge base
    3. Perform semantic search
    4. Verify caching
    """
    # Step 1: Ingest documents
    response = test_client_ingestion.post(
        "/ingest/directory",
        json={"directory_path": str(test_docs)}
    )
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    # Wait for ingestion to complete
    time.sleep(2)
    
    # Step 2: Query about Python
    python_query = test_client_query.post(
        "/query",
        json={
            "query": "What are the main programming paradigms supported by Python?",
            "max_results": 3
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert python_query.status_code == 200
    python_data = python_query.json()
    assert "object-oriented" in python_data["answer"].lower()
    assert "functional" in python_data["answer"].lower()
    
    # Step 3: Query about architecture
    arch_query = test_client_query.post(
        "/query",
        json={
            "query": "What are the key architectural patterns?",
            "max_results": 3
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert arch_query.status_code == 200
    arch_data = arch_query.json()
    assert "microservices" in arch_data["answer"].lower()
    assert "monolithic" in arch_data["answer"].lower()
    
    # Step 4: Semantic search
    search_response = test_client_query.get(
        "/search",
        params={
            "query": "software architecture patterns",
            "max_results": 2
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert search_response.status_code == 200
    search_results = search_response.json()
    assert len(search_results) > 0
    assert any("architecture" in r["content"].lower() for r in search_results)
    
    # Step 5: Verify caching
    cached_query = test_client_query.post(
        "/query",
        json={
            "query": "What are the main programming paradigms supported by Python?",
            "max_results": 3
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert cached_query.status_code == 200
    assert cached_query.json() == python_data  # Should get identical response

@pytest.mark.asyncio
async def test_error_recovery(
    test_client_ingestion,
    test_client_query,
    test_token,
    test_docs,
    mock_openai_embeddings
):
    """
    Test system recovery from errors:
    1. Try to query before ingestion
    2. Ingest documents
    3. Verify queries work after ingestion
    """
    # Step 1: Query before ingestion
    pre_query = test_client_query.post(
        "/query",
        json={
            "query": "What is Python?",
            "max_results": 3
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert pre_query.status_code in [404, 500]  # Should fail gracefully
    
    # Step 2: Ingest documents
    response = test_client_ingestion.post(
        "/ingest/directory",
        json={"directory_path": str(test_docs)}
    )
    assert response.status_code == 200
    
    time.sleep(2)  # Wait for ingestion
    
    # Step 3: Query after ingestion
    post_query = test_client_query.post(
        "/query",
        json={
            "query": "What is Python?",
            "max_results": 3
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert post_query.status_code == 200
    assert "python" in post_query.json()["answer"].lower()

@pytest.mark.asyncio
async def test_concurrent_operations(
    test_client_ingestion,
    test_client_query,
    test_token,
    test_docs,
    mock_openai_embeddings
):
    """
    Test concurrent operations:
    1. Start ingestion
    2. Try queries during ingestion
    3. Verify system handles concurrent operations gracefully
    """
    # Start ingestion
    ingest_response = test_client_ingestion.post(
        "/ingest/directory",
        json={"directory_path": str(test_docs)}
    )
    assert ingest_response.status_code == 200
    
    # Immediately try to query
    immediate_query = test_client_query.post(
        "/query",
        json={
            "query": "What is Python?",
            "max_results": 3
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    # Should either fail gracefully or return results if ready
    assert immediate_query.status_code in [200, 404, 503]
    
    # Wait for ingestion to complete
    time.sleep(2)
    
    # Query should now work
    final_query = test_client_query.post(
        "/query",
        json={
            "query": "What is Python?",
            "max_results": 3
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert final_query.status_code == 200