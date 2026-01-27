from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import asyncio

# Core Modules
from core.pubmed import search_pubmed, fetch_details

from core.semantic_scholar import search_semantic_scholar
from core.llm_client import LLMClient
from core.config import settings

router = APIRouter()
llm = LLMClient()

class ResearchRequest(BaseModel):
    query: str

class ResearchStep(BaseModel):
    step: str # intent, search, ranking, done
    details: List[str]
    results: Optional[List[dict]] = None

@router.post("/research/start")
async def start_research(request: ResearchRequest):
    """
    Simulate a streaming agent process (for now returns full result, 
    but in future should stream steps).
    """
    print(f"🕵️‍♀️ ASTRA Agent: Starting research for '{request.query}'")
    
    # 1. Intent Analysis (LLM)
    # We ask the LLM to extract key medical terms and inclusion/exclusion criteria
    prompt_intent = f"""
    You are an expert medical researcher. Analyze this user query: "{request.query}"
    
    Extract:
    1. Key medical terms for search (keywords).
    2. Specific inclusion criteria (e.g. "human trials", "consensus").
    
    Return ONLY a JSON like: {{"keywords": ["term1", "term2"], "criteria": ["criterion1"]}}
    """
    # For MVP, we skip the actual LLM call to save time/tokens if needed, 
    # but here is where we would call: intent_data = await llm.generate_json(prompt_intent)
    
    # 2. Parallel Search
    # Trigger PubMed and Semantic Scholar
    
    results = {
        "pubmed": [],
        "semantic": []
    }
    
    # PubMed
    try:
        pmids = search_pubmed(request.query, max_results=5)
        if pmids:
            results["pubmed"] = fetch_details(pmids)
    except Exception as e:
        print(f"⚠️ PubMed Search error: {e}")

    # Semantic Scholar
    try:
        semantic_papers = search_semantic_scholar(request.query, limit=5)
        results["semantic"] = semantic_papers
    except Exception as e:
        print(f"⚠️ Semantic Scholar Search error: {e}")
        
    # 3. Reranking / Synthesis
    # Transform papers into chunks with relevance scores
    chunks = []

    for idx, p in enumerate(results["pubmed"]):
        # Extract abstract as chunk (simulate chunking logic)
        abstract = p.get('abstract', 'No abstract available.')

        chunks.append({
            "id": f"pubmed_{p.get('pmid', idx)}",
            "source": "PubMed",
            "pmid": p.get('pmid', ''),
            "title": p['titre'],
            "content": abstract,
            "year": p['annee'],
            "url": p['lien'],
            "study_type": p.get('study_type', 'Research Article'),
            "relevance_score": 95 - (idx * 8),  # Mock scoring: first results are more relevant
            "token_count": len(abstract.split()),
            "size_kb": len(abstract.encode('utf-8')) / 1024
        })

    for idx, p in enumerate(results["semantic"]):
        abstract = p.get('abstract') or 'No abstract available.'

        chunks.append({
            "id": f"semantic_{p.get('paperId', idx)}",
            "source": "Semantic Scholar",
            "pmid": "",
            "title": p['title'],
            "content": abstract,
            "year": p.get('year', 'N/A'),
            "url": p.get('url', ''),
            "study_type": "Research Article",
            "relevance_score": 90 - (idx * 8),
            "token_count": len(abstract.split()),
            "size_kb": len(abstract.encode('utf-8')) / 1024
        })

    # Calculate global evidence strength (average of top 5 chunks)
    top_scores = sorted([c['relevance_score'] for c in chunks], reverse=True)[:5]
    avg_strength = sum(top_scores) / len(top_scores) if top_scores else 0

    return {
        "status": "completed",
        "intent": {
            "keywords": [request.query],
            "criteria": ["Relevant scientific literature"]
        },
        "stats": {
            "pubmed_count": len(results["pubmed"]),
            "semantic_count": len(results["semantic"]),
            "total_chunks": len(chunks),
            "evidence_strength": round(avg_strength, 1)
        },
        "chunks": sorted(chunks, key=lambda x: x['relevance_score'], reverse=True)
    }
