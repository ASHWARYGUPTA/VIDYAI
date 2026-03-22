━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — CODING CONVENTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PYTHON (FastAPI):

- All route handlers are async def
- All DB operations use Supabase Python client (supabase-py), not raw psycopg2
- Pydantic v2 for all request/response models
- Raise HTTPException with detail as dict: { "error": "...", "code": "..." }
- All service functions accept user_id: uuid.UUID as first parameter
- Log every LLM call: model, tokens_used, latency_ms, endpoint, user_id
- Never log question content or student PII at DEBUG level

TYPESCRIPT (Next.js):

- Use server components by default; add "use client" only when needed
- All API calls go through lib/api/ typed client, never raw fetch in components
- Error boundaries around every feature section
- Loading states on all async data fetches
- All dates displayed in IST using Intl.DateTimeFormat

GENERAL:

- Every feature must degrade gracefully if the LLM is unavailable
- All PYQ question text must be returned exactly as in the source
- FSRS parameters must be updated atomically per review
- Partner API key must NEVER appear in logs, even partially
- Rate limits enforced at FastAPI middleware level, not in route handlers
