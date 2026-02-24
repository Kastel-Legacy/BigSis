from fastapi import APIRouter, HTTPException
from api.schemas import AnalyzeRequest, AnalyzeResponse
from core.orchestrator import Orchestrator

router = APIRouter()
orchestrator = Orchestrator()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_wrinkles(request: AnalyzeRequest):
    try:
        input_data = request.dict()
        session_id = input_data.pop("session_id")
        result = await orchestrator.process_request(session_id, input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
