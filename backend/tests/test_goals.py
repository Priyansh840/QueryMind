import pytest
from httpx import AsyncClient
from tests.conftest import override_auth, clear_auth_override

@pytest.mark.asyncio
async def test_goal_ownership(async_client: AsyncClient, user_1, user_2):
    override_auth(user_1)

    # 1. Create user-owned goal -> Success
    response = await async_client.post("/api/v1/goals", json={
        "description": "User 1 Goal"
    })
    assert response.status_code == 201
    goal_1_id = response.json()["id"]

    # 2. Read own goal -> Success
    response = await async_client.get(f"/api/v1/goals/{goal_1_id}")
    assert response.status_code == 200

    # 3. Create Space and Project for User 1
    response = await async_client.post("/api/v1/spaces", json={"name": "Space 1"})
    space_1_id = response.json()["id"]
    response = await async_client.post("/api/v1/projects", json={"space_id": space_1_id, "name": "Proj 1"})
    project_1_id = response.json()["id"]

    # 4. Create goal linked to own project -> Success
    response = await async_client.post("/api/v1/goals", json={
        "description": "Linked Goal",
        "project_id": project_1_id
    })
    assert response.status_code == 201

    # Switch to User 2
    override_auth(user_2)

    # 5. Read another user's goal -> Rejected
    response = await async_client.get(f"/api/v1/goals/{goal_1_id}")
    assert response.status_code == 404

    # 6. Update another user's goal -> Rejected
    response = await async_client.patch(f"/api/v1/goals/{goal_1_id}", json={"description": "Hacked"})
    assert response.status_code == 404

    # 7. Create goal linked to another user's project -> Rejected
    response = await async_client.post("/api/v1/goals", json={
        "description": "Malicious Goal",
        "project_id": project_1_id
    })
    assert response.status_code == 404

    clear_auth_override()
