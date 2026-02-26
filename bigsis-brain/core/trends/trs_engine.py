"""
TRS Engine - Topic Readiness Score Calculator (v2 — cumulative)
Measures how ready the BigSIS brain is to generate content on a given topic.

v2: Scores are monotonically increasing by design. Each computation merges
newly discovered chunks/docs with the previously stored cumulative state
(set union). Since a set union can only grow, TRS never regresses.
"""

from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from sqlalchemy import select, func
from datetime import datetime, timedelta
import uuid as _uuid

from core.db.database import AsyncSessionLocal
from core.db.models import Chunk, Document, DocumentVersion, Procedure
from core.rag.embeddings import get_embedding

# TRS thresholds
TRS_GREEN = 75
TRS_YELLOW = 60
TRS_ORANGE = 40
TRS_MINIMUM_FOR_GENERATION = 70

# Semantic dedup threshold: chunks with cosine similarity > this are near-duplicates
SEMANTIC_DEDUP_THRESHOLD = 0.90

# Stagnation: if a learning iteration adds less than this TRS delta, stop
STAGNATION_DELTA_THRESHOLD = 3.0
MAX_LEARNING_ITERATIONS = 3

# Schema version for trs_details JSONB
TRS_SCHEMA_VERSION = 2


def trs_status_label(trs: float) -> str:
    if trs >= TRS_GREEN:
        return "green"
    elif trs >= TRS_YELLOW:
        return "yellow"
    elif trs >= TRS_ORANGE:
        return "orange"
    return "red"


# ---------------------------------------------------------------------------
# Cumulative state dataclass
# ---------------------------------------------------------------------------

@dataclass
class _CumulativeState:
    """Internal representation of the cumulative TRS state."""
    seen_chunk_ids: Set[str] = field(default_factory=set)
    seen_doc_ids: Set[str] = field(default_factory=set)
    seen_diversity_flags: Dict[str, bool] = field(default_factory=lambda: {
        "has_meta": False, "has_rct": False, "has_clinical": False
    })
    seen_coverage_flags: Dict[str, bool] = field(default_factory=lambda: {
        "efficacy": False, "safety": False, "recovery": False
    })
    seen_recency_chunk_ids: Set[str] = field(default_factory=set)


def _load_cumulative_state(stored_details: Optional[Dict]) -> _CumulativeState:
    """Parse stored trs_details into a CumulativeState. Handles v1 (old) and v2 formats."""
    if not stored_details or stored_details.get("schema_version") != TRS_SCHEMA_VERSION:
        # V1 or empty — start fresh, the floor workaround protects against regression
        return _CumulativeState()

    return _CumulativeState(
        seen_chunk_ids=set(stored_details.get("seen_chunk_ids", [])),
        seen_doc_ids=set(stored_details.get("seen_doc_ids", [])),
        seen_diversity_flags=stored_details.get("seen_diversity_flags", {
            "has_meta": False, "has_rct": False, "has_clinical": False
        }),
        seen_coverage_flags=stored_details.get("seen_coverage_flags", {
            "efficacy": False, "safety": False, "recovery": False
        }),
        seen_recency_chunk_ids=set(stored_details.get("seen_recency_chunk_ids", [])),
    )


async def _validate_stored_ids(session, chunk_ids: Set[str], doc_ids: Set[str]) -> Tuple[Set[str], Set[str]]:
    """Remove IDs that no longer exist in the DB (garbage collection)."""
    valid_chunk_ids = set()
    valid_doc_ids = set()

    if chunk_ids:
        try:
            uuid_list = [_uuid.UUID(cid) for cid in chunk_ids]
            result = await session.execute(
                select(Chunk.id).where(Chunk.id.in_(uuid_list))
            )
            valid_chunk_ids = {str(r[0]) for r in result.all()}
        except Exception:
            valid_chunk_ids = chunk_ids  # On error, keep all (safe fallback)

    if doc_ids:
        try:
            uuid_list = [_uuid.UUID(did) for did in doc_ids]
            result = await session.execute(
                select(Document.id).where(Document.id.in_(uuid_list))
            )
            valid_doc_ids = {str(r[0]) for r in result.all()}
        except Exception:
            valid_doc_ids = doc_ids

    return valid_chunk_ids, valid_doc_ids


# ---------------------------------------------------------------------------
# Main TRS computation
# ---------------------------------------------------------------------------

