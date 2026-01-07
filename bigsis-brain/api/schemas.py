from pydantic import BaseModel
from typing import Optional, List, Any

class AnalyzeRequest(BaseModel):
    session_id: str
    area: str # e.g. "front", "glabelle"
    wrinkle_type: str # "expression", "statique"
    age_range: Optional[str] = None
    pregnancy: Optional[bool] = False
    language: str = 'fr'
    
class AnalyzeResponse(BaseModel):
    summary: str
    explanation: str
    options_discussed: List[str]
    risks_and_limits: List[str]
    questions_for_practitioner: List[str]
    uncertainty_level: str
    evidence_used: Optional[List[dict]] = []

class SocialGenerationRequest(BaseModel):
    topic: str
    problem: Optional[str] = None

class SocialGenerationResponse(BaseModel):
    data: dict # Returns the full JSON structure expected by the viewer

class IngredientBase(BaseModel):
    name: str
    inci_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    efficacy_rating: Optional[str] = "Medium"
    min_concentration: Optional[float] = None
    safety_profile: Optional[str] = None
    evidence_source: Optional[str] = None

class IngredientCreate(IngredientBase):
    pass

from uuid import UUID

class IngredientRead(IngredientBase):
    id: UUID # Changed from str to UUID
    created_at: Any
    
    class Config:
        orm_mode = True

# --- SCANNER SCHEMAS ---

class EvidenceClaimBase(BaseModel):
    indication: str
    outcome: str
    confidence_level: str
    pmid: str
    study_type: str
    summary: str
    year: int

class EvidenceClaimRead(EvidenceClaimBase):
    id: UUID
    ingredient_id: UUID
    class Config:
        orm_mode = True

class ProductBase(BaseModel):
    ean: Optional[str] = None
    brand: Optional[str] = None
    name: Optional[str] = None
    image_url: Optional[str] = None
    inci_text_raw: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductRead(ProductBase):
    id: UUID
    created_at: Any
    class Config:
        orm_mode = True

class UserProductBase(BaseModel):
    product_id: UUID
    status: str = "in_use"

class UserProductRead(UserProductBase):
    id: UUID
    date_added: Any
    class Config:
        orm_mode = True
