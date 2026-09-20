import pytest
import pytest_asyncio
import uuid
import json
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from core.config import settings
from database.postgres import async_session
from models.core import Space
from models.knowledge import Document, DocumentChunk, Knowledge
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun
from orchestrator.state import AgentState
from orchestrator.agents.researcher import research_node
from orchestrator.agents.synthesizer import synthesis_node
from rag.knowledge_ingestion import ingest_document_knowledge
from rag.knowledge_retriever import retrieve_knowledge
from rag.ingestion import IngestionEngine
from schemas.action_proposal import DecisionEvidence
from tests.conftest import USER_1_ID, USER_2_ID

TEST_SPACE_A = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
TEST_SPACE_B = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Setup test spaces
        space_a = Space(id=TEST_SPACE_A, user_id=USER_1_ID, name="Space A", description="Test Space A")
        space_b = Space(id=TEST_SPACE_B, user_id=USER_2_ID, name="Space B", description="Test Space B")
        session.add_all([space_a, space_b])
        await session.commit()

        yield session

        await session.rollback()
        # Clean up all created test entities
        await session.execute(text("DELETE FROM knowledge"))
        await session.execute(text("DELETE FROM document_chunks"))
        await session.execute(text("DELETE FROM documents"))
        await session.execute(text("DELETE FROM agent_runs"))
        await session.execute(text("DELETE FROM workflow_steps"))
        await session.execute(text("DELETE FROM workflows"))
        await session.execute(text("DELETE FROM syntheses"))
        await session.execute(text("DELETE FROM objectives"))
        await session.execute(text("DELETE FROM spaces WHERE id IN (:sa, :sb)"), {"sa": TEST_SPACE_A, "sb": TEST_SPACE_B})
        await session.commit()


def make_raw_llm_json(chunk_id: str, page: int = 1, prefix: str = "Knowledge") -> str:
    return json.dumps({
        "summary": f"{prefix} summary statement.",
        "knowledge_items": [
            {
                "knowledge_type": "decision",
                "title": f"{prefix} Architectural Decision",
                "content": f"{prefix} decided to deploy edge consensus nodes.",
                "source_chunk_id": str(chunk_id),
                "page_number": page,
                "confidence": 0.95,
                "metadata_json": {"tag": "architecture"}
            },
            {
                "knowledge_type": "requirement",
                "title": f"{prefix} Latency Requirement",
                "content": f"{prefix} requires sub-12ms latency across edge nodes.",
                "source_chunk_id": str(chunk_id),
                "page_number": page,
                "confidence": 0.98,
                "metadata_json": {"sla": "12ms"}
            }
        ]
    })


# -----------------------------------------------------------------------------
# 1. Document -> Knowledge Ingestion
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_1_document_to_knowledge_ingestion(db: AsyncSession):
    """Verifies that ingest_document_knowledge persists grounded Knowledge rows in Postgres and points in Qdrant."""
    doc_id = uuid.uuid4()
    chunk_id = uuid.uuid4()

    doc = Document(
        id=doc_id,
        space_id=TEST_SPACE_A,
        title="Architecture Spec.pdf",
        file_url="/tmp/spec.pdf",
        type="application/pdf",
        status="processing"
    )
    chunk = DocumentChunk(
        id=chunk_id,
        document_id=doc_id,
        chunk_index=0,
        content_text="Project Hyperion selected edge nodes. Latency must be sub-12ms.",
        page_number=1,
        token_count=20,
        embedding_status="completed"
    )
    db.add_all([doc, chunk])
    await db.commit()

    raw_override = make_raw_llm_json(str(chunk_id), page=1, prefix="Doc1")
    records = await ingest_document_knowledge(
        document=doc,
        chunks=[chunk],
        user_id=str(USER_1_ID),
        space_id=str(TEST_SPACE_A),
        db=db,
        raw_llm_override=raw_override
    )
    await db.commit()

    # 1 summary + 2 structured items = 3 total
    assert len(records) == 3
    # Verify in PostgreSQL
    stmt = select(Knowledge).where(Knowledge.document_id == doc_id)
    res = await db.execute(stmt)
    pg_rows = res.scalars().all()
    assert len(pg_rows) == 3

    types = {r.knowledge_type for r in pg_rows}
    assert "summary" in types
    assert "decision" in types
    assert "requirement" in types

    for r in pg_rows:
        assert r.space_id == TEST_SPACE_A
        assert r.user_id == USER_1_ID
        assert r.document_id == doc_id


