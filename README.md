# Multi-Persona Code Reviewer

A full-stack AI-powered code review tool that runs three specialised robot personas — **SecBot 🔒**, **PerfBot ⚡**, and **ArchBot 🏛️** — concurrently against a unified diff. After the review you can chat with each robot individually or convene the entire **Review Council** and ask all three at once.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Robot Personas](#robot-personas)
4. [Features](#features)
5. [Project Structure](#project-structure)
6. [API Reference](#api-reference)
7. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Backend (FastAPI)](#backend-fastapi)
   - [Frontend (Next.js)](#frontend-nextjs)
   - [Docker](#docker)
8. [LLM Configuration](#llm-configuration)
9. [Sample Diffs](#sample-diffs)
10. [Health Score](#health-score)

---

## Overview

Paste any **unified diff** into the UI and click **Run Review**. The three AI reviewer agents fire in parallel and each produces a list of typed `Finding` objects. Results are shown in a Robot Command Deck, a filterable findings list, and a per-finding fix preview modal. You can then ask follow-up questions either to a single robot or to the whole council simultaneously.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                        │
│                                                                 │
│  DiffInput ──► POST /api/review                                 │
│                                                                 │
│  RobotPersonas ──► POST /api/chat/agent   (1-on-1)              │
│  CouncilConsole ──► POST /api/chat/council (all 3 in parallel)  │
│  FixSuggestionModal ──► POST /api/apply-fix                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / JSON
┌──────────────────────────▼──────────────────────────────────────┐
│                    FastAPI Backend                              │
│                                                                 │
│  /api/review  ──►  Orchestrator                                 │
│                       ├── security_agent   ─┐                  │
│                       ├── performance_agent ─┼──► asyncio.gather│
│                       └── architecture_agent┘                  │
│                                                                 │
│  /api/chat/agent   ──►  chat_agent.run_single_agent_chat()      │
│  /api/chat/council ──►  chat_agent.run_council_chat()           │
│  /api/apply-fix    ──►  fix_generator.generate_fix_preview()    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ OpenAI-compatible HTTP API
              ┌────────────▼───────────────┐
              │  Any LLM endpoint          │
              │  (IBM watsonx, Groq,       │
              │   OpenAI, Ollama, …)       │
              └────────────────────────────┘
```

The backend is a single **FastAPI** application that exposes a small REST API. The frontend is a **Next.js 14** single-page application that talks directly to the backend. Both can run locally on different ports; the frontend defaults to `http://localhost:8000` for the API base URL.

---

## Robot Personas

| Robot | Key | Domain | Specialisations |
|-------|-----|--------|----------------|
| **SecBot 🔒** | `SECURITY` | Application security | SQL/command injection, authentication flaws, secrets exposure, SSRF, XSS, CSRF, privilege escalation, cryptographic weaknesses, path traversal |
| **PerfBot ⚡** | `PERFORMANCE` | Performance & scalability | Algorithmic complexity, DB query optimisation, memory usage, caching strategies, concurrency, throughput |
| **ArchBot 🏛️** | `ARCHITECTURE` | Software architecture | SOLID principles, design patterns, modularity, separation of concerns, dependency management, long-term maintainability |

Each persona has its own **system prompt** (`backend/app/prompts/`) that constrains its scope strictly to its domain. This prevents the robots from second-guessing each other and keeps findings actionable.

---

## Features

### Core Review Pipeline

- **Parallel execution** — `asyncio.gather` fires all three agents simultaneously; a slow or failing agent never blocks the other two (they return `[]` on error).
- **Typed findings** — every finding carries `file`, `line_number`, `severity` (`CRITICAL` / `WARNING` / `INFO`), `category`, `issue`, `suggestion`, and a `patch` (unified-diff snippet).
- **Health score** — computed from `100 − 20×CRITICAL − 10×WARNING − 2×INFO`, floored at 0.
- **Pydantic validation** — every LLM response is validated; malformed items are dropped individually rather than failing the whole review.

### Chat System

- **1-on-1 chat** (`/api/chat/agent`) — ask a specific robot a follow-up question. The robot receives the full diff, its own findings, and the conversation history so answers are grounded and precise.
- **Review Council** (`/api/chat/council`) — broadcast the same question to all three robots simultaneously. Each answers concurrently from its own domain perspective. Results appear as a colour-coded 3-column grid.
- **Per-request LLM overrides** — every chat and review request accepts `api_key`, `base_url`, and `model` overrides so different users can use different backends without restarting the server.

### Fix Preview

- **Before/After panel** — clicking "View fix preview →" on any finding calls `/api/apply-fix`, which parses the LLM-generated unified-diff `patch` and extracts the removed and added lines into a side-by-side view.
- **Unified patch display** — the raw patch is also shown with syntax highlighting (`+` lines green, `-` lines red, `@@` lines blue).
- **Copy buttons** — each panel has a one-click copy button.

### Frontend

- **Dark / light mode toggle** — persisted with `localStorage` via `useTheme`.
- **Robot Command Deck** — 3-column layout with unique SVG robot avatars (SecBot has a shield visor, PerfBot has lightning-bolt eyes, ArchBot has a hexagonal head), status badges, per-persona finding lists, and embedded mini-chat.
- **Council Console** — terminal-style chat window with macOS-style title bar, typing indicators (animated bouncing dots per robot), example prompt suggestions, and a scrollable threaded history.
- **Persona filter** — toggle which persona categories are shown in the flat findings list.
- **Sample loader** — one-click buttons to load any of the pre-built `.patch` files from `sample_data/`.
- **Loading skeleton** — animated pulse placeholders during review.
- **Error banner** — clear HTTP/network error display.

---

## Project Structure

```
multi-persona-code-reviewer/
├── .env.example                    # Copy to .env and fill in credentials
├── sample_data/
│   ├── diff_security_flaw.patch
│   ├── diff_performance_issue.patch
│   ├── diff_architecture_violation.patch
│   └── diff_custom_scenario.patch
│
├── backend/
│   ├── Dockerfile                  # Two-stage Python 3.12 build
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, static files
│       ├── core/
│       │   ├── config.py           # pydantic-settings (reads .env)
│       │   └── schemas.py          # Pydantic models (Finding, ReviewReport, chat schemas)
│       ├── agents/
│       │   ├── _base_agent.py      # Shared LLM call + JSON parsing helper
│       │   ├── orchestrator.py     # asyncio.gather across the three agents
│       │   ├── security_agent.py   # Calls _base_agent with security.txt
│       │   ├── performance_agent.py
│       │   ├── architecture_agent.py
│       │   ├── chat_agent.py       # 1-on-1 and council chat
│       │   └── fix_generator.py    # Parses patch field → FixPreview
│       ├── prompts/
│       │   ├── security.txt
│       │   ├── performance.txt
│       │   └── architecture.txt
│       └── static/
│           └── index.html          # Standalone test UI (no Node.js required)
│
└── frontend/
    ├── package.json                # Next.js 14, React 18, Tailwind CSS 3
    └── src/
        ├── pages/
        │   ├── _app.tsx
        │   └── index.tsx           # Main dashboard page
        ├── components/
        │   ├── DiffInput.tsx       # Textarea + credential overrides + sample loader
        │   ├── ReportSummary.tsx   # Health score ring + issue count badges
        │   ├── RobotPersonas.tsx   # 3-column command deck + mini-chat
        │   ├── CouncilConsole.tsx  # Terminal-style multi-robot chat
        │   ├── PersonaFilter.tsx   # Toggle buttons for filtering findings
        │   ├── FindingCard.tsx     # Individual finding display card
        │   └── FixSuggestionModal.tsx  # Before/after fix preview overlay
        ├── hooks/
        │   └── useTheme.ts         # Dark/light mode with localStorage
        └── styles/
            └── globals.css
```

---

## API Reference

All routes are prefixed with `/api`.

### `GET /api/health`
Liveness probe. Returns `{"status": "ok"}`.

### `GET /api/samples`
Returns a `{filename: content}` map of all `.patch` files in `sample_data/`. Used by the frontend's sample loader.

### `POST /api/review`
Run a full multi-persona code review.

**Request body:**
```json
{
  "diff_text": "<unified diff string>",
  "api_key": "optional-override",
  "base_url": "optional-override",
  "model": "optional-override"
}
```

**Response:** `ReviewReport`
```json
{
  "security": [ /* Finding[] */ ],
  "performance": [ /* Finding[] */ ],
  "architecture": [ /* Finding[] */ ],
  "health_score": 72,
  "total_issues": 5
}
```

**`Finding` schema:**
```json
{
  "file": "src/auth/login.py",
  "line_number": 42,
  "severity": "CRITICAL",
  "category": "SECURITY",
  "issue": "User input passed directly to SQL query without parameterisation.",
  "suggestion": "Use parameterised queries or an ORM to prevent SQL injection.",
  "patch": "--- a/src/auth/login.py\n+++ b/src/auth/login.py\n@@ -42 +42 @@\n-  cursor.execute(f\"SELECT * FROM users WHERE id = {user_id}\")\n+  cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))\n"
}
```

### `POST /api/chat/agent`
1-on-1 follow-up conversation with a single robot persona.

**Request body:**
```json
{
  "persona": "SECURITY",
  "message": "How could an attacker exploit this?",
  "diff_text": "...",
  "findings": [ /* Finding[] — this persona's findings */ ],
  "history": [ /* ChatMessage[] — previous turns */ ],
  "api_key": null,
  "base_url": null,
  "model": null
}
```

**Response:** `{"persona": "SECURITY", "reply": "..."}`

### `POST /api/chat/council`
Broadcast a single question to all three robots simultaneously (via `asyncio.gather`).

**Request body:** same as above but `persona` is omitted; `findings` should include all personas' findings.

**Response:**
```json
{
  "replies": [
    {"persona": "SECURITY", "reply": "..."},
    {"persona": "PERFORMANCE", "reply": "..."},
    {"persona": "ARCHITECTURE", "reply": "..."}
  ]
}
```

### `POST /api/apply-fix`
Parse a finding's `patch` field and return a structured before/after preview.

**Request body:**
```json
{
  "finding": { /* Finding */ },
  "diff_text": "optional original diff for context fallback"
}
```

**Response:** `FixPreview`
```json
{
  "original_code": "...",
  "patched_code": "...",
  "unified_patch": "...",
  "status": "ok"
}
```
`status` is one of `"ok"`, `"patch_unavailable"`, or `"parse_error"`.

---

## Getting Started

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Python | 3.12 |
| Node.js | 18 |
| npm / yarn | any recent |
| An OpenAI-compatible LLM API | — |

### Environment Variables

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
cp .env.example .env
```

```env
# Your LLM API key
LLM_API_KEY=your-api-key-here

# Base URL of the chat-completions endpoint
# Default targets IBM watsonx.ai (us-south)
LLM_BASE_URL=https://us-south.ml.cloud.ibm.com/ml/v1/text/chat

# Model identifier
LLM_MODEL=ibm/granite-3-8b-instruct
```

Common alternatives:

| Provider | `LLM_BASE_URL` | Example `LLM_MODEL` |
|----------|----------------|---------------------|
| IBM watsonx.ai | `https://us-south.ml.cloud.ibm.com/ml/v1/text/chat` | `ibm/granite-3-8b-instruct` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Ollama (local) | `http://localhost:11434/v1` | `llama3` |

> **Per-request overrides:** You can also supply `api_key`, `base_url`, and `model` directly in the UI's "LLM Settings" panel. Per-request values always win over `.env` defaults.

### Backend (FastAPI)

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the development server
uvicorn app.main:app --reload --port 8000
```

The API (and the built-in test UI) will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`.

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

Set `NEXT_PUBLIC_API_URL` if the backend is not running on the default port:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### Docker

A two-stage `Dockerfile` is provided for the backend. It creates a minimal Python 3.12 image running as a non-root user.

```bash
cd backend

docker build -t multi-persona-reviewer-backend .
docker run -p 8000:8000 \
  -e LLM_API_KEY=your-key \
  -e LLM_BASE_URL=https://api.groq.com/openai/v1 \
  -e LLM_MODEL=llama-3.3-70b-versatile \
  multi-persona-reviewer-backend
```

---

## LLM Configuration

The backend uses an **OpenAI-compatible chat-completions endpoint** (`POST /chat/completions`). Any provider that implements this interface works without code changes.

Credential resolution order (first non-empty value wins):

1. Per-request field in the JSON body (`api_key`, `base_url`, `model`)
2. Environment variable / `.env` file (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`)

The review agents use `temperature: 0.0` for deterministic, structured JSON output. The chat agents use `temperature: 0.4` for slightly more natural conversation.

A 60-second timeout is applied to all LLM calls. If a review agent times out it returns an empty findings list; if a chat agent times out it returns a user-visible warning message.

---

## Sample Diffs

The `sample_data/` directory contains ready-made `.patch` files for testing:

| File | What it exercises |
|------|--------------------|
| `diff_security_flaw.patch` | Hardcoded credentials, SQL injection |
| `diff_performance_issue.patch` | N+1 query, O(n²) loop |
| `diff_architecture_violation.patch` | God class, missing abstraction layer |
| `diff_custom_scenario.patch` | Mixed multi-category issues |

Load any of them in the UI via the **Load Sample** button in the diff input panel, or fetch them programmatically from `GET /api/samples`.

---

## Health Score

The overall code health score is displayed as a circular gauge in the `ReportSummary` component. It is calculated by the orchestrator after all three agents have reported:

```
health_score = max(0, 100 − 20 × #CRITICAL − 10 × #WARNING − 2 × #INFO)
```

| Finding type | Deduction |
|-------------|-----------|
| CRITICAL | −20 pts |
| WARNING | −10 pts |
| INFO | −2 pts |

A score of **100** means no findings were produced. The score cannot go below 0.
