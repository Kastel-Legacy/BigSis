import requests
import time
from typing import List, Dict
from core.config import settings
from core.rag.ingestion import ingest_document
import asyncio

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
_PUBMED_DELAY = 0.4  # NCBI allows 3 req/s without API key

def validate_pmids(pmids: List[str]) -> Dict[str, bool]:
    """Batch-validate PMIDs via NCBI esummary. Returns {pmid: exists}."""
    if not pmids:
        return {}
    ids_str = ",".join(pmids)
    params = {
        "db": "pubmed",
        "id": ids_str,
        "retmode": "json",
        "email": settings.PUBMED_EMAIL,
    }
    try:
        time.sleep(_PUBMED_DELAY)
        resp = requests.get(f"{BASE_URL}/esummary.fcgi", params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json().get("result", {})
        results = {}
        for pmid in pmids:
            entry = data.get(pmid, {})
            # Invalid PMIDs have an "error" key in their entry
            results[pmid] = "error" not in entry and "title" in entry
        return results
    except Exception as e:
        print(f"⚠️ PMID validation failed: {e}")
        return {pmid: False for pmid in pmids}


def search_pubmed(query: str, max_results: int = None) -> List[str]:
    print(f"   ... Appel API PubMed Search pour: {query}")
    limit = max_results if max_results else (settings.MAX_STUDIES_PER_RUN + 2)
    params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": limit, 
        "reldate": settings.SEARCH_DAYS_BACK,
        "email": settings.PUBMED_EMAIL
    }

    try:
        time.sleep(_PUBMED_DELAY)
        resp = requests.get(f"{BASE_URL}/esearch.fcgi", params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("esearchresult", {}).get("idlist", [])
    except Exception as e:
        print(f"⚠️ Erreur PubMed Search: {e}")
        return []

import xml.etree.ElementTree as ET

def fetch_details(pmids: List[str]) -> List[Dict]:
    if not pmids:
        return []

    ids_str = ",".join(pmids)
    print(f"   ... Récupération détails complets (efetch) pour {len(pmids)} ID(s)")

    # Use efetch for full records (including abstracts)
    params = {
        "db": "pubmed",
        "id": ids_str,
        "retmode": "xml",
        "email": settings.PUBMED_EMAIL
    }

    try:
        time.sleep(_PUBMED_DELAY)
        resp = requests.get(f"{BASE_URL}/efetch.fcgi", params=params, timeout=15)
        resp.raise_for_status()
        
        root = ET.fromstring(resp.content)
        docs = []
        
        for article in root.findall(".//PubmedArticle"):
            try:
                medline = article.find("MedlineCitation")
                pmid = medline.find("PMID").text
                
                article_data = medline.find("Article")
                title = article_data.find("ArticleTitle").text
                
                # Extract Abstract
                abstract_elem = article_data.find("Abstract")
                abstract_text = ""
                if abstract_elem is not None:
                    # Abstracts can have multiple parts (Background, Methods, etc.)
                    parts = []
                    for text_node in abstract_elem.findall("AbstractText"):
                        label = text_node.get("Label")
                        text = text_node.text
                        if text:
                            if label:
                                parts.append(f"{label}: {text}")
                            else:
                                parts.append(text)
                    abstract_text = "\n".join(parts)
                
                if not abstract_text:
                    abstract_text = "Abstract non disponible."

                # Extract Year
                journal = article_data.find("Journal")
                journal_issue = journal.find("JournalIssue")
                pub_date = journal_issue.find("PubDate")
                year_elem = pub_date.find("Year")
                if year_elem is None:
                    # Fallback to MedlineDate if Year is missing
                    medline_date = pub_date.find("MedlineDate")
                    year = medline_date.text[:4] if medline_date is not None else "N/A"
                else:
                    year = year_elem.text
                    
                docs.append({
                    "pmid": pmid,
                    "titre": title,
                    "resume": abstract_text,
                    "annee": year,
                    "lien": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                })
            except Exception as parse_e:
                print(f"⚠️ Erreur parsing article: {parse_e}")
                continue
                
        return docs
    except Exception as e:
        print(f"⚠️ Erreur PubMed Details: {e}")
        return []

async def ingest_pubmed_results(query: str):
    """
    Search PubMed for the query, fetch details, and ingest into RAG.
    """
    print(f"🚀 Démarrage recherche PubMed: {query}")
    
    # 1. Search
    pmids = search_pubmed(query)
    if not pmids:
        print("Aucun article trouvé.")
        return 0
        
    print(f"Trouvé {len(pmids)} articles. Récupération des détails...")
    
    # 2. Fetch Details
    # We might want to batch this if there are many IDs, but start simple
    docs = fetch_details(pmids)
    
    # 3. Ingest
    count = 0
    for doc in docs:
        content = f"Titre: {doc['titre']}\n\nAbstract:\n{doc['resume']}\n\nJournal/Année: {doc['annee']}\nLien: {doc['lien']}"
        
        metadata = {
            "source": "pubmed",
            "pmid": doc['pmid'],
            "year": doc['annee'],
            "url": doc['lien'] # Use 'url' key for ingestion.py
        }
        
        # Ingest
        await ingest_document(
            title=doc['titre'],
            content=content,
            metadata=metadata
        )
        count += 1
        
    print(f"✅ Ingestion terminée pour {count} articles.")
    return count

def build_pubmed_queries(ingredient: str, mesh_synonyms: list = None) -> list:
    """Build efficacy + safety PubMed queries with optional MeSH synonym expansion."""
    terms = [f'"{ingredient}"[Title/Abstract]']
    for syn in (mesh_synonyms or []):
        clean = syn.strip()
        if clean:
            terms.append(f'"{clean}"[MeSH Terms]')
    base = f'({" OR ".join(terms)}) AND ("skin"[MeSH Terms] OR "dermatology"[MeSH Terms])'
    return [
        f'{base} AND ("efficacy"[Title/Abstract] OR "effectiveness"[Title/Abstract]) AND (Meta-Analysis[pt] OR Systematic Review[pt] OR Randomized Controlled Trial[pt])',
        f'{base} AND ("safety"[Title/Abstract] OR "adverse effects"[Title/Abstract] OR "toxicity"[Title/Abstract])'
    ]


async def search_claims_for_ingredient(ingredient: str) -> List[Dict]:
    """
    Specific search for 'efficacy' and 'safety' claims.
    Returns raw docs (title, abstract, pmid).
    """
    print(f"🔎 Recherche de PREUVES pour: {ingredient}")
    
    # 1. Construct Queries
    # Efficacy: (Ingredient) AND (Skin OR Dermatology) AND (Efficacy OR Effectiveness OR Treatment)
    # Safety: (Ingredient) AND (Skin OR Dermatology) AND (Safety OR Side Effects OR Adverse)
    
    base_term = f'("{ingredient}"[Title/Abstract]) AND ("skin"[MeSH Terms] OR "dermatology"[MeSH Terms])'
    
    queries = [
        f'{base_term} AND ("efficacy"[Title/Abstract] OR "effectiveness"[Title/Abstract]) AND (Meta-Analysis[pt] OR Systematic Review[pt] OR Randomized Controlled Trial[pt])',
        f'{base_term} AND ("safety"[Title/Abstract] OR "adverse effects"[Title/Abstract] OR "toxicity"[Title/Abstract])'
    ]
    
    all_pmids = set()
    
    # 2. Search
    for q in queries:
        pmids = search_pubmed(q)
        all_pmids.update(pmids)
        
    if not all_pmids:
        print(f"   -> Aucune preuve trouvée pour {ingredient}")
        return []

    # 3. Fetch Details
    # Limit to top 5 most relevant/recent combined
    top_pmids = list(all_pmids)[:5] 
    docs = fetch_details(top_pmids)
    
    print(f"   -> Trouvé {len(docs)} documents pertinents.")
    return docs
