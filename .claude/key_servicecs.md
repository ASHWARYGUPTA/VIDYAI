━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — KEY SERVICE CONTRACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FSRS ALGORITHM (retention_service.py)
Parameters per concept per student: S (stability), D (difficulty), R (retrievability)
Forgetting curve : R(t) = exp(-t / S)
Review outcome : pass (q >= 3) updates S and D via FSRS-4.5 equations
fail (q < 3) resets stability to initial value
Scheduling rule : next_review = today + round(S \* ln(target_R) / ln(R_0))
where target_R = 0.9 (90% desired retention)
nightly Celery job: runs at 00:30 IST, computes next_review_date for all active
learner_concept_states, upserts revision_queue

LANGCHAIN RAG CHAIN (tutor_service.py)
Retriever : SupabaseVectorStore with pgvector, k=5, cosine similarity
System prompt template includes: {context_chunks} + {student_name} + {language}
Hallucination guard: output parser checks sources[] is non-empty;
if empty → refuse with "source not found" message
Streaming : use LangChain streaming callbacks → Server-Sent Events to frontend
Citation format: every sentence that uses a source must reference [{source_index}]

LANGCHAIN STUDY PLANNER AGENT (planner_service.py)
Agent type : ReAct agent with structured tool outputs
Tools available to agent: - get_weak_concepts(user_id) → ConceptGap[] - get_syllabus_coverage(user_id) → CoverageMap - get_upcoming_revisions(user_id, days=14) → RevisionLoad - get_historical_performance(user_id) → SubjectScore[] - get_exam_weightage(exam_type) → WeightageMap
Agent output: JSON matching DailyStudyPlan.slots schema
Rebalance triggers (nightly Celery job at 01:00 IST): - Today's plan was < 50% completed - Exam date changed - 3+ consecutive weak test scores in a subject - Forgotten cards > 20% of knowledge graph

CELERY BEAT SCHEDULE (celery_app.py)
nightly-scheduler : 00:30 IST daily → scheduler_worker.run_revision_scheduler()
nightly-rebalancer : 01:00 IST daily → planner_worker.rebalance_all_active_plans()
heatmap-rollup : 23:55 IST daily → analytics_worker.rollup_daily_heatmap()
weekly-snapshot : Sunday 02:00 IST → analytics_worker.generate_weekly_snapshots()
partner-usage-reset: 1st of month 00:00 → usage_meter.reset_monthly_counts()

VIDEO PROCESSING PIPELINE (video_worker.py, Celery task)
Step 1: yt-dlp → download audio track (mp3, max 2hr)
Step 2: Whisper API → transcript with timestamps
Step 3: GPT-4o → structured notes JSON
prompt: "Given this educational video transcript, extract: 1. Structured notes with headings and bullet points 2. Key concepts as a list (match to syllabus if possible) 3. A 200-word summary
Output valid JSON only."
Step 4: Tag concepts → match summary nouns against concepts.name using pg_trgm
Step 5: If generate_dub=true → Sarvam AI TTS on translated summary → S3 upload
Step 6: Update processed_videos.processing_status = 'completed'
