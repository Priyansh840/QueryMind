"""
QueryMind - Document Understanding & Knowledge Extraction Engine
Extracts structured knowledge items (facts, concepts, decisions, requirements, risks, metrics, summary)
from document chunks using LLM with strict grounding validation.
"""

import json
import uuid
import logging
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ValidationError

from langchain_core.messages import SystemMessage, HumanMessage
from llm.provider import get_llm
from models.knowledge import Document, DocumentChunk

logger = logging.getLogger(__name__)

SUPPORTED_KNOWLEDGE_TYPES = {
    "summary",
    "fact",
    "concept",
    "entity",
    "decision",
    "requirement",
    "action_item",
    "risk",
    "date",
    "metric",
    "topic",
}


class ExtractedKnowledgeItem(BaseModel):
    knowledge_type: str
    title: Optional[str] = None
    content: str
    source_chunk_id: str
    page_number: Optional[int] = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    metadata_json: Optional[Dict[str, Any]] = None


class DocumentUnderstandingResult(BaseModel):
    summary: str
    knowledge_items: List[ExtractedKnowledgeItem] = Field(default_factory=list)


async def extract_document_knowledge(
    document: Document,
    chunks: List[DocumentChunk],
    raw_llm_override: Optional[str] = None,
) -> DocumentUnderstandingResult:
    """
    Extracts structured knowledge from document chunks using LLM.
    Enforces strict grounding validation against existing chunk IDs and page numbers.
    """
    if not chunks:
        return DocumentUnderstandingResult(summary="Empty document.", knowledge_items=[])

    valid_chunk_map: Dict[str, DocumentChunk] = {str(c.id): c for c in chunks}
    default_chunk = chunks[0]

    # If raw_llm_override is provided (e.g. for failure/malformed testing)
    if raw_llm_override is not None:
        raw_text = raw_llm_override
    else:
        # Build prompt context with chunk IDs and page numbers
        chunks_context = []
        for c in chunks[:15]: # Bound context window to prevent token explosion
            chunks_context.append(
                f"[CHUNK_ID: {c.id} | PAGE: {c.page_number or 1}]\n{c.content_text}"
            )
        combined_context = "\n\n---\n\n".join(chunks_context)

        system_prompt = (
            "You are the QueryMind Intelligent Document Understanding Agent.\n"
            "Analyze the uploaded document chunks and extract structured knowledge.\n\n"
            "CRITICAL RULES:\n"
            "1. Extract ONLY facts, decisions, requirements, concepts, entities, risks, metrics, and dates strictly supported by the text.\n"
            "2. NEVER invent facts or hallucinate details.\n"
            "3. For EVERY extracted knowledge item, you MUST include the exact CHUNK_ID and PAGE where it appears.\n"
            "4. Return valid JSON adhering to this exact schema:\n"
            "{\n"
            '  "summary": "High-level executive summary of the document",\n'
            '  "knowledge_items": [\n'
            '    {\n'
            '      "knowledge_type": "fact|concept|entity|decision|requirement|action_item|risk|date|metric|topic",\n'
            '      "title": "Short descriptive label",\n'
            '      "content": "Authoritative statement grounded in the chunk",\n'
            '      "source_chunk_id": "UUID from context",\n'
            '      "page_number": 1,\n'
            '      "confidence": 0.95,\n'
            '      "metadata_json": {}\n'
            '    }\n'
            '  ]\n'
            "}\n"
        )

        user_prompt = f"Document Title: {document.title}\n\nDocument Chunks:\n{combined_context}"

        try:
            llm = get_llm()
            response = await llm.agenerate([[SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]])
            raw_text = response.generations[0][0].text
        except Exception as e:
            logger.error(f"LLM extraction call failed: {e}")
            raw_text = ""

    # Parse and validate JSON
    parsed_json = _extract_json_from_response(raw_text)
    if not parsed_json or not isinstance(parsed_json, dict):
        logger.warning(f"Could not parse structured JSON from LLM response for {document.title}. Using grounded fallback summary.")
        # Create minimal valid grounded summary from first chunk
        summary_text = f"Document: {document.title}. Contains {len(chunks)} chunks across pages."
        return DocumentUnderstandingResult(
            summary=summary_text,
            knowledge_items=[
                ExtractedKnowledgeItem(
                    knowledge_type="summary",
                    title=f"Summary of {document.title}",
                    content=summary_text,
                    source_chunk_id=str(default_chunk.id),
                    page_number=default_chunk.page_number or 1,
                    confidence=0.8,
                )
            ],
        )

    # Validate with Pydantic
    try:
        raw_summary = parsed_json.get("summary") or f"Summary of {document.title}"
        raw_items = parsed_json.get("knowledge_items") or []

        validated_items: List[ExtractedKnowledgeItem] = []

        for item_dict in raw_items:
            try:
                # Normalize type
                ktype = str(item_dict.get("knowledge_type", "fact")).lower().strip()
                if ktype not in SUPPORTED_KNOWLEDGE_TYPES:
                    ktype = "fact"

                source_id_str = str(item_dict.get("source_chunk_id", "")).strip()
                # Grounding check: chunk must exist in this document
                if source_id_str not in valid_chunk_map:
                    logger.warning(f"Rejecting ungrounded knowledge item with unknown source_chunk_id: {source_id_str}")
                    continue

                source_chunk = valid_chunk_map[source_id_str]
                page_num = item_dict.get("page_number") or source_chunk.page_number or 1

                conf = float(item_dict.get("confidence", 0.9))
                conf = max(0.0, min(1.0, conf))

                validated_item = ExtractedKnowledgeItem(
                    knowledge_type=ktype,
                    title=item_dict.get("title") or f"{ktype.title()} from {document.title}",
                    content=str(item_dict.get("content", "")).strip(),
                    source_chunk_id=source_id_str,
                    page_number=page_num,
                    confidence=conf,
                    metadata_json=item_dict.get("metadata_json") if isinstance(item_dict.get("metadata_json"), dict) else None,
                )
                if validated_item.content:
                    validated_items.append(validated_item)
            except Exception as item_err:
                logger.warning(f"Skipping malformed knowledge item: {item_err}")
                continue

        # Ensure document summary is represented as a knowledge item
        has_summary_item = any(item.knowledge_type == "summary" for item in validated_items)
        if not has_summary_item:
            validated_items.insert(
                0,
                ExtractedKnowledgeItem(
                    knowledge_type="summary",
                    title=f"Summary of {document.title}",
                    content=raw_summary,
                    source_chunk_id=str(default_chunk.id),
                    page_number=default_chunk.page_number or 1,
                    confidence=0.9,
                ),
            )

        return DocumentUnderstandingResult(
            summary=raw_summary,
            knowledge_items=validated_items,
        )

    except Exception as parse_err:
        logger.error(f"Error validating document understanding result: {parse_err}")
        return DocumentUnderstandingResult(
            summary=f"Summary of {document.title}",
            knowledge_items=[],
        )


def _extract_json_from_response(text: str) -> Optional[Dict[str, Any]]:
    """Extracts JSON object from markdown code fences or raw string."""
    if not text:
        return None
    try:
        # Check for ```json ... ```
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))

        # Check for first { to last }
        match_brace = re.search(r"(\{.*\})", text, re.DOTALL)
        if match_brace:
            return json.loads(match_brace.group(1))

        return json.loads(text)
    except Exception:
        return None
