"""
Share API - Viral loop for diagnostic sharing.
POST /share   -> save anonymized diagnostic, return share_id
GET  /share/id -> retrieve shared diagnostic
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from core.db.database import AsyncSessionLocal
from core.db.models import SharedDiagnostic

router = APIRouter(prefix="/share", tags=["share"])


class ShareRequest(BaseModel):
    area: str
    wrinkle_type: str
    uncertainty_level: str = "medium"
    top_recommendation: str = ""
    questions_count: int = 0


def _uncertainty_to_score(level: str) -> int:
    level = level.lower()
    if level in ("low", "faible"):
        return 9
    elif level in ("medium", "moyenne"):
        return 6
    return 3


@router.post("")
async def create_share(req: ShareRequest):
    record = SharedDiagnostic(
        area=req.area,
        wrinkle_type=req.wrinkle_type,
        uncertainty_level=req.uncertainty_level.lower(),
        score=_uncertainty_to_score(req.uncertainty_level),
        top_recommendation=req.top_recommendation,
        questions_count=req.questions_count,
    )
    async with AsyncSessionLocal() as session:
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return {
            "share_id": record.id,
            "share_url": f"/share/{record.id}",
        }


@router.get("/{share_id}")
async def get_share(share_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SharedDiagnostic).where(SharedDiagnostic.id == share_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(status_code=404, detail="Diagnostic not found")
        return {
            "id": record.id,
            "area": record.area,
            "wrinkle_type": record.wrinkle_type,
            "uncertainty_level": record.uncertainty_level,
            "score": record.score,
            "top_recommendation": record.top_recommendation,
            "questions_count": record.questions_count,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }
