from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import router as api_router
from api.ingredients import router as ingredients_router
from api.scanner import router as scanner_router # [NEW]
from core.db.database import engine, Base
from sqlalchemy import text

app = FastAPI(title="Big SIS API", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.social import router as social_router
from api.trends import router as trends_router

app.include_router(api_router, prefix="/api/v1")
app.include_router(ingredients_router, prefix="/api/v1")
app.include_router(scanner_router, prefix="/api/v1")
app.include_router(social_router, prefix="/api/v1")
app.include_router(trends_router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    # Fix Production Schema (Auto-Migration)
    # Since we can't run alembic easily in this environment, we patch the DB manually on startup.
    async with engine.begin() as conn:
        print("Running Auto-Migration: checking for new columns...")
        # 1. Enable Vector
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        
        # 2. Add 'downtime' etc to Procedures
        # Using raw SQL to be safe (IF NOT EXISTS logic varies by DB version, but ADD COLUMN IF NOT EXISTS is standard PG 9.6+)
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS downtime VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS price_range VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS duration VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS pain_level VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS category VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS tags VARCHAR[]"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS embedding vector(1536)"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
        
        # 3. Create tables if missing (for entirely new tables)
        await conn.run_sync(Base.metadata.create_all)
        print("Auto-Migration complete.")

@app.on_event("shutdown")
async def shutdown():
    pass
