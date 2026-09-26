"""Review routes — /api/review, /api/samples, /api/health, /api/apply-fix."""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.fix_generator import FixPreview, generate_fix_preview
from app.agents.orchestrator import run_parallel_review
from app.core.schemas import DiffInput, Finding, ReviewReport

router = APIRouter(prefix="/api")

# Resolve the sample_data directory relative to the project root.
# backend/app/routes/review.py → up three levels → project root
_SAMPLE_DIR = Path(__file__).resolve().parents[3] / "sample_data"

_SAMPLE_FILES = [
    "diff_security_flaw.patch",
    "diff_performance_issue.patch",
    "diff_architecture_violation.patch",
]


# ---------------------------------------------------------------------------
# Request schema for /api/apply-fix
# ---------------------------------------------------------------------------


class ApplyFixRequest(BaseModel):
    """Payload for the apply-fix endpoint."""

    finding: Finding
    diff_text: Optional[str] = ""


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


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


@router.post(
    "/apply-fix",
    response_model=FixPreview,
    summary="Generate a before/after preview for a finding's suggested fix",
)
async def apply_fix(body: ApplyFixRequest) -> FixPreview:
    """
    Accept a :class:`Finding` (and optional original *diff_text*), run it
    through :func:`~app.agents.fix_generator.generate_fix_preview`, and return
    a structured preview containing:

    - **original_code** — the lines *before* the fix.
    - **patched_code** — the lines *after* the fix.
    - **unified_patch** — the normalised unified-diff patch, ready to copy or apply.
    - **status** — one of ``ok``, ``patch_unavailable``, or ``parse_error``.
    """
    preview = generate_fix_preview(body.finding, body.diff_text or "")
    return preview
