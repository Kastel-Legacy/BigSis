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
