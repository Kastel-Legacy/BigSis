"""
Social Posts API — Generate, manage, and publish Instagram carousel posts and Reel videos
from published Fiches Verite.
"""

import asyncio
import json
import os
import re
import uuid
import logging
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select

from core.auth import AuthUser, require_admin
from core.db.database import AsyncSessionLocal
from core.db.models import SocialPost, SocialGeneration
from core.social.post_generator import SocialPostGenerator, VALID_TEMPLATES, TEMPLATE_LABELS
from core.social.reel_generator import (
    ReelGenerator,
    VALID_REEL_TEMPLATES,
    REEL_TEMPLATE_LABELS,
    REEL_COMPOSITION_IDS,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_generator = SocialPostGenerator()
_reel_generator = ReelGenerator()

# Path to bigsis-video package (relative to bigsis-brain/)
_BIGSIS_VIDEO_DIR = Path(__file__).resolve().parent.parent.parent / "bigsis-video"
_VIDEO_OUTPUT_DIR = _BIGSIS_VIDEO_DIR / "output"

# Combined template labels for UI
ALL_TEMPLATE_LABELS = {**TEMPLATE_LABELS, **REEL_TEMPLATE_LABELS}


# --- SCHEMAS ---

class GeneratePostRequest(BaseModel):
    fiche_id: str
    template_type: str


class GenerateReelRequest(BaseModel):
    fiche_id: str
    reel_template: str


class GenerateBatchRequest(BaseModel):
    fiche_id: str


class UpdateStatusRequest(BaseModel):
    status: str  # draft, approved, published


class UpdateSlidesRequest(BaseModel):
    slides: list


# --- ENDPOINTS ---

@router.post("/social-posts/generate")
async def generate_social_post(
    request: GeneratePostRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Generate an Instagram carousel post from a published fiche."""
    if request.template_type not in VALID_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Template invalide: {request.template_type}. Valides: {VALID_TEMPLATES}"
        )

    # 1. Fetch the fiche
    try:
        fiche_uuid = uuid.UUID(request.fiche_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="fiche_id invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).where(SocialGeneration.id == fiche_uuid)
        )
        fiche = result.scalar_one_or_none()

    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvee")
    if not isinstance(fiche.content, dict) or "error" in fiche.content:
        raise HTTPException(status_code=400, detail="La fiche n'a pas de contenu valide")

    # 2. Generate via LLM (hybrid: fiche structure + RAG evidence chunks)
    logger.info(f"Generating social post: fiche={request.fiche_id}, template={request.template_type}")
    gen_result = await _generator.generate_post(
        fiche.content,
        request.template_type,
        procedure_topic=fiche.topic or "",
    )

    if isinstance(gen_result, dict) and "error" in gen_result:
        raise HTTPException(status_code=500, detail=gen_result["error"])

    # 3. Store in DB
    title = gen_result.get("slides", [{}])[0].get("headline", "Sans titre")
    async with AsyncSessionLocal() as session:
        post = SocialPost(
            fiche_id=fiche_uuid,
            template_type=request.template_type,
            title=title,
            slides=gen_result.get("slides", []),
            caption=gen_result.get("caption", ""),
            hashtags=gen_result.get("hashtags", []),
            status="draft",
            format="carousel",
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)

        return _serialize_post_detail(post)


@router.post("/social-posts/generate-reel")
async def generate_reel(
    request: GenerateReelRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Generate an Instagram Reel video from a published fiche.

    1. LLM generates structured Remotion props
    2. Subprocess renders MP4 via `npx remotion render`
    3. Stores post in DB with video_url
    """
    if request.reel_template not in VALID_REEL_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Template reel invalide: {request.reel_template}. Valides: {VALID_REEL_TEMPLATES}"
        )

    # 1. Fetch the fiche
    try:
        fiche_uuid = uuid.UUID(request.fiche_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="fiche_id invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).where(SocialGeneration.id == fiche_uuid)
        )
        fiche = result.scalar_one_or_none()

    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvee")
    if not isinstance(fiche.content, dict) or "error" in fiche.content:
        raise HTTPException(status_code=400, detail="La fiche n'a pas de contenu valide")

    # 2. Generate Remotion props via LLM
    logger.info(f"Generating reel props: fiche={request.fiche_id}, template={request.reel_template}")
    gen_result = await _reel_generator.generate_reel_props(
        fiche.content,
        request.reel_template,
        procedure_topic=fiche.topic or "",
    )

    if isinstance(gen_result, dict) and "error" in gen_result:
        raise HTTPException(status_code=500, detail=gen_result["error"])

    reel_props = gen_result.get("reel_props", {})

    # 3. Render video via Remotion CLI
    composition_id = REEL_COMPOSITION_IDS.get(request.reel_template, "ScoreReveal")
    proc_slug = _slugify(reel_props.get("procedureName", "unknown"))
    short_id = uuid.uuid4().hex[:8]
    filename = f"{request.reel_template}_{proc_slug}_{short_id}.mp4"
    output_path = _VIDEO_OUTPUT_DIR / filename

    # Ensure output directory exists
    _VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    props_json = json.dumps(reel_props, ensure_ascii=False)

    logger.info(f"Rendering reel: {composition_id} -> {filename}")

    try:
        process = await asyncio.create_subprocess_exec(
            "npx", "remotion", "render",
            "src/index.ts", composition_id,
            str(output_path),
            "--props", props_json,
            cwd=str(_BIGSIS_VIDEO_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)
    except asyncio.TimeoutError:
        logger.error("Remotion render timed out after 120s")
        raise HTTPException(status_code=504, detail="Render video timeout (120s)")
    except FileNotFoundError:
        logger.error("npx not found — Node.js may not be installed")
        raise HTTPException(status_code=500, detail="Node.js/npx non trouve sur le serveur")

    if process.returncode != 0:
        err_msg = stderr.decode("utf-8", errors="replace")[-500:]
        logger.error(f"Remotion render failed: {err_msg}")
        raise HTTPException(status_code=500, detail=f"Render echoue: {err_msg}")

    if not output_path.exists():
        raise HTTPException(status_code=500, detail="Le fichier video n'a pas ete genere")

    logger.info(f"Reel rendered: {filename} ({output_path.stat().st_size / 1024:.0f} KB)")

    # 4. Store in DB
    title = reel_props.get("procedureName", "Reel")
    async with AsyncSessionLocal() as session:
        post = SocialPost(
            fiche_id=fiche_uuid,
            template_type=request.reel_template,
            title=title,
            slides=[],  # Reels don't have slides
            caption=gen_result.get("caption", ""),
            hashtags=gen_result.get("hashtags", []),
            status="draft",
            format="reel",
            video_url=filename,
            reel_props=reel_props,
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)

        return _serialize_post_detail(post)


@router.post("/social-posts/generate-batch")
async def generate_batch(
    request: GenerateBatchRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Generate all 9 content formats (6 carousels + 3 reels) for a fiche.

    Returns results as they complete — NOT a background task since the
    frontend shows a progress bar per item.
    """
    # 1. Validate fiche
    try:
        fiche_uuid = uuid.UUID(request.fiche_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="fiche_id invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration).where(SocialGeneration.id == fiche_uuid)
        )
        fiche = result.scalar_one_or_none()

    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvee")
    if not isinstance(fiche.content, dict) or "error" in fiche.content:
        raise HTTPException(status_code=400, detail="La fiche n'a pas de contenu valide")

    procedure_topic = fiche.topic or ""
    fiche_content = fiche.content
    results = []

    # 2. Generate 6 carousels
    for template in VALID_TEMPLATES:
        try:
            logger.info(f"[BATCH] Carousel {template} for {procedure_topic}")
            gen = await _generator.generate_post(fiche_content, template, procedure_topic)
            if isinstance(gen, dict) and "error" in gen:
                results.append({"format": "carousel", "template": template, "status": "error", "error": gen["error"]})
                continue

            title = gen.get("slides", [{}])[0].get("headline", "Sans titre")
            async with AsyncSessionLocal() as session:
                post = SocialPost(
                    fiche_id=fiche_uuid,
                    template_type=template,
                    title=title,
                    slides=gen.get("slides", []),
                    caption=gen.get("caption", ""),
                    hashtags=gen.get("hashtags", []),
                    status="draft",
                    format="carousel",
                )
                session.add(post)
                await session.commit()
            results.append({"format": "carousel", "template": template, "status": "ok"})
        except Exception as e:
            logger.error(f"[BATCH] Carousel {template} failed: {e}")
            results.append({"format": "carousel", "template": template, "status": "error", "error": str(e)})

    # 3. Generate 3 reels
    for reel_template in VALID_REEL_TEMPLATES:
        try:
            logger.info(f"[BATCH] Reel {reel_template} for {procedure_topic}")
            gen = await _reel_generator.generate_reel_props(fiche_content, reel_template, procedure_topic)
            if isinstance(gen, dict) and "error" in gen:
                results.append({"format": "reel", "template": reel_template, "status": "error", "error": gen["error"]})
                continue

            reel_props = gen.get("reel_props", {})

            # Render video
            composition_id = REEL_COMPOSITION_IDS.get(reel_template, "ScoreReveal")
            proc_slug = _slugify(reel_props.get("procedureName", "unknown"))
            short_id = uuid.uuid4().hex[:8]
            filename = f"{reel_template}_{proc_slug}_{short_id}.mp4"
            output_path = _VIDEO_OUTPUT_DIR / filename
            _VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

            props_json = json.dumps(reel_props, ensure_ascii=False)
            process = await asyncio.create_subprocess_exec(
                "npx", "remotion", "render",
                "src/index.ts", composition_id,
                str(output_path),
                "--props", props_json,
                cwd=str(_BIGSIS_VIDEO_DIR),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)

            if process.returncode != 0 or not output_path.exists():
                err_msg = stderr.decode("utf-8", errors="replace")[-300:]
                results.append({"format": "reel", "template": reel_template, "status": "error", "error": f"Render failed: {err_msg}"})
                continue

            title = reel_props.get("procedureName", "Reel")
            async with AsyncSessionLocal() as session:
                post = SocialPost(
                    fiche_id=fiche_uuid,
                    template_type=reel_template,
                    title=title,
                    slides=[],
                    caption=gen.get("caption", ""),
                    hashtags=gen.get("hashtags", []),
                    status="draft",
                    format="reel",
                    video_url=filename,
                    reel_props=reel_props,
                )
                session.add(post)
                await session.commit()
            results.append({"format": "reel", "template": reel_template, "status": "ok"})
        except asyncio.TimeoutError:
            results.append({"format": "reel", "template": reel_template, "status": "error", "error": "Render timeout 120s"})
        except Exception as e:
            logger.error(f"[BATCH] Reel {reel_template} failed: {e}")
            results.append({"format": "reel", "template": reel_template, "status": "error", "error": str(e)})

    ok_count = sum(1 for r in results if r["status"] == "ok")
    return {
        "status": "completed",
        "total": len(results),
        "generated": ok_count,
        "results": results,
    }


@router.get("/social-posts/video/{filename}")
async def serve_video(filename: str):
    """Serve a rendered MP4 video file."""
    # Sanitize filename (prevent directory traversal)
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")

    video_path = _VIDEO_OUTPUT_DIR / safe_name
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video non trouvee")

    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=safe_name,
    )


@router.get("/social-posts")
async def list_social_posts(
    status: Optional[str] = None,
    template_type: Optional[str] = None,
    format: Optional[str] = None,
    admin: AuthUser = Depends(require_admin),
):
    """List all social posts with fiche titles. Filterable by status, template, and format."""
    async with AsyncSessionLocal() as session:
        stmt = select(SocialPost).order_by(SocialPost.created_at.desc())
        if status:
            stmt = stmt.where(SocialPost.status == status)
        if template_type:
            stmt = stmt.where(SocialPost.template_type == template_type)
        if format:
            stmt = stmt.where(SocialPost.format == format)
        result = await session.execute(stmt.limit(200))
        posts = result.scalars().all()

        # Fetch fiche titles for display
        fiche_ids = {p.fiche_id for p in posts}
        fiche_map = {}
        if fiche_ids:
            fiches_result = await session.execute(
                select(SocialGeneration).where(SocialGeneration.id.in_(fiche_ids))
            )
            for f in fiches_result.scalars().all():
                content = f.content if isinstance(f.content, dict) else {}
                fiche_map[f.id] = content.get("nom_commercial_courant", f.topic or "?")

        return [
            {
                "id": str(p.id),
                "fiche_id": str(p.fiche_id),
                "fiche_title": fiche_map.get(p.fiche_id, "?"),
                "template_type": p.template_type,
                "template_label": ALL_TEMPLATE_LABELS.get(p.template_type, p.template_type),
                "title": p.title,
                "slides_count": len(p.slides) if p.slides else 0,
                "status": p.status,
                "format": getattr(p, "format", "carousel") or "carousel",
                "video_url": _build_video_url(p) if getattr(p, "video_url", None) else None,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
            for p in posts
        ]


@router.get("/social-posts/fiches")
async def list_available_fiches(
    admin: AuthUser = Depends(require_admin),
):
    """List SocialGeneration records available for post generation (with UUIDs)."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialGeneration)
            .where(SocialGeneration.topic.like("[SOCIAL]%"))
            .order_by(SocialGeneration.created_at.desc())
            .limit(100)
        )
        fiches = result.scalars().all()

        # Dedup by title
        seen_titles = set()
        items = []
        for f in fiches:
            content = f.content if isinstance(f.content, dict) else {}
            if "error" in content:
                continue
            title = content.get("nom_commercial_courant") or f.topic.replace("[SOCIAL] ", "")
            title_key = title.lower().strip()
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)

            items.append({
                "id": str(f.id),
                "title": title,
                "topic": f.topic,
                "status": f.status,
                "score_efficacite": (content.get("score_global") or {}).get("note_efficacite_sur_10"),
                "score_securite": (content.get("score_global") or {}).get("note_securite_sur_10"),
            })

        return items


@router.get("/social-posts/templates")
async def list_templates():
    """List available post templates (carousel + reel)."""
    templates = []
    for k, v in TEMPLATE_LABELS.items():
        templates.append({"id": k, "label": v, "format": "carousel"})
    for k, v in REEL_TEMPLATE_LABELS.items():
        templates.append({"id": k, "label": v, "format": "reel"})
    return templates


@router.get("/social-posts/{post_id}")
async def get_social_post(
    post_id: str,
    admin: AuthUser = Depends(require_admin),
):
    """Get a single social post with all slides."""
    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post non trouve")

    return _serialize_post_detail(post)


@router.patch("/social-posts/{post_id}/status")
async def update_post_status(
    post_id: str,
    request: UpdateStatusRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Update post status (draft -> approved -> published)."""
    valid_statuses = ["draft", "approved", "published"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Statut invalide: {request.status}. Valides: {valid_statuses}"
        )

    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise HTTPException(status_code=404, detail="Post non trouve")

        post.status = request.status
        await session.commit()
        await session.refresh(post)

        logger.info(f"Post {post_id} status updated to: {request.status}")
        return {"id": str(post.id), "status": post.status}


@router.patch("/social-posts/{post_id}/slides")
async def update_post_slides(
    post_id: str,
    request: UpdateSlidesRequest,
    admin: AuthUser = Depends(require_admin),
):
    """Update slide content (inline editing from admin dashboard)."""
    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise HTTPException(status_code=404, detail="Post non trouve")

        post.slides = request.slides
        # Also update title from first slide headline
        if request.slides and isinstance(request.slides[0], dict):
            post.title = request.slides[0].get("headline", post.title)

        await session.commit()
        await session.refresh(post)

        return _serialize_post_detail(post)


@router.delete("/social-posts/{post_id}")
async def delete_social_post(
    post_id: str,
    admin: AuthUser = Depends(require_admin),
):
    """Delete a social post."""
    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SocialPost).where(SocialPost.id == post_uuid)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise HTTPException(status_code=404, detail="Post non trouve")

        await session.delete(post)
        await session.commit()

        logger.info(f"Post {post_id} deleted")
        return {"deleted": True, "id": post_id}


# --- HELPERS ---

def _serialize_post_detail(post: SocialPost) -> dict:
    """Serialize a SocialPost to a detail response."""
    post_format = getattr(post, "format", "carousel") or "carousel"
    data = {
        "id": str(post.id),
        "fiche_id": str(post.fiche_id),
        "template_type": post.template_type,
        "template_label": ALL_TEMPLATE_LABELS.get(post.template_type, post.template_type),
        "title": post.title,
        "slides": post.slides or [],
        "caption": post.caption or "",
        "hashtags": post.hashtags or [],
        "status": post.status,
        "format": post_format,
        "created_at": post.created_at.isoformat() if post.created_at else "",
    }

    # Reel-specific fields
    if post_format == "reel":
        data["video_url"] = _build_video_url(post) if getattr(post, "video_url", None) else None
        data["reel_props"] = getattr(post, "reel_props", None)

    return data


def _build_video_url(post: SocialPost) -> Optional[str]:
    """Build the full API URL for a video file."""
    video_url = getattr(post, "video_url", None)
    if not video_url:
        return None
    return f"/api/v1/social-posts/video/{video_url}"


def _slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r'[àâä]', 'a', text)
    text = re.sub(r'[éèêë]', 'e', text)
    text = re.sub(r'[îï]', 'i', text)
    text = re.sub(r'[ôö]', 'o', text)
    text = re.sub(r'[ùûü]', 'u', text)
    text = re.sub(r'[ç]', 'c', text)
    text = re.sub(r'[^a-z0-9]+', '_', text)
    text = text.strip('_')
    return text[:40]
