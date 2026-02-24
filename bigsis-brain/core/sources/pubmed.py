import requests
import time
import xml.etree.ElementTree as ET
from typing import List, Dict
from core.config import settings

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
_PUBMED_DELAY = 0.4  # NCBI allows 3 req/s without API key

def search_pubmed(query: str) -> List[str]:
    """Récupère les ID (Mode Silencieux)."""
    params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": settings.MAX_STUDIES_PER_RUN + 10, # Marge de sécurité augmentée
        "reldate": settings.SEARCH_DAYS_BACK,
        "email": settings.PUBMED_EMAIL
    }
    try:
        time.sleep(_PUBMED_DELAY)
        resp = requests.get(f"{BASE_URL}/esearch.fcgi", params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("esearchresult", {}).get("idlist", [])
    except Exception as e:
        # On garde le print d'erreur car c'est critique
        print(f"⚠️ Erreur Search: {e}")
        return []

def fetch_details(pmids: List[str]) -> List[Dict]:
    """Récupère Titre + Abstract complet via XML (Mode Silencieux)."""
    if not pmids:
        return []
    
    ids_str = ",".join(pmids)
    
    params = {
        "db": "pubmed",
        "id": ids_str,
        "retmode": "xml",
        "email": settings.PUBMED_EMAIL
    }
    
    docs = []
    try:
        time.sleep(_PUBMED_DELAY)
        resp = requests.get(f"{BASE_URL}/efetch.fcgi", params=params, timeout=15)
        resp.raise_for_status()
        
        root = ET.fromstring(resp.content)
        
        for article in root.findall(".//PubmedArticle"):
            try:
                pmid = article.findtext(".//PMID")
                title = article.findtext(".//ArticleTitle")
                
                # Reconstitution de l'abstract
                abstract_parts = []
                abs_node = article.find(".//Abstract")
                if abs_node is not None:
                    for text_node in abs_node.findall("AbstractText"):
                        if text_node.text:
                            label = text_node.get("Label", "")
                            if label:
                                abstract_parts.append(f"{label}: {text_node.text}")
                            else:
                                abstract_parts.append(text_node.text)
                
                full_abstract = "\n".join(abstract_parts)
                
                # Date (Année)
                year = article.findtext(".//PubDate/Year")
                if not year:
                    year = article.findtext(".//PubDate/MedlineDate")
                    if year: year = year[:4]

                docs.append({
                    "pmid": pmid,
                    "titre": title,
                    "resume": full_abstract,
                    "annee": year,
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                })
            except Exception:
                continue
                
    except Exception as e:
        print(f"⚠️ Erreur Fetch Details: {e}")
        
    return docs