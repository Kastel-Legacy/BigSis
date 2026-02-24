from typing import Dict, List, Any
from sqlalchemy import select
from core.llm_client import LLMClient
from core.prompts import (
    APP_SYSTEM_PROMPT, APP_USER_PROMPT_TEMPLATE,
    SOCIAL_SYSTEM_PROMPT, SOCIAL_USER_PROMPT_TEMPLATE,
    RECOMMENDATION_SYSTEM_PROMPT, RECOMMENDATION_USER_PROMPT_TEMPLATE
)
from core.rag.retriever import retrieve_evidence
from core.pubmed import ingest_pubmed_results, validate_pmids, build_pubmed_queries
from core.db.database import AsyncSessionLocal
from core.db.models import SocialGeneration, Procedure
from api.schemas import FicheMaster
from core.sources.pubmed import search_pubmed, fetch_details
from core.sources.openfda import get_fda_adverse_events
from core.sources.clinical import get_ongoing_trials
from core.sources.pubchem import get_chemical_safety
from core.sources.semanticscholar import get_influential_studies
from core.sources.crossref import get_crossref_context
from core.rules.engine import RulesEngine
import re
import unicodedata

RECOMMENDATION_USER_PROMPT_TEMPLATE = """
Voici le corpus documentaire et les procédures disponibles dans le catalogue pour répondre à la demande : "{topic}".

--- DÉBUT DU CORPUS ---
{corpus_text}
--- FIN DU CORPUS ---

Sélectionne les meilleures procédures dans le CATALOGUE ci-dessus qui répondent au besoin. 
Si une procédure n'est pas dans le catalogue mais est pertinente scientifiquement selon le corpus, tu peux la suggérer.
"""

