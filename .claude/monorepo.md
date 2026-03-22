━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — MONOREPO STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

vidyai/
├── apps/
│ ├── web/ # Next.js 14 student portal (Track 1)
│ │ ├── app/
│ │ │ ├── (auth)/ # login, signup, onboarding
│ │ │ ├── (dashboard)/
│ │ │ │ ├── dashboard/ # home with daily plan + streak
│ │ │ │ ├── tutor/ # AI doubt solver chat UI
│ │ │ │ ├── revision/ # today's flashcard deck
│ │ │ │ ├── planner/ # weekly/daily study plan view
│ │ │ │ ├── tests/ # MCQ test interface
│ │ │ │ ├── progress/ # heatmap + analytics
│ │ │ │ └── content/ # YouTube processor
│ │ │ └── api/ # Next.js route handlers (thin proxies only)
│ │ ├── components/
│ │ │ ├── ui/ # shadcn primitives
│ │ │ ├── tutor/ # ChatWindow, VoiceInput, SourceCitation
│ │ │ ├── revision/ # FlashCard, DeckProgress, MasteryBadge
│ │ │ ├── planner/ # DailyPlanCard, WeekCalendar, SubjectSlot
│ │ │ ├── tests/ # QuestionCard, OptionButton, TestTimer
│ │ │ └── analytics/ # HeatmapGrid, SubjectRadar, WeeklyChart
│ │ ├── lib/
│ │ │ ├── supabase/ # client.ts, server.ts, middleware.ts
│ │ │ ├── api/ # typed API client (wraps fetch to FastAPI)
│ │ │ └── stores/ # Zustand stores
│ │ └── public/
│ │
│ └── partner-sdk/ # npm package for B2B partners (Track 2)
│ ├── src/
│ │ ├── client.ts # VidyAIClient class
│ │ ├── tools/ # solvDoubt, scheduleRevision, etc.
│ │ └── types.ts # shared TypeScript types
│ └── package.json
│
├── services/
│ └── api/ # FastAPI backend
│ ├── main.py # app factory, router mounting
│ ├── config.py # pydantic Settings (env vars)
│ ├── dependencies.py # get*db, get_current_user, get_partner
│ ├── routers/
│ │ ├── tutor.py # /api/v1/tutor/*
│ │ ├── retention.py # /api/v1/retention/_
│ │ ├── planner.py # /api/v1/planner/_
│ │ ├── mcq.py # /api/v1/mcq/_
│ │ ├── content.py # /api/v1/content/_
│ │ ├── progress.py # /api/v1/progress/\_
│ │ ├── auth.py # /api/v1/auth/\*
│ │ └── mcp.py # /mcp (FastMCP server)
│ ├── services/
│ │ ├── tutor_service.py # LangChain RAG chain
│ │ ├── retention_service.py # FSRS algorithm, scheduler
│ │ ├── planner_service.py # LangChain agent
│ │ ├── mcq_service.py # test session management
│ │ ├── content_service.py # yt-dlp + Whisper + notes gen
│ │ ├── voice_service.py # Whisper STT + Sarvam TTS
│ │ └── embedding_service.py # OpenAI ada-002 wrapper
│ ├── models/
│ │ ├── database.py # SQLAlchemy ORM models
│ │ └── schemas.py # Pydantic request/response schemas
│ ├── workers/
│ │ ├── celery_app.py # Celery instance + beat schedule
│ │ ├── scheduler_worker.py # nightly revision scheduler
│ │ ├── planner_worker.py # nightly plan rebalancer
│ │ └── video_worker.py # async video processing pipeline
│ └── utils/
│ ├── supabase_client.py # service-role Supabase client
│ ├── hallucination_guard.py# citation enforcer for RAG outputs
│ └── usage_meter.py # partner call counting
│
├── packages/
│ └── shared-types/ # TypeScript types shared across apps
│ └── src/index.ts
│
├── supabase/
│ ├── migrations/ # SQL migration files (sequential)
│ └── seed/ # seed data for dev
│
└── infra/
├── .github/workflows/ # CI/CD pipelines
└── docker-compose.yml # local dev stack
