from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class DiffInput(BaseModel):
    """Payload sent by the client to trigger a review."""

    diff_text: str = Field(..., description="The unified-diff text to review.")

    # Optional per-request credential overrides (come from the UI if provided)
    api_key: Optional[str] = Field(None, description="LLM API key override.")
    base_url: Optional[str] = Field(None, description="LLM base URL override.")
    model: Optional[str] = Field(None, description="LLM model name override.")


class Finding(BaseModel):
    """A single issue found by one of the reviewer personas."""

    file: str = Field(..., description="The file path affected by this finding.")
    line_number: int = Field(..., description="Approximate line number of the issue.")
    severity: Literal["CRITICAL", "WARNING", "INFO"] = Field(
        ..., description="Severity level of the finding."
    )
    category: Literal["SECURITY", "PERFORMANCE", "ARCHITECTURE"] = Field(
        ..., description="Review category this finding belongs to."
    )
    issue: str = Field(..., description="A concise description of the problem.")
    suggestion: str = Field(..., description="Actionable recommendation to fix the issue.")
    patch: str = Field(
        ...,
        description="A unified-diff snippet demonstrating the suggested fix.",
    )


class ReviewReport(BaseModel):
    """Aggregated output of all three review personas."""

    security: List[Finding] = Field(default_factory=list)
    performance: List[Finding] = Field(default_factory=list)
    architecture: List[Finding] = Field(default_factory=list)
    health_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall code-health score (100 = no issues).",
    )
    total_issues: int = Field(..., description="Total number of findings across all personas.")


# ---------------------------------------------------------------------------
# Chat / Agentic schemas
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    """A single turn in a persona chat conversation."""

    role: Literal["user", "assistant"] = Field(
        ..., description="Who produced this message."
    )
    content: str = Field(..., description="The text of the message.")
    persona: Optional[str] = Field(
        None,
        description="Robot persona that produced this message ('SECURITY', 'PERFORMANCE', 'ARCHITECTURE', or None for user).",
    )


class AgentChatRequest(BaseModel):
    """Request payload for a 1-on-1 chat with a single persona robot."""

    persona: Literal["SECURITY", "PERFORMANCE", "ARCHITECTURE"] = Field(
        ..., description="Which robot persona to address."
    )
    message: str = Field(..., description="The developer's follow-up question.")
    diff_text: str = Field(..., description="The diff that was reviewed.")
    findings: List[Finding] = Field(
        default_factory=list,
        description="The findings this persona flagged (its own findings only).",
    )
    history: List[ChatMessage] = Field(
        default_factory=list,
        description="Previous turns in this conversation.",
    )
    api_key: Optional[str] = Field(None, description="LLM API key override.")
    base_url: Optional[str] = Field(None, description="LLM base URL override.")
    model: Optional[str] = Field(None, description="LLM model name override.")


class AgentChatResponse(BaseModel):
    """Response from a single persona robot."""

    persona: str = Field(..., description="Which robot persona replied.")
    reply: str = Field(..., description="The robot's reply text.")


class CouncilChatRequest(BaseModel):
    """Request payload for the multi-robot Review Council chat."""

    message: str = Field(..., description="The developer's question to the whole council.")
    diff_text: str = Field(..., description="The diff that was reviewed.")
    findings: List[Finding] = Field(
        default_factory=list,
        description="All findings from all personas.",
    )
    history: List[ChatMessage] = Field(
        default_factory=list,
        description="Previous council turns.",
    )
    api_key: Optional[str] = Field(None, description="LLM API key override.")
    base_url: Optional[str] = Field(None, description="LLM base URL override.")
    model: Optional[str] = Field(None, description="LLM model name override.")


class CouncilChatResponse(BaseModel):
    """Aggregated replies from all three robot personas."""

    replies: List[AgentChatResponse] = Field(
        ..., description="One reply per persona (Security, Performance, Architecture)."
    )
