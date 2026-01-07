from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from core.scanner import ScannerEngine, INCIParser

router = APIRouter()
scanner = ScannerEngine()

class ScanRequest(BaseModel):
    inci_text: str
    product_name: Optional[str] = None

class ScanResponse(BaseModel):
    verdict_category: str # Bon Investissement / Basique / Prudence / Risque
    verdict_color: str
    advice: str
    actives_found: List[dict]
    analysis_text: dict
    total_ingredients: int

@router.post("/scanner/inci", response_model=ScanResponse)
async def scan_inci(request: ScanRequest):
    """
    Analyzes an INCI list text.
    """
    if not request.inci_text:
        raise HTTPException(status_code=400, detail="INCI text is empty")
        
    # 1. Parse
    inci_list = INCIParser.parse(request.inci_text)
    
    # 2. Analyze
    result = await scanner.analyze_inci(inci_list)
    
    return result
