-- PDF-uploaded tests (created from uploaded question papers)
CREATE TABLE IF NOT EXISTS pdf_tests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    source_filename  TEXT,
    question_ids     UUID[] DEFAULT '{}',
    total_questions  INT DEFAULT 0,
    duration_minutes INT DEFAULT 60,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Proctoring violation events logged during a test session
CREATE TABLE IF NOT EXISTS proctor_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,  -- no_face | multiple_faces | tab_switch | fullscreen_exit | window_blur
    severity        TEXT NOT NULL DEFAULT 'warning',  -- warning | critical
    detail          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security
ALTER TABLE pdf_tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can manage pdf_test"
    ON pdf_tests FOR ALL
    USING (created_by = auth.uid());

CREATE POLICY "user can insert own proctor events"
    ON proctor_events FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user can read own proctor events"
    ON proctor_events FOR SELECT
    USING (user_id = auth.uid());

-- auto-updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_pdf_tests_updated_at
    BEFORE UPDATE ON pdf_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
