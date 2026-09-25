# Multi-Persona Architectural Code Reviewer

Built for the **IBM Bob 2.0 Hackathon** (Lablab.ai, Sept 25–27, 2026).

Paste a unified Git diff and get it reviewed concurrently by three specialized AI
personas — **Security**, **Performance**, and **Architecture** — synthesized into a
single dashboard with a code-health score and one-click "Apply AI Suggestion" patch
previews.

## Architecture

```
[ User pastes a Git diff ]
            │
            ▼
[ POST /api/review (FastAPI) ]
            │
            ▼
[ Orchestrator ] ── asyncio.gather (parallel) ──┬─ Security Agent
                                                 ├─ Performance Agent
                                                 └─ Architecture Agent
            │
            ▼
[ Synthesis: dedupe findings, compute health score ]
            │
            ▼
[ Next.js dashboard: health score · filterable finding cards · fix-preview modal ]
```

Each agent calls an OpenAI-compatible chat-completions endpoint (currently Gemini's
compatibility layer; swappable to IBM watsonx or any other OpenAI-shaped provider via
env vars — see below) with a strict system prompt that forces JSON-only output
matching the `Finding` schema in `backend/app/core/schemas.py`. A failing agent
degrades to an empty result instead of crashing the whole review.

## Project structure

```
backend/    FastAPI service — orchestrator, 3 persona agents, prompts, schemas
frontend/   Next.js dashboard — diff input, filters, finding cards, fix modal
sample_data/  3 synthetic demo diffs (security / performance / architecture)
bob_sessions/ Required evidence: Bob IDE task session summary screenshots (PNG)
```

## Running it locally

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

Copy `.env.example` to `.env` **at the repo root** (not inside `backend/`) and fill in
your key:

```bash
cp .env.example .env
```

```
LLM_API_KEY=<your key>
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
LLM_MODEL=gemini-2.5-flash
```

Get a free Gemini key at https://aistudio.google.com/apikey. To point at IBM watsonx
or another OpenAI-compatible provider instead, swap the three values — no code changes
needed, the client speaks the standard `{model, messages}` chat-completions shape.

Run the server (from `backend/`):

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000, paste a diff (or click one of the three sample-diff
buttons), and click **Run Review**.

## Known tradeoffs (documented, not accidental)

- **`npm audit` shows one residual advisory** (a `postcss` path-traversal issue bundled
  inside Next.js 14's own build tooling — dev/build-time only, not a runtime exposure).
  Fully resolving it requires Next.js 16, a breaking major-version jump not worth the
  risk this close to the deadline. Pinned to the latest patched 14.x (`14.2.35`)
  instead.
- **"Apply AI Suggestion" is a client-side diff preview**, not a server-side patch
  applier — there's no `/api/apply-fix` endpoint. Each finding already carries a
  ready-to-use unified-diff `patch` field from the LLM; the modal just renders it.

## Hackathon compliance

- **Bob IDE evidence**: `bob_sessions/` holds PNG screenshots of every Bob IDE task
  session summary, named `<team>_task<NN>_<description>_summary.png`.
- **Data compliance**: `sample_data/*.patch` are hand-authored synthetic diffs — no
  real, scraped, or client code.
