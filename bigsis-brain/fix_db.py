import asyncio
from sqlalchemy import text
from core.db.database import engine

async def reset_procedures():
    async with engine.begin() as conn:
        print("Dropping procedures table...")
        await conn.execute(text("DROP TABLE IF EXISTS procedures CASCADE"))
        print("Done.")

if __name__ == "__main__":
    asyncio.run(reset_procedures())
