import re
from typing import List, Dict, Optional
from sqlalchemy import select
from core.db.database import AsyncSessionLocal
from core.db.models import Ingredient, EvidenceClaim
from api.schemas import EvidenceClaimRead

class INCIParser:
    @staticmethod
    def parse(inci_text: str) -> List[str]:
        # Basic cleanup: remove "Aqua", "Water", "Eau" from start if strictly equal
        # But usually in INCI it's "Aqua (Water)"
        text = inci_text.replace("Aqua (Water)", "Aqua").replace("Water (Aqua)", "Aqua")
        
        # Split by comma
        raw_items = [item.strip() for item in text.split(',')]
        
        normalized = []
        for item in raw_items:
            # Remove content in parenthesis e.g. "Glycerin (Vegetable)" -> "Glycerin"
            # But keep checks simple for MVP
            clean = re.sub(r'\s*\(.*?\)', '', item).strip()
            if clean:
                normalized.append(clean)
        
        return normalized

class ScannerEngine:
    async def analyze_inci(self, inci_list: List[str]) -> Dict:
        """
        Takes a list of ingredient names.
        Returns:
          - identified_actives: List of DB Ingredients found
          - unknown_count: count of unmatched
          - score: 0-100
          - verdict: "Bon achat" / "Optionnel" / "Pas nécessaire"
          - evidence_summary: structured summary
        """
        async with AsyncSessionLocal() as session:
            # 1. Trace Ingredients in DB
            found_ingredients = []
            claims_map = {}
            
            for name in inci_list:
                # Try matching against name OR inci_name OR synonyms (using ANY)
                # For MVP, let's use a simpler OR logic in python or proper SQL OR
                from sqlalchemy import or_
                
                stmt = select(Ingredient).where(
                    or_(
                        Ingredient.name.ilike(name),
                        Ingredient.inci_name.ilike(name),
                        Ingredient.synonyms.any(name) # This works if synonyms is ARRAY
                    )
                )
                result = await session.execute(stmt)
                ing = result.scalars().first()
                
                if ing:
                    found_ingredients.append(ing)
                    
                    # Fetch claims
                    stmt_claims = select(EvidenceClaim).where(EvidenceClaim.ingredient_id == ing.id)
                    res_claims = await session.execute(stmt_claims)
                    claims = res_claims.scalars().all()
                    if claims:
                        claims_map[ing.id] = claims
            
            # 2. Logic: Impact vs Position (No Score)
            verdict_category = "Basique" # Basique | Bon Investissement | Prudence | Risque
            verdict_color = "yellow"
            advice_text = "Ce produit semble basique. Il hydrate mais manque d'actifs clés à haute dose."
            
            # Tracking
            high_impact_actives = []
            angel_dusting_suspects = []
            safety_alerts = []
            
            # Total ingredients count for relative position
            total_count = len(inci_list)
            
            for ing in found_ingredients:
                # Find position in original list (first occurrence)
                # Note: This is an approximation if duplicates exist
                try:
                    rank = -1
                    for idx, raw_name in enumerate(inci_list):
                        if ing.name.lower() in raw_name.lower() or ing.inci_name.lower() in raw_name.lower():
                            rank = idx + 1
                            break
                except:
                    rank = -1
                
                ing_claims = claims_map.get(ing.id, [])
                
                # Check Safety First
                for c in ing_claims:
                    if c.outcome == 'negative':
                        safety_alerts.append(f"{ing.name}: Alerte ({c.indication})")
                
                # Check Efficacy & Position
                if ing.efficacy_rating == 'High':
                    # Rule: High Impact Active
                    if ing.min_concentration and ing.min_concentration > 3.0:
                        # Needs high dose (e.g. Vit C, Niacinamide)
                        # If rank is low (after top 7), suspect angel dusting
                        if rank > 7:
                            angel_dusting_suspects.append(ing.name)
                        else:
                            high_impact_actives.append(ing.name)
                    else:
                        # Potent in low dose (Retinol), rank matters less but better if high
                        high_impact_actives.append(ing.name)

            # 3. Generate Verdict
            if safety_alerts:
                verdict_category = "Risque"
                verdict_color = "red"
                advice_text = f"Attention, présence d'ingrédients controversés : {', '.join(safety_alerts)}."
            
            elif high_impact_actives:
                if angel_dusting_suspects:
                    verdict_category = "Prudence"
                    verdict_color = "yellow"
                    advice_text = f"Contient de beaux actifs ({', '.join(high_impact_actives)}) mais attention : {', '.join(angel_dusting_suspects)} semblent être en fin de liste (possible 'Angel Dusting')."
                else:
                    verdict_category = "Bon Investissement"
                    verdict_color = "green"
                    advice_text = f"Excellent choix. Mise sur des valeurs sûres ({', '.join(high_impact_actives)}) qui semblent correctement dosées."
            
            elif angel_dusting_suspects:
                verdict_category = "Prudence"
                verdict_color = "orange"
                advice_text = f"Le marketing met en avant {', '.join(angel_dusting_suspects)}, mais ils sont probablement en quantité infime."

            return {
                "verdict_category": verdict_category,
                "verdict_color": verdict_color,
                "advice": advice_text,
                "actives_found": [
                    {
                        "name": i.name, 
                        "rating": i.efficacy_rating,
                        "claims": [c.summary for c in claims_map.get(i.id, [])]
                    } 
                    for i in found_ingredients
                ],
                "analysis_text": {
                    "positives": [f"{i} (Validé)" for i in high_impact_actives],
                    "negatives": safety_alerts,
                    "neutrals": [f"{i} (Soupçon sous-dosage)" for i in angel_dusting_suspects]
                },
                "total_ingredients": total_count,
                "matched_ingredients": len(found_ingredients)
            }
