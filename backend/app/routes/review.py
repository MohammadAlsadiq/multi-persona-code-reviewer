"""Review route — POST /api/review."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.agents.orchestrator import run_parallel_review
from app.core.schemas import DiffInput, ReviewReport

router = APIRouter(prefix="/api")


@router.post("/review", response_model=ReviewReport, summary="Run a multi-persona code review")
async def review(diff_input: DiffInput) -> ReviewReport:
    """
    Accept a unified diff and return a :class:`ReviewReport` produced by
    three AI personas running concurrently.

    - **diff_text**: the raw unified-diff text to review (required).
    - **api_key / base_url / model**: optional per-request LLM credential overrides.
    """
    if not diff_input.diff_text.strip():
        raise HTTPException(status_code=422, detail="diff_text must not be empty.")

    return await run_parallel_review(diff_input)
