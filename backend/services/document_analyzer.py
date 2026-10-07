"""
QueryMind - Cross-Document Analyzer Service
Identifies patterns, trends, contradictions, and synergies across multiple ingested documents.
Supports batch analysis, pairwise comparison, and SSE streaming for real-time progress updates.
"""

import json
import logging
import uuid
from typing import List, Optional, Dict, Any, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from langchain_core.messages import SystemMessage, HumanMessage

from models.knowledge import Document, DocumentChunk
from schemas.analysis import (
    DocumentAnalysisResult,
    PatternItem,
    TrendItem,
    ContradictionItem,
)
from llm.provider import get_llm

logger = logging.getLogger(__name__)


class CrossDocumentAnalyzer:
    """Service for synthesizing insights and detecting relationships across multiple documents."""

    @classmethod
    async def load_document_contexts(
        cls,
        document_ids: List[uuid.UUID],
        db: AsyncSession,
        max_chunks_per_doc: int = 15,
    ) -> List[Dict[str, Any]]:
        """Loads document titles and their top chunk texts from PostgreSQL."""
        doc_contexts = []

        stmt = (
            select(Document)
            .options(selectinload(Document.chunks))
            .where(Document.id.in_(document_ids))
        )
        res = await db.execute(stmt)
        docs = res.scalars().all()

        for doc in docs:
            sorted_chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)[:max_chunks_per_doc]
            concatenated = "\n\n".join(
                f"[Excerpt {c.chunk_index + 1}]: {c.content_text.strip()}"
                for c in sorted_chunks
            )
            doc_contexts.append({
                "id": str(doc.id),
                "title": doc.title,
                "type": doc.type,
                "text": concatenated or "(Empty or unparsed document)",
                "chunk_count": len(doc.chunks),
            })

        return doc_contexts

    @classmethod
    async def analyze(
        cls,
        document_ids: List[uuid.UUID],
        db: AsyncSession,
        focus_areas: Optional[List[str]] = None,
        user_query: Optional[str] = None,
    ) -> DocumentAnalysisResult:
        """Executes multi-document pattern and trend analysis."""
        doc_contexts = await cls.load_document_contexts(document_ids, db)
        if len(doc_contexts) < 2:
            raise ValueError(f"Cross-document analysis requires at least 2 loaded documents (found {len(doc_contexts)})")

        prompt = cls._build_analysis_prompt(doc_contexts, focus_areas, user_query)
        llm = get_llm(temperature=0.2)

        try:
            # Attempt structured output extraction
            structured_llm = llm.with_structured_output(DocumentAnalysisResult)
            result = await structured_llm.ainvoke([
                SystemMessage(content=cls._get_system_prompt()),
                HumanMessage(content=prompt),
            ])
            if isinstance(result, DocumentAnalysisResult):
                return result
        except Exception as e:
            logger.warning(f"Structured output fallback triggered: {e}")

        # Fallback to direct JSON parsing
        response = await llm.ainvoke([
            SystemMessage(content=cls._get_system_prompt() + "\nCRITICAL: Respond ONLY in valid JSON matching the schema."),
            HumanMessage(content=prompt),
        ])
        content_str = response.content if hasattr(response, "content") else str(response)
        return cls._parse_fallback_json(content_str, doc_contexts)

    @classmethod
    async def analyze_stream(
        cls,
        document_ids: List[uuid.UUID],
        db: AsyncSession,
        focus_areas: Optional[List[str]] = None,
        user_query: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams step-by-step reasoning events via SSE, followed by the complete result."""
        # Step 1: Loading
        yield json.dumps({
            "step": "loading_documents",
            "message": f"Fetching and loading {len(document_ids)} target documents from database...",
            "progress": 20,
        })

        doc_contexts = await cls.load_document_contexts(document_ids, db)
        if len(doc_contexts) < 2:
            yield json.dumps({
                "step": "error",
                "message": f"Expected at least 2 documents, found {len(doc_contexts)}.",
                "progress": 100,
            })
            return

        titles = [d["title"] for d in doc_contexts]
        # Step 2: Context assembled
        yield json.dumps({
            "step": "extracting_patterns",
            "message": f"Assembled context for: {', '.join(titles[:3])}{'...' if len(titles) > 3 else ''}. Scanning recurring patterns...",
            "progress": 45,
        })

        # Step 3: Detecting trends & contradictions
        yield json.dumps({
            "step": "analyzing_trajectories",
            "message": "Tracing chronological developments, metric shifts, and conflicting claims...",
            "progress": 70,
        })

        prompt = cls._build_analysis_prompt(doc_contexts, focus_areas, user_query)
        llm = get_llm(temperature=0.2)

        try:
            structured_llm = llm.with_structured_output(DocumentAnalysisResult)
            result = await structured_llm.ainvoke([
                SystemMessage(content=cls._get_system_prompt()),
                HumanMessage(content=prompt),
            ])
            if not isinstance(result, DocumentAnalysisResult):
                result = cls._parse_fallback_json(str(result), doc_contexts)
        except Exception:
            response = await llm.ainvoke([
                SystemMessage(content=cls._get_system_prompt() + "\nCRITICAL: Output purely valid JSON."),
                HumanMessage(content=prompt),
            ])
            raw_text = response.content if hasattr(response, "content") else str(response)
            result = cls._parse_fallback_json(raw_text, doc_contexts)

        # Step 4: Final Synthesis Complete
        yield json.dumps({
            "step": "complete",
            "message": "Multi-document synthesis successfully generated.",
            "progress": 100,
            "data": result.model_dump(),
        })

    @classmethod
    async def compare_two_documents(
        cls,
        doc_id_a: uuid.UUID,
        doc_id_b: uuid.UUID,
        db: AsyncSession,
        aspects: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Produces a structured, domain-aware comparison between two documents."""
        doc_contexts = await cls.load_document_contexts([doc_id_a, doc_id_b], db)
        if len(doc_contexts) != 2:
            raise ValueError("Exactly 2 documents are required for pairwise comparison")

        doc_a, doc_b = doc_contexts[0], doc_contexts[1]

        prompt = f"""You are an elite academic curriculum and technical documentation analyst.
Compare the following two documents thoroughly at a macro conceptual level.

CRITICAL INSTRUCTIONS:
1. DO NOT pair arbitrary individual test questions together just because they appear in the same position or share superficial words like 'First' or 'Define'.
2. Identify the true subject domain of Document A and Document B (e.g., Compiler Design vs Artificial Intelligence & Expert Systems).
3. If the two documents cover different subjects, state that clearly and explain their core differences in scope, purpose, and foundational theories.
4. If there are genuine thematic overlaps (e.g., formal grammars, logic representation, tree search vs parsing trees), highlight them under shared_themes. If there is little to no overlap, state that they are distinct specialized domains with different engineering goals.
5. In "key_differences", provide high-level, meaningful dimensions (such as "Core Domain & Purpose", "Primary Algorithmic Focus", "Theoretical Foundations", "Practical Applications"). Explain Document A's perspective vs Document B's perspective.
6. Provide "unique_to_a" (key topics exclusive to Document A) and "unique_to_b" (key topics exclusive to Document B).

DOCUMENT A: "{doc_a['title']}"
{doc_a['text'][:4000]}

DOCUMENT B: "{doc_b['title']}"
{doc_b['text'][:4000]}

Return purely valid JSON matching this schema:
{{
  "document_a_title": "{doc_a['title']}",
  "document_b_title": "{doc_b['title']}",
  "document_a_domain": "string (e.g. Compiler Design & Language Processing)",
  "document_b_domain": "string (e.g. Artificial Intelligence & Knowledge Systems)",
  "relationship_nature": "string (e.g. Distinct Computer Science disciplines / Complementary subjects / Direct revision)",
  "shared_themes": ["string"],
  "unique_to_a": ["string"],
  "unique_to_b": ["string"],
  "key_differences": [
    {{
      "aspect": "string (e.g. Core Objective & Scope)",
      "document_a_view": "string",
      "document_b_view": "string"
    }}
  ],
  "agreements": ["string"],
  "verdict_or_summary": "Thorough analytical synthesis summarizing how these two documents relate, their distinct purposes, and how a student or engineer should approach both."
}}"""

        llm = get_llm(temperature=0.2)
        resp = await llm.ainvoke([
            SystemMessage(content="You are an expert technical curriculum and systems analyst. Return ONLY a valid JSON object."),
            HumanMessage(content=prompt),
        ])

        raw_str = resp.content if hasattr(resp, "content") else str(resp)
        clean_json = raw_str.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json.split("```json", 1)[1].split("```", 1)[0].strip()
        elif clean_json.startswith("```"):
            clean_json = clean_json.split("```", 1)[1].split("```", 1)[0].strip()

        try:
            return json.loads(clean_json)
        except Exception:
            return {
                "document_a_title": doc_a["title"],
                "document_b_title": doc_b["title"],
                "document_a_domain": "Technical Document",
                "document_b_domain": "Technical Document",
                "relationship_nature": "Comparative Review",
                "shared_themes": [],
                "unique_to_a": [],
                "unique_to_b": [],
                "key_differences": [],
                "agreements": [],
                "verdict_or_summary": raw_str,
            }

    @staticmethod
    def _get_system_prompt() -> str:
        return """You are the QueryMind Multi-Document Intelligence Specialist.
Your purpose is to thoroughly examine multiple knowledge documents, compare their findings, and produce high-level intelligence:
1. Patterns: Identify recurring themes, shared methodologies, or correlated phenomena appearing across multiple documents.
2. Trends: Spot directional changes, historical developments, evolutions, or metric trajectories over time.
3. Contradictions: Detect discrepancies, divergent opinions, incompatible figures, or contradictory conclusions between sources.
4. Recommendations: Provide actionable, high-agency insights derived from synthesized evidence.

Be precise, objective, and ground all claims in the provided source texts."""

    @classmethod
    def _build_analysis_prompt(
        cls,
        doc_contexts: List[Dict[str, Any]],
        focus_areas: Optional[List[str]] = None,
        user_query: Optional[str] = None,
    ) -> str:
        parts = ["Please analyze the following set of documents:"]

        if user_query:
            parts.append(f"\nUser Guiding Query: \"{user_query}\"")

        if focus_areas:
            parts.append(f"Primary Focus Areas: {', '.join(focus_areas)}")

        parts.append("\n--- BEGIN DOCUMENTS CONTEXT ---\n")
        for idx, doc in enumerate(doc_contexts, 1):
            parts.append(f"### Document {idx}: \"{doc['title']}\" (ID: {doc['id']})")
            parts.append(f"{doc['text'][:2500]}\n")
            parts.append("----------------------------\n")
        parts.append("--- END DOCUMENTS CONTEXT ---\n")

        parts.append("""
Produce a comprehensive DocumentAnalysisResult JSON object with:
{
  "executive_summary": "Thorough high-level overview of cross-document findings",
  "documents_analyzed_count": integer,
  "document_titles": ["title1", "title2", ...],
  "patterns": [
    {
      "title": "Pattern Name",
      "description": "Thorough pattern description",
      "source_documents": ["Doc A", "Doc B"],
      "confidence": 0.95
    }
  ],
  "trends": [
    {
      "topic": "Topic Name",
      "direction": "up" | "down" | "neutral" | "emerging",
      "description": "Trajectory explanation",
      "time_period": "e.g. Q1 to Q4 or 2024-2026",
      "source_documents": ["Doc A", "Doc B"]
    }
  ],
  "contradictions": [
    {
      "issue": "Disagreement point",
      "description": "Why they diverge",
      "conflicting_sources": [{"source": "Doc A", "claim": "..."}, {"source": "Doc B", "claim": "..."}],
      "suggested_resolution": "Resolution rationale"
    }
  ],
  "recommendations": [
    "Actionable next step 1",
    "Actionable next step 2"
  ]
}
""")
        return "\n".join(parts)

    @classmethod
    def _parse_fallback_json(
        cls,
        raw_text: str,
        doc_contexts: List[Dict[str, Any]],
    ) -> DocumentAnalysisResult:
        clean = raw_text.strip()
        if clean.startswith("```json"):
            clean = clean.split("```json", 1)[1].split("```", 1)[0].strip()
        elif clean.startswith("```"):
            clean = clean.split("```", 1)[1].split("```", 1)[0].strip()

        titles = [d["title"] for d in doc_contexts]

        try:
            data = json.loads(clean)
            return DocumentAnalysisResult(
                executive_summary=data.get("executive_summary", "Cross-document synthesis completed."),
                documents_analyzed_count=data.get("documents_analyzed_count", len(doc_contexts)),
                document_titles=data.get("document_titles", titles),
                patterns=[PatternItem(**p) for p in data.get("patterns", [])],
                trends=[TrendItem(**t) for t in data.get("trends", [])],
                contradictions=[ContradictionItem(**c) for c in data.get("contradictions", [])],
                recommendations=data.get("recommendations", []),
            )
        except Exception as err:
            logger.error(f"Failed to parse LLM analysis fallback: {err}")
            return DocumentAnalysisResult(
                executive_summary=raw_text[:500] if raw_text else "Analysis generated.",
                documents_analyzed_count=len(doc_contexts),
                document_titles=titles,
                patterns=[
                    PatternItem(
                        title="General Cross-Document Theme",
                        description="Synthesized general findings across documents.",
                        source_documents=titles,
                        confidence=0.8,
                    )
                ],
                trends=[],
                contradictions=[],
                recommendations=["Review individual document details for specific numerical claims."],
            )
