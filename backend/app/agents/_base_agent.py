"""
Shared LLM-call helper used by all three reviewer agents.

Each agent calls `run_agent(prompt_file, diff_input)` and gets back a
`List[Finding]`.  The function:
  1. Reads the system prompt from disk (once per call — files are small).
  2. Builds an OpenAI-compatible chat-completions request.
  3. Sends it via httpx with a 60-second timeout.
  4. Strips accidental markdown code-fences from the response.
  5. Parses + validates the JSON with Pydantic.
  6. Returns [] on any error so one failing agent never crashes the review.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import List

import httpx

from app.core.config import settings
from app.core.schemas import DiffInput, Finding

logger = logging.getLogger(__name__)

# Directory that holds the .txt prompt files
_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Regex that matches ```json ... ``` or ``` ... ``` fences
_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def _strip_fences(text: str) -> str:
    """Remove markdown code-fences that the LLM may accidentally emit."""
    match = _FENCE_RE.search(text)
    if match:
        return match.group(1)
    return text.strip()


async def run_agent(prompt_file: str, diff_input: DiffInput) -> List[Finding]:
    """
    Call the LLM with the given persona prompt and return validated findings.

    Args:
        prompt_file: Filename inside ``app/prompts/`` (e.g. ``"security.txt"``).
        diff_input:  The review request payload (includes optional credential overrides).

    Returns:
        A (possibly empty) list of :class:`Finding` objects.
    """
    # --- Resolve effective credentials (per-request overrides win) ----------
    api_key = diff_input.api_key or settings.llm_api_key
    base_url = diff_input.base_url or settings.llm_base_url
    model = diff_input.model or settings.llm_model

    # --- Load system prompt --------------------------------------------------
    prompt_path = _PROMPTS_DIR / prompt_file
    try:
        system_prompt = prompt_path.read_text(encoding="utf-8")
    except OSError:
        logger.error("Cannot read prompt file: %s", prompt_path)
        return []

    # --- Build request payload -----------------------------------------------
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": diff_input.diff_text},
        ],
        "temperature": 0.0,
    }

    headers = {
        "Content-Type": "application/json",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # --- Call the LLM --------------------------------------------------------
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(base_url, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.TimeoutException:
        logger.warning("LLM request timed out for prompt '%s'.", prompt_file)
        return []
    except httpx.HTTPStatusError as exc:
        logger.error(
            "LLM returned HTTP %s for prompt '%s': %s",
            exc.response.status_code,
            prompt_file,
            exc.response.text[:500],
        )
        return []
    except httpx.RequestError as exc:
        logger.error("Network error calling LLM for prompt '%s': %s", prompt_file, exc)
        return []

    # --- Parse response ------------------------------------------------------
    try:
        body = response.json()
        raw_text: str = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as exc:
        logger.error("Unexpected LLM response shape for '%s': %s", prompt_file, exc)
        return []

    cleaned = _strip_fences(raw_text)

    try:
        items = json.loads(cleaned)
        if not isinstance(items, list):
            raise ValueError("Expected a JSON array, got %s" % type(items).__name__)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("JSON parse failure for '%s': %s — raw: %.300s", prompt_file, exc, cleaned)
        return []

    # Validate each item with Pydantic; drop malformed entries but keep the rest
    findings: List[Finding] = []
    for idx, item in enumerate(items):
        try:
            findings.append(Finding.model_validate(item))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Skipping malformed finding %d in '%s': %s", idx, prompt_file, exc)

    return findings
