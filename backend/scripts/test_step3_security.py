import sys
import os
import asyncio
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings

USER_A_EMAIL = "test_a@example.com"
USER_B_EMAIL = "test_b@example.com"
TEST_PASSWORD = "TestPassword123!"
API_BASE_URL = "http://127.0.0.1:8000/api/v1"

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
    return {
        "access_token": data["access_token"],
        "user_id": data["user"]["id"]
    }

async def main():
    print("Authenticating users...")
    user_a = await authenticate_user(USER_A_EMAIL, TEST_PASSWORD)
    user_b = await authenticate_user(USER_B_EMAIL, TEST_PASSWORD)
    print("Users authenticated.")

    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        print("\n--- Testing Projects ---")
        import uuid
        test_uuid = str(uuid.uuid4())[:8]
        # User A creates space
        res = await client.post("/spaces", json={"name": f"Space A {test_uuid}"}, headers=headers_a)
        assert res.status_code == 201, f"Space failed: {res.text}"
        space_id = res.json()["id"]

        # User A creates project in space
        res = await client.post("/projects", json={"space_id": space_id, "name": "Project A"}, headers=headers_a)
        assert res.status_code == 201, f"Failed: {res.text}"
        project_id = res.json()["id"]

        # User B reads project -> 404
        res = await client.get(f"/projects/{project_id}", headers=headers_b)
        assert res.status_code == 404
        print("Project isolation: PASS")

        print("\n--- Testing Goals ---")
        # User A creates goal
        res = await client.post("/goals", json={"description": "Goal A"}, headers=headers_a)
        assert res.status_code == 201, f"Goal failed: {res.text}"
        goal_id = res.json()["id"]

        # User B reads goal -> 404
        res = await client.get(f"/goals/{goal_id}", headers=headers_b)
        assert res.status_code == 404
        print("Goal isolation: PASS")

        print("\n--- Testing Memories ---")
        # User A creates memory
        res = await client.post("/memories", json={"memory_type": "fact", "content": "Memory A"}, headers=headers_a)
        assert res.status_code == 201, f"Failed: {res.text}"
        memory_id = res.json()["id"]
        assert res.json()["user_id"] == user_a["user_id"] # ensure user ID matches token

        # Malicious user_id override test
        res = await client.post("/memories", json={"memory_type": "fact", "content": "Memory B", "user_id": user_b["user_id"]}, headers=headers_a)
        assert res.status_code == 201, f"Failed malicious post: {res.text}"
        assert res.json()["user_id"] == user_a["user_id"]

        # User B reads memory -> 404
        res = await client.get(f"/memories/{memory_id}", headers=headers_b)
        assert res.status_code == 404
        print("Memory isolation: PASS")
        
        print("\nALL SECURITY TESTS PASSED 🟢")

if __name__ == "__main__":
    asyncio.run(main())
