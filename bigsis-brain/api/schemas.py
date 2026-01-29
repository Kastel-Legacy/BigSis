from pydantic import BaseModel
from typing import Optional, List, Any, Dict

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

class GenerateRequest(BaseModel):
    topic: str
    mode: str = "social" # social, diagnostic, recommendation

class SocialGenerationRequest(BaseModel):
    topic: str
    problem: Optional[str] = None

class FICHE_SCORE_GLOBAL(BaseModel):
    note_efficacite_sur_10: float
    explication_efficacite_bref: str
    note_securite_sur_10: float
    explication_securite_bref: str
    verdict_final: str

class FICHE_SOURCE(BaseModel):
    id: int
    titre: str
    annee: str
    url: Optional[str] = None
    pmid: Optional[str] = None
    raison_inclusion: Optional[str] = None

class FicheMaster(BaseModel):
    nom_scientifique: str
    nom_commercial_courant: str
    titre_social: str
    carte_identite: Dict[str, str]
    meta: Dict[str, List[str]]
    score_global: FICHE_SCORE_GLOBAL
    alternative_bigsis: Optional[Dict[str, Any]] = None
    synthese_efficacite: Dict[str, str]
    synthese_securite: Dict[str, Any]
    recuperation_sociale: Dict[str, Any]
    le_conseil_bigsis: str
    statistiques_consolidees: Dict[str, Any]
    annexe_sources_retenues: List[FICHE_SOURCE]

class SocialGenerationResponse(BaseModel):
    data: Any

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
        from_attributes = True

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
        from_attributes = True

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
        from_attributes = True

class UserProductBase(BaseModel):
    product_id: UUID
    status: str = "in_use"

class UserProductRead(UserProductBase):
    id: UUID
    date_added: Any
    class Config:
        from_attributes = True

class ProcedureBase(BaseModel):
    name: str
    description: Optional[str] = None
    # downtime: Optional[str] = None
    # price_range: Optional[str] = None
    tags: List[str] = []

class ProcedureRead(ProcedureBase):
    id: UUID
    class Config:
        from_attributes = True
