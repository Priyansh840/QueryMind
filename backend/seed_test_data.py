import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models.user import User
from models.core import Space, Goal, Project
from models.memory import Memory
import uuid
import os
from datetime import datetime

DATABASE_URL = "postgresql+asyncpg://querymind:querymind_dev@postgres:5432/querymind"
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with async_session() as db:
        # Check for a user
        result = await db.execute(select(User).limit(1))
        user = result.scalars().first()
        if not user:
            print("Creating dummy user")
            user = User(id=uuid.uuid4(), email="test@example.com", name="Test User")
            db.add(user)
            await db.commit()
            
        print(f"Using user {user.id}")

        # Check for space
        result = await db.execute(select(Space).where(Space.user_id == user.id).limit(1))
        space = result.scalars().first()
        if not space:
            print("Creating space")
            space = Space(id=uuid.uuid4(), user_id=user.id, name="Test Space")
            db.add(space)
            await db.commit()

        print(f"Using space {space.id}")

        # Add Goal
        goal = Goal(id=uuid.uuid4(), user_id=user.id, description="Launch MYND beta", status="active")
        db.add(goal)

        # Add Project
        project = Project(id=uuid.uuid4(), space_id=space.id, name="Step 6 integration", status="active")
        db.add(project)

        # Add Memory / Evidence
        memory = Memory(
            id=uuid.uuid4(),
            user_id=user.id,
            content="Integration validation remains incomplete. We must finish validation before launching.",
            importance="high",
            memory_type="note"
        )
        db.add(memory)

        await db.commit()
        print("Test data seeded.")

if __name__ == "__main__":
    asyncio.run(seed())
