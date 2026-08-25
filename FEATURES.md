# VidyAI - Comprehensive Feature List

This document outlines all the major features, modules, and capabilities of the VidyAI platform, based on the backend architecture and frontend applications.

## 1. Authentication & Security (Core)
*   **NextAuth Integration:** Secure authentication handling for users and admins.
*   **Supabase Identity:** JWT-based session management across the Next.js frontend and FastAPI backend.
*   **Role-Based Access Control (RBAC):** Dedicated permissions for `student`, `admin`, and `partner` roles. Database-level row security (RLS) policies.
*   **Dynamic Admin Whitelisting:** Automatic syncing of admin emails from `.env` to the database on server startup.

## 2. Admin Knowledge Base & RAG Pipeline
*   **Document Uploads:** Support for PDFs and Images (NCERT, PYQ, Reference Books, Notes, Syllabus).
*   **Background Processing Engine:** Celery/Redis queue for asynchronous extraction of document contents without blocking the UI.
*   **PageIndex Extraction:** AI-driven document chunking and metadata extraction (using Gemini/Vision models) to build searchable trees.
*   **Vector Search & Embeddings:** RAG (Retrieval-Augmented Generation) pipeline for accurately querying study materials.
*   **Admin Dashboard:** Secure interface for uploading, processing, listing, and deleting source documents.

## 3. Syllabus & Learner Knowledge Graph
*   **Syllabus Tracking:** Structured tracking of subjects, chapters, and topics for various exams (e.g., JEE, NEET).
*   **Learner Knowledge Graph:** Maps the individual student's mastery over specific topics over time.
*   **Retention Scoring (Heatmap):** Spaced repetition algorithms that calculate a "retention score" to visually display memory decay.
*   **Progress Analytics:** Dashboards tracking daily study time, topics covered, and overall completion percentages.

## 4. Study Planner & Scheduling
*   **Dynamic Study Sessions:** Creation of individual study blocks with targeted topics.
*   **Revision Scheduler:** Automated recommendations on what to revise today based on the learner's retention scores (spaced repetition).
*   **Daily Study Planner:** Automatically curates a personalized daily checklist for students.

## 5. Assessments & Testing
*   **MCQ Engine:** Generation, serving, and evaluation of Multiple Choice Questions (including PYQs).
*   **PDF Tests:** Ability to generate and take simulated tests from PDF materials.
*   **Performance Tracking:** Accuracy metrics, time taken, and topic-wise strengths/weaknesses derived from test results.

## 6. AI Tutor 
*   **Interactive Chat:** AI-powered chatbot capable of answering student doubts using the indexed knowledge base.
*   **Context-Aware Responses:** RAG implementation ensures the tutor answers strictly based on the provided reference books and NCERTs, reducing hallucinations.
*   **Multi-Model Fallback:** Configured to gracefully switch to backup LLMs (Llama 3, Gemma) if the primary API (OpenRouter/Gemini) rate limits or fails.

## 7. Content Processing
*   **Vision Extraction:** Uses models like `xiaomi/mimo-v2-omni` for extracting text and context from image-heavy PDFs.
*   **YouTube Integration:** Fetches and processes YouTube transcripts (bypassing restrictions via proxies/cookies) to summarize educational videos.

## 8. Partner Portal (MCP)
*   **B2B Dashboard:** Dedicated Next.js app (`apps/partner`) running on port 3001 for institutional partners.
*   **Student Monitoring:** Partners can view analytics and knowledge graphs of their onboarded students.
*   **Partner Onboarding:** Workflows for registering organizational slugs and managing API keys.

## 9. Notifications & System Architecture
*   **Notifications Engine:** Alerts for upcoming revisions, newly generated study plans, and processed documents.
*   **Message Broker System:** RabbitMQ / Redis for reliable internal service communication.
*   **Production Ready:** Support for Docker, AWS S3 storage, Razorpay/Stripe billing endpoints, and Datadog/Sentry observability.