# -----------------------------------------------------------------------------
# 2. Space Isolation (Space A vs Space B)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_2_space_isolation_boundary(db: AsyncSession):
    """Verifies that Knowledge query in Space A NEVER returns Knowledge from Space B."""
    space_a_id = uuid.uuid4()
    space_b_id = uuid.uuid4()
    space_a = Space(id=space_a_id, user_id=USER_1_ID, name="Space Iso A", description="Test Space A")
    space_b = Space(id=space_b_id, user_id=USER_2_ID, name="Space Iso B", description="Test Space B")
    db.add_all([space_a, space_b])
    await db.commit()

    # Create Document in Space A
    doc_a = Document(id=uuid.uuid4(), space_id=space_a_id, title="Space A Doc", file_url="a.pdf", type="pdf", status="completed")
    chunk_a = DocumentChunk(id=uuid.uuid4(), document_id=doc_a.id, chunk_index=0, content_text="Space A Secret Data", page_number=1)
    db.add_all([doc_a, chunk_a])
    await db.commit()

    await ingest_document_knowledge(
        document=doc_a,
        chunks=[chunk_a],
        user_id=str(USER_1_ID),
        space_id=str(space_a_id),
        db=db,
        raw_llm_override=make_raw_llm_json(str(chunk_a.id), prefix="AlphaSpace")
    )

    # Create Document in Space B
    doc_b = Document(id=uuid.uuid4(), space_id=space_b_id, title="Space B Doc", file_url="b.pdf", type="pdf", status="completed")
    chunk_b = DocumentChunk(id=uuid.uuid4(), document_id=doc_b.id, chunk_index=0, content_text="Space B Confidential", page_number=1)
    db.add_all([doc_b, chunk_b])
    await db.commit()

    await ingest_document_knowledge(
        document=doc_b,
        chunks=[chunk_b],
        user_id=str(USER_2_ID),
        space_id=str(space_b_id),
        db=db,
        raw_llm_override=make_raw_llm_json(str(chunk_b.id), prefix="BetaSpace")
    )
    await db.commit()

    # Query Space A
    results_a = await retrieve_knowledge(
        query="edge consensus nodes latency",
        user_id=str(USER_1_ID),
        space_id=str(space_a_id),
        top_k=10
    )
    # Every result must belong to Space A and Doc A
    assert len(results_a) > 0
    for item in results_a:
        assert item["document_id"] == str(doc_a.id)
        assert "AlphaSpace" in item["content"]
        assert "BetaSpace" not in item["content"]

    # Query Space B
    results_b = await retrieve_knowledge(
        query="edge consensus nodes latency",
        user_id=str(USER_2_ID),
        space_id=str(space_b_id),
        top_k=10
    )
    assert len(results_b) > 0
    for item in results_b:
        assert item["document_id"] == str(doc_b.id)
        assert "BetaSpace" in item["content"]
        assert "AlphaSpace" not in item["content"]


