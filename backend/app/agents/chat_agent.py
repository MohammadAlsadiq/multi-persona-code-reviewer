"""
chat_agent.py — Agentic 1-on-1 and council chat for the three robot personas.

Reuses the same credential-resolution logic as _base_agent.py:
  api_key = req.api_key or settings.llm_api_key
  base_url = req.base_url or settings.llm_base_url
  model    = req.model    or settings.llm_model

Two public async functions:
  run_single_agent_chat(req) → AgentChatResponse
  run_council_chat(req)      → CouncilChatResponse  (all 3 in parallel)
"""
from __future__ import annotations

import asyncio
import logging
from typing import List

import httpx

from app.core.config import settings
from app.core.schemas import (
    AgentChatRequest,
    AgentChatResponse,
    ChatMessage,
    CouncilChatRequest,
    CouncilChatResponse,
    Finding,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Persona identity table
# ---------------------------------------------------------------------------

_PERSONA_META = {
    "SECURITY": {
        "name": "SecBot",
        "emoji": "🔒",
        "identity": (
            "You are SecBot 🔒, a senior application security engineer robot. "
            "You specialise in vulnerabilities, exploits, injection attacks, "
            "authentication flaws, secrets exposure, and secure coding practices. "
            "You have already reviewed the diff below and flagged the security findings listed. "
            "Answer the developer's follow-up question concisely (3-8 sentences max). "
            "Stay strictly in your security domain. Reference specific file names and line "
            "numbers from the diff when relevant. Include a short code snippet if it helps. "
            "Never discuss performance or architecture concerns — those are other robots' jobs."
        ),
    },
    "PERFORMANCE": {
        "name": "PerfBot",
        "emoji": "⚡",
        "identity": (
            "You are PerfBot ⚡, a performance and scalability engineer robot. "
            "You specialise in algorithmic complexity, database query optimisation, "
            "memory usage, caching strategies, concurrency, and throughput. "
            "You have already reviewed the diff below and flagged the performance findings listed. "
            "Answer the developer's follow-up question concisely (3-8 sentences max). "
            "Stay strictly in your performance domain. Reference specific file names and line "
            "numbers from the diff when relevant. Include a short code snippet if it helps. "
            "Never discuss security or architecture concerns — those are other robots' jobs."
        ),
    },
    "ARCHITECTURE": {
        "name": "ArchBot",
        "emoji": "🏛️",
        "identity": (
            "You are ArchBot 🏛️, a software architect robot. "
            "You specialise in SOLID principles, design patterns, modularity, "
            "separation of concerns, dependency management, and long-term maintainability. "
            "You have already reviewed the diff below and flagged the architecture findings listed. "
            "Answer the developer's follow-up question concisely (3-8 sentences max). "
            "Stay strictly in your architecture domain. Reference specific file names and line "
            "numbers from the diff when relevant. Include a short code snippet if it helps. "
            "Never discuss security or performance concerns — those are other robots' jobs."
        ),
    },
}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_system_prompt(persona: str, diff_text: str, findings: List[Finding]) -> str:
    """Compose the system prompt for a single persona."""
    meta = _PERSONA_META[persona]

    findings_block = ""
    if findings:
        lines = []
        for f in findings:
            lines.append(
                f"  • [{f.severity}] {f.file}:{f.line_number} — {f.issue} | Suggestion: {f.suggestion}"
            )
        findings_block = "\n\nFindings you flagged:\n" + "\n".join(lines)
    else:
        findings_block = "\n\nYou found no issues in this diff."

    diff_block = f"\n\nDiff under review:\n```\n{diff_text[:4000]}\n```"  # cap to avoid token overrun

    return meta["identity"] + findings_block + diff_block


def _build_messages(system_prompt: str, history: List[ChatMessage], new_message: str) -> list:
    """Build the messages array for the chat-completions API."""
    messages: list = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": new_message})
    return messages


async def _call_llm(
    messages: list,
    api_key: str,
    base_url: str,
    model: str,
) -> str:
    """Send a chat-completions request and return the assistant reply text."""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    endpoint = base_url.rstrip("/")
    if not endpoint.endswith("/chat/completions"):
        endpoint = f"{endpoint}/chat/completions"

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
        body = response.json()
        return body["choices"][0]["message"]["content"]
    except httpx.TimeoutException:
        logger.warning("Chat LLM request timed out.")
        return "⚠️ Request timed out. Please try again."
    except httpx.HTTPStatusError as exc:
        logger.error("Chat LLM HTTP %s: %s", exc.response.status_code, exc.response.text[:300])
        return f"⚠️ LLM returned HTTP {exc.response.status_code}."
    except (httpx.RequestError, KeyError, IndexError) as exc:
        logger.error("Chat LLM error: %s", exc)
        return "⚠️ Could not reach the LLM. Check credentials and base URL."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def run_single_agent_chat(req: AgentChatRequest) -> AgentChatResponse:
    """
    Run a 1-on-1 follow-up chat with a single persona robot.

    Credential resolution mirrors _base_agent.py:
      api_key  = req.api_key  or settings.llm_api_key
      base_url = req.base_url or settings.llm_base_url
      model    = req.model    or settings.llm_model
    """
    api_key = req.api_key or settings.llm_api_key
    base_url = req.base_url or settings.llm_base_url
    model = req.model or settings.llm_model

    system_prompt = _build_system_prompt(req.persona, req.diff_text, req.findings)
    messages = _build_messages(system_prompt, req.history, req.message)

    reply = await _call_llm(messages, api_key, base_url, model)
    return AgentChatResponse(persona=req.persona, reply=reply)


async def run_council_chat(req: CouncilChatRequest) -> CouncilChatResponse:
    """
    Dispatch the developer's question to all three persona robots concurrently
    using asyncio.gather, then return all three replies.

    Each robot receives only the findings it originally flagged so it can
    reference them precisely.
    """
    api_key = req.api_key or settings.llm_api_key
    base_url = req.base_url or settings.llm_base_url
    model = req.model or settings.llm_model

    async def _ask_one(persona: str) -> AgentChatResponse:
        persona_findings = [f for f in req.findings if f.category == persona]
        system_prompt = _build_system_prompt(persona, req.diff_text, persona_findings)

        # For council chat, inject a brief council context into the user message
        council_message = (
            f"[Council question from developer — answer from your {persona.lower()} perspective]: "
            f"{req.message}"
        )
        messages = _build_messages(system_prompt, req.history, council_message)
        reply = await _call_llm(messages, api_key, base_url, model)
        return AgentChatResponse(persona=persona, reply=reply)

    results = await asyncio.gather(
        _ask_one("SECURITY"),
        _ask_one("PERFORMANCE"),
        _ask_one("ARCHITECTURE"),
        return_exceptions=False,
    )

    return CouncilChatResponse(replies=list(results))
