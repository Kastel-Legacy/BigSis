from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from core.social.generator import SocialContentGenerator
from core.db.database import AsyncSessionLocal
from core.db.models import SocialGeneration
from core.prompts import APP_SYSTEM_PROMPT, DIAGNOSTIC_SYSTEM_PROMPT, RECOMMENDATION_SYSTEM_PROMPT
from api.schemas import GenerateRequest, SocialGenerationResponse

router = APIRouter()
generator = SocialContentGenerator()


@router.post("/social/generate", response_model=SocialGenerationResponse)
async def generate_social_content(request: GenerateRequest):
    """Generates social content, diagnostic advice, or recommendations."""
    if request.mode == "diagnostic":
        system_prompt = DIAGNOSTIC_SYSTEM_PROMPT
    elif request.mode == "recommendation":
        system_prompt = RECOMMENDATION_SYSTEM_PROMPT
    else:
        system_prompt = APP_SYSTEM_PROMPT

    cache_topic = f"[{request.mode.upper()}] {request.topic}"
    result = await generator.generate_social_content(cache_topic, system_prompt=system_prompt, force=request.force)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"data": result}


@router.get("/social/history")
async def get_social_history():
    """Returns history of generated content."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).order_by(SocialGeneration.created_at.desc()).limit(50)
        )
        return [
            {
                "id": str(g.id),
                "topic": g.topic,
                "type": "Social",
                "date": str(g.created_at.date()) if g.created_at else "",
                "status": "Ready",
            }
            for g in result.scalars().all()
        ]
