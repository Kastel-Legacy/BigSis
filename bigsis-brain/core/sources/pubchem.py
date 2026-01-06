import requests
import json

def get_chemical_safety(query: str) -> str:
    """
    Récupère les données de sécurité (GHS Hazards) sur PubChem.
    Idéal pour : Retinol, Acide Hyaluronique, Botox, Niacinamide...
    Inutile pour : Laser, Cryolipolyse (renverra vide).
    """
    
    # ÉTAPE 1 : Trouver le CID (Compound ID) à partir du nom
    search_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{query}/cids/JSON"
    
    try:
        resp = requests.get(search_url)
        if resp.status_code != 200:
            return "Pas de données chimiques (Ce n'est probablement pas une molécule simple)."
        
        data = resp.json()
        cid = data['IdentifierList']['CID'][0] # On prend le premier résultat
        
    except Exception:
        return "Pas de données chimiques trouvées."

    # ÉTAPE 2 : Récupérer les "GHS Hazard Statements" (Phrases de risque)
    # On cible spécifiquement la section "Safety and Hazards" -> "GHS Classification"
    details_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON?heading=GHS+Classification"
    
    try:
        resp = requests.get(details_url)
        if resp.status_code != 200:
            return "Molécule trouvée, mais pas de données de sécurité GHS."
            
        data = resp.json()
        
        # Parsing du JSON complexe de PubChem pour trouver les phrases "H" (Hazards)
        hazards = []
        
        # Navigation profonde dans l'arbre JSON de PubChem...
        # Section -> Section -> Information -> Value -> StringWithMarkup
        sections = data.get("Record", {}).get("Section", [])
        for sec in sections:
            if sec.get("TOCHeading") == "Safety and Hazards":
                subsections = sec.get("Section", [])
                for sub in subsections:
                    if sub.get("TOCHeading") == "Hazards Identification":
                         sub_sub = sub.get("Section", [])
                         for ss in sub_sub:
                             if ss.get("TOCHeading") == "GHS Classification":
                                 infos = ss.get("Information", [])
                                 for info in infos:
                                     if info.get("Name") == "GHS Hazard Statements":
                                         val = info.get("Value", {}).get("StringWithMarkup", [])
                                         for v in val:
                                             hazards.append(v.get("String", ""))

        if not hazards:
            return "Molécule listée, mais pas d'avertissements GHS majeurs."

        # On dédoublonne et on formate
        unique_hazards = list(set(hazards))
        # On garde les 5 premiers pour ne pas saturer le prompt
        display_hazards = unique_hazards[:5] 
        
        text = f"⚠️ PROFIL CHIMIQUE & RISQUES (Source: PubChem - CID {cid}) :\n"
        for h in display_hazards:
            text += f"- {h}\n"
            
        return text

    except Exception as e:
        return f"Erreur lecture données PubChem: {e}"