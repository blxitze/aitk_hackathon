"""Pydantic request/response schemas (expanded in later steps)."""

from typing import Literal

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    scenario: str
    metrics: dict
    mode: Literal["openai", "ollama"]
    language: Literal["ru", "kz"]