async def compute_trs(topic: str, stored_details: Optional[Dict] = None, search_queries: List[str] = None) -> Dict:
    """
    Compute the Topic Readiness Score for a given topic (cumulative v2).

    When stored_details is provided (from a previous computation), the engine
    merges newly discovered chunks/docs with the stored cumulative state.
    Since set union can only grow, TRS is monotonically increasing by design.

    TRS components (max 100):
    - documents:  /20  (unique docs matching the topic)
    - chunks:     /20  (semantically relevant chunks, deduplicated)
    - diversity:  /15  (evidence types: meta-analysis, RCT, etc.)
    - recency:    /15  (papers from last 3 years)
    - coverage:   /15  (efficacy + safety + recovery dimensions)
    - atlas:      /15  (procedure exists in atlas)
    """
    # Load cumulative state from previous computation
    state = _load_cumulative_state(stored_details)

    query_embedding = await get_embedding(topic)

    async with AsyncSessionLocal() as session:
        # 1. Find relevant chunks via semantic search (fresh discovery)
        stmt = (
            select(Chunk, DocumentVersion, Document)
            .join(DocumentVersion, Chunk.document_version_id == DocumentVersion.id)
            .join(Document, DocumentVersion.document_id == Document.id)
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(200)
        )
        result = await session.execute(stmt)
        rows = result.all()

        # 2. Semantic deduplication on fresh results
        fresh_unique_chunks = []
        fresh_unique_embeddings = []
        fresh_chunk_texts = []
        fresh_doc_titles = []

        for chunk, version, doc in rows:
            if chunk.embedding is None:
                continue

            is_duplicate = False
            for existing_emb in fresh_unique_embeddings:
                sim = _cosine_similarity(chunk.embedding, existing_emb)
                if sim > SEMANTIC_DEDUP_THRESHOLD:
                    is_duplicate = True
                    break

            if not is_duplicate:
                fresh_unique_chunks.append((chunk, version, doc))
                fresh_unique_embeddings.append(chunk.embedding)
                fresh_chunk_texts.append(chunk.text or "")
                fresh_doc_titles.append(doc.title or "")

        # 3. Merge: union fresh discovery with stored cumulative state
        fresh_chunk_ids = {str(chunk.id) for chunk, _, _ in fresh_unique_chunks}
        fresh_doc_ids = {str(doc.id) for _, _, doc in fresh_unique_chunks}

        all_chunk_ids = state.seen_chunk_ids | fresh_chunk_ids
        all_doc_ids = state.seen_doc_ids | fresh_doc_ids

        # 4. Validate stored IDs still exist in DB (garbage collection)
        # Only validate the stored ones — fresh ones were just fetched so they exist
        if state.seen_chunk_ids or state.seen_doc_ids:
            valid_stored_chunks, valid_stored_docs = await _validate_stored_ids(
                session, state.seen_chunk_ids, state.seen_doc_ids
            )
            all_chunk_ids = valid_stored_chunks | fresh_chunk_ids
            all_doc_ids = valid_stored_docs | fresh_doc_ids

        # --- SCORING on merged sets ---

        # 1. Documents (/20)
        n_docs = len(all_doc_ids)
        if n_docs >= 8:
            score_docs = 20
        elif n_docs >= 5:
            score_docs = 12
        elif n_docs >= 3:
            score_docs = 6
        else:
            score_docs = 0

        # 2. Chunks (/20) - cumulative unique chunks
        n_chunks = len(all_chunk_ids)
        if n_chunks >= 20:
            score_chunks = 20
        elif n_chunks >= 10:
            score_chunks = 12
        elif n_chunks >= 5:
            score_chunks = 6
        else:
            score_chunks = 0

        # 3. Diversity (/15) - OR-merge with stored flags
        fresh_diversity = _compute_diversity_flags(fresh_chunk_texts, fresh_doc_titles)
        merged_diversity = {
            "has_meta": state.seen_diversity_flags.get("has_meta", False) or fresh_diversity["has_meta"],
            "has_rct": state.seen_diversity_flags.get("has_rct", False) or fresh_diversity["has_rct"],
            "has_clinical": state.seen_diversity_flags.get("has_clinical", False) or fresh_diversity["has_clinical"],
        }
        score_diversity = _score_diversity(merged_diversity)

        # 4. Recency (/15) - union of recency chunk IDs
        three_years_ago = datetime.utcnow() - timedelta(days=3 * 365)
        fresh_recency_ids = set()
        for chunk, version, doc in fresh_unique_chunks:
            if version.created_at and version.created_at.replace(tzinfo=None) >= three_years_ago:
                fresh_recency_ids.add(str(chunk.id))

        all_recency_ids = state.seen_recency_chunk_ids | fresh_recency_ids
        # Validate stored recency IDs still exist
        if state.seen_recency_chunk_ids:
            all_recency_ids = (valid_stored_chunks & state.seen_recency_chunk_ids) | fresh_recency_ids if state.seen_chunk_ids else all_recency_ids

        recent_count = len(all_recency_ids)
        if recent_count >= 3:
            score_recency = 15
        elif recent_count >= 2:
            score_recency = 10
        elif recent_count >= 1:
            score_recency = 5
        else:
            score_recency = 0

        # 5. Coverage (/15) - OR-merge with stored flags
        fresh_efficacy, fresh_safety, fresh_recovery = _check_thematic_coverage(fresh_chunk_texts)
        merged_coverage = {
            "efficacy": state.seen_coverage_flags.get("efficacy", False) or fresh_efficacy,
            "safety": state.seen_coverage_flags.get("safety", False) or fresh_safety,
            "recovery": state.seen_coverage_flags.get("recovery", False) or fresh_recovery,
        }
        coverage_count = sum([merged_coverage["efficacy"], merged_coverage["safety"], merged_coverage["recovery"]])
        if coverage_count == 3:
            score_coverage = 15
        elif coverage_count == 2:
            score_coverage = 10
        elif coverage_count == 1:
            score_coverage = 5
        else:
            score_coverage = 0

        # 6. Atlas presence (/15)
        topic_lower = topic.lower()
        proc_stmt = select(Procedure)
        proc_result = await session.execute(proc_stmt)
        procedures = proc_result.scalars().all()
        atlas_match = False
        for p in procedures:
            if p.name and (topic_lower in p.name.lower() or p.name.lower() in topic_lower):
                atlas_match = True
                break
        if not atlas_match:
            for p in procedures:
                if p.tags:
                    for tag in p.tags:
                        if topic_lower in tag.lower() or tag.lower() in topic_lower:
                            atlas_match = True
                            break
                if atlas_match:
                    break

        score_atlas = 15 if atlas_match else 0

        # Total
        trs_total = score_docs + score_chunks + score_diversity + score_recency + score_coverage + score_atlas

        return {
            "trs": round(trs_total, 1),
            "status": trs_status_label(trs_total),
            "ready_for_generation": trs_total >= TRS_MINIMUM_FOR_GENERATION,
            "details": {
                # Cumulative state (persisted between computations)
                "schema_version": TRS_SCHEMA_VERSION,
                "seen_chunk_ids": sorted(all_chunk_ids),
                "seen_doc_ids": sorted(all_doc_ids),
                "seen_diversity_flags": merged_diversity,
                "seen_coverage_flags": merged_coverage,
                "seen_recency_chunk_ids": sorted(all_recency_ids),
                # Score snapshot (for display/debug)
                "scores": {
                    "documents": {"score": score_docs, "max": 20, "count": n_docs},
                    "chunks": {"score": score_chunks, "max": 20, "count": n_chunks},
                    "diversity": {"score": score_diversity, "max": 15},
                    "recency": {"score": score_recency, "max": 15, "recent_count": recent_count},
                    "coverage": {
                        "score": score_coverage, "max": 15,
                        "efficacy": merged_coverage["efficacy"],
                        "safety": merged_coverage["safety"],
                        "recovery": merged_coverage["recovery"],
                    },
                    "atlas": {"score": score_atlas, "max": 15, "match_found": atlas_match},
                },
            }
        }


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _cosine_similarity(a: list, b: list) -> float:
    """Compute cosine similarity between two embedding vectors."""
    if a is None or b is None or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _compute_diversity_flags(chunk_texts: List[str], doc_titles: List[str]) -> Dict[str, bool]:
    """Detect evidence type signals in text. Returns boolean flags."""
    all_text = " ".join(chunk_texts + doc_titles).lower()

    return {
        "has_meta": any(kw in all_text for kw in [
            "meta-analysis", "meta analysis", "systematic review", "meta-analyse"
        ]),
        "has_rct": any(kw in all_text for kw in [
            "randomized controlled", "randomised controlled", "rct",
            "double-blind", "double blind", "placebo-controlled"
        ]),
        "has_clinical": any(kw in all_text for kw in [
            "clinical trial", "clinical study", "prospective study",
            "retrospective study", "cohort study", "case series"
        ]),
    }


