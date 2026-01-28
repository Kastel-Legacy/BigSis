"""
TRS Engine - Topic Readiness Score Calculator
Measures how ready the BigSIS brain is to generate content on a given topic.
Includes semantic deduplication to avoid counting near-duplicate chunks.
"""

from typing import Dict, List, Tuple
from sqlalchemy import select, func
from datetime import datetime, timedelta

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


def trs_status_label(trs: float) -> str:
    if trs >= TRS_GREEN:
        return "green"
    elif trs >= TRS_YELLOW:
        return "yellow"
    elif trs >= TRS_ORANGE:
        return "orange"
    return "red"


async def compute_trs(topic: str, search_queries: List[str] = None) -> Dict:
    """
    Compute the Topic Readiness Score for a given topic.
    Returns a dict with total score, breakdown, and status.

    TRS components (max 100):
    - documents:  /20  (unique docs matching the topic)
    - chunks:     /20  (semantically relevant chunks, deduplicated)
    - diversity:  /15  (evidence types: meta-analysis, RCT, etc.)
    - recency:    /15  (papers from last 3 years)
    - coverage:   /15  (efficacy + safety + recovery dimensions)
    - atlas:      /15  (procedure exists in atlas)
    """
    query_embedding = await get_embedding(topic)

    async with AsyncSessionLocal() as session:
        # 1. Find relevant chunks via semantic search
        stmt = (
            select(Chunk, DocumentVersion, Document)
            .join(DocumentVersion, Chunk.document_version_id == DocumentVersion.id)
            .join(Document, DocumentVersion.document_id == Document.id)
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(50)
        )
        result = await session.execute(stmt)
        rows = result.all()

        # Semantic deduplication: keep only chunks that are sufficiently different
        unique_chunks = []
        unique_embeddings = []
        doc_ids = set()
        doc_titles = []
        chunk_texts = []

        for chunk, version, doc in rows:
            # Skip if no embedding
            if chunk.embedding is None:
                continue

            # Check semantic similarity against already-kept chunks
            is_duplicate = False
            for existing_emb in unique_embeddings:
                sim = _cosine_similarity(chunk.embedding, existing_emb)
                if sim > SEMANTIC_DEDUP_THRESHOLD:
                    is_duplicate = True
                    break

            if not is_duplicate:
                unique_chunks.append((chunk, version, doc))
                unique_embeddings.append(chunk.embedding)
                doc_ids.add(str(doc.id))
                doc_titles.append(doc.title or "")
                chunk_texts.append(chunk.text or "")

        # --- SCORING ---

        # 1. Documents (/20)
        n_docs = len(doc_ids)
        if n_docs >= 8:
            score_docs = 20
        elif n_docs >= 5:
            score_docs = 12
        elif n_docs >= 3:
            score_docs = 6
        else:
            score_docs = 0

        # 2. Chunks (/20) - only semantically unique
        n_chunks = len(unique_chunks)
        if n_chunks >= 20:
            score_chunks = 20
        elif n_chunks >= 10:
            score_chunks = 12
        elif n_chunks >= 5:
            score_chunks = 6
        else:
            score_chunks = 0

        # 3. Diversity of evidence (/15)
        score_diversity = _compute_diversity_score(chunk_texts, doc_titles)

        # 4. Recency (/15) - papers from last 3 years
        three_years_ago = datetime.utcnow() - timedelta(days=3 * 365)
        recent_count = 0
        for _, version, doc in unique_chunks:
            if version.created_at and version.created_at.replace(tzinfo=None) >= three_years_ago:
                recent_count += 1
        # Deduplicate by doc
        if recent_count >= 3:
            score_recency = 15
        elif recent_count >= 2:
            score_recency = 10
        elif recent_count >= 1:
            score_recency = 5
        else:
            score_recency = 0

        # 5. Thematic coverage (/15) - efficacy + safety + recovery
        has_efficacy, has_safety, has_recovery = _check_thematic_coverage(chunk_texts)
        coverage_count = sum([has_efficacy, has_safety, has_recovery])
        if coverage_count == 3:
            score_coverage = 15
        elif coverage_count == 2:
            score_coverage = 10
        elif coverage_count == 1:
            score_coverage = 5
        else:
            score_coverage = 0

        # 6. Atlas presence (/15) - procedure exists in catalog
        proc_result = await session.execute(select(func.count(Procedure.id)))
        total_procs = proc_result.scalar() or 0

        # Search for a matching procedure by name similarity
        topic_lower = topic.lower()
        proc_stmt = select(Procedure)
        proc_result = await session.execute(proc_stmt)
        procedures = proc_result.scalars().all()
        atlas_match = False
        for p in procedures:
            if p.name and (topic_lower in p.name.lower() or p.name.lower() in topic_lower):
                atlas_match = True
                break
        # Also check tags
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
                "documents": {"score": score_docs, "max": 20, "count": n_docs},
                "chunks": {"score": score_chunks, "max": 20, "count": n_chunks, "note": "semantically deduplicated"},
                "diversity": {"score": score_diversity, "max": 15},
                "recency": {"score": score_recency, "max": 15, "recent_papers": recent_count},
                "coverage": {
                    "score": score_coverage, "max": 15,
                    "efficacy": has_efficacy, "safety": has_safety, "recovery": has_recovery
                },
                "atlas": {"score": score_atlas, "max": 15, "match_found": atlas_match},
            }
        }


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


def _compute_diversity_score(chunk_texts: List[str], doc_titles: List[str]) -> int:
    """
    Score /15 based on evidence type diversity.
    Looks for signals of meta-analyses, RCTs, clinical trials in text.
    """
    all_text = " ".join(chunk_texts + doc_titles).lower()

    has_meta = any(kw in all_text for kw in [
        "meta-analysis", "meta analysis", "systematic review", "meta-analyse"
    ])
    has_rct = any(kw in all_text for kw in [
        "randomized controlled", "randomised controlled", "rct",
        "double-blind", "double blind", "placebo-controlled"
    ])
    has_clinical = any(kw in all_text for kw in [
        "clinical trial", "clinical study", "prospective study",
        "retrospective study", "cohort study", "case series"
    ])

    if has_meta:
        return 15
    elif has_rct:
        return 10
    elif has_clinical:
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
