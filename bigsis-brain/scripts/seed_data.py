import asyncio
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.db.database import engine, Base, AsyncSessionLocal
from core.db.models import FaceArea, WrinkleType, Procedure, Risk
from sqlalchemy import select, text

async def init_models():
    async with engine.begin() as conn:
        # Enable pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.drop_all) # WARNING: DROPS ALL DATA for Dev
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created.")

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Check if data exists
        result = await session.execute(select(FaceArea))
        if result.scalars().first():
            print("Data already seeded.")
            return

        # 1. Face Areas
        areas = [
            FaceArea(name="front", description="Zone supérieure du visage, incluant le muscle frontal."),
            FaceArea(name="glabelle", description="Zone entre les sourcils (rides du lion)."),
            FaceArea(name="pattes_oie", description="Coins externes des yeux."),
            FaceArea(name="sillon_nasogenien", description="Plis allant du nez aux coins de la bouche."),
        ]
        session.add_all(areas)

        # 2. Wrinkle Types
        types = [
            WrinkleType(name="expression", description="Causées par la contraction musculaire répétée (dynamiques)."),
            WrinkleType(name="statique", description="Présentes même au repos, dues à la perte d'élasticité/volume."),
            WrinkleType(name="ridule", description="Fines lignes superficielles (déshydratation, début de vieillissement)."),
        ]
        session.add_all(types)
        
        # 3. Procedures
        procedures = [
            Procedure(name="toxine_botulique", description="Détend les muscles pour lisser les rides d'expression.", recovery_time="Moques ou rougeurs 30min"),
            Procedure(name="acide_hyaluronique", description="Comble les volumes et les rides statiques.", recovery_time="Gêne possible 24-48h"),
        ]
        session.add_all(procedures)

        # 4. Risks
        risks = [
            Risk(name="hematome", severity="Low", description="Bleu au point d'injection."),
            Risk(name="asymetrie", severity="Medium", description="Résultat non uniforme nécessitant une retouche."),
            Risk(name="ptosis", severity="High", description="Chute temporaire de la paupière ou du sourcil."),
        ]
        session.add_all(risks)

        await session.commit()
        print("Seed data inserted successfully.")

async def main():
    await init_models()
    await seed_data()

if __name__ == "__main__":
    asyncio.run(main())
