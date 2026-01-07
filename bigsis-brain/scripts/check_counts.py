
import asyncio
from sqlalchemy import select, func
from core.db.database import AsyncSessionLocal
from core.db.models import Document, Chunk, Procedure

async def check_stats():
    async with AsyncSessionLocal() as session:
        doc_count = await session.scalar(select(func.count()).select_from(Document))
        proc_count = await session.scalar(select(func.count()).select_from(Procedure))
        chunk_count = await session.scalar(select(func.count()).select_from(Chunk))
        
        print(f"--- DATABASE STATS ---")
        print(f"Documents: {doc_count}")
        print(f"Procedures: {proc_count}")
        print(f"Chunks: {chunk_count}")
        print(f"----------------------")

if __name__ == "__main__":
    asyncio.run(check_stats())
