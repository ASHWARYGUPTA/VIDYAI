-- MODULE 2: SYLLABUS GRAPH

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name subject_type NOT NULL,
  exam_types exam_type[] NOT NULL DEFAULT '{}',
  display_order integer,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE chapters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_types exam_type[] NOT NULL DEFAULT '{}',
  chapter_number integer,
  total_concepts integer DEFAULT 0,
  weightage_percent numeric(5,2),
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE concepts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  name text NOT NULL,
  description text,
  difficulty_level difficulty_level DEFAULT 'Medium',
  exam_relevance exam_type[] DEFAULT '{}',
  prerequisite_concept_ids uuid[] DEFAULT '{}',
  related_concept_ids uuid[] DEFAULT '{}',
  ncert_reference text,
  tags text[] DEFAULT '{}',
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX concepts_embedding_idx ON concepts
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX concepts_chapter_idx ON concepts(chapter_id);
CREATE INDEX concepts_subject_idx ON concepts(subject_id);
CREATE INDEX chapters_subject_idx ON chapters(subject_id);

-- Updated_at triggers
CREATE TRIGGER subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER concepts_updated_at BEFORE UPDATE ON concepts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
