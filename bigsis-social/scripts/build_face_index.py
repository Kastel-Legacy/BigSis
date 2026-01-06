#!/usr/bin/env python3
"""
Construit un index simplifié des fiches générées pour alimenter la page BIGSIS Atlas.

Usage:
    python scripts/build_face_index.py
"""
import json
import re
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path("data/outputs")
INDEX_PATH = Path("data/atlas-index.json")

FACE_ZONE_KEYWORDS = {
    "front": ["front", "frontal", "glabelle", "forehead"],
    "yeux": ["oeil", "yeux", "paupiere", "orbitaire", "cernes", "crow"],
    "joues": ["joue", "pommet", "malar", "zygom"],
    "nez": ["nez", "rhin", "nasal"],
    "levres": ["levre", "perioral", "bouche", "lip"],
    "menton": ["menton", "chin"],
    "machoire": ["machoire", "jaw", "mandibul", "masseter"],
    "cou": ["cou", "cervic", "neck", "decollete"],
    "frontotemporal": ["tempe", "temporal"]
}

def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower())

def guess_zones(data: dict) -> list:
    zones = data.get("zones_visage")
    if zones:
        return sorted({z for z in zones if z})
    
    fallback_candidates = []
    meta = data.get("meta", {})
    if isinstance(meta.get("zones_concernees"), list):
        fallback_candidates.extend(meta["zones_concernees"])
    carte = data.get("carte_identite", {})
    fallback_candidates.append(carte.get("zone_anatomique", ""))
    fallback_candidates.append(data.get("titre_social", ""))
    
    normalized = " ".join(normalize_text(text) for text in fallback_candidates)
    found = set()
    for canonical, keywords in FACE_ZONE_KEYWORDS.items():
        if canonical in normalized:
            found.add(canonical)
            continue
        if any(kw in normalized for kw in keywords):
            found.add(canonical)
    return sorted(found) or ["general"]

def slugify(value: str) -> str:
    value = value or "fiche"
    value = re.sub(r"[^\w\s-]", "", value.lower()).strip()
    value = re.sub(r"[-\s]+", "-", value)
    return value or "fiche"

def build_entry(path: Path, data: dict) -> dict:
    synthese_eff = data.get("synthese_efficacite", {})
    score = data.get("score_global", {})
    return {
        "id": slugify(data.get("titre_officiel") or path.stem),
        "file": str(path).replace("\\", "/"),
        "titre_social": data.get("titre_social"),
        "titre_officiel": data.get("titre_officiel") or data.get("nom_scientifique"),
        "topic_source": data.get("_meta_topic"),
        "problem_source": data.get("_meta_problem"),
        "zones": guess_zones(data),
        "score_efficacite": score.get("note_efficacite_sur_10"),
        "score_securite": score.get("note_securite_sur_10"),
        "verdict_final": score.get("verdict_final") or data.get("verdict_final"),
        "resume": synthese_eff.get("ce_que_ca_fait_vraiment"),
        "sources_total": data.get("_meta_stats", {}).get("sources_total")
    }

def main():
    if not OUTPUT_DIR.exists():
        raise SystemExit("Le dossier data/outputs est introuvable.")
    
    items = []
    for json_path in sorted(OUTPUT_DIR.glob("*.json")):
        try:
            with open(json_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            items.append(build_entry(json_path, data))
        except Exception as exc:
            print(f"[WARN] Impossible de traiter {json_path.name}: {exc}")
    
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "items": items
    }
    with open(INDEX_PATH, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    print(f"Atlas index généré ({len(items)} fiches) -> {INDEX_PATH}")

if __name__ == "__main__":
    main()
