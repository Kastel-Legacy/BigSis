"""
Trend Scout - Discovers trending topics within the BigSIS scope.

FLOW:
  PubMed recent publications (last 6 months) + Reddit hot posts + CrossRef (parallel)
  -> LLM identifies 5 trending topics from real scientific + patient signals
  -> TRS scoring + persist

No dependency on Google Trends (unreliable, slow, rate-limited).
Scientific publication velocity + Reddit patient interest = proxy for what's trending.
"""

import asyncio
import uuid
import logging
import requests
import time
from datetime import datetime
from typing import Dict, List
from sqlalchemy import select, func
from starlette.concurrency import run_in_threadpool

from core.llm_client import LLMClient
from core.db.database import AsyncSessionLocal
from core.db.models import Document, Chunk, Procedure, SocialGeneration, TrendTopic
from core.prompts.trends import (
    TREND_SCOUT_SYSTEM_PROMPT,
    TREND_USER_PROMPT_TEMPLATE,
    format_recent_signals_for_prompt,
)
from core.sources.crossref import get_crossref_studies

logger = logging.getLogger(__name__)
llm = LLMClient()

# PubMed base URL
_PUBMED_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
_PUBMED_EFETCH  = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
_PUBMED_EMAIL   = "adolphe.sa@gmail.com"

# Facial aesthetics queries for recent signal mining (last 180 days)
SIGNAL_QUERIES = [
    "facial rejuvenation non-surgical procedure",
    "botulinum toxin face aesthetic treatment",
    "hyaluronic acid filler facial injection",
    "laser skin resurfacing face aesthetics",
    "thread lift PDO face minimally invasive",
    "polynucleotides PDRN skin face",
    "radiofrequency microneedling face",
    "profhilo bioremodeling face",
]


# Reddit subreddits for facial aesthetics patient signals
_REDDIT_SUBS = [
    "PlasticSurgery",
    "SkincareAddiction",
    "botox",
    "aestheticmedicine",
]
_REDDIT_HEADERS = {"User-Agent": "BigSIS-TrendScout/1.0 (research; contact: adolphe.sa@gmail.com)"}


def _fetch_reddit_hot(subreddit: str, limit: int = 25) -> List[Dict]:
    """Synchronous: fetch hot posts from a public subreddit via the JSON API."""
    try:
        url = f"https://www.reddit.com/r/{subreddit}/hot.json"
        r = requests.get(url, params={"limit": limit}, headers=_REDDIT_HEADERS, timeout=8)
        if r.status_code != 200:
            logger.warning(f"[Scout] Reddit r/{subreddit} returned {r.status_code}")
            return []
        posts = r.json().get("data", {}).get("children", [])
        results = []
        for p in posts:
            d = p.get("data", {})
            title = d.get("title", "").strip()
            score = d.get("score", 0)
            num_comments = d.get("num_comments", 0)
            # Skip pinned/announcement posts with low engagement
            if not title or score < 5:
                continue
            results.append({
                "titre": title,
                "source": "Reddit",
                "subreddit": subreddit,
                "score": score,
                "comments": num_comments,
                "annee": str(datetime.now().year),
            })
        return results
    except Exception as e:
        logger.warning(f"[Scout] Reddit r/{subreddit} failed: {e}")
        return []


def _pubmed_recent_titles(query: str, max_results: int = 4) -> List[Dict]:
    """Synchronous: fetch recent PubMed titles for a query (last 180 days)."""
    try:
        time.sleep(0.35)  # NCBI rate limit: 3 req/s
        r = requests.get(_PUBMED_ESEARCH, params={
            "db": "pubmed", "term": query, "retmode": "json",
            "retmax": max_results, "reldate": 180,
            "email": _PUBMED_EMAIL,
        }, timeout=8)
        pmids = r.json().get("esearchresult", {}).get("idlist", [])[:max_results]
        if not pmids:
            return []

        time.sleep(0.35)
        import xml.etree.ElementTree as ET
        rf = requests.get(_PUBMED_EFETCH, params={
            "db": "pubmed", "id": ",".join(pmids), "retmode": "xml",
            "email": _PUBMED_EMAIL,
        }, timeout=10)
        root = ET.fromstring(rf.content)
        results = []
        for article in root.findall(".//PubmedArticle"):
            title = article.findtext(".//ArticleTitle") or ""
            year_node = article.find(".//PubDate/Year")
            year = year_node.text if year_node is not None else str(datetime.now().year)
            pmid = article.findtext(".//PMID") or ""
            if title:
                results.append({"titre": title, "annee": year, "pmid": pmid, "source": "PubMed"})
        return results
    except Exception as e:
        logger.warning(f"[Scout] PubMed signal failed for '{query}': {e}")
        return []


