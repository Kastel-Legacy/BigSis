import asyncio
from sqlalchemy import text
from core.db.database import engine

async def add_social_table():
    async with engine.begin() as conn:
        print("Creating social_generations table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS social_generations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                topic VARCHAR NOT NULL,
                language VARCHAR DEFAULT 'fr',
                content JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL
            );
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_social_generations_topic ON social_generations (topic);
        """))
        print("Done.")

if __name__ == "__main__":
    asyncio.run(add_social_table())
