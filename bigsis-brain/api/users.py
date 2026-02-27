import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import AuthUser, get_current_user
from core.db.database import AsyncSessionLocal as async_session
from core.db.models import UserProfile, DiagnosticHistory, JournalEntry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


# --- Schemas ---

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    skin_type: Optional[str] = None
    age_range: Optional[str] = None
    concerns: Optional[list[str]] = None
    preferences: Optional[dict] = None


class ProfileResponse(BaseModel):
    supabase_uid: str
    first_name: Optional[str] = None
    skin_type: Optional[str] = None
    age_range: Optional[str] = None
    concerns: Optional[list[str]] = None
    preferences: Optional[dict] = None

    class Config:
        from_attributes = True


class DiagnosticCreate(BaseModel):
    area: str
    wrinkle_type: Optional[str] = None
    score: Optional[int] = None
    top_recommendation: Optional[str] = None
    chat_messages: Optional[list[dict]] = None


class DiagnosticResponse(BaseModel):
    id: UUID
    area: str
    wrinkle_type: Optional[str] = None
    score: Optional[int] = None
    top_recommendation: Optional[str] = None
    chat_messages: Optional[list[dict]] = None
    created_at: str

    class Config:
        from_attributes = True


class JournalCreate(BaseModel):
    procedure_name: str
    entry_date: str
    day_number: Optional[int] = None
    pain_level: Optional[int] = Field(None, ge=0, le=10)
    swelling_level: Optional[int] = Field(None, ge=0, le=10)
    satisfaction: Optional[int] = Field(None, ge=0, le=10)
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class JournalResponse(BaseModel):
    id: UUID
    procedure_name: str
    entry_date: str
    day_number: Optional[int] = None
    pain_level: Optional[int] = None
    swelling_level: Optional[int] = None
    satisfaction: Optional[int] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


# --- Profile ---

@router.get("/profile")
async def get_profile(user: AuthUser = Depends(get_current_user)):
    async with async_session() as session:
        result = await session.execute(
            select(UserProfile).where(UserProfile.supabase_uid == user.sub)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return {"supabase_uid": user.sub, "first_name": user.first_name}

        return ProfileResponse.model_validate(profile)


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    user: AuthUser = Depends(get_current_user),
):
    async with async_session() as session:
        result = await session.execute(
            select(UserProfile).where(UserProfile.supabase_uid == user.sub)
        )
        profile = result.scalar_one_or_none()

        if profile:
            for key, value in data.model_dump(exclude_none=True).items():
                setattr(profile, key, value)
        else:
            profile = UserProfile(
                supabase_uid=user.sub,
                **data.model_dump(exclude_none=True),
            )
            session.add(profile)

        await session.commit()
        await session.refresh(profile)
        return ProfileResponse.model_validate(profile)


# --- Diagnostic History ---

