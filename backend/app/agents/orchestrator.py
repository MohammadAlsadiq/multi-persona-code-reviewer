"""
Orchestrator — runs all three reviewer agents concurrently and assembles
the final :class:`ReviewReport`.

Health-score formula (minimum 0):
  100  − 20 × #CRITICAL  − 10 × #WARNING  − 2 × #INFO
"""
from __future__ import annotations

import asyncio
from typing import List

from app.agents.architecture_agent import run_architecture_review
from app.agents.performance_agent import run_performance_review
from app.agents.security_agent import run_security_review
from app.core.schemas import DiffInput, Finding, ReviewReport


def _calculate_health_score(findings: List[Finding]) -> int:
    """Compute a 0-100 health score from a flat list of findings."""
    deduction = sum(
        20 if f.severity == "CRITICAL" else 10 if f.severity == "WARNING" else 2
        for f in findings
    )
    return max(0, 100 - deduction)


async def run_parallel_review(diff_input: DiffInput) -> ReviewReport:
    """
    Execute the three persona agents concurrently and return a :class:`ReviewReport`.

    Individual agent failures are silently swallowed (they return ``[]``) so a
    single failing persona never prevents the other two from delivering results.
    """
    security_findings, performance_findings, architecture_findings = await asyncio.gather(
        run_security_review(diff_input),
        run_performance_review(diff_input),
        run_architecture_review(diff_input),
    )

    all_findings: List[Finding] = (
        security_findings + performance_findings + architecture_findings
    )

    return ReviewReport(
        security=security_findings,
        performance=performance_findings,
        architecture=architecture_findings,
        health_score=_calculate_health_score(all_findings),
        total_issues=len(all_findings),
    )
