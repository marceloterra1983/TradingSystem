#!/usr/bin/env python3
"""
============================================================================
Qdrant Single Instance to Cluster Migration
============================================================================
Purpose: Migrate collections from single Qdrant instance to 3-node cluster
Usage: python scripts/migration/migrate-qdrant-single-to-cluster.py
Prerequisites:
  - Source Qdrant (single) running on port 6333 (or QDRANT_SOURCE_PORT)
  - Destination Qdrant cluster with load balancer on port 6333 (or QDRANT_DEST_PORT)
  - qdrant-client installed: pip install qdrant-client
============================================================================
"""

import os
import sys
import logging
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
except ImportError:
    print("ERROR: qdrant-client not installed")
    print("Install with: pip install qdrant-client")
    sys.exit(1)

# Configuration
SOURCE_URL = os.getenv("QDRANT_SOURCE_URL", "http://localhost:6333")
DEST_URL = os.getenv("QDRANT_DEST_URL", "http://qdrant-lb:80")  # Via NGINX load balancer
BATCH_SIZE = int(os.getenv("QDRANT_BATCH_SIZE", "100"))
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"

# Collections to migrate
COLLECTIONS_TO_MIGRATE = [
    "docs_index_mxbai",
    "documentation",
    "documentation_gemma",
]

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"qdrant_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
logger = logging.getLogger(__name__)


def check_connectivity(client: QdrantClient, name: str) -> bool:
    """Check if Qdrant instance is accessible"""
    try:
        collections = client.get_collections()
        logger.info(f"✅ {name} is accessible ({len(collections.collections)} collections)")
        return True
    except Exception as e:
        logger.error(f"❌ Cannot connect to {name}: {e}")
        return False


def get_collection_info(client: QdrantClient, collection_name: str) -> Dict[str, Any]:
    """Get collection configuration and stats"""
    try:
        collection = client.get_collection(collection_name)
        count = client.count(collection_name, exact=True)
        
        return {
            "name": collection_name,
            "vectors_config": collection.config.params.vectors,
            "hnsw_config": collection.config.hnsw_config,
            "optimizer_config": collection.config.optimizer_config,
            "points_count": count.count,
            "segments_count": collection.segments_count,
        }
    except Exception as e:
        logger.error(f"Failed to get collection info for {collection_name}: {e}")
        return None


def create_collection_in_cluster(
    dest_client: QdrantClient,
    collection_name: str,
    source_info: Dict[str, Any]
) -> bool:
    """Create collection in destination cluster with same configuration"""
    try:
        logger.info(f"Creating collection '{collection_name}' in cluster...")
        
        if DRY_RUN:
            logger.info(f"DRY RUN: Would create collection with config: {source_info['vectors_config']}")
            return True
        
        dest_client.create_collection(
            collection_name=collection_name,
            vectors_config=source_info["vectors_config"],
            hnsw_config=source_info["hnsw_config"],
            optimizers_config=source_info["optimizer_config"],
            replication_factor=3,  # Important: replicate across 3 nodes
            write_consistency_factor=2,  # Quorum (2/3 nodes)
        )
        
        logger.info(f"✅ Collection '{collection_name}' created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to create collection '{collection_name}': {e}")
        return False


def migrate_collection(
    source_client: QdrantClient,
    dest_client: QdrantClient,
    collection_name: str,
    source_info: Dict[str, Any]
) -> bool:
    """Migrate all points from source to destination"""
    try:
        total_points = source_info["points_count"]
        logger.info(f"Migrating {total_points} points from '{collection_name}'...")
        
        migrated_count = 0
        offset = None
        
        while True:
            # Scroll source collection
            records, offset = source_client.scroll(
                collection_name=collection_name,
                limit=BATCH_SIZE,
                offset=offset,
                with_vectors=True,
                with_payload=True,
            )
            
            if not records:
                break
            
            if DRY_RUN:
                logger.info(f"DRY RUN: Would migrate batch of {len(records)} points")
                migrated_count += len(records)
            else:
                # Upload to destination cluster
                dest_client.upsert(
                    collection_name=collection_name,
                    points=records,
                    wait=True,  # Wait for replication to quorum
                )
                
                migrated_count += len(records)
                logger.info(f"  Migrated {migrated_count}/{total_points} points ({migrated_count/total_points*100:.1f}%)")
            
            # Check if we're done
            if offset is None:
                break
        
        logger.info(f"✅ Migration complete for '{collection_name}': {migrated_count} points")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed for '{collection_name}': {e}")
        return False


def verify_migration(
    source_client: QdrantClient,
    dest_client: QdrantClient,
    collection_name: str
) -> bool:
    """Verify migration by comparing point counts"""
    try:
        source_count = source_client.count(collection_name, exact=True).count
        dest_count = dest_client.count(collection_name, exact=True).count
        
        if source_count == dest_count:
            logger.info(f"✅ Verification passed for '{collection_name}': {dest_count} points")
            return True
        else:
            logger.error(f"❌ Verification failed for '{collection_name}': source={source_count}, dest={dest_count}")
            return False
    except Exception as e:
        logger.error(f"❌ Verification error for '{collection_name}': {e}")
        return False


