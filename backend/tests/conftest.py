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
USER_3_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")

@pytest.fixture
def user_1():
    user = User(id=USER_1_ID, email="test1@example.com")
    return user

@pytest.fixture
def user_2():
    user = User(id=USER_2_ID, email="test2@example.com")
    return user

@pytest.fixture
def user_3():
    user = User(id=USER_3_ID, email="test3@example.com")
    return user

@pytest_asyncio.fixture(autouse=True)
async def setup_test_users():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        from database.postgres import Base
        import models.core
        import models.user
        import models.conversation
        import models.action_proposal
        import models.memory
        import models.orchestrator
        import models.space_member
        import models.knowledge
        import models.outcome
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE memories ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE CASCADE"))
        await conn.execute(text("ALTER TABLE objectives ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE CASCADE"))
        await conn.execute(text("ALTER TABLE workflows ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE CASCADE"))
        
        # Mock Supabase auth.users table for local tests
        await conn.execute(text('CREATE SCHEMA IF NOT EXISTS auth'))
        await conn.execute(text('CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY)'))
        await conn.execute(text('INSERT INTO auth.users (id) VALUES (:uid1), (:uid2), (:uid3) ON CONFLICT DO NOTHING'), {"uid1": USER_1_ID, "uid2": USER_2_ID, "uid3": USER_3_ID})
        
        # Ensure test users exist idempotently
        await conn.execute(
            text(
                "INSERT INTO users (id, email, created_at, updated_at) "
                "VALUES (:uid1, 'test1@example.com', NOW(), NOW()), (:uid2, 'test2@example.com', NOW(), NOW()), (:uid3, 'test3_deterministic@example.com', NOW(), NOW()) "
                "ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email"
            ),
            {"uid1": USER_1_ID, "uid2": USER_2_ID, "uid3": USER_3_ID}
        )
    yield


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

def override_auth(user):
    if isinstance(user, uuid.UUID):
        user_obj = User(id=user, email=f"user_{user}@example.com")
    else:
        user_obj = user
    app.dependency_overrides[get_current_user] = lambda: user_obj
    app.dependency_overrides[get_current_supabase_user] = lambda: {"sub": str(user_obj.id if hasattr(user_obj, 'id') else user_obj)}

def clear_auth_override():
    app.dependency_overrides.clear()
