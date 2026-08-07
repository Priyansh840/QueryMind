"""
QueryMind - Automated Security Verification
Verifies RLS policies, Auth FK constraints, Database Authentication Context, and Qdrant.
"""

import sys
import os
import asyncio
import json
import httpx
import uuid
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from qdrant_client import QdrantClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings

# Test users (these must exist in Supabase Auth before running this script)
USER_A_EMAIL = "test_a@example.com"
USER_B_EMAIL = "test_b@example.com"
TEST_PASSWORD = "TestPassword123!"

async def authenticate_user(email: str, password: str) -> dict:
    """Authenticates with Supabase to get a real JWT."""
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        
    if response.status_code != 200:
        print(f"FAILED to authenticate {email}. Make sure the user exists in Supabase Auth.")
        print(response.text)
        sys.exit(1)
        
    data = response.json()
    
    # We also need the raw JWT payload (claims) exactly as the backend would receive it
    import jwt
    claims = jwt.decode(data["access_token"], options={"verify_signature": False})
    
    return {
        "access_token": data["access_token"],
        "user_id": data["user"]["id"],
        "claims": claims
    }

async def verify_qdrant():
    print("--- Verifying Qdrant ---")
    try:
        client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        collections = client.get_collections().collections
        c_names = [c.name for c in collections]
        
        expected = [
            settings.QDRANT_COLLECTION_DOCUMENTS, 
            settings.QDRANT_COLLECTION_MEMORIES, 
            settings.QDRANT_COLLECTION_KNOWLEDGE
        ]
        
        for e in expected:
            if e not in c_names:
                print(f"[FAIL] Missing collection {e}")
                sys.exit(1)
                
            info = client.get_collection(e)
            dim = info.config.params.vectors.size
            if dim != settings.QDRANT_VECTOR_DIMENSION:
                print(f"[FAIL] Collection {e} dimension is {dim}, expected {settings.QDRANT_VECTOR_DIMENSION}")
                sys.exit(1)
                
        print("[PASS] Qdrant collections and dimensions match config.")
    except Exception as ex:
        print(f"[FAIL] Qdrant verification failed: {ex}")
        sys.exit(1)

async def verify_postgres_rls():
    print("--- Verifying PostgreSQL RLS and Constraints ---")
    
    print("Authenticating User A...")
    user_a = await authenticate_user(USER_A_EMAIL, TEST_PASSWORD)
    
    print("Authenticating User B...")
    user_b = await authenticate_user(USER_B_EMAIL, TEST_PASSWORD)
    
    engine = create_async_engine(settings.DATABASE_URL)
    
    async def set_auth_context(conn, claims: dict):
        """Replicates the FastAPI dependency injection logic"""
        await conn.execute(text("SET LOCAL role = 'authenticated';"))
        claims_json = json.dumps(claims)
        await conn.execute(text("SELECT set_config('request.jwt.claims', :claims, true);"), {"claims": claims_json})
    
    async with engine.connect() as conn:
        # TEST 1: Foreign Key Constraint
        print("Test 1: auth.users FK constraint")
        try:
            fake_uuid = str(uuid.uuid4())
            await conn.execute(
                text("INSERT INTO public.users (id, email) VALUES (:id, :email)"),
                {"id": fake_uuid, "email": "fake@example.com"}
            )
            print("[FAIL] Inserted public.users row with non-existent auth.users UUID. FK constraint is missing!")
            sys.exit(1)
        except Exception as e:
            if "fk_auth_users" in str(e) or "foreign key constraint" in str(e).lower():
                print("[PASS] auth.users FK prevents orphaned users.")
            else:
                print(f"[ERROR] Unexpected error during FK test: {e}")
                sys.exit(1)
        
        await conn.rollback()
        
        # We need public.users rows to test nested ownership
        # For this test, we assume the users are already inserted into public.users via a trigger 
        # or we insert them as a superuser here.
        await conn.execute(text("INSERT INTO public.users (id, email) VALUES (:id, :email) ON CONFLICT DO NOTHING"), 
                           {"id": user_a["user_id"], "email": USER_A_EMAIL})
        await conn.execute(text("INSERT INTO public.users (id, email) VALUES (:id, :email) ON CONFLICT DO NOTHING"), 
                           {"id": user_b["user_id"], "email": USER_B_EMAIL})
        await conn.commit()

        # TEST 2: Setup Data as User A
        async with conn.begin():
            await set_auth_context(conn, user_a["claims"])
            space_id = str(uuid.uuid4())
            await conn.execute(
                text("INSERT INTO spaces (id, user_id, name) VALUES (:id, :uid, 'User A Space')"),
                {"id": space_id, "uid": user_a["user_id"]}
            )
            project_id = str(uuid.uuid4())
            # Nested ownership insert
            await conn.execute(
                text("INSERT INTO projects (id, space_id, name) VALUES (:id, :sid, 'User A Project')"),
                {"id": project_id, "sid": space_id}
            )
            
        print("[PASS] User A can insert nested data (space -> project) passing RLS.")

        # TEST 3: User B attempts to read User A's nested data
        async with conn.begin():
            await set_auth_context(conn, user_b["claims"])
            result = await conn.execute(text("SELECT count(*) FROM projects"))
            count = result.scalar()
            if count > 0:
                print(f"[FAIL] User B could read {count} projects. RLS is broken!")
                sys.exit(1)
            print("[PASS] User B cannot read User A's data (RLS isolated).")

        # TEST 4: User B attempts to update User A's nested data
        async with conn.begin():
            await set_auth_context(conn, user_b["claims"])
            result = await conn.execute(
                text("UPDATE projects SET name = 'Hacked' WHERE id = :pid"),
                {"pid": project_id}
            )
            if result.rowcount > 0:
                print("[FAIL] User B successfully updated User A's project. RLS is broken!")
                sys.exit(1)
            print("[PASS] User B cannot update User A's data.")

    await engine.dispose()
    print("--- ALL SECURITY TESTS PASSED ---")

if __name__ == "__main__":
    if not settings.SUPABASE_URL or "your_" in settings.SUPABASE_URL:
        print("ERROR: Please configure SUPABASE_URL and SUPABASE_ANON_KEY in .env first.")
        sys.exit(1)
        
    asyncio.run(verify_qdrant())
    asyncio.run(verify_postgres_rls())
