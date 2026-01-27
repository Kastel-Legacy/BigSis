import requests
from typing import List, Dict
from core.config import settings
from core.rag.ingestion import ingest_document

BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

def search_semantic_scholar(query: str, limit: int = 10) -> List[Dict]:
    print(f"   ... Appel API Semantic Scholar pour: {query}")
    
    # Fields to retrieve
    fields = "paperId,title,abstract,year,url,isOpenAccess,openAccessPdf"
    
    params = {
        "query": query,
        "limit": limit,
        "fields": fields
    }
    
    headers = {}
    if settings.SEMANTIC_SCHOLAR_API_KEY:
        headers["x-api-key"] = settings.SEMANTIC_SCHOLAR_API_KEY
    
    try:
        resp = requests.get(BASE_URL, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [])
    except Exception as e:
        print(f"⚠️ Erreur Semantic Scholar Search: {e}")
        return []

async def ingest_semantic_results(query: str):
    """
    Search Semantic Scholar and ingest results.
    """
    print(f"🚀 Démarrage recherche Semantic Scholar: {query}")
    
    # 1. Search
    papers = search_semantic_scholar(query, limit=settings.MAX_STUDIES_PER_RUN)
    
    if not papers:
        print("Aucun papier trouvé.")
        return 0
        
    print(f"Trouvé {len(papers)} papiers. Ingestion...")
    
    count = 0
    for paper in papers:
        # Skip if no abstract (low value for RAG)
        if not paper.get('abstract'):
            continue

        pdf_url = paper.get('openAccessPdf', {}).get('url') if paper.get('openAccessPdf') else paper.get('url')
        
        content = f"Titre: {paper['title']}\n\nAbstract:\n{paper['abstract']}\n\nAnnée: {paper['year']}\nLien: {pdf_url}"
        
        metadata = {
            "source": "semantic_scholar",
            "paperId": paper['paperId'],
            "year": paper['year'],
            "url": pdf_url,
            "isOpenAccess": paper.get('isOpenAccess', False)
        }
        
        # Ingest
        await ingest_document(
            title=paper['title'],
            content=content,
            metadata=metadata
        )
        count += 1
        
    print(f"✅ Ingestion terminée pour {count} papiers.")
    return count
