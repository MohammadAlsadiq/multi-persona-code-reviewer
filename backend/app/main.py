"""FastAPI application entry-point."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.routes.review import router as review_router

_STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(
    title="Multi-Persona Architectural Code Reviewer",
    version="0.1.0",
    description=(
        "Submits a unified diff to three specialised AI reviewer personas "
        "(Security, Performance, Architecture) running in parallel and returns "
        "a consolidated ReviewReport."
    ),
)

# Allow the local Next.js dev server and any deployed frontend origin.
# Adjust `allow_origins` for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(review_router)

# Serve static assets (CSS, JS, images if any) under /static
app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def index() -> HTMLResponse:
    """Serve the single-page Test UI."""
    html = (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(content=html)
