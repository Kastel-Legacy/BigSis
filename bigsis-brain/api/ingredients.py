from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List, Optional
from core.db.database import AsyncSessionLocal
from core.db.models import Ingredient
from api.schemas import IngredientRead, IngredientCreate

router = APIRouter()

@router.get("/ingredients", response_model=List[IngredientRead])
async def list_ingredients(q: Optional[str] = None):
    """
    Search ingredients by name or INCI name.
    """
    async with AsyncSessionLocal() as session:
        stmt = select(Ingredient)
        if q:
            search = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Ingredient.name.ilike(search),
                    Ingredient.inci_name.ilike(search),
                    Ingredient.category.ilike(search)
                )
            )
        stmt = stmt.order_by(Ingredient.name)
        result = await session.execute(stmt)
        return result.scalars().all()

@router.post("/ingredients", response_model=IngredientRead)
async def create_ingredient(ingredient: IngredientCreate):
    """
    Add a new ingredient to the database.
    """
    async with AsyncSessionLocal() as session:
        try:
            db_item = Ingredient(**ingredient.dict())
            session.add(db_item)
            await session.commit()
            await session.refresh(db_item)
            return db_item
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.get("/ingredients/{id}", response_model=IngredientRead)
async def get_ingredient(id: str):
    async with AsyncSessionLocal() as session:
        # Fetch ingredient
        result = await session.execute(select(Ingredient).where(Ingredient.id == id))
        item = result.scalars().first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Ingredient not found")
            
        # Fetch claims
        from core.db.models import EvidenceClaim
        stmt_claims = select(EvidenceClaim).where(EvidenceClaim.ingredient_id == id)
        res_claims = await session.execute(stmt_claims)
        item.claims = res_claims.scalars().all()
        
        return item
