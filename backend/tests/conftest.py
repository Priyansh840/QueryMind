import pytest
import pytest_asyncio
import uuid
from typing import AsyncGenerator
from fastapi.testclient import TestClient
from httpx import AsyncClient

from main import app
from api.deps import get_current_user, get_current_supabase_user
from models.user import User
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import text
from core.config import settings

# Deterministic UUIDs for testing
USER_1_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
USER_2_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

@pytest.fixture
def user_1():
    user = User(id=USER_1_ID, email="test1@example.com")
    return user

@pytest.fixture
def user_2():
    user = User(id=USER_2_ID, email="test2@example.com")
    return user

@pytest_asyncio.fixture(autouse=True)
async def setup_test_users():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as session:
        # Mock Supabase auth.users table for local tests
        await session.execute(text('CREATE SCHEMA IF NOT EXISTS auth'))
        await session.execute(text('CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY)'))
        await session.execute(text('INSERT INTO auth.users (id) VALUES (:uid1), (:uid2) ON CONFLICT DO NOTHING'), {"uid1": USER_1_ID, "uid2": USER_2_ID})
        
        await session.execute(text("DELETE FROM users WHERE email IN ('test1@example.com', 'test2@example.com')"))
        
        session.add(User(id=USER_1_ID, email="test1@example.com"))
        session.add(User(id=USER_2_ID, email="test2@example.com"))
        await session.commit()
    yield


import httpx

@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    transport = httpx.ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

def override_auth(user: User):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_supabase_user] = lambda: {"sub": str(user.id)}

def clear_auth_override():
    app.dependency_overrides.clear()
