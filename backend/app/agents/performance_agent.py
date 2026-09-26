"""Performance reviewer agent."""
from __future__ import annotations

from typing import List

from app.agents._base_agent import run_agent
from app.core.schemas import DiffInput, Finding


async def run_performance_review(diff_input: DiffInput) -> List[Finding]:
    """Run the performance persona against *diff_input* and return findings."""
    return await run_agent("performance.txt", diff_input)
