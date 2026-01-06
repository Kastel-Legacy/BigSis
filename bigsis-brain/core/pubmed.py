import requests
from typing import List, Dict
from core.config import settings
from core.rag.ingestion import ingest_document
import asyncio

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

def search_pubmed(query: str) -> List[str]:
    print(f"   ... Appel API PubMed Search pour: {query}")
    params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": settings.MAX_STUDIES_PER_RUN + 2, 
        "reldate": settings.SEARCH_DAYS_BACK,
        "email": settings.PUBMED_EMAIL
    }
    try:
        resp = requests.get(f"{BASE_URL}/esearch.fcgi", params=params)
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
        resp = requests.get(f"{BASE_URL}/efetch.fcgi", params=params)
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
