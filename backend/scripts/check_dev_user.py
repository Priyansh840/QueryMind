import asyncio
from database.postgres import async_session
from sqlalchemy import text

async def run():
    async with async_session() as s:
        res = await s.execute(text("SELECT id, email, display_name FROM users WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'"))
        print("Dev user found:", res.fetchall())
        res_docs = await s.execute(text("SELECT id, space_id, title FROM documents"))
        print("Documents in DB:", res_docs.fetchall())
        res_spaces = await s.execute(text("SELECT id, user_id, name FROM spaces"))
        print("Spaces in DB:", res_spaces.fetchall())

asyncio.run(run())
