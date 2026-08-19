import sys, os, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'spaces'
            ORDER BY ordinal_position;
        """))
        print("SPACES TABLE COLUMNS:")
        for row in res.fetchall():
            print(" ", row)

        res2 = await conn.execute(text("""
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'spaces';
        """))
        print("\nSPACES CONSTRAINTS:")
        for row in res2.fetchall():
            print(" ", row)
            
        res3 = await conn.execute(text("""
            SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies
            WHERE tablename = 'spaces';
        """))
        print("\nSPACES RLS POLICIES:")
        for row in res3.fetchall():
            print(" ", row)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