def _score_diversity(flags: Dict[str, bool]) -> int:
    """Score /15 based on evidence type diversity flags."""
    if flags.get("has_meta"):
        return 15
    elif flags.get("has_rct"):
        return 10
    elif flags.get("has_clinical"):
        return 5
    return 0


def _check_thematic_coverage(chunk_texts: List[str]) -> Tuple[bool, bool, bool]:
    """Check if chunks cover efficacy, safety, and recovery dimensions."""
    all_text = " ".join(chunk_texts).lower()

    efficacy_keywords = [
        "efficacy", "efficacite", "effective", "improvement", "reduction",
        "amelioration", "resultat", "result", "outcome", "response rate"
    ]
    safety_keywords = [
        "safety", "securite", "adverse", "side effect", "effet secondaire",
        "complication", "risk", "risque", "contraindication", "contre-indication"
    ]
    recovery_keywords = [
        "recovery", "downtime", "recuperation", "healing", "cicatrisation",
        "eviction sociale", "social downtime", "redness", "swelling", "rougeur"
    ]

    has_efficacy = any(kw in all_text for kw in efficacy_keywords)
    has_safety = any(kw in all_text for kw in safety_keywords)
    has_recovery = any(kw in all_text for kw in recovery_keywords)

    return has_efficacy, has_safety, has_recovery
