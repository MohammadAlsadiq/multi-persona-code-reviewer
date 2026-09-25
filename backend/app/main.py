"""FastAPI application entry-point."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.review import router as review_router

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
