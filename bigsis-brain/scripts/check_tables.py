import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text
from core.db.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result.fetchall()]
        print("Tables found:", tables)
        
        required = ['products', 'evidence_claims', 'user_products', 'ingredients']
        missing = [t for t in required if t not in tables]
        
        if missing:
            print(f"❌ Missing tables: {missing}")
            sys.exit(1)
        else:
            print("✅ All required tables present.")

if __name__ == "__main__":
    asyncio.run(check())
