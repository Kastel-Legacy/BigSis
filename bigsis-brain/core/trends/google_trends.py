
"""
Google Trends Integration using pytrends.
- Mine real rising/top queries from seed keywords (GT-driven discovery)
- Fetch interest over time for individual keywords (validation)
"""

from pytrends.request import TrendReq
from collections import defaultdict
import unicodedata
import time
import random
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- RETRY CONFIG ---
MAX_RETRIES = 0  # Fail fast: no retry, switch to LLM fallback immediately
MIN_SLEEP = 30.0  # 30s between requests to avoid rate limiting
MAX_SLEEP = 30.0  # Fixed 30s delay
RETRY_BACKOFF_BASE = 10  # seconds (unused with MAX_RETRIES=0)


# --- DYNAMIC SEED GENERATION ---

ROOT_CONCEPTS = [
    "rides visage",
    "acide hyaluronique",
    "botox",
    "skinbooster",
    "laser visage",
    "peeling visage",
    "medecine esthetique"
]

def get_dynamic_seeds(root_concepts: list = None) -> list:
    """
    Fetch official Google Trends 'Entities' (Topics) related to root concepts.
    This expands 'botox' into 'Toxine botulique (Médicament)', 'Injections', etc.
    """
    if root_concepts is None:
        root_concepts = ROOT_CONCEPTS
        
    dynamic_seeds = set(root_concepts) # Start with roots
    
    # Try to fetch suggestions for a few random roots to keep it fast
    selected_roots = random.sample(root_concepts, min(3, len(root_concepts)))
    
    pytrends = TrendReq(hl='fr-FR', tz=360)
    
    for root in selected_roots:
        try:
            # Sleep to respect rate limits
            time.sleep(random.uniform(1.0, 2.0))
            suggestions = pytrends.suggestions(keyword=root)
            
            if suggestions:
                # Add titles of suggestions (e.g. "Toxine botulique")
                for s in suggestions[:3]: # Top 3 suggestions
                    dynamic_seeds.add(s['title'])
                    logger.info(f"Expanded root '{root}' -> '{s['title']}' ({s['type']})")
                    
        except Exception as e:
            logger.warning(f"Could not fetch suggestions for '{root}': {e}")
            
    return list(dynamic_seeds)


# --- MINING: Discover real rising queries from Google Trends ---

def _is_french_keyword(keyword: str) -> bool:
    french_markers = [
        "visage", "rides", "front", "acide", "peau", "chimique",
        "mésothérapie", "anti-rides", "rajeunissement", "peeling",
        "fractionné", "skinbooster", "profhilo", "traitement", "esthetique",
        "medecine", "laser", "injection"
    ]
    kw_lower = keyword.lower()
    return any(m in kw_lower for m in french_markers)


