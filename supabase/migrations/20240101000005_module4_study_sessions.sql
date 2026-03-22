-- MODULE 4: STUDY SESSIONS & EVENTS

CREATE TABLE study_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  subject_id uuid REFERENCES subjects(id),
  chapter_id uuid REFERENCES chapters(id),
  concepts_covered uuid[] DEFAULT '{}',
  cards_reviewed integer DEFAULT 0,
  cards_correct integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE concept_interaction_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'quiz_attempt', 'revision', 'doubt_asked')),
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 5),
  response_time_ms integer,
  was_correct boolean,
  hint_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own events" ON concept_interaction_events
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX sessions_user_started_idx ON study_sessions(user_id, started_at DESC);
CREATE INDEX cie_session_idx ON concept_interaction_events(session_id);
CREATE INDEX cie_user_concept_idx ON concept_interaction_events(user_id, concept_id);

CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
