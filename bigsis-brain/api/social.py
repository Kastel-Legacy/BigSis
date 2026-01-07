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
    from sqlalchemy import select, func, or_

    async with AsyncSessionLocal() as session:
        # Count Documents
        doc_count = await session.scalar(select(func.count()).select_from(Document))
        # Count Chunks
        chunk_count = await session.scalar(select(func.count()).select_from(Chunk))
        
        # Radar Data Calculation (BigSIS DNA: Face & Non-Invasive Focus)
        categories = {
            "Anti-Âge": ["wrinkle", "ride", "aging", "vieillissement", "nasolabial"],
            "Injections": ["toxin", "botox", "filler", "acide hyaluronique", "volum"],
            "Skin Quality": ["glow", "texture", "acne", "pores", "pigment"],
            "Technologies": ["laser", "radiofrequency", "led", "ultrasound", "device"],
            "Cosméto-Active": ["retinol", "vitamin", "peptide", "acid", "serum"],
            "Sécurité": ["risk", "danger", "side effect", "complication", "safety"]
        }
        
        radar_data = []
        
        for cat, keywords in categories.items():
            # semantic search would be better but simple like is fast
            conditions = [Chunk.text.ilike(f"%{k}%") for k in keywords]
            count = await session.scalar(select(func.count()).select_from(Chunk).where(or_(*conditions)))
            
            # Normalize to 0-100 scale. Assuming 50 chunks mentions is "Mastery" (100) for now.
            normalization_factor = 2.0 
            score = min(100, int(count * normalization_factor))
            
            radar_data.append({"subject": cat, "A": score, "fullMark": 100})

        return {
            "documents_read": doc_count,
            "chunks_indexed": chunk_count,
            "knowledge_power_level": "High" if doc_count > 100 else "Growing",
            "radar_data": radar_data
        }
