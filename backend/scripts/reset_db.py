import asyncio
from sqlalchemy import text
from database.postgres import engine

async def reset():
    async with engine.begin() as conn:
        print("Dropping public schema...")
        await conn.execute(text('DROP SCHEMA public CASCADE; CREATE SCHEMA public;'))
        print("Schema dropped. Reading SQL file...")
        with open('backend/database/supabase_rls_deploy.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
        print("Applying SQL...")
        await conn.execute(text(sql))
        print("DB Reset & Deployed")

asyncio.run(reset())
