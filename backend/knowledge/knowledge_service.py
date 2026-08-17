"""
QueryMind - RAG (Retrieval-Augmented Generation) Pipeline
The core AI orchestrator that ties everything together.

Flow: User Query → Embed → Vector Search → Build Context → LLM Generate → Response with Citations
"""

from typing import List, Dict, Optional
from dataclasses import dataclass

from llm.provider import llm_service, LLMService
from knowledge.vector_store import vector_store, VectorStoreService


@dataclass
class RAGResponse:
    """Structured response from the RAG pipeline."""
    answer: str
    citations: List[Dict]
    suggested_questions: List[str]


# System prompt for the QueryMind AI
SYSTEM_PROMPT = """You are QueryMind, an intelligent and versatile AI assistant.
You can answer general knowledge questions, day-to-day life queries, technical topics, coding, and synthesize the user's uploaded documents.

RULES:
1. If the user's question relates to their uploaded documents, answer using the provided context and mention the source document.
2. If the user asks a general knowledge or day-to-day question (e.g. 'what is the capital of India', 'how are you', 'explain gravity', coding help, etc.) and the context is not relevant:
   - Answer the question directly, accurately, and naturally using your broad knowledge.
   - NEVER say "I couldn't find this information in your documents" unless the user specifically asked you to find it in their files.
3. Be clear, accurate, and structured with clean Markdown."""


CONTEXT_TEMPLATE = """
--- CONTEXT FROM USER'S DOCUMENTS ---
{context}
--- END OF CONTEXT ---

User's Question: {query}

Based on the above context from the user's personal documents, provide a helpful and accurate answer.
If you reference specific information, mention which document it came from.
"""

SUGGESTION_PROMPT = """Based on the user's question and the context provided, suggest 3 follow-up questions
the user might want to ask. Return them as a simple numbered list.

Question: {query}
Context summary: {context_summary}

Return ONLY the 3 questions, one per line, numbered 1-3."""


class RAGPipeline:
    """
    Retrieval-Augmented Generation pipeline.

    Steps:
    1. Embed user query using BGE-Small
    2. Search Qdrant for top-K similar chunks (ANN + Cosine Similarity)
    3. Build context prompt from retrieved chunks
    4. Send context + query to LLM (Gemini/Ollama)
    5. Parse response and extract citations
    6. Generate suggested follow-up questions
    """

    def __init__(
        self,
        llm: LLMService = llm_service,
        store: VectorStoreService = vector_store,
        top_k: int = 10,
    ):
        self.llm = llm
        self.store = store
        self.top_k = top_k

    async def query(
        self,
        user_query: str,
        user_id: str,
        document_ids: Optional[List[str]] = None,
        document_title: Optional[str] = None,
        top_k: Optional[int] = None,
    ) -> RAGResponse:
        """
        Execute the full RAG pipeline.

        Args:
            user_query: Natural language question from the user
            user_id: Current user's ID (for filtering vectors)
            document_ids: Optional list of document IDs to search within
            document_title: Optional document title to filter search
            top_k: Override default number of chunks to retrieve

        Returns:
            RAGResponse with answer, citations, and suggested questions
        """
        k = top_k or self.top_k

        # Step 1 & 2: Embed query and search for similar chunks
        search_results = self.store.search_similar(
            query=user_query,
            user_id=user_id,
            document_title=document_title,
            top_k=k,
        )

        # If no results found
        if not search_results:
            return RAGResponse(
                answer="I couldn't find any relevant information in your documents. "
                       "Try uploading more documents or rephrasing your question.",
                citations=[],
                suggested_questions=[
                    "What documents have I uploaded?",
                    "Can you summarize my documents?",
                    "What topics are covered in my files?",
                ],
            )

        # Step 3: Build context from retrieved chunks
        context = self._build_context(search_results)

        # Step 4: Generate response using LLM
        prompt = CONTEXT_TEMPLATE.format(
            context=context,
            query=user_query,
        )

        answer = await self.llm.generate(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
        )

        # Step 5: Build citations from search results
        citations = self._build_citations(search_results)

        # Step 6: Generate suggested follow-up questions
        suggested = await self._generate_suggestions(user_query, context[:500])

        return RAGResponse(
            answer=answer,
            citations=citations,
            suggested_questions=suggested,
        )

    def _build_context(self, search_results: List[Dict]) -> str:
        """Build context string from retrieved chunks."""
        context_parts = []

        for i, result in enumerate(search_results, 1):
            doc_title = result.get("document_title", "Unknown Document")
            page = result.get("page_number", "N/A")
            content = result.get("content", "")
            score = result.get("score", 0)

            context_parts.append(
                f"[Source {i}] Document: \"{doc_title}\" | Page: {page} | Relevance: {score:.2f}\n"
                f"{content}"
            )

        return "\n\n".join(context_parts)

    def _build_citations(self, search_results: List[Dict]) -> List[Dict]:
        """Build structured citations from search results."""
        return [
            {
                "source_number": i + 1,
                "document_id": result.get("document_id", ""),
                "document_title": result.get("document_title", ""),
                "page_number": result.get("page_number"),
                "excerpt": result.get("content", "")[:200] + "...",
                "relevance_score": round(result.get("score", 0), 3),
            }
            for i, result in enumerate(search_results)
        ]

    async def _generate_suggestions(
        self, query: str, context_summary: str
    ) -> List[str]:
        """Generate follow-up question suggestions."""
        try:
            prompt = SUGGESTION_PROMPT.format(
                query=query,
                context_summary=context_summary,
            )
            response = await self.llm.generate(prompt=prompt)

            # Parse numbered list
            questions = []
            for line in response.strip().split("\n"):
                line = line.strip()
                if line and line[0].isdigit():
                    # Remove number prefix like "1. " or "1) "
                    cleaned = line.lstrip("0123456789.)- ").strip()
                    if cleaned:
                        questions.append(cleaned)

            return questions[:3]  # Max 3 suggestions
        except Exception:
            return []


# Singleton instance
rag_pipeline = RAGPipeline()
