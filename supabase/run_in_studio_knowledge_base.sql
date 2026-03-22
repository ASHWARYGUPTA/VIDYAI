-- ============================================================
-- Run this in Supabase Studio → SQL Editor if the knowledge
-- base tables don't exist yet (paste and click Run).
-- ============================================================

-- Extensions (safe to re-run)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Documents table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               text NOT NULL,
  description         text,
  exam_types          text[]  NOT NULL DEFAULT '{}',   -- 'JEE','NEET','UPSC'
  subject             text,
  document_type       text NOT NULL
                        CHECK (document_type IN ('ncert','pyq','reference_book','notes','syllabus','other')),
  year                integer,
  class_level         text,
  file_path           text NOT NULL,
  file_name           text NOT NULL,
  file_type           text NOT NULL,
  file_size_bytes     bigint,
  page_count          integer,
  processing_status   text NOT NULL DEFAULT 'pending'
                        CHECK (processing_status IN ('pending','processing','completed','failed')),
  error_message       text,
  chunk_count         integer DEFAULT 0,
  uploaded_by         uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ── Chunks table (768-dim — Gemini text-embedding-004) ──────
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index      integer NOT NULL,
  content          text NOT NULL,
  page_number      integer,
  section_heading  text,
  exam_types       text[],
  subject          text,
  document_type    text,
  token_count      integer,
  embedding        vector(768),
  created_at       timestamptz DEFAULT now()
);

-- ── Indexes (IF NOT EXISTS guards) ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'knowledge_chunks_doc_idx') THEN
    CREATE INDEX knowledge_chunks_doc_idx ON knowledge_chunks(document_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'knowledge_chunks_exam_idx') THEN
    CREATE INDEX knowledge_chunks_exam_idx ON knowledge_chunks USING GIN(exam_types);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'knowledge_docs_status_idx') THEN
    CREATE INDEX knowledge_docs_status_idx ON knowledge_documents(processing_status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'knowledge_docs_type_idx') THEN
    CREATE INDEX knowledge_docs_type_idx ON knowledge_documents(document_type);
  END IF;
END$$;

-- IVFFlat index requires rows to exist first; skip with 0 rows
-- Run this separately after uploading at least 100 chunks:
-- CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── RPC: vector similarity search ───────────────────────────
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding    vector(768),
  match_count        int     DEFAULT 5,
  filter_exam_type   text    DEFAULT NULL,
  filter_subject     text    DEFAULT NULL,
  similarity_threshold float DEFAULT 0.2
)
RETURNS TABLE (
  id               uuid,
  document_id      uuid,
  content          text,
  page_number      integer,
  section_heading  text,
  subject          text,
  document_type    text,
  doc_title        text,
  similarity       float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    kc.page_number,
    kc.section_heading,
    kc.subject,
    kc.document_type,
    kd.title  AS doc_title,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM  knowledge_chunks   kc
  JOIN  knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.processing_status = 'completed'
    AND (filter_exam_type IS NULL OR filter_exam_type = ANY(kc.exam_types))
    AND (filter_subject   IS NULL OR kc.subject ILIKE filter_subject)
    AND 1 - (kc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read knowledge docs"   ON knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users read knowledge chunks" ON knowledge_chunks;

CREATE POLICY "Authenticated users read knowledge docs"
  ON knowledge_documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read knowledge chunks"
  ON knowledge_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── Updated-at trigger ──────────────────────────────────────
-- (update_updated_at function assumed to exist from earlier migrations)
DROP TRIGGER IF EXISTS knowledge_docs_updated_at ON knowledge_documents;
CREATE TRIGGER knowledge_docs_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Supabase Storage bucket ─────────────────────────────────
-- This cannot be done in SQL; the backend creates it on first upload.
-- If you see storage errors, run this in the Supabase dashboard:
--   Storage → New bucket → "knowledge-base" (private)
