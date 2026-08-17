import asyncio
import uuid
from database.postgres import async_session
from sqlalchemy import text

USER_ID = "eea9d3bc-d38e-4abd-ae29-14878860e8af"
SPACE_ID = "e788c2a5-6234-4697-9d6e-886f6f4d00bd"

async def init_mock_data():
    async with async_session() as db:
        await db.execute(text(f"""
            INSERT INTO users (id, email, display_name, created_at, updated_at) 
            VALUES ('{USER_ID}', 'demo@mynd.app', 'Demo User', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
        """))
        
        await db.execute(text(f"""
            INSERT INTO spaces (id, user_id, name, description, created_at) 
            VALUES ('{SPACE_ID}', '{USER_ID}', 'Demo Space', 'Space for UI demo', NOW())
            ON CONFLICT (id) DO NOTHING;
        """))
        
        await db.commit()
        print("Mock user and space initialized via SQL!")

if __name__ == "__main__":
    asyncio.run(init_mock_data())