def mine_rising_trends(
    seed_keywords: list = None,
    timeframe: str = "today 3-m",
    max_per_seed: int = 10,
) -> list:
    """
    Mine Google Trends for REAL rising/top related queries.
    Uses DYNAMIC SEEDS (Suggestions) + Root Keywords.
    """
    
    # 1. Generate/Refine Seeds
    if seed_keywords is None:
        logger.info("[Scout] Generating dynamic seeds via Google Autocomplete...")
        seed_keywords = get_dynamic_seeds()
        # Limit to 2 seeds total for conservative rate limiting
        seed_keywords = random.sample(seed_keywords, min(2, len(seed_keywords)))
        logger.info(f"[Scout] Using seeds: {seed_keywords}")

    all_results = []

    for seed in seed_keywords:
        is_fr = _is_french_keyword(seed)
        geo = "FR" if is_fr else ""
        lang = "fr" if is_fr else "en"
        hl = "fr-FR" if is_fr else "en-US"

        for attempt in range(MAX_RETRIES + 1):
            try:
                sleep_time = random.uniform(MIN_SLEEP, MAX_SLEEP)
                if attempt > 0:
                    sleep_time = RETRY_BACKOFF_BASE * (2 ** (attempt - 1))
                    logger.info(f"Retry {attempt} for '{seed}', backoff {sleep_time:.0f}s")
                time.sleep(sleep_time)

                pytrends = TrendReq(hl=hl, tz=360)
                pytrends.build_payload([seed], cat=0, timeframe=timeframe, geo=geo, gprop="")
                related = pytrends.related_queries()

                if seed not in related:
                    logger.warning(f"No related queries for seed '{seed}'")
                    break

                seed_data = related[seed]

                # Rising queries (high priority)
                rising_df = seed_data.get("rising")
                if rising_df is not None and not rising_df.empty:
                    for _, row in rising_df.head(max_per_seed).iterrows():
                        all_results.append({
                            "query": row["query"],
                            "seed": seed,
                            "type": "rising",
                            "value": row.get("value", 0),
                            "language": lang,
                            "geo": geo,
                        })

                # Top queries (lower priority, fewer)
                top_df = seed_data.get("top")
                if top_df is not None and not top_df.empty:
                    for _, row in top_df.head(max_per_seed // 2).iterrows():
                        all_results.append({
                            "query": row["query"],
                            "seed": seed,
                            "type": "top",
                            "value": row.get("value", 0),
                            "language": lang,
                            "geo": geo,
                        })

                count = len([r for r in all_results if r["seed"] == seed])
                logger.info(f"Seed '{seed}': {count} queries found")
                break

            except Exception as e:
                # Catch 429 specifically
                err_str = str(e)
                if "429" in err_str or "Too Many" in err_str:
                    logger.warning(f"Rate limited on '{seed}', attempt {attempt + 1}")
                    if attempt >= MAX_RETRIES:
                        logger.error(f"Giving up on seed '{seed}'")
                # Catch 400 (Bad Request) - often happening with Suggestions that are invalid keywords
                elif "400" in err_str:
                     logger.warning(f"Bad Request for seed '{seed}' (likely invalid format), skipping.")
                     break
                else:
                    logger.error(f"Error for seed '{seed}': {e}")
                    break
                    
    logger.info(f"Total mined: {len(all_results)} raw queries from {len(seed_keywords)} seeds")
    return all_results


def aggregate_and_rank_trends(raw_results: list, top_n: int = 20) -> list:
    """
    Deduplicate, aggregate, and rank raw GT results.
    Queries found via multiple seeds get a multi-seed boost.

    Returns top_n ranked results:
    [{"query": str, "seeds": list, "best_type": str, "max_growth": int,
      "max_volume": int, "aggregate_score": float, "language": str, "seed_count": int}]
    """
    def normalize(text: str) -> str:
        text = text.lower().strip()
        nfkd = unicodedata.normalize("NFKD", text)
        return "".join(c for c in nfkd if not unicodedata.combining(c))

    groups = defaultdict(lambda: {
        "original_queries": [],
        "seeds": set(),
        "rising_values": [],
        "top_values": [],
        "languages": set(),
    })

    for r in raw_results:
        key = normalize(r["query"])
        g = groups[key]
        g["original_queries"].append(r["query"])
        g["seeds"].add(r["seed"])
        g["languages"].add(r["language"])
        if r["type"] == "rising":
            g["rising_values"].append(r["value"])
        else:
            g["top_values"].append(r["value"])

    scored = []
    for norm_key, g in groups.items():
        original = max(set(g["original_queries"]), key=g["original_queries"].count)
        max_growth = max(g["rising_values"]) if g["rising_values"] else 0
        max_volume = max(g["top_values"]) if g["top_values"] else 0

        if g["rising_values"]:
            base_score = min(max_growth, 1000) / 10.0
        elif g["top_values"]:
            base_score = max_volume * 0.5
        else:
            base_score = 0

        n_seeds = len(g["seeds"])
        multi_seed_factor = 1.0 + 0.3 * (n_seeds - 1)
        aggregate_score = round(base_score * multi_seed_factor, 1)

        scored.append({
            "query": original,
            "normalized": norm_key,
            "seeds": sorted(g["seeds"]),
            "best_type": "rising" if g["rising_values"] else "top",
            "max_growth": max_growth,
            "max_volume": max_volume,
            "aggregate_score": aggregate_score,
            "language": "fr" if "fr" in g["languages"] else "en",
            "seed_count": n_seeds,
        })

    scored.sort(key=lambda x: x["aggregate_score"], reverse=True)
    return scored[:top_n]

def get_interest_score(keyword: str, timeframe='today 12-m', geo='') -> dict:
    """
    Fetches Google Trends interest for a keyword.
    Returns a score (0-10) and explanation.
    
    Score Logic:
    - Based on average interest relative to the peak (100).
    - Checks for "Rising" trend (last 30 days > yearly average).
    """
    try:
        # Pytrends requires a bit of sleep to avoid 429s if called in loop
        time.sleep(random.uniform(1.0, 2.0))
        
        pytrends = TrendReq(hl='en-US', tz=360)
        kw_list = [keyword]
        
        # Build payload
        pytrends.build_payload(kw_list, cat=0, timeframe=timeframe, geo=geo, gprop='')
        
        # Get interest over time
        data = pytrends.interest_over_time()
        
        if data.empty:
            return {
                "score": 1,
                "justification": f"No data found on Google Trends for '{keyword}'."
            }
            
        # Analyze data
        # 'is_partial' column exists sometimes, ignore it
        interest_values = data[keyword].values
        if len(interest_values) == 0:
             return {
                "score": 1,
                "justification": "Data returned but empty values."
            }

        avg_interest = interest_values.mean()
        max_interest = interest_values.max()
        
        # Calculate recent interest (approx last 4 weeks of data points)
        # Data is usually weekly for 12 months, so ~4 points
        recent_interest = interest_values[-4:].mean() if len(interest_values) >= 4 else avg_interest
        
        # Score calculation (0-10)
        # If recent interest is high (close to 100), score is high.
        # If average is low but recent is high -> Emerging trend
        
        raw_score = (recent_interest / 100.0) * 10.0
        
        # Boost if rising
        is_rising = recent_interest > (avg_interest * 1.2)
        if is_rising:
            raw_score = min(10, raw_score * 1.2)
            
        final_score = round(max(1, raw_score), 1)
        
        trend_status = "stable"
        if is_rising:
            trend_status = "rising"
        elif recent_interest < (avg_interest * 0.8):
            trend_status = "declining"
            
        justification = (
            f"Google Trends ({timeframe}): Status {trend_status.upper()}. "
            f"Avg Interest: {avg_interest:.1f}/100. Recent: {recent_interest:.1f}/100."
        )
        
        return {
            "score": final_score,
            "justification": justification,
            "meta": {
                "avg": round(avg_interest, 1),
                "recent": round(recent_interest, 1),
                "status": trend_status
            }
        }

    except Exception as e:
        logger.error(f"Google Trends Error for {keyword}: {e}")
        # Fallback
        return {
            "score": 0,
            "justification": f"Google Trends unavailable: {str(e)}",
            "error": str(e)
        }