class SocialContentGenerator:
    """
    Orchestrates the generation of BigSIS Social Content (Fiche Verité) or Recommendations.
    Unifies RAG, Specialized Scrapers (FDA, Trials, etc.), and LLM orchestration.
    """
    
    def __init__(self):
        self.llm = LLMClient()

    async def _expand_mesh_terms(self, topic: str) -> list:
        """Ask LLM for MeSH synonyms to improve PubMed query coverage."""
        try:
            result = await self.llm.generate_response(
                system_prompt="You are a biomedical librarian. Return only a JSON array of strings.",
                user_content=f'Return a JSON array of MeSH terms and synonyms for: "{topic}". Include the official MeSH heading and supplementary concept names relevant to dermatology/aesthetics. Return ONLY the JSON array, no explanation.',
                model_override="gpt-4o-mini",
                json_mode=True,
                temperature_override=0.0
            )
            if isinstance(result, list):
                return [str(t) for t in result[:5]]
            if isinstance(result, dict):
                # Accept any key that contains an array (MeSH_terms, terms, synonyms, etc.)
                for key, val in result.items():
                    if isinstance(val, list) and val:
                        return [str(t) for t in val[:5]]
        except Exception as e:
            print(f"[SocialAgent] Warn: MeSH expansion failed: {e}")
        return []

    def _classify_study_type(self, text: str) -> str:
        """Classify a corpus part by study type for prioritized ordering."""
        t = text.lower()
        if any(kw in t for kw in ["meta-analysis", "meta analysis", "systematic review", "meta-analyse"]):
            return "META"
        if any(kw in t for kw in ["randomized controlled", "randomised controlled", "rct", "double-blind", "double blind"]):
            return "RCT"
        return "OTHER"

    def _clean_abstract(self, text):
        if not text: return "Non disponible"
        text = re.sub(r'\S+@\S+', '', text)
        text = re.sub(r'© \d{4}.*', '', text)
        text = re.sub(r'Copyright.*', '', text)
        text = re.sub(r'DOI:.*', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _normalize_text(self, value: str) -> str:
        if not value: return ""
        normalized = unicodedata.normalize("NFKD", value)
        return normalized.encode("ascii", "ignore").decode("ascii").lower()

    def _build_evidence_metadata(self, fda_text: str, trials_text: str, scholar: list, corpus_parts: list, chem_text: str = "", has_crossref: bool = False) -> dict:
        """Build structured evidence_metadata with per-section confidence scores."""
        # Parse FDA adverse event count from text
        fda_count = 0
        if fda_text and "signalements" in fda_text:
            for line in fda_text.split("\n"):
                match = re.search(r':\s*(\d+)\s*signalements', line)
                if match:
                    fda_count += int(match.group(1))

        # Parse trials count and phases from text
        trials_count = 0
        trials_phases = []
        if trials_text and "ESSAIS CLINIQUES" in trials_text:
            trials_count = trials_text.count("- [")
            for phase in ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "PHASE1", "PHASE2", "PHASE3", "PHASE4"]:
                if phase in trials_text:
                    trials_phases.append(phase)

        # Scholar citations
        scholar_citations = 0
        if scholar:
            scholar_citations = sum(s.get("citations", 0) for s in scholar[:5])

        pubmed_count = len(corpus_parts)
        pubchem_has_data = bool(chem_text and "GHS" in chem_text)
        corpus_text_lower = " ".join(corpus_parts).lower()

        # Determine which data sources contributed
        sources_used = []
        if pubmed_count > 0:
            sources_used.append("PubMed")
        if fda_count > 0:
            sources_used.append("OpenFDA")
        if trials_count > 0:
            sources_used.append("ClinicalTrials.gov")
        if scholar_citations > 0:
            sources_used.append("SemanticScholar")
        if pubchem_has_data:
            sources_used.append("PubChem")
        if has_crossref:
            sources_used.append("CrossRef")

        # --- Per-section confidence scores (/100) ---

        # Count study types in corpus
        meta_count = sum(1 for p in corpus_parts if any(kw in p.lower() for kw in ["meta-analysis", "meta analysis", "systematic review", "meta-analyse"]))
        rct_count = sum(1 for p in corpus_parts if any(kw in p.lower() for kw in ["randomized controlled", "randomised controlled", "rct", "double-blind"]))
        efficacy_count = sum(1 for p in corpus_parts if any(kw in p.lower() for kw in ["efficacy", "effective", "efficacite", "improvement", "amelioration"]))
        safety_count = sum(1 for p in corpus_parts if any(kw in p.lower() for kw in ["safety", "adverse", "securite", "side effect", "toxicity"]))
        recovery_count = sum(1 for p in corpus_parts if any(kw in p.lower() for kw in ["recovery", "downtime", "recuperation", "healing", "cicatrisation", "social downtime"]))
        interaction_count = sum(1 for p in corpus_parts if any(kw in p.lower() for kw in ["interaction", "contraindication", "contre-indication", "drug interaction"]))

        # EFFICACITE (/100)
        eff_score = min(meta_count * 25, 50) + min(rct_count * 20, 40) + (10 if scholar_citations > 100 else 5 if scholar_citations > 20 else 0)
        eff_score = min(eff_score, 100)
        eff_parts = []
        if rct_count: eff_parts.append(f"{rct_count} RCTs")
        if meta_count: eff_parts.append(f"{meta_count} meta-analyses")
        if efficacy_count: eff_parts.append(f"{efficacy_count} efficacy studies")
        eff_basis = ", ".join(eff_parts) or "Insufficient data"

        # SECURITE (/100)
        sec_score = 0
        if fda_count > 0: sec_score += 30
        if safety_count >= 3: sec_score += 30
        elif safety_count >= 1: sec_score += 15
        if fda_count > 100: sec_score += 20
        elif fda_count > 10: sec_score += 10
        if pubchem_has_data: sec_score += 20
        sec_score = min(sec_score, 100)
        sec_basis = f"FDA: {fda_count} adverse events, {safety_count} safety studies"

        # RECUPERATION (/100)
        rec_score = 0
        if recovery_count >= 3: rec_score += 60
        elif recovery_count >= 1: rec_score += 30
        if trials_count > 0: rec_score += 20
        if pubmed_count >= 5: rec_score += 20
        rec_score = min(rec_score, 100)
        rec_basis = f"{recovery_count} studies mention recovery"

        # INTERACTIONS (/100)
        int_score = 0
        if pubchem_has_data: int_score += 50
        if interaction_count >= 2: int_score += 30
        elif interaction_count >= 1: int_score += 15
        if fda_count > 0: int_score += 20
        int_score = min(int_score, 100)
        int_basis = f"PubChem: {'data available' if pubchem_has_data else 'no data'}, {interaction_count} interaction studies"

        section_confidence = {
            "efficacite": {"score": eff_score, "basis": eff_basis},
            "securite": {"score": sec_score, "basis": sec_basis},
            "recuperation": {"score": rec_score, "basis": rec_basis},
            "interactions": {"score": int_score, "basis": int_basis},
        }

        # Global TRS = weighted average of sections
        trs = round(eff_score * 0.30 + sec_score * 0.30 + rec_score * 0.20 + int_score * 0.20)

        return {
            "fda_adverse_count": fda_count,
            "active_trials_count": trials_count,
            "trials_phases": trials_phases,
            "pubmed_studies_count": pubmed_count,
            "scholar_citations_total": scholar_citations,
            "trs_score": trs,
            "data_sources_used": sources_used,
            "section_confidence": section_confidence,
        }

    def _normalize_zone(self, zone: str) -> str:
        """Normalize a zone name to match rules engine values."""
        z = self._normalize_text(zone)
        zone_map = {
            "front": "front",
            "forehead": "front",
            "glabelle": "glabelle",
            "rides du lion": "glabelle",
            "frown": "glabelle",
            "pattes d'oie": "pattes_oie",
            "pattes doie": "pattes_oie",
            "patte d'oie": "pattes_oie",
            "crow": "pattes_oie",
            "periorbital": "pattes_oie",
            "contour des yeux": "pattes_oie",
            "sillon nasogenien": "sillon_nasogenien",
            "sillons nasogeniens": "sillon_nasogenien",
            "nasolabial": "sillon_nasogenien",
        }
        for key, val in zone_map.items():
            if key in z:
                return val
        return z

    def _infer_wrinkle_type(self, topic: str) -> str | None:
        """Infer wrinkle type from the topic string."""
        t = self._normalize_text(topic)
        if "botox" in t or "toxine" in t or "botulique" in t:
            return "expression"
        if "filler" in t or "hyaluronique" in t or "acide hyaluronique" in t:
            return "statique"
        if "prevention" in t or "preventif" in t:
            return "prevention"
        if "lifting" in t or "relachement" in t:
            return "relachement"
        return None
        
    def _validate_sources(self, response_data: dict) -> None:
        """Validate PMIDs cited in annexe_sources_retenues via NCBI API."""
        sources = response_data.get("annexe_sources_retenues", [])
        if not sources:
            return

        # Extract real PMIDs (skip Semantic Scholar S2ID- fakes)
        real_pmids = []
        for s in sources:
            pmid = s.get("pmid")
            if pmid and not str(pmid).startswith("S2ID"):
                real_pmids.append(str(pmid))

        if not real_pmids:
            for s in sources:
                s["verified"] = False
            return

        validation = validate_pmids(real_pmids)

        verified_count = 0
        invalid_count = 0
        for s in sources:
            pmid = s.get("pmid")
            if pmid and not str(pmid).startswith("S2ID"):
                is_valid = validation.get(str(pmid), False)
                s["verified"] = is_valid
                if is_valid:
                    verified_count += 1
                else:
                    invalid_count += 1
            else:
                s["verified"] = False
                invalid_count += 1

        # Attach counts to evidence_metadata
        meta = response_data.get("evidence_metadata", {})
        meta["pmids_verified"] = verified_count
        meta["pmids_invalid"] = invalid_count
        response_data["evidence_metadata"] = meta
        print(f"[SocialAgent] ✅ PMID validation: {verified_count} verified, {invalid_count} invalid")

    @staticmethod
    def _fix_source_urls(response_data: dict, url_map: dict) -> None:
        """Replace LLM-hallucinated URLs with real ones from the corpus/scouts.

        Matching strategy:
        1. Exact title match (lowercased)
        2. Fuzzy: if a real title is a substring of the cited title (or vice versa)
        3. PMID-based: construct PubMed URL from valid PMID
        """
        sources = response_data.get("annexe_sources_retenues", [])
        if not sources or not url_map:
            return

        fixed = 0
        for s in sources:
            title = (s.get("titre") or "").lower().strip()
            current_url = s.get("url", "")

            # Skip already-good URLs (real PubMed/DOI links)
            if current_url and ("pubmed.ncbi.nlm.nih.gov" in current_url or "doi.org/" in current_url or "semanticscholar.org" in current_url):
                continue

            # 1. Exact match
            if title in url_map:
                s["url"] = url_map[title]
                fixed += 1
                continue

            # 2. Fuzzy substring match
            matched = False
            for map_title, map_url in url_map.items():
                if len(map_title) > 15 and (map_title in title or title in map_title):
                    s["url"] = map_url
                    fixed += 1
                    matched = True
                    break
            if matched:
                continue

            # 3. Fallback: construct from verified PMID
            pmid = s.get("pmid")
            if pmid and s.get("verified") and not str(pmid).startswith("S2ID") and not str(pmid).startswith("DOI"):
                s["url"] = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                fixed += 1

        if fixed:
            print(f"[SocialAgent] 🔗 Fixed {fixed}/{len(sources)} source URLs with real links")

    def _cross_validate(self, evidence_metadata: dict, corpus_parts: list, trials_text: str) -> dict:
        """Detect contradictions between data sources."""
        report = {
            "fda_efficacy_alignment": "aligned",
            "study_consensus": "strong",
            "regulatory_maturity": "established",
            "flags": []
        }

        fda_count = evidence_metadata.get("fda_adverse_count", 0)
        pubmed_count = evidence_metadata.get("pubmed_studies_count", 0)

        # 1. FDA vs Efficacy tension
        if fda_count > 500:
            report["fda_efficacy_alignment"] = "contradicted"
            report["flags"].append("Volume eleve de signalements FDA (>500) - profil de securite preoccupant")
        elif fda_count > 200 and pubmed_count >= 5:
            report["fda_efficacy_alignment"] = "tension"
            report["flags"].append("Procedure documentee mais profil de securite a surveiller (>200 signalements FDA)")

        # 2. Study consensus — keyword analysis
        corpus_lower = " ".join(corpus_parts).lower()
        positive_kw = ["effective", "efficace", "significant improvement", "amelioration significative", "safe and effective"]
        negative_kw = ["no significant difference", "ineffective", "pas de difference significative", "insufficient evidence", "inconclusive"]

        pos = sum(corpus_lower.count(kw) for kw in positive_kw)
        neg = sum(corpus_lower.count(kw) for kw in negative_kw)

        if neg > 0 and pos > 0:
            report["study_consensus"] = "mixed"
            report["flags"].append(f"Consensus mixte: {pos} signaux positifs vs {neg} signaux negatifs dans la litterature")
        elif neg > pos:
            report["study_consensus"] = "weak"
            report["flags"].append("Evidence majoritairement negative ou non concluante")

        # 3. Regulatory maturity from trial phases
        phases = evidence_metadata.get("trials_phases", [])
        has_late = any(p in str(phases) for p in ["Phase 3", "Phase 4", "PHASE3", "PHASE4"])
        has_early = any(p in str(phases) for p in ["Phase 1", "Phase 2", "PHASE1", "PHASE2"])

        if has_early and not has_late:
            report["regulatory_maturity"] = "early"
            report["flags"].append("Evidence precoce: uniquement des essais Phase 1-2")
        elif not phases and trials_text and evidence_metadata.get("active_trials_count", 0) == 0:
            report["regulatory_maturity"] = "emerging"

        return report

    def _calculate_scores(self, evidence_metadata: dict, safety_warnings: list, topic: str, scout_chem: str = "") -> dict:
        """Calculate formulaic efficacy & safety scores based on evidence data."""
        t = self._normalize_text(topic)

        # --- Efficacy Score ---
        eff = 3.0  # baseline
        pubmed = evidence_metadata.get("pubmed_studies_count", 0)
        citations = evidence_metadata.get("scholar_citations_total", 0)
        trials = evidence_metadata.get("active_trials_count", 0)

        if pubmed >= 5:
            eff += 3.0
        elif pubmed >= 2:
            eff += 2.0

        if citations > 100:
            eff += 2.0
        elif citations > 20:
            eff += 1.0

        if trials > 0:
            eff += 1.5

        # Gold standard bonus
        gold_standards = ["botox", "toxine botulique", "acide hyaluronique", "hyaluronic acid"]
        if any(gs in t for gs in gold_standards):
            eff += 2.0

        eff = min(eff, 10.0)

        # --- Safety Score ---
        saf = 8.0  # baseline (most aesthetic procedures are safe)
        fda = evidence_metadata.get("fda_adverse_count", 0)

        if fda > 500:
            saf -= 2.0
        elif fda > 100:
            saf -= 1.0

        if safety_warnings:
            saf -= len(safety_warnings) * 0.5

        if scout_chem and "GHS" in scout_chem:
            saf -= 1.0

        saf = max(saf, 2.0)
        saf = min(saf, 10.0)

        return {"efficacy": round(eff, 1), "safety": round(saf, 1)}

    async def generate_social_content(self, topic: str, system_prompt: str = None, force: bool = False) -> Dict:
        # Step 0: Check Cache (skip if force regeneration)
        if not force:
            async with AsyncSessionLocal() as session:
                stmt = select(SocialGeneration).where(SocialGeneration.topic == topic).order_by(SocialGeneration.created_at.desc()).limit(1)
                result = await session.execute(stmt)
                cached_gen = result.scalar_one_or_none()

                if cached_gen:
                    print(f"[SocialAgent] ✅ Cache hit for: {topic}")
                    return cached_gen.content
        else:
            print(f"[SocialAgent] 🔄 Force regeneration for: {topic}")

        # Step 1: Check existing knowledge (RAG)
        print(f"[SocialAgent] Checking RAG for: {topic}")
        # Search queries adapted to the topic
        sub_queries = [
            f"efficacy and mechanism of {topic}",
            f"side effects, risks and recovery downtime for {topic}",
        ]
        
        corpus_parts = []
        seen_chunks = set()
        # Track real URLs from RAG for post-correction of LLM output
        _source_url_map: dict[str, str] = {}  # title -> url

        for q in sub_queries:
            chunks = await retrieve_evidence(q, limit=5)
            for c in chunks:
                if c['chunk_id'] not in seen_chunks:
                    url_line = f"\nURL: {c['url']}" if c.get('url') else ""
                    corpus_parts.append(f"Source: {c['source']}{url_line}\nContent: {c['text']}\n---")
                    seen_chunks.add(c['chunk_id'])
                    if c.get('url') and c.get('source'):
                        _source_url_map[c['source'].lower().strip()] = c['url']
        
        # Step 2: Ingest only if needed (Threshold: 3 chunks)
        # Skip ingestion for pure Diagnostic/Recommendation if data is OK
        # Track MeSH terms for reuse in scouts (Step 4)
        _mesh_cache = []

        if len(corpus_parts) < 3 and "RECOMMENDATION" not in topic:
            search_term_raw = re.sub(r'^\[.*?\]\s*', '', topic)
            print(f"[SocialAgent] 🧪 Knowledge low, enriching PubMed for: {search_term_raw}")
            _mesh_cache = await self._expand_mesh_terms(search_term_raw)
            if _mesh_cache:
                print(f"[SocialAgent] 🔬 MeSH expansion: {_mesh_cache}")
            queries = build_pubmed_queries(search_term_raw, mesh_synonyms=_mesh_cache)
            for q in queries:
                await ingest_pubmed_results(q)

            # Re-retrieve after ingestion
            new_chunks = await retrieve_evidence(f"clinical data for {topic}", limit=5)
            for c in new_chunks:
                if c['chunk_id'] not in seen_chunks:
                    url_line = f"\nURL: {c['url']}" if c.get('url') else ""
                    corpus_parts.append(f"Source: {c['source']}{url_line}\nContent: {c['text']}\n---")
                    seen_chunks.add(c['chunk_id'])
                    if c.get('url') and c.get('source'):
                        _source_url_map[c['source'].lower().strip()] = c['url']

        # Annotate and sort corpus by study type (meta-analyses first, then RCTs)
        annotated = []
        for part in corpus_parts:
            study_type = self._classify_study_type(part)
            prefix = {"META": "[META-ANALYSE] ", "RCT": "[RCT] ", "OTHER": ""}[study_type]
            annotated.append((study_type, f"{prefix}{part}"))
        type_order = {"META": 0, "RCT": 1, "OTHER": 2}
        annotated.sort(key=lambda x: type_order[x[0]])
        corpus_parts = [text for _, text in annotated]

        corpus_text = "\n".join(corpus_parts)
        if not corpus_text:
            corpus_text = "Aucune donnée scientifique spécifique trouvée dans la base. Utilise tes connaissances expertes générales."

        # Step 3: Retrieve catalog procedures (Structured context)
        context_procedures = []
        async with AsyncSessionLocal() as session:
            result_db = await session.execute(select(Procedure))
            procedures = result_db.scalars().all()
            for p in procedures:
                context_procedures.append(f"- Name: {p.name}\n  Desc: {p.description}\n  Downtime: {p.downtime}\n  Price: {p.price_range}")
        
        kb_context = "\n".join(context_procedures) if context_procedures else "AUCUNE PROCÉDURE STRUCTUREE DANS LE CATALOGUE."

        # Step 4: Specialized Scouts (Scraping FDA, Trials, etc.)
        # We only do this for FICHE mode to keep it rich
        specialized_context = ""
        is_recommendation = (system_prompt == RECOMMENDATION_SYSTEM_PROMPT or "[RECOMMENDATION]" in topic)

        # Store raw scout results for evidence_metadata
        scout_fda = ""
        scout_trials = ""
        scout_chem = ""
        scout_scholar: list = []
        scout_crossref = ""

        if not is_recommendation:
            # Strip mode prefixes ([SOCIAL], [DIAGNOSTIC], etc.) for clean scout queries
            search_term = re.sub(r'^\[.*?\]\s*', '', topic)

            # Get English scientific name via MeSH expansion (APIs are English-only)
            # Reuse cached MeSH terms from Step 2 if available
            mesh_terms = _mesh_cache if _mesh_cache else await self._expand_mesh_terms(search_term)
            english_term = mesh_terms[0] if mesh_terms else search_term
            print(f"[SocialAgent] 🔍 Gathering specialized context for: {search_term} (EN: {english_term})")
            if mesh_terms:
                print(f"[SocialAgent] 🔬 MeSH expansion: {mesh_terms}")

            try:
                # FDA uses brand names (botox, restylane) — try original term first, fall back to MeSH
                scout_fda = get_fda_adverse_events(search_term)
                if "Aucune donnée" in scout_fda and english_term != search_term:
                    scout_fda = get_fda_adverse_events(english_term)
                # PubChem: try MeSH term first, fall back to original (handles French names)
                scout_chem = get_chemical_safety(english_term)
                if "Pas de données" in scout_chem and english_term != search_term:
                    scout_chem = get_chemical_safety(search_term)
                scout_trials = get_ongoing_trials(english_term)
                scout_scholar = get_influential_studies(f"{english_term} efficacy skin")
                scout_crossref, crossref_studies = get_crossref_context(f"{english_term} skin dermatology")
                for cs in crossref_studies:
                    if cs.get('titre') and cs.get('url'):
                        _source_url_map[cs['titre'].lower().strip()] = cs['url']

                specialized_context = f"\n=== FDA ADVERSE EVENTS ===\n{scout_fda}\n"
                specialized_context += f"\n=== CLINICAL TRIALS ===\n{scout_trials}\n"
                specialized_context += f"\n=== CHEMICAL SAFETY ===\n{scout_chem}\n"
                if scout_scholar:
                    specialized_context += "\n=== SCHOLAR STUDIES ===\n"
                    for s in scout_scholar[:3]:
                        s_url = s.get('url', '')
                        specialized_context += f"- {s.get('titre')}\n  URL: {s_url}\n  {self._clean_abstract(s.get('resume'))[:300]}...\n"
                        if s.get('titre') and s_url and s_url != 'N/A':
                            _source_url_map[s['titre'].lower().strip()] = s_url
                if scout_crossref:
                    specialized_context += f"\n{scout_crossref}\n"
            except Exception as e:
                print(f"Warn: Specialized scouts failed: {e}")

        # Step 4b: Cross-validate sources for coherence
        coherence_report = {}
        if not is_recommendation and specialized_context:
            try:
                preliminary_meta = self._build_evidence_metadata(
                    scout_fda, scout_trials, scout_scholar, corpus_parts, scout_chem,
                    has_crossref=bool(scout_crossref)
                )
                coherence_report = self._cross_validate(preliminary_meta, corpus_parts, scout_trials)
                if coherence_report.get("flags"):
                    print(f"[SocialAgent] 🔍 Coherence flags: {coherence_report['flags']}")
                    specialized_context += "\n=== COHERENCE ALERTS ===\n"
                    for flag in coherence_report["flags"]:
                        specialized_context += f"- ALERT: {flag}\n"
                    specialized_context += "Prends en compte ces alertes dans ton verdict.\n"
            except Exception as e:
                print(f"Warn: Cross-validation failed: {e}")

        # Step 5: Determine Template & System Prompt
        is_social = "[SOCIAL]" in topic
        
        if is_recommendation:
            system_prompt = RECOMMENDATION_SYSTEM_PROMPT
            user_template = RECOMMENDATION_USER_PROMPT_TEMPLATE
        elif is_social:
            system_prompt = SOCIAL_SYSTEM_PROMPT
            user_template = SOCIAL_USER_PROMPT_TEMPLATE
        else:
            # Default to App Fiche
            system_prompt = APP_SYSTEM_PROMPT
            user_template = APP_USER_PROMPT_TEMPLATE

        user_prompt = user_template.format(
            topic=topic,
            corpus_text=f"{corpus_text}\n{specialized_context}\n\n=== CATALOGUE DE PROCEDURES ===\n{kb_context}"
        )
        
        print(f"[SocialAgent] 🧠 Generating with LLM (gpt-4o)... Mode: {'Recs' if is_recommendation else 'Fiche'}")
        try:
            response_data = await self.llm.generate_response(
                system_prompt=system_prompt,
                user_content=user_prompt,
                model_override="gpt-4o",
                json_mode=True
            )
            
            # Step 6: Cache & Return
            # We cache if it's a valid response
            is_valid = False
            if isinstance(response_data, dict):
                if is_recommendation and "recommendations" in response_data:
                    is_valid = True
                elif not is_recommendation:
                    try:
                        # Internal validation against schema
                        FicheMaster(**response_data)
                        is_valid = True
                    except Exception as ve:
                        print(f"Warn: LLM output failed schema validation: {ve}")
                        is_valid = False

            # Step 6a: Attach evidence_metadata (for fiches only)
            if is_valid and not is_recommendation and isinstance(response_data, dict):
                response_data["evidence_metadata"] = self._build_evidence_metadata(
                    scout_fda, scout_trials, scout_scholar, corpus_parts, scout_chem,
                    has_crossref=bool(scout_crossref)
                )
                # Attach coherence report from cross-validation
                if coherence_report:
                    response_data["evidence_metadata"]["coherence_report"] = coherence_report

            # Step 6b: Attach safety_warnings from rules engine (for fiches only)
            if is_valid and not is_recommendation and isinstance(response_data, dict):
                try:
                    engine = RulesEngine()
                    zones = (response_data.get("meta") or {}).get("zones_concernees", [])
                    wt = self._infer_wrinkle_type(search_term if 'search_term' in dir() else topic)

                    # Evaluate rules against ALL zones (not just the first)
                    all_warnings = []
                    seen_keys = set()
                    for z in zones:
                        normalized = self._normalize_zone(z)
                        context = {"area": normalized}
                        if wt:
                            context["wrinkle_type"] = wt
                        for w in engine.evaluate(context):
                            if w.key not in seen_keys:
                                all_warnings.append(w)
                                seen_keys.add(w.key)

                    # Also evaluate with just wrinkle_type (no zone) for transversal rules
                    if wt and not zones:
                        for w in engine.evaluate({"wrinkle_type": wt}):
                            if w.key not in seen_keys:
                                all_warnings.append(w)
                                seen_keys.add(w.key)

                    if all_warnings:
                        response_data["safety_warnings"] = [w.dict() for w in all_warnings]
                        print(f"[SocialAgent] ⚠️ {len(all_warnings)} safety warnings attached")
                except Exception as e:
                    print(f"Warn: Rules engine failed: {e}")

            # Step 6c: Validate PMIDs in cited sources
            if is_valid and not is_recommendation and isinstance(response_data, dict):
                try:
                    self._validate_sources(response_data)
                except Exception as e:
                    print(f"Warn: PMID validation failed: {e}")

            # Step 6c2: Fix source URLs using real URLs from corpus/scouts
            if is_valid and not is_recommendation and isinstance(response_data, dict):
                try:
                    self._fix_source_urls(response_data, _source_url_map)
                except Exception as e:
                    print(f"Warn: URL fix failed: {e}")

            # Step 6d: Override LLM scores with formulaic calculation
            if is_valid and not is_recommendation and isinstance(response_data, dict):
                try:
                    scores = self._calculate_scores(
                        response_data.get("evidence_metadata", {}),
                        response_data.get("safety_warnings", []),
                        topic,
                        scout_chem,
                    )
                    response_data["score_global"]["note_efficacite_sur_10"] = scores["efficacy"]
                    response_data["score_global"]["note_securite_sur_10"] = scores["safety"]
                    response_data.setdefault("evidence_metadata", {})["score_method"] = "formulaic_v1"
                    print(f"[SocialAgent] 📊 Formulaic scores: efficacy={scores['efficacy']}, safety={scores['safety']}")
                except Exception as e:
                    print(f"Warn: Formulaic scoring failed: {e}")

            if is_valid:
                print(f"[SocialAgent] 💾 Caching result for: {topic}")
                async with AsyncSessionLocal() as session:
                    new_gen = SocialGeneration(topic=topic, content=response_data, status="draft")
                    session.add(new_gen)
                    await session.commit()

            return response_data
            
        except Exception as e:
            print(f"❌ Social Generation Failed: {e}")
            return {"error": str(e)}
