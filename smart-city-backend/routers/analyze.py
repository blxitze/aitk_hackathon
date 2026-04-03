"""POST /api/analyze — LLM integration in a later step."""

from fastapi import APIRouter

from models.schemas import AnalyzeRequest

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze")
async def analyze(body: AnalyzeRequest) -> dict:
    """Stub; returns structure per API.md."""
    return {
        "what_happening": "",
        "critical_level": "Low",
        "actions": ["", "", ""],
        "reasoning": "",
        "confidence": "Низкая",
        "confidence_basis": "Stub response — LLM not wired yet.",
    }
