"""
Trend Scout - Discovers trending topics within the BigSIS scope.

INVERTED FLOW (primary):
  Google Trends mines real rising queries -> LLM evaluates & structures them.

FALLBACK (if GT returns too few results):
  LLM proposes topics -> Google Trends validates post-hoc.
"""

import uuid
import logging
from typing import Dict, List
from sqlalchemy import select, func
from starlette.concurrency import run_in_threadpool

from core.llm_client import LLMClient
from core.db.database import AsyncSessionLocal
from core.db.models import Document, Chunk, Procedure, SocialGeneration, TrendTopic
from core.prompts.trends import (
    TREND_SCOUT_SYSTEM_PROMPT,
    TREND_USER_PROMPT_TEMPLATE,
    TREND_EVALUATOR_SYSTEM_PROMPT,
    TREND_EVALUATOR_USER_PROMPT_TEMPLATE,
    format_gt_trends_for_prompt,
)
from core.pubmed import search_pubmed
from core.trends.trs_engine import compute_trs
from core.trends.google_trends import (
    mine_rising_trends,
    aggregate_and_rank_trends,
    get_interest_score,
)

logger = logging.getLogger(__name__)
llm = LLMClient()

# Minimum ranked GT trends needed to use the GT-driven flow
# Lowered to 3 due to conservative rate limiting (2 seeds max)
MIN_GT_TRENDS = 3