# -----------------------------------------------------------------------------
# 3. Provenance Integrity
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_3_provenance_integrity(db: AsyncSession):
    """Verifies that retrieved knowledge items preserve document_id, source_chunk_id, page_number, title, score, and source_type."""
    doc_id = uuid.uuid4()
    chunk_id = uuid.uuid4()

    test_space = uuid.uuid4()
    sp = Space(id=test_space, user_id=USER_1_ID, name="Provenance Space", description="Provenance")
    doc = Document(id=doc_id, space_id=test_space, title="Security Policy.pdf", file_url="sec.pdf", type="pdf", status="completed")
    chunk = DocumentChunk(id=chunk_id, document_id=doc_id, chunk_index=0, content_text="RSA-2048 vulnerable. Migrate to Kyber.", page_number=7)
    db.add_all([sp, doc, chunk])
    await db.commit()

    raw_json = json.dumps({
        "summary": "Security Policy Summary",
        "knowledge_items": [
            {
                "knowledge_type": "risk",
                "title": "Quantum Vulnerability",
                "content": "RSA-2048 keys are vulnerable to quantum decryption.",
                "source_chunk_id": str(chunk_id),
                "page_number": 7,
                "confidence": 0.99,
                "metadata_json": {"algorithm": "RSA"}
            }
        ]
    })
    await ingest_document_knowledge(
        document=doc,
        chunks=[chunk],
        user_id=str(USER_1_ID),
        space_id=str(test_space),
        db=db,
        raw_llm_override=raw_json
    )
    await db.commit()

    results = await retrieve_knowledge(
        query="quantum decryption vulnerability",
        user_id=str(USER_1_ID),
        space_id=str(test_space),
        top_k=5
    )
    assert len(results) >= 1
    item = results[0]

    assert item["source_type"] == "knowledge"
    assert item["document_id"] == str(doc_id)
    assert item["source_chunk_id"] == str(chunk_id)
    assert item["page_number"] == 7
    assert item["document_title"] == "Security Policy.pdf"
    assert item["knowledge_type"] == "risk"
    assert isinstance(item["relevance_score"], float)
    assert "RSA-2048" in item["content"]

    await db.execute(text("DELETE FROM spaces WHERE id = :sid"), {"sid": test_space})
    await db.commit()


# -----------------------------------------------------------------------------
# 4. Retry / Idempotency & Failure-Safe Replacement
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_4_retry_and_idempotency(db: AsyncSession):
    """Verifies that re-ingesting the same document replaces old items without duplicates, and failed runs keep old items intact."""
    doc_id = uuid.uuid4()
    chunk_id = uuid.uuid4()

    doc = Document(id=doc_id, space_id=TEST_SPACE_A, title="Roadmap.pdf", file_url="roadmap.pdf", type="pdf", status="completed")
    chunk = DocumentChunk(id=chunk_id, document_id=doc_id, chunk_index=0, content_text="Roadmap Q1 vs Q2 features", page_number=1)
    db.add_all([doc, chunk])
    await db.commit()

    # Initial ingestion: Version 1
    v1_json = make_raw_llm_json(str(chunk_id), prefix="Version1")
    await ingest_document_knowledge(
        document=doc,
        chunks=[chunk],
        user_id=str(USER_1_ID),
        space_id=str(TEST_SPACE_A),
        db=db,
        raw_llm_override=v1_json
    )
    await db.commit()

    stmt = select(Knowledge).where(Knowledge.document_id == doc_id)
    v1_rows = (await db.execute(stmt)).scalars().all()
    assert len(v1_rows) == 3
    v1_ids = {r.id for r in v1_rows}

    # Re-ingest same document: Version 2
    v2_json = make_raw_llm_json(str(chunk_id), prefix="Version2")
    await ingest_document_knowledge(
        document=doc,
        chunks=[chunk],
        user_id=str(USER_1_ID),
        space_id=str(TEST_SPACE_A),
        db=db,
        raw_llm_override=v2_json
    )
    await db.commit()

    # Total rows must still be exactly 3 (old ones replaced, no duplicates)
    v2_rows = (await db.execute(stmt)).scalars().all()
    assert len(v2_rows) == 3
    v2_ids = {r.id for r in v2_rows}
    assert v1_ids.isdisjoint(v2_ids)  # Completely new IDs
    for r in v2_rows:
        assert "Version2" in r.content

    # Test Failure-Safe preservation:
    # If a re-ingestion attempt fails during upsert, the old (v2) records must NOT be lost!
    with pytest.raises(RuntimeError):
        await ingest_document_knowledge(
            document=doc,
            chunks=[chunk],
            user_id=str(USER_1_ID),
            space_id=str(TEST_SPACE_A),
            db=db,
            fail_at_stage="after_knowledge_postgres",
            raw_llm_override=make_raw_llm_json(str(chunk_id), prefix="Version3_Fail")
        )
    await db.rollback()

    # Old v2 records are still present!
    surviving_rows = (await db.execute(stmt)).scalars().all()
    assert len(surviving_rows) == 3
    assert {r.id for r in surviving_rows} == v2_ids


