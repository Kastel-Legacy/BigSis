"""
Learning Pipeline - Automated knowledge acquisition for approved trend topics.
Includes stagnation detection and coverage-oriented query diversification.
"""

from typing import Dict, List
from sqlalchemy import select
from core.db.database import AsyncSessionLocal
from core.db.models import TrendTopic
from core.pubmed import ingest_pubmed_results
from core.semantic_scholar import ingest_semantic_results
from core.trends.trs_engine import (
    compute_trs,
    STAGNATION_DELTA_THRESHOLD,
    MAX_LEARNING_ITERATIONS,
    TRS_MINIMUM_FOR_GENERATION,
)

# Coverage-gap oriented query suffixes
COVERAGE_QUERIES = {
    "efficacy": [
        "{topic} efficacy systematic review",
        "{topic} effectiveness clinical outcomes",
    ],
    "safety": [
        "{topic} adverse effects safety profile",
        "{topic} complications side effects risk",
    ],
    "recovery": [
        "{topic} downtime recovery social",
        "{topic} healing time patient satisfaction",
    ],
}


async def run_learning_iteration(topic_id: str) -> Dict:
    """
    Execute one learning iteration for an approved TrendTopic.

    Flow:
    1. Load the topic and its search queries
    2. Compute TRS before
    3. Run PubMed + Semantic Scholar ingestion using the topic's queries
    4. If coverage gaps exist, run targeted queries for missing dimensions
    5. Compute TRS after
    6. Detect stagnation (delta < threshold)
    7. Update the topic record

    Returns a status dict with before/after TRS and stagnation info.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TrendTopic).where(TrendTopic.id == topic_id)
        )
        topic = result.scalar_one_or_none()
        if not topic:
            return {"error": "Topic not found"}

        if topic.status not in ("approved", "learning"):
            return {"error": f"Topic status is '{topic.status}', expected 'approved' or 'learning'"}

        if topic.learning_iterations >= MAX_LEARNING_ITERATIONS:
            topic.status = "stagnated"
            await session.commit()
            return {
                "error": "Max learning iterations reached",
                "status": "stagnated",
                "trs": topic.trs_current,
            }

        # Mark as learning
        topic.status = "learning"
        iteration = topic.learning_iterations + 1

        # Step 1: TRS before
        trs_before = await compute_trs(topic.titre)
        trs_before_score = trs_before["trs"]

        # Step 2: Run ingestion with the topic's pre-generated queries
        queries_used = []
        new_chunks_total = 0

        search_queries = topic.search_queries or [topic.titre]
        for query in search_queries:
            try:
                count = await ingest_pubmed_results(query)
                new_chunks_total += count
                queries_used.append({"source": "pubmed", "query": query, "results": count})
            except Exception as e:
                queries_used.append({"source": "pubmed", "query": query, "error": str(e)})

        # Also try Semantic Scholar with the topic title
        try:
            sem_count = await ingest_semantic_results(topic.titre)
            new_chunks_total += sem_count
            queries_used.append({"source": "semantic_scholar", "query": topic.titre, "results": sem_count})
        except Exception as e:
            queries_used.append({"source": "semantic_scholar", "query": topic.titre, "error": str(e)})

        # Step 3: Coverage-gap oriented queries
        trs_mid = await compute_trs(topic.titre)
        coverage = trs_mid["details"].get("coverage", {})

        for dimension, has_it in [
            ("efficacy", coverage.get("efficacy", False)),
            ("safety", coverage.get("safety", False)),
            ("recovery", coverage.get("recovery", False)),
        ]:
            if not has_it and dimension in COVERAGE_QUERIES:
                for q_template in COVERAGE_QUERIES[dimension]:
                    query = q_template.format(topic=topic.titre)
                    try:
                        count = await ingest_pubmed_results(query)
                        new_chunks_total += count
                        queries_used.append({
                            "source": "pubmed",
                            "query": query,
                            "results": count,
                            "gap_fill": dimension,
                        })
                    except Exception as e:
                        queries_used.append({
                            "source": "pubmed",
                            "query": query,
                            "error": str(e),
                            "gap_fill": dimension,
                        })

        # Step 4: TRS after (monotonic — never regress due to ranking artifacts)
        trs_after = await compute_trs(topic.titre)
        trs_after_raw = trs_after["trs"]
        trs_after_score = max(trs_before_score, trs_after_raw)
        delta = trs_after_score - trs_before_score  # always >= 0

        # Step 5: Stagnation detection
        is_stagnated = delta < STAGNATION_DELTA_THRESHOLD and iteration >= 2

        # Step 6: Determine new status
        if trs_after_score >= TRS_MINIMUM_FOR_GENERATION:
            new_status = "ready"
        elif is_stagnated:
            new_status = "stagnated"
        else:
            new_status = "learning"

        # Step 7: Update topic record
        log_entry = {
            "iteration": iteration,
            "queries": queries_used,
            "new_chunks": new_chunks_total,
            "trs_before": trs_before_score,
            "trs_after": trs_after_score,
            "trs_after_raw": trs_after_raw,
            "delta": round(delta, 1),
            "stagnated": is_stagnated,
        }

        existing_log = topic.learning_log or []
        existing_log.append(log_entry)

        topic.learning_iterations = iteration
        topic.last_learning_delta = round(delta, 1)
        topic.learning_log = existing_log
        topic.trs_current = trs_after_score
        topic.trs_details = trs_after["details"]
        topic.status = new_status

        await session.commit()

        return {
            "topic_id": str(topic.id),
            "titre": topic.titre,
            "iteration": iteration,
            "trs_before": trs_before_score,
            "trs_after": trs_after_score,
            "trs_after_raw": trs_after_raw,
            "delta": round(delta, 1),
            "new_chunks": new_chunks_total,
            "queries_used": len(queries_used),
            "stagnated": is_stagnated,
            "status": new_status,
            "ready_for_generation": trs_after_score >= TRS_MINIMUM_FOR_GENERATION,
            "details": trs_after["details"],
        }


async def run_full_learning(topic_id: str) -> Dict:
    """
    Run learning iterations until the topic is ready, stagnated, or max iterations reached.
    Returns the final state.
    """
    results = []
    for _ in range(MAX_LEARNING_ITERATIONS):
        result = await run_learning_iteration(topic_id)
        results.append(result)

        if result.get("error"):
            break
        if result["status"] in ("ready", "stagnated"):
            break

    return {
        "topic_id": topic_id,
        "iterations": results,
        "final_status": results[-1].get("status", "unknown") if results else "error",
        "final_trs": results[-1].get("trs_after", 0) if results else 0,
    }