async def discover_trends(batch_id: str = None) -> Dict:
    # Main entry: discover 5 trending topics within BigSIS scope.
    if not batch_id:
        batch_id = str(uuid.uuid4())[:8]
    
    # ===== PHASE 1: GOOGLE TRENDS MINING =====
    logger.info("[Scout] Phase 1: Mining Google Trends (conservative mode: 2 seeds, 0 retry)...")

    try:
        raw_gt = await run_in_threadpool(mine_rising_trends)
        ranked = aggregate_and_rank_trends(raw_gt, top_n=20)
        logger.info(f"[Scout] GT: {len(raw_gt)} raw -> {len(ranked)} ranked trends")
    except Exception as e:
        logger.error(f"[Scout] GT mining failed: {e}")
        raw_gt = []
        ranked = []
    
    # Check if we have enough trends (fail fast if not)
    if len(ranked) < MIN_GT_TRENDS:
        logger.warning(
            f"[Scout] Only {len(ranked)} GT trends (min {MIN_GT_TRENDS}). "
            f"Falling back to LLM-driven discovery."
        )
        return await _discover_trends_llm_driven(batch_id)

    # ===== PHASE 2: GATHER BRAIN CONTEXT =====
    logger.info("[Scout] Phase 2: Gathering brain context...")
    doc_count, chunk_count, proc_count, fiche_topics = await _gather_brain_stats()

    # ===== PHASE 3: PUBMED SIGNALS =====


    # ===== PHASE 4: LLM EVALUATES REAL GT DATA =====
    logger.info("[Scout] Phase 4: LLM evaluating real Google Trends data...")

    gt_formatted = format_gt_trends_for_prompt(ranked)

    user_prompt = TREND_EVALUATOR_USER_PROMPT_TEMPLATE.format(
        doc_count=doc_count,
        chunk_count=chunk_count,
        proc_count=proc_count,
        fiche_topics=", ".join(fiche_topics) if fiche_topics else "Aucune",
        extra_context=extra_context,
        gt_trends_data=gt_formatted,
    )

    llm_result = await llm.generate_response(
        system_prompt=TREND_EVALUATOR_SYSTEM_PROMPT,
        user_content=user_prompt,
        json_mode=True,
        model_override="gpt-4o",
        temperature_override=0.3,
    )

    if not isinstance(llm_result, dict) or "trending_topics" not in llm_result:
        logger.error(f"[Scout] LLM returned invalid format: {llm_result}")
        return {"error": "LLM returned invalid format", "raw": llm_result}

    # ===== PHASE 5: TRS + PERSIST =====
    logger.info("[Scout] Phase 5: Computing TRS and persisting topics...")

    # batch_id = str(uuid.uuid4())[:8]
    topics_output = []

    async with AsyncSessionLocal() as session:
        for topic_data in llm_result["trending_topics"]:
            titre = topic_data["titre"]

            # Marketing score: from GT data, possibly adjusted by LLM
            source_gt_query = topic_data.get("source_gt_query", "")
            source_gt_score = topic_data.get("source_gt_score", 0)
            source_gt_growth = topic_data.get("source_gt_growth", 0)

            marketing_score = topic_data.get("expertises", {}).get("marketing", {}).get("score", source_gt_score)
            marketing_justif = topic_data.get("expertises", {}).get("marketing", {}).get("justification", "")

            # Annotate with GT source
            gt_annotation = (
                f"[GT: query='{source_gt_query}', "
                f"growth={source_gt_growth}%, score={source_gt_score}/10] "
            )
            marketing_justif = gt_annotation + marketing_justif

            # Compute TRS
            trs_result = await compute_trs(titre)

            # Build record
            expertises = topic_data.get("expertises", {})
            if "marketing" not in expertises:
                expertises["marketing"] = {}
            expertises["marketing"]["score"] = marketing_score
            expertises["marketing"]["justification"] = marketing_justif

            ai_sci = expertises.get("science", {}).get("score", 0)
            ai_know = expertises.get("knowledge_ia", {}).get("score", 0)
            new_composite = round((marketing_score * 0.3) + (ai_sci * 0.4) + (ai_know * 0.3), 1)

            record = TrendTopic(
                titre=titre,
                topic_type=topic_data.get("type", "procedure"),
                description=topic_data.get("description", ""),
                zones=topic_data.get("zones", []),
                search_queries=topic_data.get("search_queries", []),
                score_marketing=marketing_score,
                justification_marketing=marketing_justif,
                score_science=expertises.get("science", {}).get("score", 0),
                justification_science=expertises.get("science", {}).get("justification", ""),
                references_suggerees=expertises.get("science", {}).get("references", []),
                score_knowledge=expertises.get("knowledge_ia", {}).get("score", 0),
                justification_knowledge=expertises.get("knowledge_ia", {}).get("justification", ""),
                score_composite=new_composite,
                status="proposed",
                recommandation=topic_data.get("recommandation", "REPORTER"),
                trs_current=trs_result["trs"],
                trs_details=trs_result["details"],
                learning_iterations=0,
                learning_log=[],
                batch_id=batch_id,
            )
            session.add(record)
            await session.flush()

            topics_output.append({
                "id": str(record.id),
                "titre": record.titre,
                "type": record.topic_type,
                "description": record.description,
                "zones": record.zones,
                "search_queries": record.search_queries,
                "source_gt_query": source_gt_query,
                "source_gt_growth": source_gt_growth,
                "expertises": expertises,
                "score_composite": new_composite,
                "recommandation": record.recommandation,
                "trs_current": trs_result["trs"],
                "trs_status": trs_result["status"],
                "trs_details": trs_result["details"],
            })

        await session.commit()

    return {
        "batch_id": batch_id,
        "flow": "gt_driven",
        "gt_stats": {
            "raw_queries_mined": len(raw_gt),
            "ranked_trends_sent_to_llm": len(ranked),
        },
        "topics": topics_output,
        "synthese": llm_result.get("synthese", ""),
        "requetes_rejetees": llm_result.get("requetes_rejetees", []),
        "brain_stats": {
            "documents": doc_count,
            "chunks": chunk_count,
            "procedures": proc_count,
        },
    }


# ==========================================================================
# FALLBACK: Original LLM-driven discovery flow
# ==========================================================================

