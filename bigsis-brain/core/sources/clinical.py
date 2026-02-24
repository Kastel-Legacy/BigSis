import requests
import time

_TRIALS_DELAY = 0.3  # ClinicalTrials.gov — polite delay

def get_ongoing_trials(query: str) -> str:
    """
    Interroge ClinicalTrials.gov pour voir les études actives.
    Permet à Big Sis de dire : "La science est encore en train de chercher..."
    """
    url = "https://clinicaltrials.gov/api/v2/studies"
    
    # On filtre sur les statuts pertinents
    params = {
        "query.term": query,
        "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED",
        "pageSize": 5,
        "sort": "LastUpdatePostDate:desc",
    }

    try:
        time.sleep(_TRIALS_DELAY)
        resp = requests.get(url, params=params, timeout=15)
        data = resp.json()
        
        if "studies" not in data or not data["studies"]:
            return "Aucun essai clinique récent trouvé sur ClinicalTrials.gov."

        text = "DERNIERS ESSAIS CLINIQUES (Source: ClinicalTrials.gov) :\n"
        
        for study in data["studies"]:
            proto = study.get("protocolSection", {})
            
            # Titre
            title = proto.get("identificationModule", {}).get("briefTitle", "Sans titre")
            
            # Statut
            status = study.get("protocolSection", {}).get("statusModule", {}).get("overallStatus", "Inconnu")
            
            # Phase (ex: Phase 3)
            phases = proto.get("designModule", {}).get("phases", [])
            phase_str = ", ".join(phases) if phases else "Non spécifié"
            
            text += f"- [{status}] {title} (Phase: {phase_str})\n"
            
        return text

    except Exception as e:
        return f"Erreur connexion ClinicalTrials: {e}"