def test_search_accuracy(
    source_client: QdrantClient,
    dest_client: QdrantClient,
    collection_name: str
) -> bool:
    """Test search accuracy by comparing results"""
    try:
        logger.info(f"Testing search accuracy for '{collection_name}'...")
        
        # Get a sample vector from source
        sample_points, _ = source_client.scroll(
            collection_name=collection_name,
            limit=1,
            with_vectors=True,
        )
        
        if not sample_points:
            logger.warning(f"No points found in '{collection_name}' to test")
            return True
        
        sample_vector = sample_points[0].vector
        
        # Search in source
        source_results = source_client.search(
            collection_name=collection_name,
            query_vector=sample_vector,
            limit=5,
        )
        
        # Search in destination
        dest_results = dest_client.search(
            collection_name=collection_name,
            query_vector=sample_vector,
            limit=5,
        )
        
        # Compare top result IDs
        source_ids = [r.id for r in source_results]
        dest_ids = [r.id for r in dest_results]
        
        if source_ids == dest_ids:
            logger.info(f"✅ Search accuracy verified for '{collection_name}'")
            return True
        else:
            logger.warning(f"⚠️  Search results differ for '{collection_name}'")
            logger.warning(f"   Source IDs: {source_ids[:3]}...")
            logger.warning(f"   Dest IDs:   {dest_ids[:3]}...")
            return False
            
    except Exception as e:
        logger.error(f"❌ Search accuracy test failed for '{collection_name}': {e}")
        return False


def main():
    """Main migration workflow"""
    logger.info("=" * 60)
    logger.info("Qdrant Single Instance → Cluster Migration")
    logger.info("=" * 60)
    logger.info(f"Source: {SOURCE_URL}")
    logger.info(f"Destination: {DEST_URL}")
    logger.info(f"Batch Size: {BATCH_SIZE}")
    logger.info(f"Dry Run: {DRY_RUN}")
    logger.info("=" * 60)
    
    # Initialize clients
    logger.info("Initializing Qdrant clients...")
    source_client = QdrantClient(url=SOURCE_URL)
    dest_client = QdrantClient(url=DEST_URL)
    
    # Check connectivity
    if not check_connectivity(source_client, "Source Qdrant"):
        sys.exit(1)
    if not check_connectivity(dest_client, "Destination Qdrant Cluster"):
        sys.exit(1)
    
    # Migration results
    results = {
        "total_collections": len(COLLECTIONS_TO_MIGRATE),
        "successful": 0,
        "failed": 0,
        "skipped": 0,
    }
    
    # Migrate each collection
    for collection_name in COLLECTIONS_TO_MIGRATE:
        logger.info("")
        logger.info(f"Processing collection: {collection_name}")
        logger.info("-" * 60)
        
        # Get source collection info
        source_info = get_collection_info(source_client, collection_name)
        if not source_info:
            logger.warning(f"⚠️  Skipping '{collection_name}' (not found in source)")
            results["skipped"] += 1
            continue
        
        logger.info(f"Source collection info:")
        logger.info(f"  - Points: {source_info['points_count']}")
        logger.info(f"  - Segments: {source_info['segments_count']}")
        logger.info(f"  - Vectors: {source_info['vectors_config']}")
        
        # Check if collection already exists in destination
        try:
            dest_client.get_collection(collection_name)
            logger.warning(f"⚠️  Collection '{collection_name}' already exists in destination")
            user_input = input(f"Delete and recreate? (y/n): ")
            if user_input.lower() == 'y':
                logger.info(f"Deleting existing collection...")
                if not DRY_RUN:
                    dest_client.delete_collection(collection_name)
            else:
                logger.info(f"Skipping '{collection_name}'")
                results["skipped"] += 1
                continue
        except:
            pass  # Collection doesn't exist, good to create
        
        # Create collection in cluster
        if not create_collection_in_cluster(dest_client, collection_name, source_info):
            results["failed"] += 1
            continue
        
        # Migrate points
        if not migrate_collection(source_client, dest_client, collection_name, source_info):
            results["failed"] += 1
            continue
        
        # Verify migration
        if not verify_migration(source_client, dest_client, collection_name):
            results["failed"] += 1
            continue
        
        # Test search accuracy
        test_search_accuracy(source_client, dest_client, collection_name)
        
        results["successful"] += 1
    
    # Summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("Migration Summary")
    logger.info("=" * 60)
    logger.info(f"Total Collections: {results['total_collections']}")
    logger.info(f"✅ Successful: {results['successful']}")
    logger.info(f"❌ Failed: {results['failed']}")
    logger.info(f"⚠️  Skipped: {results['skipped']}")
    logger.info("=" * 60)
    
    if results["failed"] > 0:
        logger.error(f"Migration completed with {results['failed']} failures")
        sys.exit(1)
    else:
        logger.info("✅ Migration completed successfully!")
        logger.info("")
        logger.info("Next Steps:")
        logger.info("  1. Update .env: QDRANT_URL=http://qdrant-lb:80")
        logger.info("  2. Update application code to use new URL")
        logger.info("  3. Test search queries via cluster")
        logger.info("  4. Keep single instance running for 1 week as fallback")
        logger.info("")


if __name__ == "__main__":
    main()