async def _discover_trends_llm_driven(batch_id: str = None) -> Dict:
    # Fallback flow: LLM proposes topics, Google Trends validates post-hoc.
    # Used when GT mining returns insufficient data.
    if not batch_id:
        batch_id = str(uuid.uuid4())[:8]
    logger.info(f"[Scout] Running LLM-driven fallback flow (batch {batch_id})...")

    doc_count, chunk_count, proc_count, fiche_topics = await _gather_brain_stats()

    user_prompt = TREND_USER_PROMPT_TEMPLATE.format(
        doc_count=doc_count,
        chunk_count=chunk_count,
        proc_count=proc_count,
        fiche_topics=", ".join(fiche_topics) if fiche_topics else "Aucune",
        extra_context="",
    )

    llm_result = await llm.generate_response(
        system_prompt=TREND_SCOUT_SYSTEM_PROMPT,
        user_content=user_prompt,
        json_mode=True,
        model_override="gpt-4o",
        temperature_override=0.4,
    )

    if not isinstance(llm_result, dict) or "trending_topics" not in llm_result:
        return {"error": "LLM returned invalid format", "raw": llm_result}
    topics_output = []

    async with AsyncSessionLocal() as session:
        for topic_data in llm_result["trending_topics"]:
            titre = topic_data["titre"]

            # Post-hoc GT validation
            trend_kw = topic_data.get("trend_keyword") or titre
            if not topic_data.get("trend_keyword") and ":" in titre:
                trend_kw = titre.split(":")[0].strip()

            gt_result = get_interest_score(trend_kw)
            marketing_score = topic_data.get("expertises", {}).get("marketing", {}).get("score", 0)
            marketing_justif = topic_data.get("expertises", {}).get("marketing", {}).get("justification", "")

            if gt_result["score"] > 0:
                logger.info(f"  -> GT validated '{trend_kw}': {gt_result['score']}/10")
                marketing_score = gt_result["score"]
                marketing_justif = f"[Trend: {trend_kw}] {gt_result['justification']}"
            else:
                logger.info(f"  -> GT unavailable for '{trend_kw}', keeping AI score")
                if "error" in gt_result:
                    marketing_justif += f" (GT check failed: {gt_result['error']})"

            trs_result = await compute_trs(titre)

            expertises = topic_data.get("expertises", {})
            if "marketing" not in expertises:
                expertises["marketing"] = {}
            expertises["marketing"]["score"] = marketing_score
            expertises["marketing"]["justification"] = marketing_justif

            ai_sci = expertises.get("science", {}).get("score", 0)
            ai_know = expertises.get("knowledge_ia", {}).get("score", 0)
            new_composite = round((marketing_score * 0.3) + (ai_sci * 0.4) + (ai_know * 0.3), 1)

            record = TrendTopic(
                titre=titre,
                topic_type=topic_data.get("type", "procedure"),
                description=topic_data.get("description", ""),
                zones=topic_data.get("zones", []),
                search_queries=topic_data.get("search_queries", []),
                score_marketing=marketing_score,
                justification_marketing=marketing_justif,
                score_science=expertises.get("science", {}).get("score", 0),
                justification_science=expertises.get("science", {}).get("justification", ""),
                references_suggerees=expertises.get("science", {}).get("references", []),
                score_knowledge=expertises.get("knowledge_ia", {}).get("score", 0),
                justification_knowledge=expertises.get("knowledge_ia", {}).get("justification", ""),
                score_composite=new_composite,
                status="proposed",
                recommandation=topic_data.get("recommandation", "REPORTER"),
                trs_current=trs_result["trs"],
                trs_details=trs_result["details"],
                learning_iterations=0,
                learning_log=[],
                batch_id=batch_id,
            )
            session.add(record)
            await session.flush()

            topics_output.append({
                "id": str(record.id),
                "titre": record.titre,
                "type": record.topic_type,
                "description": record.description,
                "zones": record.zones,
                "search_queries": record.search_queries,
                "expertises": expertises,
                "score_composite": new_composite,
                "recommandation": record.recommandation,
                "trs_current": trs_result["trs"],
                "trs_status": trs_result["status"],
                "trs_details": trs_result["details"],
            })

        await session.commit()

    return {
        "batch_id": batch_id,
        "flow": "llm_driven_fallback",
        "topics": topics_output,
        "synthese": llm_result.get("synthese", ""),
        "brain_stats": {
            "documents": doc_count,
            "chunks": chunk_count,
            "procedures": proc_count,
        },
    }


# ==========================================================================
# SHARED HELPERS
# ==========================================================================

async def _gather_brain_stats():
    # Gather current brain knowledge stats.
    async with AsyncSessionLocal() as session:
        doc_count = (await session.execute(select(func.count(Document.id)))).scalar() or 0
        chunk_count = (await session.execute(select(func.count(Chunk.id)))).scalar() or 0
        proc_count = (await session.execute(select(func.count(Procedure.id)))).scalar() or 0

        fiche_result = await session.execute(
            select(SocialGeneration.topic).distinct().limit(20)
        )
        fiche_topics = [r[0] for r in fiche_result.all()]

    return doc_count, chunk_count, proc_count, fiche_topics