@router.get("/diagnostics")
async def list_diagnostics(
    user: AuthUser = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    async with async_session() as session:
        result = await session.execute(
            select(DiagnosticHistory)
            .where(DiagnosticHistory.user_id == user.sub)
            .order_by(DiagnosticHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        diagnostics = result.scalars().all()

        count_result = await session.execute(
            select(func.count(DiagnosticHistory.id))
            .where(DiagnosticHistory.user_id == user.sub)
        )
        total = count_result.scalar() or 0

        return {
            "items": [
                {
                    "id": str(d.id),
                    "area": d.area,
                    "wrinkle_type": d.wrinkle_type,
                    "score": d.score,
                    "top_recommendation": d.top_recommendation,
                    "created_at": d.created_at.isoformat() if d.created_at else None,
                }
                for d in diagnostics
            ],
            "total": total,
        }


@router.post("/diagnostics", status_code=201)
async def save_diagnostic(
    data: DiagnosticCreate,
    user: AuthUser = Depends(get_current_user),
):
    async with async_session() as session:
        # Ensure profile exists (auto-create on first save)
        result = await session.execute(
            select(UserProfile).where(UserProfile.supabase_uid == user.sub)
        )
        if not result.scalar_one_or_none():
            session.add(UserProfile(
                supabase_uid=user.sub,
                first_name=user.first_name,
            ))
            await session.flush()  # ensure profile exists before FK reference

        entry = DiagnosticHistory(
            user_id=user.sub,
            area=data.area,
            wrinkle_type=data.wrinkle_type,
            score=data.score,
            top_recommendation=data.top_recommendation,
            chat_messages=data.chat_messages,
        )
        session.add(entry)
        await session.commit()
        return {"id": str(entry.id), "status": "saved"}


# --- Diagnostic Feedback ---

class DiagnosticFeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


@router.patch("/diagnostics/{diagnostic_id}/feedback")
async def submit_diagnostic_feedback(
    diagnostic_id: UUID,
    data: DiagnosticFeedbackRequest,
    user: AuthUser = Depends(get_current_user),
):
    """Submit feedback (thumbs up/down) on a saved diagnostic."""
    from datetime import datetime

    async with async_session() as session:
        result = await session.execute(
            select(DiagnosticHistory).where(
                DiagnosticHistory.id == diagnostic_id,
                DiagnosticHistory.user_id == user.sub,
            )
        )
        diag = result.scalar_one_or_none()
        if not diag:
            raise HTTPException(status_code=404, detail="Diagnostic non trouve")

        diag.feedback = {
            "rating": data.rating,
            "comment": data.comment,
            "created_at": datetime.utcnow().isoformat(),
        }
        await session.commit()
        return {"status": "feedback_saved", "rating": data.rating}


# --- Journal ---

@router.get("/journal")
async def list_journal(
    user: AuthUser = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    async with async_session() as session:
        result = await session.execute(
            select(JournalEntry)
            .where(JournalEntry.user_id == user.sub)
            .order_by(JournalEntry.entry_date.desc())
            .limit(limit)
            .offset(offset)
        )
        entries = result.scalars().all()

        count_result = await session.execute(
            select(func.count(JournalEntry.id))
            .where(JournalEntry.user_id == user.sub)
        )
        total = count_result.scalar() or 0

        return {
            "items": [
                {
                    "id": str(e.id),
                    "procedure_name": e.procedure_name,
                    "entry_date": e.entry_date.isoformat() if e.entry_date else None,
                    "day_number": e.day_number,
                    "pain_level": e.pain_level,
                    "swelling_level": e.swelling_level,
                    "satisfaction": e.satisfaction,
                    "notes": e.notes,
                    "photo_url": e.photo_url,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in entries
            ],
            "total": total,
        }


@router.post("/journal", status_code=201)
async def add_journal_entry(
    data: JournalCreate,
    user: AuthUser = Depends(get_current_user),
):
    from datetime import datetime

    async with async_session() as session:
        entry = JournalEntry(
            user_id=user.sub,
            procedure_name=data.procedure_name,
            entry_date=datetime.fromisoformat(data.entry_date),
            day_number=data.day_number,
            pain_level=data.pain_level,
            swelling_level=data.swelling_level,
            satisfaction=data.satisfaction,
            notes=data.notes,
            photo_url=data.photo_url,
        )
        session.add(entry)
        await session.commit()
        return {"id": str(entry.id), "status": "created"}


@router.put("/journal/{entry_id}")
async def update_journal_entry(
    entry_id: UUID,
    data: JournalCreate,
    user: AuthUser = Depends(get_current_user),
):
    from datetime import datetime

    async with async_session() as session:
        result = await session.execute(
            select(JournalEntry).where(
                JournalEntry.id == entry_id,
                JournalEntry.user_id == user.sub,
            )
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=404, detail="Entree non trouvee")

        entry.procedure_name = data.procedure_name
        entry.entry_date = datetime.fromisoformat(data.entry_date)
        entry.day_number = data.day_number
        entry.pain_level = data.pain_level
        entry.swelling_level = data.swelling_level
        entry.satisfaction = data.satisfaction
        entry.notes = data.notes
        entry.photo_url = data.photo_url

        await session.commit()
        return {"id": str(entry.id), "status": "updated"}


@router.delete("/journal/{entry_id}")
async def delete_journal_entry(
    entry_id: UUID,
    user: AuthUser = Depends(get_current_user),
):
    async with async_session() as session:
        result = await session.execute(
            select(JournalEntry).where(
                JournalEntry.id == entry_id,
                JournalEntry.user_id == user.sub,
            )
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=404, detail="Entree non trouvee")

        await session.delete(entry)
        await session.commit()
        return {"status": "deleted"}
