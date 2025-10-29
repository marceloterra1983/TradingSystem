"""
Document processors for different file types.
Handles markdown, PDF, and other document formats.
"""

import os
import logging
from typing import List, Dict, Optional
from pathlib import Path

import magic
import frontmatter
from PyPDF2 import PdfReader
from llama_index.core.node_parser import SentenceSplitter

from .monitoring import record_document_ingested, track_time, INGEST_TIME

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Base class for document processors."""

    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        # Support environment variable configuration for optimal chunking
        # Recommended: 768-1024 tokens with 100-150 overlap for better context
        self.chunk_size = chunk_size or int(os.getenv('LLAMAINDEX_CHUNK_SIZE', '768'))
        self.chunk_overlap = chunk_overlap or int(os.getenv('LLAMAINDEX_CHUNK_OVERLAP', '128'))

        logger.info(f"DocumentProcessor initialized: chunk_size={self.chunk_size}, chunk_overlap={self.chunk_overlap}")

        self.text_splitter = SentenceSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
    
    @track_time(INGEST_TIME)
    async def process_file(self, file_path: str) -> List[Dict]:
        """Process a single file and return chunks with metadata."""
        try:
            mime_type = magic.from_file(file_path, mime=True)
            processor = self.get_processor_for_type(mime_type)
            if not processor:
                raise ValueError(f"Unsupported file type: {mime_type}")
            
            chunks = await processor(file_path)
            record_document_ingested(mime_type, "success")
            return chunks
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            record_document_ingested(mime_type, "error")
            raise
    
    def get_processor_for_type(self, mime_type: str):
        """Return the appropriate processor function for the MIME type."""
        processors = {
            'text/markdown': self.process_markdown,
            'application/pdf': self.process_pdf,
            'text/plain': self.process_text
        }
        return processors.get(mime_type)
    
    async def process_markdown(self, file_path: str) -> List[Dict]:
        """Process a markdown file, preserving frontmatter metadata."""
        try:
            post = frontmatter.load(file_path)
            content = post.content
            metadata = dict(post.metadata)
            
            # Split content into chunks
            chunks = self.text_splitter.split_text(content)
            
            # Create documents with metadata
            documents = []
            for i, chunk in enumerate(chunks):
                doc = {
                    'content': chunk,
                    'metadata': {
                        **metadata,
                        'source': file_path,
                        'chunk_index': i,
                        'total_chunks': len(chunks)
                    }
                }
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Error processing markdown file {file_path}: {str(e)}")
            raise
    
    async def process_pdf(self, file_path: str) -> List[Dict]:
        """Process a PDF file, extracting text and metadata."""
        try:
            reader = PdfReader(file_path)
            content = ""
            
            # Extract text from all pages
            for page in reader.pages:
                content += page.extract_text() + "\n"
            
            # Get PDF metadata
            metadata = {
                'title': reader.metadata.get('/Title', ''),
                'author': reader.metadata.get('/Author', ''),
                'creation_date': reader.metadata.get('/CreationDate', ''),
                'pages': len(reader.pages)
            }
            
            # Split content into chunks
            chunks = self.text_splitter.split_text(content)
            
            # Create documents with metadata
            documents = []
            for i, chunk in enumerate(chunks):
                doc = {
                    'content': chunk,
                    'metadata': {
                        **metadata,
                        'source': file_path,
                        'chunk_index': i,
                        'total_chunks': len(chunks)
                    }
                }
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Error processing PDF file {file_path}: {str(e)}")
            raise
    
    async def process_text(self, file_path: str) -> List[Dict]:
        """Process a plain text file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Split content into chunks
            chunks = self.text_splitter.split_text(content)
            
            # Create documents with metadata
            documents = []
            for i, chunk in enumerate(chunks):
                doc = {
                    'content': chunk,
                    'metadata': {
                        'source': file_path,
                        'chunk_index': i,
                        'total_chunks': len(chunks)
                    }
                }
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Error processing text file {file_path}: {str(e)}")
            raise

class DocumentIngester:
    """Handles document ingestion workflow."""
    
    def __init__(self, processor: DocumentProcessor):
        self.processor = processor
    
    async def ingest_directory(self, directory_path: str) -> Dict:
        """Ingest all supported documents in a directory."""
        try:
            results = {
                'processed': 0,
                'failed': 0,
                'skipped': 0,
                'errors': []
            }
            
            for root, _, files in os.walk(directory_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        mime_type = magic.from_file(file_path, mime=True)
                        if self.processor.get_processor_for_type(mime_type):
                            await self.processor.process_file(file_path)
                            results['processed'] += 1
                        else:
                            results['skipped'] += 1
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append({
                            'file': file_path,
                            'error': str(e)
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Error processing directory {directory_path}: {str(e)}")
            raise