# -----------------------------------------------------------------------------
# 5. Knowledge Extraction Failure Tolerance in Ingestion Pipeline
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_5_knowledge_extraction_failure_tolerance(db: AsyncSession):
    """Verifies that transient/LLM failure during knowledge extraction does NOT break raw chunk ingestion."""
    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        space_id=TEST_SPACE_A,
        title="Sample Text.txt",
        file_url="nonexistent.txt",
        type="text/plain",
        status="pending"
    )
    db.add(doc)
    await db.commit()

    engine = IngestionEngine()

    # Mock loaders & embeddings
    mock_lc_doc = MagicMock(page_content="Operational system data for testing pipeline resilience.", metadata={"page": 1})
    mock_embeddings = AsyncMock()
    mock_embeddings.aembed_documents.return_value = [[0.1] * settings.EMBEDDING_DIMENSION]

    with patch.object(engine, "_load_document", return_value=[mock_lc_doc]), \
         patch("rag.ingestion.get_embeddings", return_value=mock_embeddings), \
         patch("rag.ingestion.AsyncQdrantClient.upsert", new_callable=AsyncMock), \
         patch("rag.ingestion.ingest_document_knowledge", side_effect=Exception("Simulated LLM rate limit failure")):

        await engine.run_ingestion(
            document_id=str(doc_id),
            file_path="sample.txt",
            filename="Sample Text.txt",
            content_type="text/plain",
            user_id=str(USER_1_ID),
            space_id=str(TEST_SPACE_A),
        )

    # Document must reach "completed" status despite knowledge extraction failure!
    await db.refresh(doc)
    assert doc.status == "completed"
    assert doc.error_message is None

    # Raw document chunks must be successfully saved
    stmt = select(DocumentChunk).where(DocumentChunk.document_id == doc_id)
    chunks = (await db.execute(stmt)).scalars().all()
    assert len(chunks) > 0
    assert chunks[0].embedding_status == "completed"

    # Also test that explicit test failure mode re-raises and sets doc to failed
    doc_fail_id = uuid.uuid4()
    doc_fail = Document(
        id=doc_fail_id,
        space_id=TEST_SPACE_A,
        title="Fail Text.txt",
        file_url="fail.txt",
        type="text/plain",
        status="pending"
    )
    db.add(doc_fail)
    await db.commit()

    with patch.object(engine, "_load_document", return_value=[mock_lc_doc]), \
         patch("rag.ingestion.get_embeddings", return_value=mock_embeddings), \
         patch("rag.ingestion.AsyncQdrantClient.upsert", new_callable=AsyncMock), \
         patch("rag.ingestion.ingest_document_knowledge", side_effect=RuntimeError("Simulated failure at stage: after_knowledge_postgres")):

        await engine.run_ingestion(
            document_id=str(doc_fail_id),
            file_path="fail.txt",
            filename="Fail Text.txt",
            content_type="text/plain",
            user_id=str(USER_1_ID),
            space_id=str(TEST_SPACE_A),
            fail_at_stage="after_knowledge_postgres"
        )

    await db.refresh(doc_fail)
    assert doc_fail.status == "failed"
    assert "after_knowledge_postgres" in doc_fail.error_message


