-- MODULE 8: AI TUTOR

CREATE TABLE doubt_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_language text DEFAULT 'en',
  question_audio_url text,
  subject_id uuid REFERENCES subjects(id),
  chapter_id uuid REFERENCES chapters(id),
  related_concept_ids uuid[] DEFAULT '{}',
  answer_text text,
  answer_language text DEFAULT 'en',
  answer_audio_url text,
  -- sources: [{title, chapter, page, excerpt}]
  sources jsonb DEFAULT '[]',
  rag_chunks_used integer,
  llm_model text,
  tokens_used integer,
  latency_ms integer,
  was_helpful boolean,
  follow_up_count integer DEFAULT 0,
  parent_doubt_id uuid REFERENCES doubt_sessions(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE ncert_content_chunks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  chapter_id uuid NOT NULL REFERENCES chapters(id),
  source_title text NOT NULL,
  source_page integer,
  chunk_index integer,
  content text NOT NULL,
  content_hindi text,
  embedding vector(1536) NOT NULL,
  token_count integer,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE doubt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncert_content_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own doubt sessions" ON doubt_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read NCERT chunks" ON ncert_content_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes — IVFFlat for vector similarity search
CREATE INDEX ncert_embedding_idx ON ncert_content_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ncert_chapter_idx ON ncert_content_chunks(chapter_id);
CREATE INDEX ds_user_idx ON doubt_sessions(user_id, created_at DESC);
CREATE INDEX ds_parent_idx ON doubt_sessions(parent_doubt_id) WHERE parent_doubt_id IS NOT NULL;

CREATE TRIGGER ds_updated_at BEFORE UPDATE ON doubt_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
