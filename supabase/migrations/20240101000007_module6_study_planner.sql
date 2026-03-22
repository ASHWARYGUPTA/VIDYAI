-- MODULE 6: STUDY PLANNER

CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_type exam_type NOT NULL,
  exam_date date NOT NULL,
  status plan_status DEFAULT 'active',
  total_weeks integer,
  current_week integer DEFAULT 1,
  syllabus_coverage_percent numeric(5,2) DEFAULT 0,
  weak_subjects subject_type[] DEFAULT '{}',
  strong_subjects subject_type[] DEFAULT '{}',
  daily_revision_slots integer DEFAULT 2,
  plan_config jsonb DEFAULT '{}',
  last_rebalanced_at timestamptz,
  rebalance_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE daily_study_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  total_hours numeric(4,2),
  is_completed boolean DEFAULT false,
  completion_percent numeric(5,2) DEFAULT 0,
  -- slots: [{subject, chapter_id, concept_ids[], duration_minutes, type: 'new'|'revision'|'test'}]
  slots jsonb NOT NULL DEFAULT '[]',
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, plan_date)
);

-- RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own study plans" ON study_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own daily plans" ON daily_study_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX dsp_user_date_idx ON daily_study_plans(user_id, plan_date);
CREATE INDEX sp_user_status_idx ON study_plans(user_id, status);

CREATE TRIGGER sp_updated_at BEFORE UPDATE ON study_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER dsp_updated_at BEFORE UPDATE ON daily_study_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