# -----------------------------------------------------------------------------
# 6. Researcher Consuming Both Evidence Types
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_6_researcher_consumes_both_evidence_types(db: AsyncSession):
    """Verifies that Researcher node retrieves and populates evidence from both raw chunks and structured knowledge."""
    obj_id = uuid.uuid4()
    objective = Objective(id=obj_id, user_id=USER_1_ID, space_id=TEST_SPACE_A, raw_input="Test Objective")
    wf = Workflow(id=uuid.uuid5(obj_id, "workflow"), objective_id=obj_id, space_id=TEST_SPACE_A, status="active")
    db.add_all([objective, wf])
    await db.commit()

    mock_raw_chunks = [
        {
            "chunk_id": "chunk-111",
            "document_id": str(uuid.uuid4()),
            "document_title": "SysArch.pdf",
            "content": "Raw chunk text about consensus algorithm.",
            "page_number": 2,
            "score": 0.88,
            "source_type": "document"
        }
    ]
    mock_knowledge_items = [
        {
            "knowledge_id": "kn-222",
            "chunk_id": "chunk-111",
            "document_id": str(uuid.uuid4()),
            "document_title": "SysArch.pdf",
            "content": "Decision: Edge nodes run Paxos consensus.",
            "page_number": 2,
            "knowledge_type": "decision",
            "relevance_score": 0.92,
            "source_type": "knowledge"
        }
    ]

    state: AgentState = {
        "user_id": str(USER_1_ID),
        "space_id": str(TEST_SPACE_A),
        "objective_id": str(obj_id),
        "conversation_id": str(uuid.uuid4()),
        "raw_query": "What consensus algorithm is used?",
        "chat_history": [],
        "workspace_context": {},
        "planner_output": None,
        "research_tasks": [{"id": "task_1", "query": "consensus algorithm", "purpose": "check consensus", "status": "pending"}],
        "research_results": [],
        "critic_output": None,
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "in_progress",
        "decision_output": None,
        "action_proposals": [],
        "final_synthesis": "",
        "citations": []
    }

    with patch("orchestrator.agents.researcher.retrieve_context", new_callable=AsyncMock) as mock_ctx, \
         patch("orchestrator.agents.researcher.retrieve_knowledge", new_callable=AsyncMock) as mock_kn:

        mock_ctx.return_value = mock_raw_chunks
        mock_kn.return_value = mock_knowledge_items

        res_state = await research_node(state, {"configurable": {"db": db}})

    assert len(res_state["research_results"]) == 1
    evidence = res_state["research_results"][0]["evidence"]
    assert len(evidence) == 2

    source_types = {e["source_type"] for e in evidence}
    assert "document" in source_types
    assert "knowledge" in source_types


# -----------------------------------------------------------------------------
# 7. Deterministic Bounded Merge
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_7_deterministic_bounded_merge(db: AsyncSession):
    """Verifies bounds: max 5 raw docs, max 4 knowledge items, max 8 merged total, sorted by relevance score descending."""
    obj_id = uuid.uuid4()
    objective = Objective(id=obj_id, user_id=USER_1_ID, space_id=TEST_SPACE_A, raw_input="Merge Test")
    wf = Workflow(id=uuid.uuid5(obj_id, "workflow"), objective_id=obj_id, space_id=TEST_SPACE_A, status="active")
    db.add_all([objective, wf])
    await db.commit()

    # Generate 6 raw chunks (scores 0.50 to 0.75)
    raw_chunks = [
        {
            "chunk_id": f"chunk-{i}",
            "document_id": str(uuid.uuid4()),
            "document_title": f"Doc {i}",
            "content": f"Raw chunk content {i}",
            "page_number": 1,
            "score": 0.50 + (i * 0.05),
            "source_type": "document"
        }
        for i in range(6)
    ]
    # Generate 5 knowledge items (scores 0.60 to 0.90)
    knowledge_items = [
        {
            "knowledge_id": f"kn-{j}",
            "chunk_id": f"chunk-ref-{j}",
            "document_id": str(uuid.uuid4()),
            "document_title": f"Knowledge Doc {j}",
            "content": f"Knowledge content {j}",
            "page_number": 1,
            "knowledge_type": "fact",
            "relevance_score": 0.60 + (j * 0.07),
            "source_type": "knowledge"
        }
        for j in range(5)
    ]

    state: AgentState = {
        "user_id": str(USER_1_ID),
        "space_id": str(TEST_SPACE_A),
        "objective_id": str(obj_id),
        "conversation_id": str(uuid.uuid4()),
        "raw_query": "Test query for merge limits",
        "chat_history": [],
        "workspace_context": {},
        "planner_output": None,
        "research_tasks": [{"id": "t1", "query": "limits", "purpose": "test", "status": "pending"}],
        "research_results": [],
        "critic_output": None,
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "in_progress",
        "decision_output": None,
        "action_proposals": [],
        "final_synthesis": "",
        "citations": []
    }

    with patch("orchestrator.agents.researcher.retrieve_context", new_callable=AsyncMock) as mock_ctx, \
         patch("orchestrator.agents.researcher.retrieve_knowledge", new_callable=AsyncMock) as mock_kn:

        mock_ctx.return_value = raw_chunks
        mock_kn.return_value = knowledge_items

        res_state = await research_node(state, {"configurable": {"db": db}})

    evidence = res_state["research_results"][0]["evidence"]
    # Bounded merge asserts:
    assert len(evidence) <= 8
    assert len(evidence) == 8  # 5 raw + 4 kn = 9, capped at 8

    # Must be sorted strictly descending by relevance_score
    scores = [e["relevance_score"] for e in evidence]
    assert scores == sorted(scores, reverse=True)


