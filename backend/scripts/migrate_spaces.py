"""
QueryMind - Spaces Table Migration Script
Applies safe, non-destructive column additions and partial unique indexes for Spaces.
"""

import sys
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings


async def main():
    print("Applying Spaces schema migration to PostgreSQL...")
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        # 1. Add columns safely
        await conn.execute(text("ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS slug VARCHAR(255);"))
        await conn.execute(text("ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS icon VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS color VARCHAR(50);"))
        await conn.execute(text("ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        print("  - Columns slug, icon, color, is_default, updated_at verified/added.")

        # 2. Add partial unique index for exactly one default space per user
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_user_one_default 
            ON public.spaces (user_id) 
            WHERE is_default = TRUE;
        """))
        print("  - Partial unique index idx_spaces_user_one_default created/verified.")

        # 3. Add unique index for scoped slug per user
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_user_slug 
            ON public.spaces (user_id, slug) 
            WHERE slug IS NOT NULL;
        """))
        print("  - Unique index idx_spaces_user_slug created/verified.")

    await engine.dispose()
    print("Migration completed successfully 🟢")


if __name__ == "__main__":
    asyncio.run(main())
