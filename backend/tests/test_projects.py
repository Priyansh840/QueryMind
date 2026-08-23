import pytest
from httpx import AsyncClient
import uuid
from tests.conftest import override_auth, clear_auth_override, USER_1_ID, USER_2_ID

@pytest.mark.asyncio
async def test_project_ownership(async_client: AsyncClient, user_1, user_2):
    # This is a placeholder test. In a real integration test, we would hit the real DB.
    # We will simulate the authorization tests here.
    override_auth(user_1)
    
    # 1. Create Space for User 1
    response = await async_client.post("/api/v1/spaces", json={"name": "User 1 Space"})
    assert response.status_code == 201
    space_1_id = response.json()["id"]

    # 2. Create Project in User 1's Space -> Success
    response = await async_client.post("/api/v1/projects", json={
        "space_id": space_1_id,
        "name": "User 1 Project"
    })
    assert response.status_code == 201
    project_1_id = response.json()["id"]

    # 3. Read own project -> Success
    response = await async_client.get(f"/api/v1/projects/{project_1_id}")
    assert response.status_code == 200

    # Switch to User 2
    override_auth(user_2)

    # 4. User 2 tries to read User 1's project -> Rejected (404)
    response = await async_client.get(f"/api/v1/projects/{project_1_id}")
    assert response.status_code == 404

    # 5. User 2 tries to update User 1's project -> Rejected (404)
    response = await async_client.patch(f"/api/v1/projects/{project_1_id}", json={"name": "Hacked"})
    assert response.status_code == 404

    # 6. User 2 tries to delete User 1's project -> Rejected (404)
    response = await async_client.delete(f"/api/v1/projects/{project_1_id}")
    assert response.status_code == 404

    # 7. User 2 tries to create project in User 1's space -> Rejected (404)
    response = await async_client.post("/api/v1/projects", json={
        "space_id": space_1_id,
        "name": "Malicious Project"
    })
    assert response.status_code == 404

    clear_auth_override()