async def _fetch_reddit_signals() -> List[Dict]:
    """
    Fetch hot posts from facial aesthetics subreddits in parallel.
    Returns patient-interest signals (what real people are asking in 2026).
    """
    tasks = [
        run_in_threadpool(_fetch_reddit_hot, sub, 25)
        for sub in _REDDIT_SUBS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    seen: set = set()
    signals: List[Dict] = []
    for batch in results:
        if isinstance(batch, Exception) or not isinstance(batch, list):
            continue
        for post in batch:
            key = post["titre"].lower()[:60]
            if key not in seen:
                seen.add(key)
                signals.append(post)

    # Sort by engagement (score + comments) descending, keep top 20
    signals.sort(key=lambda x: x.get("score", 0) + x.get("comments", 0) * 2, reverse=True)
    logger.info(f"[Scout] Reddit: {len(signals)} hot posts from {len(_REDDIT_SUBS)} subreddits")
    return signals[:20]


async def _fetch_recent_signals() -> List[Dict]:
    """
    Fetch signals from 3 parallel sources:
    - PubMed: recent publications (last 6 months) — scientific trending
    - Reddit: hot posts from aesthetics subreddits — patient interest (real 2026 signal)
    - CrossRef: recent papers (current year-1) — academic trending
    Returns combined deduplicated list.
    """
    seen_titles: set = set()
    signals: List[Dict] = []
    current_year = datetime.now().year

    # All 3 sources in parallel
    pubmed_tasks = [
        run_in_threadpool(_pubmed_recent_titles, q, 4)
        for q in SIGNAL_QUERIES
    ]
    pubmed_results, reddit_signals, crossref_raw = await asyncio.gather(
        asyncio.gather(*pubmed_tasks, return_exceptions=True),
        _fetch_reddit_signals(),
        run_in_threadpool(
            get_crossref_studies,
            "facial aesthetics injection treatment minimally invasive",
            5,
            current_year - 1,
        ),
        return_exceptions=True,
    )

    # PubMed
    if not isinstance(pubmed_results, Exception):
        for batch in pubmed_results:
            if isinstance(batch, Exception) or not isinstance(batch, list):
                continue
            for paper in batch:
                title_key = paper["titre"].lower()[:60]
                if title_key not in seen_titles:
                    seen_titles.add(title_key)
                    signals.append(paper)

    # Reddit (patient signals — labeled explicitly)
    if not isinstance(reddit_signals, Exception) and isinstance(reddit_signals, list):
        for post in reddit_signals:
            key = post["titre"].lower()[:60]
            if key not in seen_titles:
                seen_titles.add(key)
                signals.append(post)
    else:
        logger.warning(f"[Scout] Reddit signals failed: {reddit_signals}")

    # CrossRef
    if not isinstance(crossref_raw, Exception) and isinstance(crossref_raw, list):
        for r in crossref_raw[:5]:
            title_key = r.get("titre", "").lower()[:60]
            if title_key and title_key not in seen_titles:
                seen_titles.add(title_key)
                signals.append({
                    "titre": r.get("titre", ""),
                    "annee": r.get("annee", str(current_year)),
                    "pmid": r.get("pmid", ""),
                    "source": "CrossRef",
                })
    else:
        logger.warning(f"[Scout] CrossRef signals failed: {crossref_raw}")

    pubmed_count = sum(1 for s in signals if s.get("source") == "PubMed")
    reddit_count = sum(1 for s in signals if s.get("source") == "Reddit")
    crossref_count = sum(1 for s in signals if s.get("source") == "CrossRef")
    logger.info(
        f"[Scout] Signals: {len(signals)} total "
        f"(PubMed={pubmed_count}, Reddit={reddit_count}, CrossRef={crossref_count})"
    )
    return signals


async def discover_trends(batch_id: str = None) -> Dict:
    """
    Discover 5 trending topics within BigSIS scope.

    Flow:
      Phase 1: Fetch recent publications (PubMed 6m + CrossRef) — parallel
      Phase 2: Gather brain context
      Phase 3: LLM identifies 5 topics from signals
      Phase 4: TRS + persist
    """
    if not batch_id:
        batch_id = str(uuid.uuid4())[:8]

    # Phase 1 + 2 in parallel
    logger.info("[Scout] Phase 1+2: Fetching recent signals & brain context in parallel...")
    signals, brain_stats = await asyncio.gather(
        _fetch_recent_signals(),
        _gather_brain_stats(),
    )
    doc_count, chunk_count, proc_count, fiche_topics = brain_stats
    logger.info(f"[Scout] Got {len(signals)} signals | Brain: {doc_count} docs, {proc_count} procs")

    # Phase 3: LLM
    logger.info("[Scout] Phase 3: LLM identifying trending topics from publication signals...")
    signals_text = format_recent_signals_for_prompt(signals)

    user_prompt = TREND_USER_PROMPT_TEMPLATE.format(
        doc_count=doc_count,
        chunk_count=chunk_count,
        proc_count=proc_count,
        fiche_topics=", ".join(fiche_topics) if fiche_topics else "Aucune",
        extra_context=signals_text,
    )

    llm_result = await llm.generate_response(
        system_prompt=TREND_SCOUT_SYSTEM_PROMPT,
        user_content=user_prompt,
        json_mode=True,
        model_override="gpt-4o-mini",
        temperature_override=0.3,
    )

    if not isinstance(llm_result, dict) or "trending_topics" not in llm_result:
        logger.error(f"[Scout] LLM returned invalid format: {llm_result}")
        return {"error": "LLM returned invalid format", "raw": llm_result}

    # Phase 4: Persist topics — TRS computed on-demand when admin clicks "Intéressant"
    logger.info("[Scout] Phase 4: Persisting topics (TRS deferred to admin approval)...")
    trending = llm_result["trending_topics"]

    # Build auditable signals summary (top 5 per source)
    signals_summary = {
        "pubmed": [
            {"titre": s["titre"], "annee": s.get("annee", ""), "pmid": s.get("pmid", "")}
            for s in signals if s.get("source") == "PubMed"
        ][:5],
        "reddit": [
            {"titre": s["titre"], "subreddit": s.get("subreddit", ""), "score": s.get("score", 0), "comments": s.get("comments", 0)}
            for s in signals if s.get("source") == "Reddit"
        ][:5],
        "crossref": [
            {"titre": s["titre"], "annee": s.get("annee", "")}
            for s in signals if s.get("source") == "CrossRef"
        ][:5],
    }

    topics_output = []
    async with AsyncSessionLocal() as session:
        for topic_data in trending:
            titre = topic_data["titre"]

            expertises = topic_data.get("expertises", {})
            marketing_score = expertises.get("marketing", {}).get("score", 0)
            marketing_justif = expertises.get("marketing", {}).get("justification", "")
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
                justification_marketing=f"[PUBMED+REDDIT SIGNALS] {marketing_justif}",
                score_science=ai_sci,
                justification_science=expertises.get("science", {}).get("justification", ""),
                references_suggerees=expertises.get("science", {}).get("references", []),
                score_knowledge=ai_know,
                justification_knowledge=expertises.get("knowledge_ia", {}).get("justification", ""),
                score_composite=new_composite,
                status="proposed",
                recommandation=topic_data.get("recommandation", "REPORTER"),
                trs_current=0,
                trs_details={},
                learning_iterations=0,
                learning_log=[],
                raw_signals=signals_summary,
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
            })

        await session.commit()

    return {
        "batch_id": batch_id,
        "flow": "pubmed_signals",
        "signal_count": len(signals),
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
    async with AsyncSessionLocal() as session:
        doc_count = (await session.execute(select(func.count(Document.id)))).scalar() or 0
        chunk_count = (await session.execute(select(func.count(Chunk.id)))).scalar() or 0
        proc_count = (await session.execute(select(func.count(Procedure.id)))).scalar() or 0
        fiche_result = await session.execute(
            select(SocialGeneration.topic).distinct().limit(20)
        )
        fiche_topics = [r[0] for r in fiche_result.all()]
    return doc_count, chunk_count, proc_count, fiche_topics
