
import sys
import os
from pydantic import ValidationError

# Add brain root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.schemas import FicheMaster

def verify_json(data: dict, label: str):
    print(f"--- Verifying {label} ---")
    try:
        FicheMaster(**data)
        print("✅ SUCCESS: Data matches FicheMaster schema.")
    except ValidationError as e:
        print(f"❌ FAILURE: Validation error for {label}:")
        print(e.json(indent=2))
        return False
    except Exception as e:
        print(f"❌ ERROR: Unexpected error: {e}")
        return False
    return True

# 1. Valid Minimal Mock
valid_mock = {
    "nom_scientifique": "OnabotulinumtoxinA",
    "nom_commercial_courant": "Botox",
    "titre_social": "Botox: La vérité brute",
    "carte_identite": {
        "ce_que_c_est": "Toxine",
        "comment_ca_marche": "Bloque les muscles",
        "mode_application": "Injection",
        "zone_anatomique": "Visage"
    },
    "meta": {
        "zones_concernees": ["Front", "Pattes d'oie"],
        "problemes_traites": ["Rides"]
    },
    "score_global": {
        "note_efficacite_sur_10": 9.5,
        "explication_efficacite_bref": "Gold standard.",
        "note_securite_sur_10": 9.0,
        "explication_securite_bref": "Rares effets secondaires.",
        "verdict_final": "Indispensable."
    },
    "synthese_efficacite": {
        "ce_que_ca_fait_vraiment": "Lissage immédiat.",
        "delai_resultat": "4-7 jours",
        "duree_resultat": "4 mois"
    },
    "synthese_securite": {
        "niveau_douleur_moyen": "Faible",
        "risques_courants": ["Bleus"],
        "le_risque_qui_fait_peur": "Ptosis"
    },
    "recuperation_sociale": {
        "verdict_immediat": "Rien",
        "downtime_visage_nu": "0j",
        "downtime_maquillage": "0j",
        "zoom_ready": "Immédiat",
        "date_ready": "Immédiat",
        "les_interdits_sociaux": ["Pas de sport"]
    },
    "le_conseil_bigsis": "Ne frottez pas la zone.",
    "statistiques_consolidees": {
        "nombre_etudes_pertinentes_retenues": 100,
        "nombre_patients_total": 10000,
        "niveau_de_preuve_global": "Elevé"
    },
    "annexe_sources_retenues": [
        {
            "id": 1,
            "titre": "Botox vs Placebo",
            "annee": "2023",
            "url": "https://pubmed.gov/1",
            "pmid": "123",
            "raison_inclusion": "Étude pivot"
        }
    ]
}

# 2. Invalid Mock (Missing required score_global)
invalid_mock = valid_mock.copy()
del invalid_mock["score_global"]

if __name__ == "__main__":
    s1 = verify_json(valid_mock, "VALID MOCK")
    s2 = verify_json(invalid_mock, "INVALID MOCK (Missing field)")
    
    if not s1 or s2:
        print("\n❌ Hardening Failed: Schema verification script did not behave as expected.")
        sys.exit(1)
    else:
        print("\n✨ Hardening Passed: Schema verification utility is operational.")
