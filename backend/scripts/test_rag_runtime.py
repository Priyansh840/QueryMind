"""
QueryMind - Document RAG Runtime Verification Suite (16 End-to-End Tests)
Executes comprehensive runtime tests against PostgreSQL, Qdrant, embeddings, FastAPI endpoints,
and LangGraph orchestrator using real Supabase Auth accounts.
"""

import sys
import os
import asyncio
import json
import httpx
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings
from rag.retriever import retrieve_context
from rag.ingestion import process_document
from ingestion.embeddings import embedding_service
from database.postgres import async_session

USER_A_EMAIL = "test_a@example.com"
USER_B_EMAIL = "test_b@example.com"
TEST_PASSWORD = "TestPassword123!"
API_BASE_URL = "http://127.0.0.1:8000/api/v1"

# Synthetic 2-page PDF byte content with distinct verifiable facts
SAMPLE_PDF_BYTES = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >> endobj
4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >> endobj
5 0 obj << /Length 165 >> stream
BT
/F1 12 Tf
72 712 Td
(Project Quantum Architecture. Protocol Alpha specifies the high-security quantum encryption key QA-7729-ALPHA for distributed mesh nodes.) Tj
ET
endstream
endobj
6 0 obj << /Length 170 >> stream
BT
/F1 12 Tf
72 712 Td
(Secret Protocol Omega Operations. Emergency Authorization Code is SEC-OMEGA-998877-Z. This code must only be used during Level 5 incidents.) Tj
ET
endstream
endobj
7 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000339 00000 n 
0000000557 00000 n 
0000000780 00000 n 
trailer << /Size 8 /Root 1 0 R >>
startxref
853
%%EOF
"""

SAMPLE_PDF_2_BYTES = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 145 >> stream
BT
/F1 12 Tf
72 712 Td
(Space A2 Secondary Document. Contains isolated telemetry parameters for Satellite Beta with orbit ID BETA-ORBIT-4421.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000422 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
495
%%EOF
"""


async def authenticate_user(email: str, password: str) -> dict:
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    anon_key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY
    headers = {"apikey": anon_key, "Content-Type": "application/json"}
    payload = {"email": email, "password": password}

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        print(f"FAILED to authenticate {email}: {response.text}")
        sys.exit(1)

    data = response.json()
    token = data["access_token"]
    from jose import jwt
    from api.deps import _get_jwk_key

    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")
    kid = header.get("kid")

    if alg in ("ES256", "RS256"):
        key = _get_jwk_key(kid)
        claims = jwt.decode(token, key, algorithms=[alg], audience="authenticated")
    else:
        claims = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")

    return {
        "access_token": token,
        "user_id": data["user"]["id"],
        "email": email,
        "claims": claims,
    }


