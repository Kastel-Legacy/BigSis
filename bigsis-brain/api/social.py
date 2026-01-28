from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from core.social.generator import SocialContentGenerator
from core.db.database import AsyncSessionLocal
from core.db.models import Document, Chunk, Procedure
from sqlalchemy import select, func, or_
from core.prompts import APP_SYSTEM_PROMPT, DIAGNOSTIC_SYSTEM_PROMPT, RECOMMENDATION_SYSTEM_PROMPT

router = APIRouter()
generator = SocialContentGenerator()

from api.schemas import GenerateRequest, SocialGenerationResponse, ProcedureRead

@router.post("/social/generate", response_model=SocialGenerationResponse)
async def generate_social_content(request: GenerateRequest):
    """Generates social content, diagnostic advice, or recommendations."""
    try:
        # Select Prompt based on Mode
        if request.mode == "diagnostic":
            system_prompt = DIAGNOSTIC_SYSTEM_PROMPT
        elif request.mode == "recommendation":
            system_prompt = RECOMMENDATION_SYSTEM_PROMPT
        else:
            system_prompt = APP_SYSTEM_PROMPT
        
        # Prefix topic to differentiate cache between modes (Social vs Reco vs Diag)
        cache_topic = f"[{request.mode.upper()}] {request.topic}"
        
        result = await generator.generate_social_content(cache_topic, system_prompt=system_prompt)
        
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
             
        return {"data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/social/history")
async def get_social_history():
    """Returns mock history of generated content."""
    return [
        {"id": 1, "topic": "Rides Front", "type": "Diagnostic", "date": "2024-01-20", "status": "Ready"},
        {"id": 2, "topic": "Acide Hyaluronique", "type": "Social", "date": "2024-01-19", "status": "Published"}
    ]

@router.get("/social/stats")
async def get_knowledge_stats():
    """Returns stats about the Brain's knowledge base."""
    async with AsyncSessionLocal() as session:
        # Count Documents
        doc_count_res = await session.execute(select(func.count(Document.id)))
        doc_count = doc_count_res.scalar() or 0
        
        # Count Procedures
        proc_count_res = await session.execute(select(func.count(Procedure.id)))
        proc_count = proc_count_res.scalar() or 0
        
        # Count Chunks
        chunk_count_res = await session.execute(select(func.count(Chunk.id)))
        chunk_count = chunk_count_res.scalar() or 0
        
        # Calculate Mock Radar Data
        radar_data = [
            {"subject": "Efficacité", "A": min(95, 40 + doc_count), "fullMark": 100},
            {"subject": "Sécurité", "A": min(90, 30 + (chunk_count // 20)), "fullMark": 100},
            {"subject": "Procédures", "A": min(100, 20 + (proc_count * 10)), "fullMark": 100},
            {"subject": "Rigueur", "A": 85, "fullMark": 100},
            {"subject": "Dermato", "A": 70, "fullMark": 100},
            {"subject": "Innovation", "A": 75, "fullMark": 100},
        ]
        
        return {
            "documents_read": doc_count,
            "procedures_indexed": proc_count,
            "chunks_indexed": chunk_count,
            "radar_data": radar_data,
            "status": "Online",
            "v": "2.1" # Version marker for debug
        }

@router.get("/fiches/{pmid}", response_model=SocialGenerationResponse)
async def get_fiche(pmid: str):
    """
    Get (or generate) a Fiche for the given ID/Name.
    For MVP, pmid is treated as the Procedure Name / Topic.
    """
    # Decoding URL (fastapi does it automatically for path params? mostly yes)
    topic = pmid
    # We use SOCIAL mode for the Fiche View
    cache_topic = f"[SOCIAL] {topic}"
    
    # We leave system_prompt=None so the generator defaults to APP_SYSTEM_PROMPT
    result = await generator.generate_social_content(cache_topic)
    
    if "error" in result:
         raise HTTPException(status_code=500, detail=result["error"])
         
    return {"data": result}

class ProcedureCreate(BaseModel):
    name: str
    description: str
    downtime: str
    price_range: str
    tags: list[str] = []

@router.post("/knowledge/procedures")
async def create_procedure(proc: ProcedureCreate):
    """Adds a new medical procedure to the Knowledge Base."""
    from core.db.database import AsyncSessionLocal
    from core.db.models import Procedure
    
    async with AsyncSessionLocal() as session:
        new_proc = Procedure(
            name=proc.name,
            description=proc.description,
            downtime=proc.downtime,
            price_range=proc.price_range,
            tags=proc.tags
        )
        session.add(new_proc)
        await session.commit()
        return {"status": "created", "name": new_proc.name}

@router.get("/knowledge/procedures", response_model=list[ProcedureRead])
async def list_procedures():
    """List all medical procedures in the Knowledge Base."""
    from core.db.database import AsyncSessionLocal
    from core.db.models import Procedure
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Procedure).order_by(Procedure.name))
        return result.scalars().all()
