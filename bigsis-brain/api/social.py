from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from core.social.generator import SocialContentGenerator

router = APIRouter()

class SocialGenRequest(BaseModel):
    topic: str
    language: Optional[str] = "fr"

@router.post("/social/generate")
async def generate_social_content(req: SocialGenRequest):
    """
    Generates a 'Fiche Verité' for Instagram based on PubMed evidence.
    Triggers RAG retrieval and LLM synthesis.
    """
    generator = SocialContentGenerator()
    try:
        content = await generator.generate_social_content(req.topic)
        if "error" in content:
            raise HTTPException(status_code=500, detail=content["error"])
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/social/history")
async def get_social_history():
    """Returns recent generated social fiches metadata."""
    from core.db.database import AsyncSessionLocal
    from core.db.models import SocialGeneration
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        stmt = select(SocialGeneration).order_by(SocialGeneration.created_at.desc()).limit(20)
        result = await session.execute(stmt)
        gens = result.scalars().all()
        return [
            {
                "id": str(g.id),
                "topic": g.topic,
                "created_at": g.created_at,
                "verdict_brief": g.content.get("score_global", {}).get("verdict_final", "N/A")
            }
            for g in gens
        ]

@router.get("/social/stats")
async def get_knowledge_stats():
    """Returns stats about the Brain's knowledge base."""
    from core.db.database import AsyncSessionLocal
    from core.db.models import Document, Chunk
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as session:
        # Count Documents
        doc_count = await session.scalar(select(func.count()).select_from(Document))
        # Count Chunks
        chunk_count = await session.scalar(select(func.count()).select_from(Chunk))
        
        return {
            "documents_read": doc_count,
            "chunks_indexed": chunk_count,
            "knowledge_power_level": "High" if doc_count > 100 else "Growing"
        }
