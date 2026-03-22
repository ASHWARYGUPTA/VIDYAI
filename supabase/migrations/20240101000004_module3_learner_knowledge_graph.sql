-- MODULE 3: LEARNER KNOWLEDGE GRAPH

CREATE TABLE learner_concept_states (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  mastery_state mastery_state DEFAULT 'unseen',
  mastery_score numeric(4,3) DEFAULT 0.0 CHECK (mastery_score >= 0.0 AND mastery_score <= 1.0),
  ease_factor numeric(4,3) DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  interval_days integer DEFAULT 0,
  repetition_count integer DEFAULT 0,
  next_review_date date,
  last_reviewed_at timestamptz,
  total_attempts integer DEFAULT 0,
  correct_attempts integer DEFAULT 0,
  average_response_ms integer,
  -- FSRS parameters
  stability numeric(8,4),
  difficulty_fsrs numeric(4,3),
  retrievability numeric(4,3),
  response_history jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, concept_id)
);

CREATE TABLE learner_chapter_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  concepts_seen integer DEFAULT 0,
  concepts_mastered integer DEFAULT 0,
  completion_percent numeric(5,2) DEFAULT 0,
  last_studied_at timestamptz,
  time_spent_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);

-- RLS
ALTER TABLE learner_concept_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own concept states" ON learner_concept_states
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own chapter progress" ON learner_chapter_progress
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX lcs_user_next_review_idx ON learner_concept_states(user_id, next_review_date)
  WHERE mastery_state != 'mastered';
CREATE INDEX lcs_user_concept_idx ON learner_concept_states(user_id, concept_id);

-- Updated_at
CREATE TRIGGER lcs_updated_at BEFORE UPDATE ON learner_concept_states FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lcp_updated_at BEFORE UPDATE ON learner_chapter_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();
