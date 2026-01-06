import subprocess
import time
import sys

# CONFIGURATION DU BATCH DÉCEMBRE 2025
# Chaque entrée contient :
# - name : Nom pour l'affichage
# - query : La requête scientifique pour le Sujet Principal (Topic)
# - problem : Le problème visé (pour permettre à Big Sis de chercher un Challenger/Alternative)

batch_config = [
    {
        "name": "Botox_Facial_Wrinkles",
        "query": "Botulinum toxin type A facial wrinkle treatment OR botox dynamic rhytids",
        "problem": "Facial wrinkles and aging"
    },
    {
        "name": "Profhilo_BioRemodeling",
        "query": "Hybrid cooperative complexes hyaluronic acid OR Profhilo bio-remodeling",
        "problem": "Loss of dermal hydration and elasticity"
    },
    {
        "name": "PDO_Thread_Lift",
        "query": "PDO thread lift facial rejuvenation OR polydioxanone threads lifting",
        "problem": "Mild facial ptosis and contour lifting"
    },
    {
        "name": "Jawline_Contour_Filler",
        "query": "Hyaluronic acid jawline contouring OR chin filler harmonization",
        "problem": "Jawline blurring and lower face laxity"
    },
    {
        "name": "Tear_Trough_Filler",
        "query": "Hyaluronic acid tear trough correction OR under eye filler safety",
        "problem": "Infraorbital hollowing and dark circles"
    },
    {
        "name": "Temple_Volume_Filler",
        "query": "Temporal hollowing filler hyaluronic acid OR temple augmentation injections",
        "problem": "Temporal hollowing and skeletal appearance"
    },
    {
        "name": "Lip_Filler_HA",
        "query": "Hyaluronic acid lip augmentation OR lip filler vermilion border definition",
        "problem": "Lip volume loss and asymmetry"
    },
    {
        "name": "RF_Microneedling",
        "query": "Radiofrequency microneedling facial rejuvenation OR RF microneedling acne scars",
        "problem": "Atrophic acne scars and texture irregularities"
    },
    {
        "name": "Fractional_CO2_Laser",
        "query": "Fractional CO2 laser facial rejuvenation OR ablative laser perioral wrinkles",
        "problem": "Perioral rhytids and photoaging"
    },
    {
        "name": "LED_Facial_Therapy",
        "query": "LED phototherapy facial rejuvenation OR low level light therapy wrinkles",
        "problem": "Photoaging and inflammation"
    }
]

def run_batch():
    print(f"🚀 BIG SIS LAUNCHER V7 - Démarrage du batch de {len(batch_config)} sujets...\n")
    
    success_count = 0
    
    for i, item in enumerate(batch_config, 1):
        display_name = item["name"]
        
        print(f"--------------------------------------------------")
        print(f"🔹 [{i}/{len(batch_config)}] Traitement : {display_name}")
        print(f"   Topic   : {item['query']}")
        print(f"   Problem : {item['problem']}")
        print(f"--------------------------------------------------")
        
        try:
            # Appel de main.py avec les DEUX arguments (Topic + Problem)
            subprocess.run(
                [
                    sys.executable, "main.py", 
                    "--topic", item["query"], 
                    "--problem", item["problem"]
                ],
                check=True
            )
            success_count += 1
            
        except subprocess.CalledProcessError:
            print(f"❌ Erreur critique sur '{display_name}'. Passage au suivant.")
        except KeyboardInterrupt:
            print("\n🛑 Arrêt d'urgence demandé.")
            break
        
        # Pause de courtoisie pour les API
        print("⏳ Pause de sécurité (5s)...")
        time.sleep(5)

    try:
        print("\n🗂️ Mise à jour de l'Atlas (build_face_index.py)...", end=" ", flush=True)
        subprocess.run(
            [sys.executable, "scripts/build_face_index.py"],
            check=True
        )
        print("✅")
    except Exception as exc:
        print(f"\n⚠️ Impossible de régénérer l'Atlas automatiquement: {exc}")
    
    print(f"\n✨ BATCH TERMINÉ ! {success_count}/{len(batch_config)} fiches générées.")

if __name__ == "__main__":
    run_batch()
