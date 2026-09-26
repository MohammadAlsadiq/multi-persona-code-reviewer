"""Review routes — /api/review, /api/samples, /api/health."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.agents.orchestrator import run_parallel_review
from app.core.schemas import DiffInput, ReviewReport

router = APIRouter(prefix="/api")

# Resolve the sample_data directory relative to the project root.
# backend/app/routes/review.py → up three levels → project root
_SAMPLE_DIR = Path(__file__).resolve().parents[3] / "sample_data"

_SAMPLE_FILES = [
    "diff_security_flaw.patch",
    "diff_performance_issue.patch",
    "diff_architecture_violation.patch",
]


@router.get("/health", summary="Health check")
async def health() -> dict:
    """Return a simple liveness probe."""
    return {"status": "ok"}


@router.get("/samples", summary="Load patch file samples")
async def samples() -> dict[str, str]:
    """
    Return the raw text of every pre-built ``.patch`` file in *sample_data/*.

    The response is a ``{filename: content}`` mapping so the UI can populate
    the diff textarea with one button click.
    """
    result: dict[str, str] = {}
    for name in _SAMPLE_FILES:
        path = _SAMPLE_DIR / name
        if path.is_file():
            result[name] = path.read_text(encoding="utf-8")
    if not result:
        raise HTTPException(status_code=404, detail="No sample patch files found.")
    return result


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
