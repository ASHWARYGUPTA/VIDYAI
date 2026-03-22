-- MODULE 7: MCQ / PYQ ENGINE

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  chapter_id uuid NOT NULL REFERENCES chapters(id),
  concept_ids uuid[] DEFAULT '{}',
  exam_type exam_type NOT NULL,
  exam_year integer,
  exam_paper text,
  question_text text NOT NULL,
  question_text_hindi text,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation text,
  explanation_hindi text,
  difficulty_level difficulty_level,
  is_pyq boolean DEFAULT false,
  marks_positive numeric(4,2) DEFAULT 4,
  marks_negative numeric(4,2) DEFAULT 1,
  embedding vector(1536),
  tags text[] DEFAULT '{}',
  source text,
  verified boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE test_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  exam_type exam_type NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  chapter_id uuid REFERENCES chapters(id),
  question_ids uuid[] NOT NULL,
  total_questions integer,
  duration_minutes integer DEFAULT 60,
  started_at timestamptz,
  submitted_at timestamptz,
  score numeric(6,2),
  max_score numeric(6,2),
  percentile numeric(5,2),
  time_per_question jsonb DEFAULT '{}',
  is_adaptive boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE test_answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_session_id uuid NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_option text CHECK (selected_option IN ('A', 'B', 'C', 'D', 'skipped')),
  is_correct boolean,
  marks_awarded numeric(4,2),
  time_spent_ms integer,
  was_reviewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own test sessions" ON test_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own test answers" ON test_answers
  FOR ALL USING (auth.uid() = user_id);

-- Questions are public (readable by all authenticated users)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read questions" ON questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX questions_embedding_idx ON questions
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX questions_exam_subject_idx ON questions(exam_type, subject_id);
CREATE INDEX questions_pyq_idx ON questions(exam_type, exam_year) WHERE is_pyq = true;
CREATE INDEX questions_text_trgm_idx ON questions USING gin(question_text gin_trgm_ops);
CREATE INDEX ts_user_idx ON test_sessions(user_id, started_at DESC);

CREATE TRIGGER questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER test_sessions_updated_at BEFORE UPDATE ON test_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
