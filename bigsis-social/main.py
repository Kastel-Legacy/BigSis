import os
import json
import argparse
import requests
import re

API_URL = "http://localhost:8000/api/v1/generate/social"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", required=True, help="Sujet principal (ex: 'Pore Strips')")
    parser.add_argument("--problem", required=False, help="Problème traité (ex: 'Blackheads') pour le Challenger")
    args = parser.parse_args()

    print(f"🚀 BIG SIS (Mode API Client) - Sujet : {args.topic}")
    print(f"📡 Appel de BigSis Brain ({API_URL})...", end=" ", flush=True)

    try:
        payload = {
            "topic": args.topic,
            "problem": args.problem
        }
        response = requests.post(API_URL, json=payload)
        response.raise_for_status()
        
        envelope = response.json()
        master_data = envelope.get("data")
        
        print("✅")
    except Exception as e:
        print(f"\n❌ Erreur API: {e}")
        if 'response' in locals():
            print(f"Détails: {response.text}")
        return

    if master_data and master_data.get("status") != "failed":
        # Sécurisation du nom de fichier
        safe_topic_name = re.sub(r'[^a-zA-Z0-9]', '_', args.topic[:30])
        os.makedirs("data/outputs", exist_ok=True)
        filename = f"data/outputs/{safe_topic_name}_MASTER.json"
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(master_data, f, ensure_ascii=False, indent=2)
            
        print(f"✨ Fiche générée : {filename}")
        nb_retenues = len(master_data.get('annexe_sources_retenues', []) or [])
        print(f"(Infos: {nb_retenues} sources retenues)")
    else:
        print("⚠️ Pas de données générées ou erreur distante.")

if __name__ == "__main__":
    main()
