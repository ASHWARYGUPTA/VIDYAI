-- MODULE 11: ANALYTICS

CREATE TABLE daily_activity_heatmap (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  study_minutes integer DEFAULT 0,
  cards_reviewed integer DEFAULT 0,
  questions_attempted integer DEFAULT 0,
  doubts_asked integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  subjects_covered subject_type[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, activity_date)
);

CREATE TABLE weekly_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  overall_score numeric(5,2),
  subject_scores jsonb DEFAULT '{}',
  concepts_mastered integer DEFAULT 0,
  revision_completion_rate numeric(5,2),
  test_accuracy numeric(5,2),
  weak_concepts uuid[] DEFAULT '{}',
  strong_concepts uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, week_start)
);

-- RLS
ALTER TABLE daily_activity_heatmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own heatmap" ON daily_activity_heatmap
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own weekly snapshots" ON weekly_performance_snapshots
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX dah_user_date_idx ON daily_activity_heatmap(user_id, activity_date DESC);
CREATE INDEX wps_user_week_idx ON weekly_performance_snapshots(user_id, week_start DESC);

CREATE TRIGGER dah_updated_at BEFORE UPDATE ON daily_activity_heatmap FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER wps_updated_at BEFORE UPDATE ON weekly_performance_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
