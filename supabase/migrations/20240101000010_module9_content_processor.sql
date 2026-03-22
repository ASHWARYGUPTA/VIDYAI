-- MODULE 9: CONTENT PROCESSOR

CREATE TABLE processed_videos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  youtube_url text NOT NULL,
  youtube_video_id text NOT NULL,
  title text,
  channel text,
  duration_seconds integer,
  language_detected text,
  transcript_raw text,
  transcript_hindi text,
  -- structured_notes: [{heading, content, concepts_tagged: uuid[], timestamp_seconds}]
  structured_notes jsonb DEFAULT '[]',
  summary text,
  key_concepts uuid[] DEFAULT '{}',
  audio_dubbed_url text,
  thumbnail_url text,
  processing_status content_status DEFAULT 'pending',
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  error_message text,
  job_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE processed_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own processed videos" ON processed_videos
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX pv_user_idx ON processed_videos(user_id, created_at DESC);
CREATE INDEX pv_status_idx ON processed_videos(processing_status) WHERE processing_status IN ('pending', 'processing');
CREATE INDEX pv_job_idx ON processed_videos(job_id) WHERE job_id IS NOT NULL;

CREATE TRIGGER pv_updated_at BEFORE UPDATE ON processed_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
