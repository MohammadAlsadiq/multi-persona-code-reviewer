"""
fix_generator.py — Produces a structured before/after preview for a Finding.

Given the original diff snippet and a Finding (which carries a ``patch`` field
with a unified-diff snippet and a ``suggestion`` text), this module:

  1. Extracts the "removed" (original) and "added" (patched) lines from the
     unified-diff patch stored in the Finding.
  2. Falls back to the raw diff_text for context when the patch is minimal.
  3. Validates the patch is well-formed (starts with ``---`` / ``+++`` lines or
     is a hunk-only fragment beginning with ``@@``).
  4. Returns a ``FixPreview`` object with ``original_code``, ``patched_code``,
     ``unified_patch``, and a ``status`` field.
"""
from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel

from app.core.schemas import Finding

# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------


class FixPreview(BaseModel):
    """Structured preview of the suggested fix."""

    original_code: str
    patched_code: str
    unified_patch: str
    status: Literal["ok", "patch_unavailable", "parse_error"]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_HUNK_HEADER_RE = re.compile(r"^@@\s+[-+\d, ]+\s+@@", re.MULTILINE)


def _normalise_patch(raw_patch: str) -> str:
    """Strip leading/trailing whitespace and normalise line endings."""
    return raw_patch.strip().replace("\r\n", "\n").replace("\r", "\n")


def _is_valid_patch(patch: str) -> bool:
    """Return True if *patch* looks like a well-formed unified-diff fragment."""
    if not patch:
        return False
    # Accept full diff (--- / +++ header) or bare hunk (starting with @@)
    if patch.startswith("---") or patch.startswith("+++"):
        return True
    if _HUNK_HEADER_RE.search(patch):
        return True
    # Accept if there is at least one +/- context line
    lines = patch.splitlines()
    has_remove = any(ln.startswith("-") and not ln.startswith("---") for ln in lines)
    has_add = any(ln.startswith("+") and not ln.startswith("+++") for ln in lines)
    return has_remove or has_add


def _extract_sides(patch: str) -> tuple[str, str]:
    """
    Walk the unified-diff lines and separate the *original* (``-``) and
    *patched* (``+``) sides.

    Context lines (no prefix or space-prefixed) are included on both sides.
    Header lines (``---``, ``+++``, ``@@``) are skipped.
    """
    original_lines: list[str] = []
    patched_lines: list[str] = []

    for line in patch.splitlines():
        if line.startswith("---") or line.startswith("+++"):
            continue
        if _HUNK_HEADER_RE.match(line):
            continue
        if line.startswith("-"):
            original_lines.append(line[1:])
        elif line.startswith("+"):
            patched_lines.append(line[1:])
        else:
            # Context line — strip optional leading space
            ctx = line[1:] if line.startswith(" ") else line
            original_lines.append(ctx)
            patched_lines.append(ctx)

    return "\n".join(original_lines), "\n".join(patched_lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_fix_preview(finding: Finding, diff_text: str = "") -> FixPreview:
    """
    Build a :class:`FixPreview` from a *finding* and the original *diff_text*.

    Args:
        finding:   A validated :class:`~app.core.schemas.Finding` object whose
                   ``patch`` field contains a unified-diff snippet.
        diff_text: The raw diff that was submitted for review (used as fallback
                   context when the finding's patch is missing or trivial).

    Returns:
        A :class:`FixPreview` with ``original_code``, ``patched_code``,
        ``unified_patch``, and ``status``.
    """
    raw_patch = _normalise_patch(finding.patch)

    if not raw_patch:
        # No patch at all — surface the suggestion and diff context only
        return FixPreview(
            original_code=diff_text.strip(),
            patched_code=f"# {finding.suggestion}",
            unified_patch="",
            status="patch_unavailable",
        )

    if not _is_valid_patch(raw_patch):
        return FixPreview(
            original_code=diff_text.strip(),
            patched_code=raw_patch,
            unified_patch=raw_patch,
            status="parse_error",
        )

    original_code, patched_code = _extract_sides(raw_patch)

    return FixPreview(
        original_code=original_code or diff_text.strip(),
        patched_code=patched_code,
        unified_patch=raw_patch,
        status="ok",
    )
