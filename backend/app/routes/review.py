"""Review routes — /api/review, /api/samples, /api/health, /api/apply-fix,
                  /api/chat/agent, /api/chat/council."""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.chat_agent import run_council_chat, run_single_agent_chat
from app.agents.fix_generator import FixPreview, generate_fix_preview
from app.agents.orchestrator import run_parallel_review
from app.core.schemas import (
    AgentChatRequest,
    AgentChatResponse,
    CouncilChatRequest,
    CouncilChatResponse,
    DiffInput,
    Finding,
    ReviewReport,
)

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
# Existing routes
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
    a structured preview containing ``original_code``, ``patched_code``,
    ``unified_patch``, and ``status``.
    """
    return generate_fix_preview(body.finding, body.diff_text or "")


# ---------------------------------------------------------------------------
# Chat endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/chat/agent",
    response_model=AgentChatResponse,
    summary="1-on-1 follow-up chat with a single robot persona",
)
async def chat_agent(req: AgentChatRequest) -> AgentChatResponse:
    """
    Send a follow-up question to **one** robot persona (SecBot, PerfBot, or
    ArchBot).  Pass the diff, the persona's findings, and the conversation
    history so the robot can give contextually grounded answers.

    Credential overrides (``api_key``, ``base_url``, ``model``) work the same
    way as in ``/api/review``.
    """
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty.")
    return await run_single_agent_chat(req)


@router.post(
    "/chat/council",
    response_model=CouncilChatResponse,
    summary="Ask all 3 robot personas the same question simultaneously",
)
async def chat_council(req: CouncilChatRequest) -> CouncilChatResponse:
    """
    Send one question to the **Review Council** (all three robot personas at
    once).  All three reply concurrently via ``asyncio.gather``.  Each robot
    answers from its own domain perspective and only references its own
    findings.

    Credential overrides work the same way as in ``/api/review``.
    """
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty.")
    return await run_council_chat(req)
