-- MODULE 5: REVISION SCHEDULER

CREATE TABLE revision_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  priority_score numeric(8,4),
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  session_id uuid REFERENCES study_sessions(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE revision_streaks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_revision_date date,
  total_revision_days integer DEFAULT 0,
  freeze_tokens_remaining integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE revision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own revision queue" ON revision_queue
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own streaks" ON revision_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Critical index for daily revision fetching
CREATE INDEX rq_user_date_pending_idx ON revision_queue(user_id, scheduled_date)
  WHERE is_completed = false;

CREATE TRIGGER rq_updated_at BEFORE UPDATE ON revision_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rs_updated_at BEFORE UPDATE ON revision_streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
