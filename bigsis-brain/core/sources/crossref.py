import requests
import re
import time
from typing import List, Dict

from core.rag.ingestion import ingest_document


def get_crossref_studies(query: str, max_results: int = 5, from_year: int = 2010) -> List[Dict]:
    """
    Search CrossRef API for peer-reviewed articles (covers Wiley, Elsevier, Springer, etc.).
    Returns structured study data compatible with the pipeline.
    Articles with abstracts are prioritized; those without get title-only entries.
    """
    base_url = "https://api.crossref.org/works"

    # Request more results than needed since some may lack abstracts
    params = {
        "query": query,
        "rows": max_results + 5,
        "filter": f"from-pub-date:{from_year},type:journal-article",
        "sort": "relevance",
        "select": "DOI,title,abstract,published-print,published-online,container-title,is-referenced-by-count,URL",
    }

    headers = {
        "User-Agent": "BigSIS/1.0 (mailto:adolphe.sa@gmail.com)",
    }

    with_abstract = []
    without_abstract = []

    try:
        time.sleep(0.5)
        resp = requests.get(base_url, params=params, headers=headers, timeout=15)

        if resp.status_code != 200:
            print(f"CrossRef API returned {resp.status_code}")
            return []

        data = resp.json()
        items = data.get("message", {}).get("items", [])

        for item in items:
            title_list = item.get("title", [])
            title = title_list[0] if title_list else "Sans titre"

            abstract = item.get("abstract", "")
            # CrossRef abstracts have JATS XML tags — strip them
            if abstract:
                abstract = re.sub(r'<[^>]+>', '', abstract).strip()

            # Parse year from published-print or published-online
            year = "N/A"
            for date_field in ["published-print", "published-online"]:
                date_parts = item.get(date_field, {}).get("date-parts", [[]])
                if date_parts and date_parts[0]:
                    year = str(date_parts[0][0])
                    break

            journal = item.get("container-title", [""])[0] if item.get("container-title") else ""
            doi = item.get("DOI", "")
            citations = item.get("is-referenced-by-count", 0)

            entry = {
                "source": f"CrossRef ({journal})" if journal else "CrossRef",
                "titre": title,
                "annee": year,
                "citations": citations,
                "url": f"https://doi.org/{doi}" if doi else item.get("URL", ""),
                "pmid": f"DOI-{doi}" if doi else "N/A",
                "resume": abstract if abstract else title,
            }

            if abstract:
                with_abstract.append(entry)
            else:
                without_abstract.append(entry)

    except Exception as e:
        print(f"CrossRef search failed: {e}")
        return []

    # Prioritize articles with abstracts, fill remaining slots with title-only
    studies = with_abstract[:max_results]
    remaining = max_results - len(studies)
    if remaining > 0:
        studies.extend(without_abstract[:remaining])

    return studies


async def ingest_crossref_results(query: str) -> int:
    """
    Search CrossRef and ingest results into RAG knowledge base.
    Returns count of ingested articles.
    """
    print(f"🚀 Demarrage recherche CrossRef: {query}")

    studies = get_crossref_studies(query, max_results=10)

    if not studies:
        print("Aucun article CrossRef trouve.")
        return 0

    print(f"Trouve {len(studies)} articles CrossRef. Ingestion...")

    count = 0
    for study in studies:
        # Skip title-only entries (no real abstract)
        abstract = study.get("resume", "")
        if abstract == study.get("titre", ""):
            continue

        content = f"Titre: {study['titre']}\n\nAbstract:\n{abstract}\n\nJournal: {study['source']}\nAnnee: {study['annee']}\nCitations: {study.get('citations', 0)}\nLien: {study['url']}"

        metadata = {
            "source": "crossref",
            "year": study["annee"],
            "url": study["url"],
            "citations": study.get("citations", 0),
        }

        await ingest_document(
            title=study["titre"],
            content=content,
            metadata=metadata,
        )
        count += 1

    print(f"✅ Ingestion CrossRef terminee pour {count} articles.")
    return count


def get_crossref_context(query: str) -> tuple[str, list]:
    """Format CrossRef results as context text for the LLM. Returns (text, studies_list)."""
    studies = get_crossref_studies(query)
    if not studies:
        return "", []

    lines = [f"=== CROSSREF / WILEY STUDIES ({len(studies)} results) ==="]
    for s in studies:
        lines.append(f"- [{s['annee']}] {s['titre']}")
        lines.append(f"  Journal: {s['source']} | Citations: {s['citations']}")
        lines.append(f"  URL: {s['url']}")
        lines.append(f"  {s['resume'][:400]}")
        lines.append("")

    return "\n".join(lines), studies
