"""
Documentation Workflow - LangGraph Implementation
Review and enrichment workflows for documentation management
"""
import logging
import os
from typing import Any, Dict, List, TypedDict
from uuid import uuid4

from langgraph.graph import StateGraph, END

# LangSmith tracing (optional)
try:
    from langsmith import traceable
except ImportError:
    # Graceful fallback if langsmith not installed
    def traceable(*dargs, **dkwargs):
        def _decorator(func):
            return func
        return _decorator

from ...domain.models import DocsReviewResult, WorkflowType
from ...infrastructure.adapters.docs_client import docs_client
from ...infrastructure.adapters.firecrawl_client import firecrawl_client

logger = logging.getLogger(__name__)


class DocsState(TypedDict):
    """Documentation workflow state"""
    doc_id: str
    url: str
    markdown: str
    operation: str  # review | enrich
    document_content: Dict[str, Any]
    review_results: Dict[str, Any]
    enrichment_data: Dict[str, Any]
    error: str
    current_step: str


@traceable(name="docs.fetch_document", run_type="retriever")
async def fetch_document_node(state: DocsState) -> DocsState:
    """
    Node 1: Fetch Document
    Retrieves document from DocsAPI or URL
    """
    logger.info(f"[DOCS] Fetching document: {state.get('doc_id') or state.get('url')}")
    
    try:
        if state.get("doc_id"):
            # Fetch from DocsAPI
            doc = await docs_client.get_document(state["doc_id"])
            state["document_content"] = doc
            state["markdown"] = doc.get("content", "")
        elif state.get("url"):
            # Scrape from URL via Firecrawl
            result = await firecrawl_client.scrape_url(state["url"], formats=["markdown"])
            if result.get("success"):
                state["document_content"] = result.get("data", {})
                state["markdown"] = result["data"].get("markdown", "")
            else:
                state["error"] = "Failed to scrape URL"
        elif state.get("markdown"):
            # Use provided markdown
            state["document_content"] = {"content": state["markdown"]}
        else:
            state["error"] = "No document source provided"
        
        state["current_step"] = "fetch_complete"
        logger.info(f"[DOCS] Document fetched successfully")
        
    except Exception as e:
        logger.error(f"[DOCS] Fetch failed: {e}")
        state["error"] = str(e)
        state["current_step"] = "failed"
    
    return state


@traceable(name="docs.review_document", run_type="chain")
async def review_document_node(state: DocsState) -> DocsState:
    """
    Node 2: Review Document
    Analyzes document for issues and generates suggestions
    """
    logger.info(f"[DOCS] Reviewing document")
    
    if state.get("error"):
        return state
    
    try:
        markdown = state.get("markdown", "")
        
        # Simple review logic (can be enhanced with LLM)
        issues = []
        suggestions = []
        
        # Check for missing YAML frontmatter
        if not markdown.startswith("---"):
            issues.append("Missing YAML frontmatter")
            suggestions.append("Add YAML frontmatter with required fields")
        
        # Check for headings
        if "# " not in markdown:
            issues.append("No top-level heading found")
            suggestions.append("Add a main title heading")
        
        # Check for last_review date (in frontmatter)
        if "last_review:" not in markdown:
            issues.append("Missing last_review date in frontmatter")
            suggestions.append("Add last_review: YYYY-MM-DD to frontmatter")
        
        # Check document length
        if len(markdown) < 100:
            issues.append("Document is very short")
            suggestions.append("Consider expanding with more details")
        
        state["review_results"] = {
            "issues_found": len(issues),
            "issues": issues,
            "suggestions": suggestions,
            "status": "reviewed"
        }
        state["current_step"] = "review_complete"
        
        logger.info(f"[DOCS] Review complete: {len(issues)} issues found")
        
    except Exception as e:
        logger.error(f"[DOCS] Review failed: {e}")
        state["error"] = str(e)
        state["current_step"] = "failed"
    
    return state


@traceable(name="docs.enrich_document", run_type="chain")
async def enrich_document_node(state: DocsState) -> DocsState:
    """
    Node 3: Enrich Document
    Adds external references and context via Firecrawl
    """
    logger.info(f"[DOCS] Enriching document")
    
    if state.get("error"):
        return state
    
    try:
        # Extract keywords from document for search
        # Simplified: look for code blocks, links, etc.
        markdown = state.get("markdown", "")
        
        # Find external links to scrape
        external_refs = []
        if "http" in markdown:
            # TODO: Parse markdown and extract URLs
            pass
        
        state["enrichment_data"] = {
            "external_references": external_refs,
            "enrichment_status": "completed"
        }
        state["current_step"] = "enrichment_complete"
        
        logger.info(f"[DOCS] Enrichment complete")
        
    except Exception as e:
        logger.error(f"[DOCS] Enrichment failed: {e}")
        state["error"] = str(e)
        state["current_step"] = "failed"
    
    return state


@traceable(name="docs.save_results", run_type="tool")
async def save_results_node(state: DocsState) -> DocsState:
    """
    Node 4: Save Results
    Creates review report in DocsAPI
    """
    logger.info(f"[DOCS] Saving results")
    
    if state.get("error"):
        return state
    
    try:
        if state.get("doc_id") and state.get("review_results"):
            # Create review report
            await docs_client.create_review_report(
                doc_id=state["doc_id"],
                issues=state["review_results"].get("issues", []),
                suggestions=state["review_results"].get("suggestions", [])
            )
        
        state["current_step"] = "completed"
        logger.info(f"[DOCS] Results saved successfully")
        
    except Exception as e:
        logger.error(f"[DOCS] Save failed: {e}")
        state["error"] = str(e)
        state["current_step"] = "failed"
    
    return state


def should_review(state: DocsState) -> str:
    """Decision: should we review?"""
    if state.get("error"):
        return "end"
    if state.get("operation") == "review":
        return "review"
    return "enrich"


def should_enrich(state: DocsState) -> str:
    """Decision: should we enrich?"""
    if state.get("error"):
        return "end"
    if state.get("operation") == "enrich":
        return "enrich"
    return "save"


def create_docs_workflow(checkpointer=None):
    """
    Create documentation workflow graph

    Flow:
    START → Fetch Document → [Review OR Enrich] → Save Results → END
    """
    workflow = StateGraph(DocsState)

    # Add nodes
    workflow.add_node("fetch_document", fetch_document_node)
    workflow.add_node("review", review_document_node)
    workflow.add_node("enrich", enrich_document_node)
    workflow.add_node("save", save_results_node)

    # Define edges
    workflow.set_entry_point("fetch_document")

    workflow.add_conditional_edges(
        "fetch_document",
        should_review,
        {
            "review": "review",
            "enrich": "enrich",
            "end": END
        }
    )

    workflow.add_edge("review", "save")
    workflow.add_edge("enrich", "save")
    workflow.add_edge("save", END)

    # Compile (checkpointer support for future)
    return workflow.compile()


# Module-level export for LangGraph CLI
# Only create graph when LANGGRAPH_CLI_EXPORT environment variable is set
# FastAPI server uses create_docs_workflow() function directly
if os.getenv("LANGGRAPH_CLI_EXPORT") == "1":
    docs_graph = create_docs_workflow()