import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the bigsis-brain directory (works regardless of cwd)
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.endpoints import router as api_router
from api.knowledge import router as knowledge_router
from api.fiches import router as fiches_router
from api.chat import router as chat_router
from api.ingredients import router as ingredients_router
from api.scanner import router as scanner_router
from core.db.database import engine, Base
from sqlalchemy import text

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

app = FastAPI(title="Big SIS API", version="1.0")

# Global error handler — all unhandled exceptions return JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Erreur interne du serveur", "detail": str(exc)}
    )

# CORS — read allowed origins from env or use defaults
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else []
_allowed_origins += ["http://localhost:3000", "http://localhost:5173"]
if not os.getenv("ALLOWED_ORIGINS"):
    _allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.social import router as social_router
from api.social_posts import router as social_posts_router
from api.trends import router as trends_router
from api.share import router as share_router
from api.users import router as users_router

app.include_router(api_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(fiches_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(ingredients_router, prefix="/api/v1")
app.include_router(scanner_router, prefix="/api/v1")
app.include_router(social_router, prefix="/api/v1")
app.include_router(social_posts_router, prefix="/api/v1")
app.include_router(trends_router, prefix="/api/v1")
app.include_router(share_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        logger.info("Running Auto-Migration: checking for new columns...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS downtime VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS price_range VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS duration VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS pain_level VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS category VARCHAR"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS tags VARCHAR[]"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS embedding vector(1536)"))
        await conn.execute(text("ALTER TABLE procedures ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
        await conn.execute(text("ALTER TABLE social_generations ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'published'"))
        await conn.execute(text("ALTER TABLE trend_topics ADD COLUMN IF NOT EXISTS raw_signals JSONB"))
        # Social Posts table
        await conn.execute(text("""CREATE TABLE IF NOT EXISTS social_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fiche_id UUID NOT NULL,
            template_type VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            slides JSONB NOT NULL,
            caption TEXT,
            hashtags VARCHAR[],
            status VARCHAR NOT NULL DEFAULT 'draft',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"""))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_social_posts_fiche ON social_posts(fiche_id)"))
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Auto-Migration complete.")

@app.on_event("shutdown")
async def shutdown():
    pass