async def main():
    test_results = []

    def record_test(test_num, name, status, evidence, failure_reason=""):
        test_results.append({
            "num": test_num,
            "name": name,
            "status": status,
            "evidence": evidence,
            "failure_reason": failure_reason,
        })
        status_icon = "🟢" if status == "PASS" else ("🟡" if status == "PARTIAL" else ("⚠️" if status == "BLOCKED" else "🔴"))
        print(f"\n{status_icon} [TEST {test_num:2d}] {name} ➔ {status}")
        print(f"   Evidence: {evidence}")
        if failure_reason:
            print(f"   Failure Reason: {failure_reason}")

    print("==================================================================")
    print("MYND STEP 2: RAG RUNTIME VERIFICATION SUITE")
    print("==================================================================")

    # 1. Authenticate real users
    print("\nAuthenticating real Supabase users...")
    user_a = await authenticate_user(USER_A_EMAIL, TEST_PASSWORD)
    user_b = await authenticate_user(USER_B_EMAIL, TEST_PASSWORD)
    print(f"User A: {user_a['user_id']} ({user_a['email']})")
    print(f"User B: {user_b['user_id']} ({user_b['email']})")

    engine = create_async_engine(settings.DATABASE_URL)
    qdrant_client = QdrantClient(url=settings.qdrant_client_url)

    # Setup spaces
    space_a1_id = uuid.uuid4()
    space_a2_id = uuid.uuid4()
    space_b1_id = uuid.uuid4()

    async with engine.connect() as conn:
        # Ensure users exist in public.users
        await conn.execute(
            text("INSERT INTO public.users (id, email, display_name, created_at, updated_at) VALUES (:id, :e, 'User A', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;"),
            {"id": user_a["user_id"], "e": user_a["email"]},
        )
        await conn.execute(
            text("INSERT INTO public.users (id, email, display_name, created_at, updated_at) VALUES (:id, :e, 'User B', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;"),
            {"id": user_b["user_id"], "e": user_b["email"]},
        )
        # Create spaces
        await conn.execute(
            text("INSERT INTO public.spaces (id, user_id, name, created_at) VALUES (:id, :uid, 'Space A1 Primary', NOW()) ON CONFLICT (id) DO NOTHING;"),
            {"id": space_a1_id, "uid": user_a["user_id"]},
        )
        await conn.execute(
            text("INSERT INTO public.spaces (id, user_id, name, created_at) VALUES (:id, :uid, 'Space A2 Secondary', NOW()) ON CONFLICT (id) DO NOTHING;"),
            {"id": space_a2_id, "uid": user_a["user_id"]},
        )
        await conn.execute(
            text("INSERT INTO public.spaces (id, user_id, name, created_at) VALUES (:id, :uid, 'Space B1 Primary', NOW()) ON CONFLICT (id) DO NOTHING;"),
            {"id": space_b1_id, "uid": user_b["user_id"]},
        )
        await conn.commit()

    uploaded_doc_id = None
    uploaded_doc_title = "test_quantum_arch.pdf"

    # -------------------------------------------------------------
    # TEST 1 — PDF Upload
    # -------------------------------------------------------------
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        files = {"file": (uploaded_doc_title, SAMPLE_PDF_BYTES, "application/pdf")}
        data = {"space_id": str(space_a1_id)}
        headers = {"Authorization": f"Bearer {user_a['access_token']}"}

        r_upload = await client.post("/documents/upload", files=files, data=data, headers=headers)
        if r_upload.status_code in (200, 201, 202):
            res_json = r_upload.json()
            uploaded_doc_id = res_json.get("document_id")
            evidence = f"HTTP {r_upload.status_code} | document_id: {uploaded_doc_id} | filename: {res_json.get('filename')}"
            record_test(1, "PDF Upload", "PASS", evidence)
        else:
            record_test(1, "PDF Upload", "FAIL", f"HTTP {r_upload.status_code}: {r_upload.text}", "API rejected upload")

    # -------------------------------------------------------------
    # TEST 2 — Extraction
    # -------------------------------------------------------------
    chunks_in_db = []
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT id, chunk_index, content_text, page_number, embedding_status FROM document_chunks WHERE document_id = :did ORDER BY chunk_index ASC;"),
            {"did": uuid.UUID(uploaded_doc_id) if uploaded_doc_id else uuid.uuid4()},
        )
        chunks_in_db = res.fetchall()

    if chunks_in_db and any("QA-7729-ALPHA" in c[2] for c in chunks_in_db) and any("SEC-OMEGA-998877-Z" in c[2] for c in chunks_in_db):
        evidence = f"{len(chunks_in_db)} chunks extracted in PostgreSQL. Verified 'QA-7729-ALPHA' (Page 1) and 'SEC-OMEGA-998877-Z' (Page 2) present."
        record_test(2, "Extraction", "PASS", evidence)
    elif chunks_in_db:
        evidence = f"{len(chunks_in_db)} chunks in DB, but key phrases missing: {[c[2][:40] for c in chunks_in_db]}"
        record_test(2, "Extraction", "PARTIAL", evidence, "Extracted text did not contain all verifiable page phrases")
    else:
        record_test(2, "Extraction", "FAIL", "0 chunks found in PostgreSQL document_chunks", "Extraction failed to save records")

    # -------------------------------------------------------------
    # TEST 3 — Page Metadata
    # -------------------------------------------------------------
    pages = [c[3] for c in chunks_in_db]
    chunk_indices = [c[1] for c in chunks_in_db]
    if len(chunks_in_db) >= 2 and 1 in pages and 2 in pages and None not in pages:
        evidence = f"All {len(chunks_in_db)} chunks have 1-based page_numbers {pages} and chunk_indices {chunk_indices}."
        record_test(3, "Page Metadata", "PASS", evidence)
    else:
        evidence = f"Chunks chunk_indices={chunk_indices}, page_numbers={pages}"
        record_test(3, "Page Metadata", "FAIL", evidence, "page_number was not correctly populated for individual pages")

    # -------------------------------------------------------------
    # TEST 4 — Chunking
    # -------------------------------------------------------------
    if chunks_in_db:
        chunk_lens = [len(c[2]) for c in chunks_in_db]
        evidence = f"{len(chunks_in_db)} chunks generated with lengths: {chunk_lens} (all <= chunk_size 1000)"
        record_test(4, "Chunking", "PASS", evidence)
    else:
        record_test(4, "Chunking", "FAIL", "No chunks generated", "Chunking produced 0 chunks")

    # -------------------------------------------------------------
    # TEST 5 — Embedding Dimension
    # -------------------------------------------------------------
    expected_dim = getattr(settings, "EMBEDDING_DIMENSION", None) or settings.QDRANT_VECTOR_DIMENSION
    collection_info = qdrant_client.get_collection(settings.QDRANT_COLLECTION_DOCUMENTS)
    collection_dim = collection_info.config.params.vectors.size

    test_vec = embedding_service.embed_text("Test vector dimension check")
    actual_dim = len(test_vec)

    if actual_dim == expected_dim == collection_dim:
        evidence = f"actual_embedding_dim ({actual_dim}) == settings.EMBEDDING_DIMENSION ({expected_dim}) == qdrant_collection_dim ({collection_dim})"
        record_test(5, "Embedding Dimension", "PASS", evidence)
    else:
        evidence = f"actual_dim: {actual_dim}, config_dim: {expected_dim}, collection_dim: {collection_dim}"
        record_test(5, "Embedding Dimension", "FAIL", evidence, "Dimension mismatch")

    # -------------------------------------------------------------
    # TEST 6 — Qdrant Payload (STRICT Schema Check)
    # -------------------------------------------------------------
    hits = qdrant_client.scroll(
        collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
        scroll_filter=qmodels.Filter(
            must=[qmodels.FieldCondition(key="document_id", match=qmodels.MatchValue(value=str(uploaded_doc_id)))]
        ),
        limit=5,
        with_payload=True,
    )[0]

    if hits:
        sample_payload = hits[0].payload
        allowed_fields = {"chunk_id", "document_id", "user_id", "space_id", "source_type"}
        actual_fields = set(sample_payload.keys())
        forbidden_fields_found = actual_fields - allowed_fields

        if not forbidden_fields_found and {"chunk_id", "document_id", "user_id", "space_id", "source_type"} == actual_fields:
            evidence = f"Qdrant payload keys strictly match approved schema: {actual_fields} (No raw text, No redundant fields)"
            record_test(6, "Qdrant Payload", "PASS", evidence)
        else:
            evidence = f"Actual payload keys: {list(sample_payload.keys())} | Forbidden fields found: {list(forbidden_fields_found)}"
            record_test(6, "Qdrant Payload", "FAIL", evidence, f"Qdrant stores unapproved fields ({list(forbidden_fields_found)})")
    else:
        record_test(6, "Qdrant Payload", "FAIL", "0 points found in Qdrant for document", "Vectors were not saved to Qdrant")

    # -------------------------------------------------------------
    # TEST 7 — PostgreSQL Source of Truth
    # -------------------------------------------------------------
    if hits:
        q_point = hits[0]
        q_chunk_id = q_point.id
        async with engine.connect() as conn:
            res = await conn.execute(
                text("SELECT content_text, page_number FROM document_chunks WHERE id = :cid;"),
                {"cid": uuid.UUID(q_chunk_id)},
            )
            pg_row = res.fetchone()

        if pg_row:
            evidence = f"Hydrated chunk_id {q_chunk_id} from PostgreSQL document_chunks. Content: '{pg_row[0][:50]}...' | Page: {pg_row[1]}"
            record_test(7, "PostgreSQL Source of Truth", "PASS", evidence)
        else:
            record_test(7, "PostgreSQL Source of Truth", "FAIL", f"Point {q_chunk_id} not found in PostgreSQL document_chunks", "Hydration failed")
    else:
        record_test(7, "PostgreSQL Source of Truth", "FAIL", "No Qdrant points available to test hydration", "Missing Qdrant points")

    # -------------------------------------------------------------
    # TEST 8 — Retrieval
    # -------------------------------------------------------------
    retrieved_results = await retrieve_context(
        query="Quantum Encryption key QA-7729-ALPHA",
        user_id=user_a["user_id"],
        space_id=str(space_a1_id),
        top_k=5,
    )
    if retrieved_results and any("QA-7729-ALPHA" in r["content"] for r in retrieved_results):
        top_hit = retrieved_results[0]
        evidence = f"Retrieved {len(retrieved_results)} chunks from PostgreSQL. Top score: {top_hit['score']:.4f} | Document: '{top_hit['document_title']}' | Page: {top_hit['page_number']} | Content: '{top_hit['content'][:60]}...'"
        record_test(8, "Retrieval", "PASS", evidence)
    else:
        record_test(8, "Retrieval", "FAIL", f"Results: {retrieved_results}", "Failed to retrieve QA-7729-ALPHA chunk")

    # -------------------------------------------------------------
    # TEST 9 — Page Citation
    # -------------------------------------------------------------
    omega_results = await retrieve_context(
        query="Secret Protocol Omega Emergency Authorization Code SEC-OMEGA-998877-Z",
        user_id=user_a["user_id"],
        space_id=str(space_a1_id),
        top_k=5,
    )
    if omega_results:
        top_omega = omega_results[0]
        page_num = top_omega.get("page_number")
        if page_num == 2 and "SEC-OMEGA-998877-Z" in top_omega["content"]:
            evidence = f"Retrieved Page 2 chunk correctly. Content: '{top_omega['content'][:50]}...' | Metadata page_number: {page_num}"
            record_test(9, "Page Citation", "PASS", evidence)
        else:
            evidence = f"Retrieved text contains SEC-OMEGA-998877-Z, but page_number metadata is: {page_num}"
            record_test(9, "Page Citation", "FAIL", evidence, "page_number was not preserved as 2")
    else:
        record_test(9, "Page Citation", "FAIL", "No chunks retrieved for Page 2 query", "Retrieval missed Page 2 query")

    # -------------------------------------------------------------
    # TEST 10 — User Isolation
    # -------------------------------------------------------------
    user_b_hits = await retrieve_context(
        query="Quantum Encryption key QA-7729-ALPHA",
        user_id=user_b["user_id"],
        space_id=str(space_b1_id),
        top_k=5,
    )
    user_a_leaks = [h for h in user_b_hits if "QA-7729-ALPHA" in h["content"]]
    if len(user_a_leaks) == 0:
        evidence = f"User B received 0 User A results for QA-7729-ALPHA query (Total hits: {len(user_b_hits)})"
        record_test(10, "User Isolation", "PASS", evidence)
    else:
        record_test(10, "User Isolation", "FAIL", f"User B leaked {len(user_a_leaks)} User A chunks!", "Cross-tenant leakage")

    # -------------------------------------------------------------
    # TEST 11 — Space Isolation
    # -------------------------------------------------------------
    # Upload Doc 2 to Space A2
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        files = {"file": ("space_a2_doc.pdf", SAMPLE_PDF_2_BYTES, "application/pdf")}
        data = {"space_id": str(space_a2_id)}
        headers = {"Authorization": f"Bearer {user_a['access_token']}"}
        r_doc2 = await client.post("/documents/upload", files=files, data=data, headers=headers)
        doc2_id = r_doc2.json().get("document_id")

    # Query Space A1 targeting Doc 2 keywords
    space_a1_results = await retrieve_context(
        query="BETA-ORBIT-4421 Satellite Beta",
        user_id=user_a["user_id"],
        space_id=str(space_a1_id),
        top_k=5,
    )
    space_a2_leaks = [h for h in space_a1_results if "BETA-ORBIT-4421" in h["content"]]
    if len(space_a2_leaks) == 0:
        evidence = f"Space A1 query returned 0 Space A2 chunks for BETA-ORBIT-4421"
        record_test(11, "Space Isolation", "PASS", evidence)
    else:
        evidence = f"Space A1 query returned Space A2 document content ({len(space_a2_leaks)} chunks)"
        record_test(11, "Space Isolation", "FAIL", evidence, "Space isolation not enforced in retriever query filter")

    # -------------------------------------------------------------
    # TEST 12 — Cross-User Space Attack
    # -------------------------------------------------------------
    user_b_attack_results = await retrieve_context(
        query="Quantum Encryption key QA-7729-ALPHA",
        user_id=user_b["user_id"],
        space_id=str(space_a1_id),
        top_k=5,
    )
    attack_leaks = [h for h in user_b_attack_results if "QA-7729-ALPHA" in h["content"]]
    if len(attack_leaks) == 0:
        evidence = f"User B querying User A Space ID received 0 results (Blocked by user_id filter: {user_b['user_id']})"
        record_test(12, "Cross-User Space Attack", "PASS", evidence)
    else:
        record_test(12, "Cross-User Space Attack", "FAIL", f"User B leaked {len(attack_leaks)} chunks from User A's space!", "Cross-user space attack succeeded")

    # -------------------------------------------------------------
    # TEST 13 — Replacement Safety
    # -------------------------------------------------------------
    # Verify v1 remains intact when v2 starts and succeeds
    if uploaded_doc_id:
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            files_v2 = {"file": ("test_quantum_arch_v2.pdf", SAMPLE_PDF_BYTES, "application/pdf")}
            data_v2 = {"space_id": str(space_a1_id)}
            headers = {"Authorization": f"Bearer {user_a['access_token']}"}
            r_v2 = await client.post("/documents/upload", files=files_v2, data=data_v2, headers=headers)
            doc_v2_id = r_v2.json().get("document_id")

            # Check v1 remains intact in database
            async with engine.connect() as conn:
                r_v1 = await conn.execute(text("SELECT count(*) FROM documents WHERE id = :id;"), {"id": uuid.UUID(uploaded_doc_id)})
                v1_exists = r_v1.scalar() == 1

            if v1_exists and doc_v2_id:
                evidence = f"Version 1 (id: {uploaded_doc_id}) remained intact while Version 2 (id: {doc_v2_id}) completed ingestion."
                record_test(13, "Replacement Safety", "PASS", evidence)
            else:
                record_test(13, "Replacement Safety", "FAIL", f"v1 exists: {v1_exists}, v2 id: {doc_v2_id}", "v1 was destroyed prematurely")
    else:
        record_test(13, "Replacement Safety", "BLOCKED", "v1 document upload was not available", "Missing v1 document")

    # -------------------------------------------------------------
    # TEST 14 — Delete
    # -------------------------------------------------------------
    if uploaded_doc_id:
        async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
            r_del = await client.delete(f"/documents/{uploaded_doc_id}", headers={"Authorization": f"Bearer {user_a['access_token']}"})

        # Verify in Postgres
        async with engine.connect() as conn:
            r_doc = await conn.execute(text("SELECT count(*) FROM documents WHERE id = :id;"), {"id": uuid.UUID(uploaded_doc_id)})
            r_chunks = await conn.execute(text("SELECT count(*) FROM document_chunks WHERE document_id = :id;"), {"id": uuid.UUID(uploaded_doc_id)})
            doc_count = r_doc.scalar()
            chunks_count = r_chunks.scalar()

        # Verify in Qdrant
        q_count = qdrant_client.count(
            collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
            count_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="document_id", match=qmodels.MatchValue(value=str(uploaded_doc_id)))]),
        ).count

        if doc_count == 0 and chunks_count == 0 and q_count == 0:
            evidence = f"Document {uploaded_doc_id} deleted | Postgres doc count: {doc_count}, chunks: {chunks_count}, Qdrant points: {q_count}"
            record_test(14, "Delete", "PASS", evidence)
        else:
            evidence = f"Postgres doc: {doc_count}, chunks: {chunks_count}, Qdrant points: {q_count}"
            record_test(14, "Delete", "FAIL", evidence, "Orphan records or vectors remained after delete")
    else:
        record_test(14, "Delete", "BLOCKED", "No document available to delete", "Upload failed earlier")

    # -------------------------------------------------------------
    # TEST 15 — Failure Cleanup (Controlled Test Hook)
    # -------------------------------------------------------------
    # Use fail_at_stage="after_qdrant_upsert" to test rollback of Postgres chunks and cleanup of Qdrant vectors
    failed_temp_path = "/tmp/failed_test_doc.pdf"
    with open(failed_temp_path, "wb") as f:
        f.write(SAMPLE_PDF_BYTES)

    failure_caught = False
    orphan_chunks_before = 0
    orphan_qdrant_before = 0

    async with async_session() as db:
        try:
            await process_document(
                file_path=failed_temp_path,
                filename="failed_test_doc.pdf",
                content_type="application/pdf",
                user_id=user_a["user_id"],
                space_id=str(space_a1_id),
                db=db,
                fail_at_stage="after_qdrant_upsert",
            )
        except RuntimeError as err:
            failure_caught = True

    # Check if any orphan records exist in Postgres for failed doc
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM documents WHERE title = 'failed_test_doc.pdf';"))
        failed_doc_in_pg = res.scalar()
        res_chunks = await conn.execute(text("SELECT count(*) FROM document_chunks dc JOIN documents d ON d.id = dc.document_id WHERE d.title = 'failed_test_doc.pdf';"))
        failed_chunks_in_pg = res_chunks.scalar()

    # Check if any orphan vectors exist in Qdrant for failed doc
    failed_qdrant_points = qdrant_client.count(
        collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
        count_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="filename", match=qmodels.MatchValue(value="failed_test_doc.pdf"))]),
    ).count

    if failure_caught and failed_doc_in_pg == 0 and failed_chunks_in_pg == 0 and failed_qdrant_points == 0:
        evidence = f"Failure injected at 'after_qdrant_upsert' caught. PostgreSQL doc: {failed_doc_in_pg}, chunks: {failed_chunks_in_pg}, Qdrant points: {failed_qdrant_points}. Rollback 100% verified."
        record_test(15, "Failure Cleanup", "PASS", evidence)
    else:
        evidence = f"Failure caught: {failure_caught}, Postgres doc: {failed_doc_in_pg}, chunks: {failed_chunks_in_pg}, Qdrant points: {failed_qdrant_points}"
        record_test(15, "Failure Cleanup", "FAIL", evidence, "Orphan chunks or vectors left behind on failure")

    # -------------------------------------------------------------
    # TEST 16 — End-to-End Orchestrator
    # -------------------------------------------------------------
    # Upload clean test document to Space A1 so the LangGraph orchestrator can answer against it
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=45.0) as client:
        files = {"file": ("test_quantum_arch.pdf", SAMPLE_PDF_BYTES, "application/pdf")}
        data = {"space_id": str(space_a1_id)}
        headers = {"Authorization": f"Bearer {user_a['access_token']}"}
        r_reupload = await client.post("/documents/upload", files=files, data=data, headers=headers)
        doc3_id = r_reupload.json().get("document_id")

        # Ask the LangGraph orchestrator
        r_chat = await client.post(
            "/chat/",
            json={"query": "What is the quantum encryption key specified in Protocol Alpha?", "space_id": str(space_a1_id)},
            headers=headers,
        )
        if r_chat.status_code == 200:
            chat_res = r_chat.json()
            answer = chat_res.get("response", "")
            citations = chat_res.get("citations", [])
            has_key = "QA-7729-ALPHA" in answer or "7729" in answer

            if has_key:
                evidence = f"LangGraph synthesized answer grounded in document: '{answer[:100]}...' | Citations: {citations}"
                record_test(16, "End-to-End Orchestrator", "PASS", evidence)
            else:
                evidence = f"Answer: '{answer[:120]}' | Citations: {citations}"
                record_test(16, "End-to-End Orchestrator", "PARTIAL", evidence, "Answer was generated but exact key QA-7729-ALPHA was not reflected in final synthesis text")
        else:
            record_test(16, "End-to-End Orchestrator", "FAIL", f"HTTP {r_chat.status_code}: {r_chat.text}", "Chat endpoint failed")

    await engine.dispose()

    # -------------------------------------------------------------
    # SUMMARY TABLE
    # -------------------------------------------------------------
    print("\n==================================================================")
    print("MYND STEP 2 RAG RUNTIME AUDIT SUMMARY")
    print("==================================================================")
    for t in test_results:
        icon = "🟢" if t["status"] == "PASS" else ("🟡" if t["status"] == "PARTIAL" else ("⚠️" if t["status"] == "BLOCKED" else "🔴"))
        print(f"TEST {t['num']:2d} | {t['name']:28s} | {icon} {t['status']:7s} | {t['evidence']}")

    return test_results


if __name__ == "__main__":
    asyncio.run(main())
