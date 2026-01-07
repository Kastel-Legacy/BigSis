import asyncio
import sys
import os

# Add parent directory to path to import core modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.db.database import AsyncSessionLocal
from core.db.models import Ingredient
from sqlalchemy.future import select

SAMPLES = [
    {
        "name": "Rétinol",
        "inci_name": "Retinol",
        "category": "Anti-âge",
        "description": "Dérivé de la vitamine A, référence absolue de l'anti-âge. Accélère le renouvellement cellulaire, stimule le collagène et réduit les taches.",
        "efficacy_rating": "High",
        "min_concentration": 0.3,
        "safety_profile": "Irritant, photosensibilisant (appliquer le soir + SPF le matin). Déconseillé femmes enceintes.",
        "evidence_source": "Kafi et al. (2007) - Arch Dermatol."
    },
    {
        "name": "Vitamine C",
        "inci_name": "Ascorbic Acid",
        "category": "Antioxydant / Éclat",
        "description": "Puissant antioxydant qui protège des radicaux libres, illumine le teint et stimule la synthèse de collagène.",
        "efficacy_rating": "High",
        "min_concentration": 10.0,
        "safety_profile": "Peut être irritant à haute concentration ou pH bas. S'oxyde rapidement à la lumière.",
        "evidence_source": "Telang (2013) - Indian Dermatol Online J."
    },
    {
        "name": "Acide Hyaluronique",
        "inci_name": "Sodium Hyaluronate",
        "category": "Hydratant",
        "description": "Molécule éponge capable de retenir 1000x son poids en eau. Repulpe et hydrate intensément.",
        "efficacy_rating": "Medium",
        "min_concentration": 0.1,
        "safety_profile": "Très bien toléré. Aucun risque majeur connu.",
        "evidence_source": "Pavicic et al. (2011) - J Drugs Dermatol."
    }
]

async def seed():
    print("🌱 Seeding ingredients...")
    async with AsyncSessionLocal() as session:
        for data in SAMPLES:
            # Check if exists
            result = await session.execute(select(Ingredient).where(Ingredient.name == data["name"]))
            existing = result.scalars().first()
            
            if not existing:
                print(f"   -> Adding {data['name']}")
                ing = Ingredient(**data)
                session.add(ing)
            else:
                print(f"   -> {data['name']} already exists. Skipping.")
        
        await session.commit()
    print("✅ Done!")

if __name__ == "__main__":
    asyncio.run(seed())
