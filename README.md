# VidyAI — "Nothing Forgotten. Everything Mastered."

> AI-powered cognitive companion for Indian competitive exam aspirants (JEE / NEET / UPSC). Combines a spaced-repetition retention engine, RAG-grounded doubt solver, adaptive test suite, and a Model Context Protocol (MCP) API that lets edtech partners embed every feature into their own LLM agents.

---

## Demo Accounts

| Account | Email | Password |
|---------|-------|----------|
| Demo user (pre-seeded data) | `demo@vidyai.in` | `demo1234` |
| Test user (seeded data) | `testuser@vidyai.dev` | `test1234` |

---

## Table of Contents

- [Product Overview](#product-overview)
- [Architecture](#architecture)
- [Feature Breakdown](#feature-breakdown)
- [MCP B2B API](#mcp-b2b-api)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)

---

## Product Overview

VidyAI operates on **two business tracks** from a single shared FastAPI backend:

| Track | URL | Users | Billing |
|-------|-----|-------|---------|
| **B2C Student Portal** | vidyai.in | JEE/NEET/UPSC students (16–28) | Razorpay · Free (10 doubts/day) + Pro |
| **B2B MCP API** | api.vidyai.in/mcp | EdTech partners (PhysicsWallah, Unacademy, Udemy India) | Stripe · Starter (50k calls/mo) + Enterprise |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  Next.js 14 Web App (PWA)  │  Partner SDK  │  Mobile (PWA/RN)  │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTPS
┌────────────────▼────────────────────────────────────────────────┐
│                         GATEWAY LAYER                           │
│          FastAPI + Nginx   │   MCP Server (HTTP + SSE)          │
│          Rate-limiting     │   JSON-RPC 2.0 · /mcp endpoint     │
│          Partner key auth  │   FastMCP (Python)                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                      FEATURE MICROSERVICES                      │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────┐ ┌─────────┐ │
│  │ AI Tutor │ │ Retention │ │ Planner  │ │ MCQ  │ │ Content │ │
│  │ RAG+voice│ │ FSRS algo │ │ LangChain│ │  PYQ │ │   YT→   │ │
│  │          │ │ KG update │ │  agent   │ │      │ │  notes  │ │
│  └──────────┘ └───────────┘ └──────────┘ └──────┘ └─────────┘ │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                        AI / LLM LAYER                           │
│  LangChain Orchestrator (chains / agents / tools)               │
│  Primary: Claude 3.5 Sonnet  │  Fallback: GPT-4o                │
│  Voice/STT/TTS: Whisper + Sarvam AI                             │
│  Embeddings: text-embedding-ada-002 (1536-dim)                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                          DATA LAYER                             │
│  Supabase (Postgres 15)  │  pgvector (NCERT embeddings)         │
│  Redis / Upstash (cache + revision queue)                       │
│  S3 / Supabase Storage (video assets, PDFs)                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                       ASYNC WORKERS                             │
│  Celery 5 + RabbitMQ                                            │
│  · Nightly FSRS scheduler + plan rebalancer                     │
│  · Video pipeline: yt-dlp → Whisper → GPT notes                 │
│  · Notification worker: FCM / email / SMS                       │
└─────────────────────────────────────────────────────────────────┘

                      OBSERVABILITY & CI/CD
           Sentry + Datadog  │  GitHub Actions  │  Vercel + Railway
```

### Data Flow — Student Doubt Solve

```
Student types doubt
      │
      ▼
Next.js → FastAPI /api/v1/tutor/solve
      │
      ▼
Embed doubt → pgvector similarity search (NCERT chunks)
      │
      ▼
Top-k context chunks injected into LangChain chain
      │
      ▼
Claude 3.5 Sonnet generates grounded answer
      │
      ▼
Response + sources returned → UI renders with citations
      │
      ▼
Session logged → knowledge graph updated → FSRS card created
```

### Data Flow — MCP Partner Call

```
Partner LLM Agent → POST /mcp  (JSON-RPC 2.0)
      │
      ▼
Middleware: SHA-256 API key validation + rate-limit check
      │
      ▼
FastMCP routes to tool handler (e.g. solve_doubt)
      │
      ▼
External student ID → VidyAI UUID (partner_student_mappings)
      │
      ▼
Delegates to same internal service as B2C path
      │
      ▼
Response returned + usage recorded (partner_api_usage table)
```

---

## Feature Breakdown

### F1 — AI Tutor (RAG Doubt Solver)
- **RAG pipeline:** NCERT PDFs chunked, embedded with `text-embedding-ada-002`, stored in pgvector
- **LLM chain:** LangChain `RetrievalQA` with Claude 3.5 Sonnet as the generator
- **Voice layer:** Whisper STT for voice input + Sarvam AI TTS for Hindi/Hinglish responses
- **Grounding:** Every answer includes source citations (chapter, page)

### F2 — Retention Engine
- **Algorithm:** FSRS (Free Spaced Repetition Scheduler) — state-of-the-art forgetting-curve model
- **Knowledge graph:** Neo4j/Supabase graph tracking per-concept mastery per student
- **Revision queue:** Redis sorted set, daily due cards surfaced at login
- **Nightly job:** Celery worker reschedules all due cards across all users

### F3 — Study Planner
- **LangChain agent:** Reads syllabus graph + student mastery + exam date → generates daily plan
- **Auto-rebalancer:** Nightly Celery task adjusts plan if student is behind/ahead
- **Output format:** Structured JSON → rendered as interactive timeline in UI

### F4 — MCQ / PYQ Tests
- **Question bank:** JEE (2008–2024), NEET (2015–2024), UPSC prelims scraped + curated
- **Adaptive engine:** Post-test, mastery scores updated per concept; weak areas resurface
- **PDF tests:** `pdf_test_service.py` parses uploaded test PDFs into question structs
- **Proctoring:** `utils/proctoring.py` (tab-focus events, session integrity checks)

### F5 — Content Processor
- **Pipeline:** `yt-dlp` downloads → `youtube-transcript-api` extracts captions → LLM generates structured notes
- **Output:** Chapter-wise notes, key formulae, summary — stored and linked to syllabus concepts
- **Async:** Video jobs enqueued to Celery, status polled via `/api/v1/content/status/{job_id}`

---

## MCP B2B API

VidyAI exposes all five features as MCP (Model Context Protocol) tools so partner LLM agents (e.g., a PhysicsWallah AI assistant) can call them directly over JSON-RPC 2.0.

**Endpoint:** `POST /mcp` (HTTP + SSE, JSON-RPC 2.0)
**Auth:** `Authorization: Bearer vida_live_<key>` or short-lived embed token `et_<token>`

### Tools

| Tool | Description | Key Params |
|------|-------------|------------|
| `solve_doubt` | RAG-grounded answer from NCERT | `question`, `subject`, `student_id` |
| `get_revision_deck` | FSRS-scheduled flashcards due today | `student_id`, `limit` |
| `submit_revision_result` | Update FSRS state after review | `student_id`, `card_id`, `rating` |
| `get_study_plan` | Daily study plan for student | `student_id`, `target_date` |
| `run_mcq_test` | Fetch MCQ/PYQ questions | `exam`, `subject`, `count` |
| `submit_mcq_answers` | Grade answers + update knowledge graph | `student_id`, `session_id`, `answers` |
| `process_video` | Enqueue YouTube video for notes extraction | `url`, `student_id` |
| `get_video_status` | Poll async video processing job | `job_id` |

### Resources

| Resource URI | Description |
|-------------|-------------|
| `vidyai://syllabus/{exam_type}` | Full subject → chapter → concept tree |
| `vidyai://student/{student_id}/profile` | Mastery summary + streak + scores |
| `vidyai://student/{student_id}/knowledge-graph` | Per-concept mastery states |

### Prompts

| Prompt | Description |
|--------|-------------|
| `explain_concept` | System prompt for structured concept explanation |
| `motivate_student` | Personalized motivational prompt based on student profile |

### Partner Auth Tiers

| Token Type | Format | TTL | Use case |
|-----------|--------|-----|----------|
| Permanent API key | `vida_live_*` | Never | Server-to-server backend calls |
| Embed token | `et_*` | 60 min | Browser-safe, per-session |
| Supabase JWT | `eyJ...` | 1 hour | Partner portal admin |

### Usage Metering

Every tool call is logged to `partner_api_usage` with: `partner_id`, `tool_name`, `latency_ms`, `tokens_used`, `status_code`. Monthly limits enforced at middleware level (429 when exceeded).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Radix UI |
| **State** | Zustand (client state) + TanStack Query v5 (server state) |
| **Backend** | FastAPI (Python 3.12), async, Pydantic v2 |
| **Database** | Supabase (Postgres 15) + pgvector + pg_trgm |
| **Auth** | Supabase Auth (JWT + magic link + Google OAuth) + NextAuth v5 |
| **LLM Orchestration** | LangChain ≥ 0.3, LangGraph |
| **LLM Providers** | Claude 3.5 Sonnet (primary), GPT-4o (fallback) |
| **Voice** | OpenAI Whisper (STT) + Sarvam AI (Hindi TTS) |
| **Embeddings** | text-embedding-ada-002 (1536-dim), pgvector ANN search |
| **MCP Server** | FastMCP 3.1.1 + mcp 1.26.0, JSON-RPC 2.0, HTTP + SSE |
| **Cache / Queue** | Redis (Upstash) + Celery 5 + RabbitMQ |
| **Video pipeline** | yt-dlp + youtube-transcript-api |
| **B2C Billing** | Razorpay |
| **B2B Billing** | Stripe (per-call metering) |
| **Deployment** | Vercel (frontend) + Railway (backend) |
| **Observability** | Sentry + Datadog |
| **CI/CD** | GitHub Actions |

---

## Project Structure

```
VIDYAI/
├── apps/
│   ├── web/                        # Next.js 14 B2C student portal
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, signup, onboarding
│   │   │   ├── (dashboard)/        # Tutor, revision, planner, tests, progress
│   │   │   ├── admin/              # Knowledge base management
│   │   │   └── api/                # NextAuth route handlers
│   │   ├── components/ui/          # shadcn/ui components
│   │   ├── lib/api/                # Typed API client (never raw fetch)
│   │   └── types/                  # TypeScript types incl. next-auth.d.ts
│   └── partner/                    # Partner admin portal (Next.js)
│
├── packages/
│   └── embed-sdk/                  # Browser SDK for partner embedding
│
├── services/
│   └── api/                        # FastAPI backend
│       ├── main.py                 # App factory, router registration
│       ├── config.py               # Settings (Pydantic BaseSettings)
│       ├── middleware.py           # CORS, rate-limit, partner key validation
│       ├── dependencies.py         # User auth (Supabase JWT)
│       ├── dependencies_partner.py # Partner auth (3 token types)
│       ├── routers/
│       │   ├── mcp.py              # MCP server (FastMCP, 8 tools, 3 resources)
│       │   ├── tutor.py            # AI Tutor endpoints
│       │   ├── retention.py        # FSRS revision endpoints
│       │   ├── planner.py          # Study planner endpoints
│       │   ├── mcq.py              # MCQ/PYQ test endpoints
│       │   ├── content.py          # Content processor endpoints
│       │   └── partner.py          # Partner admin (key mgmt, usage analytics)
│       ├── services/               # Business logic (one file per feature)
│       └── utils/
│           ├── llm.py              # LLM provider setup
│           ├── supabase_client.py  # Supabase service-role client
│           └── usage_meter.py      # Per-call MCP metering
│
├── supabase/
│   ├── migrations/                 # 13+ migration files
│   └── seed.sql                    # Development seed data
│
└── infra/
    └── docker-compose.yml          # Local dev environment
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12
- Docker & Docker Compose (for local Supabase + Redis)

### Local Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/vidyai.git
cd vidyai
cp .env.example .env   # Fill in required values

# 2. Start infrastructure
docker-compose -f infra/docker-compose.yml up -d

# 3. Frontend
cd apps/web
npm install
npm run dev            # http://localhost:3000

# 4. Backend
cd services/api
pip install -r requirements.txt
cd ../..
python -m uvicorn api.main:app --app-dir services --reload --port 8000


# 5. Run migrations
cd supabase
npm install -g supabase
supabase db push
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Voice
SARVAM_API_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Billing
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_SECRET_KEY=

# Cache
REDIS_URL=

# Observability
SENTRY_DSN=
```

---

## API Reference

Base URL: `https://api.vidyai.in`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/tutor/solve` | Submit a doubt question |
| GET | `/api/v1/retention/deck` | Get today's revision cards |
| POST | `/api/v1/retention/review` | Submit card review rating |
| GET | `/api/v1/planner/today` | Get today's study plan |
| GET | `/api/v1/mcq/questions` | Fetch MCQ/PYQ questions |
| POST | `/api/v1/mcq/submit` | Submit test answers |
| POST | `/api/v1/content/process` | Enqueue video for processing |
| GET | `/api/v1/content/status/{job_id}` | Poll video processing status |
| POST | `/mcp` | MCP JSON-RPC 2.0 endpoint (partner) |
| GET | `/api/v1/partner/usage` | Partner usage analytics |

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend (`apps/web`) | Vercel | Auto-deploy on push to `main` |
| Backend (`services/api`) | Railway | Dockerfile in `services/api/` |
| Database | Supabase | Managed Postgres + pgvector |
| Cache | Upstash Redis | Serverless Redis |
| Workers | Railway (separate service) | Celery workers |

CI/CD via GitHub Actions: lint → test → build → deploy on every PR merge.
