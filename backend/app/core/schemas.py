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
