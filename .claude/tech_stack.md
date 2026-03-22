━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — TECH STACK (CANONICAL, DO NOT SUBSTITUTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FRONTEND
Framework : Next.js 14 (App Router, TypeScript strict mode)
Styling : Tailwind CSS + shadcn/ui component library
State : Zustand (client), TanStack Query v5 (server state)
Charts : Recharts (heatmap, progress, analytics)
Auth client : @supabase/auth-helpers-nextjs
Voice : Web Speech API (STT) + custom TTS audio player
Realtime : Supabase Realtime (live doubt sessions)
PWA : next-pwa (offline flashcard deck, push notifications)
Deployment : Vercel (automatic preview + production deploys)

BACKEND
Framework : FastAPI (Python 3.11, async throughout)
Server : Uvicorn + Gunicorn (4 workers in prod)
AI/LLM : LangChain 0.2 (chains, agents, output parsers)
LLM providers : Anthropic Claude 3.5 Sonnet (primary), OpenAI GPT-4o (fallback)
Embeddings : OpenAI text-embedding-ada-002 (1536 dimensions)
Voice STT : OpenAI Whisper API
Voice TTS : Sarvam AI (Hindi/Hinglish), OpenAI TTS (English)
Task queue : Celery 5 + Redis (async workers for video processing, nightly scheduler)
MCP server : FastMCP (Python) — mounted as FastAPI router at /mcp
Deployment : Railway (FastAPI + Celery worker as separate services)

DATABASE & STORAGE
Primary DB : Supabase (PostgreSQL 15)
Vector store : pgvector extension on Supabase (same DB, no separate service)
Cache/Queue : Redis (Upstash managed — also used as Celery broker)
File storage : Supabase Storage (thumbnails, audio) + AWS S3 (video transcripts,
dubbed audio, large processed outputs)
Search : pg_trgm extension for full-text question search

AUTH & BILLING
Authentication: Supabase Auth (JWT, magic link, Google OAuth)
B2C billing : Razorpay (INR subscriptions, UPI support)
B2B billing : Stripe (USD, partner API metering)
API auth : Bearer token (JWT for B2C), API key hash (B2B partners)

OBSERVABILITY
Error tracking: Sentry (both frontend and backend)
APM : Datadog (backend latency, Celery queue depth)
Logging : Structured JSON logs via Python logging → Datadog
CI/CD : GitHub Actions → Vercel (frontend) + Railway (backend)
