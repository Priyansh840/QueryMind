import pytest
from httpx import AsyncClient
from tests.conftest import override_auth, clear_auth_override

@pytest.mark.asyncio
async def test_memory_ownership(async_client: AsyncClient, user_1, user_2):
    override_auth(user_1)

    # 1. Create own memory -> Success
    response = await async_client.post("/api/v1/memories", json={
        "memory_type": "fact",
        "content": "User 1 likes testing."
    })
    assert response.status_code == 201
    memory_1_id = response.json()["id"]

    # Malicious user_id injection check: try to inject user_id in body
    response = await async_client.post("/api/v1/memories", json={
        "memory_type": "fact",
        "content": "Injected memory",
        "user_id": str(user_2.id)
    })
    assert response.status_code == 201
    # Check that it actually ignored the injected user_id and used the JWT user
    assert response.json()["user_id"] == str(user_1.id)

    # 2. Read own memory -> Success
    response = await async_client.get(f"/api/v1/memories/{memory_1_id}")
    assert response.status_code == 200

    # Switch to User 2
    override_auth(user_2)

    # 3. Read another user's memory -> Rejected
    response = await async_client.get(f"/api/v1/memories/{memory_1_id}")
    assert response.status_code == 404

    # 4. Update another user's memory -> Rejected
    response = await async_client.patch(f"/api/v1/memories/{memory_1_id}", json={"content": "Hacked"})
    assert response.status_code == 404

    # 5. Delete another user's memory -> Rejected
    response = await async_client.delete(f"/api/v1/memories/{memory_1_id}")
    assert response.status_code == 404

    clear_auth_override()
