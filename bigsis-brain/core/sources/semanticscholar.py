import requests
import time
from typing import List, Dict

def get_influential_studies(query: str) -> List[Dict]:
    """
    Récupère les 5 études les plus influentes sous forme de données structurées.
    Retourne une liste de dicts compatible avec le format de main.py.
    """
    base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
    fields = "title,abstract,year,citationCount,url,openAccessPdf"
    
    params = {
        "query": query,
        "limit": 5,
        "fields": fields
    }
    
    structured_studies = []
    
    try:
        time.sleep(1)  # Politesse API
        resp = requests.get(base_url, params=params, timeout=15)

        # Retry once on rate limit (429)
        if resp.status_code == 429:
            print(f"⚠️ Semantic Scholar rate limited, retrying in 5s...")
            time.sleep(5)
            resp = requests.get(base_url, params=params, timeout=15)

        if resp.status_code != 200:
            print(f"⚠️ Semantic Scholar returned {resp.status_code}")
            return []
            
        data = resp.json()
        if "data" not in data:
            return []

        for paper in data["data"]:
            abstract = paper.get("abstract")
            if not abstract: continue # On ignore si pas de résumé
            
            # On formate comme PubMed pour uniformiser dans main.py
            study = {
                "source": "Semantic Scholar", # Pour savoir d'où ça vient
                "titre": paper.get("title", "Sans titre"),
                "annee": str(paper.get("year", "N/A")),
                "citations": paper.get("citationCount", 0),
                "url": paper.get("url") or (paper.get("openAccessPdf") or {}).get("url") or "N/A",
                "pmid": f"S2ID-{paper.get('paperId', 'N/A')}", # Faux PMID pour l'affichage
                "resume": abstract
            }
            structured_studies.append(study)
            
    except Exception as e:
        print(f"⚠️ Erreur Semantic Scholar: {e}")
        return []

    return structured_studies