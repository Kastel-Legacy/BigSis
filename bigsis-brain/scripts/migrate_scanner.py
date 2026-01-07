import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text
from core.db.database import AsyncSessionLocal

async def migrate():
    print("Migrating Ingredients Table...")
    async with AsyncSessionLocal() as session:
        # Add synonyms column
        try:
            await session.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS synonyms VARCHAR[]"))
            print("Added synonyms.")
        except Exception as e:
            print(f"Synonyms error (maybe exists): {e}")

        # Add mesh_terms column
        try:
            await session.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS mesh_terms VARCHAR[]"))
            print("Added mesh_terms.")
        except Exception as e:
            print(f"Mesh terms error: {e}")
            
        await session.commit()

if __name__ == "__main__":
    asyncio.run(migrate())