# -----------------------------------------------------------------------------
# 8. Citation & Provenance Preservation in Synthesis and Actions
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_8_citation_and_provenance_preservation(db: AsyncSession):
    """Verifies that citations generated by Synthesizer preserve document_id, source_type, and cleanly map to DecisionEvidence."""
    obj_id = uuid.uuid4()
    objective = Objective(id=obj_id, user_id=USER_1_ID, space_id=TEST_SPACE_A, raw_input="Citation Objective")
    wf = Workflow(id=uuid.uuid5(obj_id, "workflow"), objective_id=obj_id, space_id=TEST_SPACE_A, status="active")
    db.add_all([objective, wf])
    await db.commit()

    test_doc_id = str(uuid.uuid4())
    test_chunk_id = str(uuid.uuid4())

    state: AgentState = {
        "user_id": str(USER_1_ID),
        "space_id": str(TEST_SPACE_A),
        "objective_id": str(obj_id),
        "conversation_id": str(uuid.uuid4()),
        "raw_query": "Explain the architecture decision",
        "chat_history": [],
        "workspace_context": {},
        "planner_output": {"needs_research": True, "reasoning_summary": "Query requires architecture details"},
        "research_tasks": [],
        "research_results": [
            {
                "task_id": "task_1",
                "query": "architecture decision",
                "status": "completed",
                "evidence": [
                    {
                        "source_type": "document",
                        "chunk_id": test_chunk_id,
                        "document_id": test_doc_id,
                        "document_title": "Architecture Specification.pdf",
                        "page_number": 1,
                        "content": "Raw chunk text about edge consensus mesh.",
                        "relevance_score": 0.85,
                    },
                    {
                        "source_type": "knowledge",
                        "knowledge_id": "kn-999",
                        "chunk_id": test_chunk_id,
                        "document_id": test_doc_id,
                        "document_title": "Architecture Specification.pdf",
                        "page_number": 1,
                        "content": "Decision: Edge nodes run consensus mesh with sub-12ms latency.",
                        "knowledge_type": "decision",
                        "relevance_score": 0.96,
                    }
                ]
            }
        ],
        "critic_output": None,
        "workflow_iteration": 1,
        "total_research_tasks": 1,
        "workflow_status": "in_progress",
        "decision_output": {
            "blockers": [],
            "recommendations": [{"action": "Approve architecture", "reason": "Consistent with latency SLA", "confidence": "high", "evidence": []}],
            "uncertainties": []
        },
        "action_proposals": [],
        "final_synthesis": "",
        "citations": []
    }

    mock_llm_response = MagicMock(content="The architecture was verified to meet sub-12ms requirements using an edge consensus mesh.")
    with patch("orchestrator.agents.synthesizer.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = mock_llm_response
        mock_get_llm.return_value = mock_llm

        res_state = await synthesis_node(state, {"configurable": {"db": db}})

    citations = res_state["citations"]
    assert len(citations) >= 2

    # Check knowledge citation
    kn_citations = [c for c in citations if c.get("source_type") == "knowledge"]
    assert len(kn_citations) >= 1
    kn_cit = kn_citations[0]
    assert kn_cit["document_id"] == test_doc_id
    assert kn_cit["knowledge_type"] == "decision"
    assert kn_cit["document_title"] == "Architecture Specification.pdf"

    # Verify that DecisionEvidence can be parsed from this citation without schema error
    decision_evidence = DecisionEvidence(
        document_id=uuid.UUID(kn_cit["document_id"]),
        document_title=kn_cit["document_title"],
        chunk_id=kn_cit["chunk_id"],
        page_number=kn_cit["page_number"],
        snippet=kn_cit["snippet"],
        source_type=kn_cit["source_type"]
    )
    assert decision_evidence.source_type == "knowledge"
    assert str(decision_evidence.document_id) == test_doc_id
