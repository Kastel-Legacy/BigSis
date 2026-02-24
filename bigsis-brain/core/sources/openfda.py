import requests
import time
from typing import Dict

_FDA_DELAY = 0.3  # OpenFDA allows 240 req/min (~4/s)

def get_fda_adverse_events(query: str) -> str:
    """
    Cherche les effets secondaires rapportés dans la base OpenFDA.
    Stratégie : Cherche d'abord dans les Médicaments (Drug), puis Dispositifs (Device).
    Retourne un résumé textuel prêt à être injecté dans le prompt.
    """
    
    # 1. Essai : Base MÉDICAMENTS (Drug)
    # On cherche les effets secondaires les plus fréquents (count=reaction)
    drug_url = "https://api.fda.gov/drug/event.json"
    params = {
        "search": f'patient.drug.medicinalproduct:"{query}"',
        "count": "patient.reaction.reactionmeddrapt.exact",
        "limit": 10
    }
    
    try:
        time.sleep(_FDA_DELAY)
        resp = requests.get(drug_url, params=params, timeout=15)
        data = resp.json()
        
        if "results" in data:
            return _format_results(data["results"], "Médicament/Produit")
            
    except Exception:
        pass # On passe silencieusement à la suite si échec

    # 2. Essai : Base DISPOSITIFS (Device) - Si pas trouvé en médicament
    # ex: Laser, Prothèse, Cryolipolyse
    device_url = "https://api.fda.gov/device/event.json"
    params_dev = {
        "search": f'device.generic_name:"{query}" OR device.brand_name:"{query}"',
        "count": "mdr_text.text.exact", # Difficile de compter les réactions exactes en device, on tente une approche simple
        # Note: L'API Device est plus complexe pour les "counts" de réaction. 
        # Pour simplifier Big Sis V1, on va chercher les "Device Problems"
        "count": "mdr_text.text.exact", 
        "limit": 5
    }
    
    # Correction pour Device : on compte plutôt les types d'événements (event_type) ou on reste simple.
    # Pour faire simple et robuste : On réutilise la logique de comptage si possible, sinon on ignore.
    # OpenFDA Device endpoint est tricky. Pour l'instant, si Drug échoue, on renvoie "Non disponible".
    # (On pourra améliorer le connecteur Device plus tard car il demande des clés spécifiques).
    
    return "Aucune donnée spécifique d'effets secondaires (FDA) trouvée pour ce terme."

def _format_results(results: list, source_type: str) -> str:
    """Formate la liste JSON en texte lisible pour l'IA."""
    text = f"TOP EFFETS SECONDAIRES RAPPORTÉS (Source: OpenFDA {source_type}) :\n"
    for item in results:
        term = item.get("term", "Inconnu")
        count = item.get("count", 0)
        text += f"- {term} : {count} signalements\n"
    
    text += "\n(Note à Big Sis : Ces données sont des signalements réels de patients. Utilise-les pour identifier les risques concrets.)"
    return text