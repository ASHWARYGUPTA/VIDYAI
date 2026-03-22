-- MODULE 14: KNOWLEDGE BASE
-- Stores uploaded PDFs, books, PYQs, NCERT content with 768-dim Gemini embeddings.
-- Replaces/augments the old ncert_content_chunks (1536-dim, never populated).

-- ── Documents table ────────────────────────────────────────────────────────
CREATE TABLE knowledge_documents (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               text NOT NULL,
  description         text,
  exam_types          exam_type[]  NOT NULL DEFAULT '{}',
  subject             text,
  document_type       text NOT NULL
                        CHECK (document_type IN ('ncert','pyq','reference_book','notes','syllabus','other')),
  year                integer,          -- PYQ year
  class_level         text,             -- 11, 12, dropper, graduate
  file_path           text NOT NULL,    -- Supabase Storage path
  file_name           text NOT NULL,
  file_type           text NOT NULL,    -- pdf | jpg | jpeg | png | webp
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

-- ── Chunks table (768-dim — Gemini text-embedding-004) ────────────────────
CREATE TABLE knowledge_chunks (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index      integer NOT NULL,
  content          text NOT NULL,
  page_number      integer,
  section_heading  text,
  exam_types       exam_type[],
  subject          text,
  document_type    text,
  token_count      integer,
  embedding        vector(768),          -- Gemini text-embedding-004
  created_at       timestamptz DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX knowledge_chunks_doc_idx   ON knowledge_chunks(document_id);
CREATE INDEX knowledge_chunks_exam_idx  ON knowledge_chunks USING GIN(exam_types);
CREATE INDEX knowledge_docs_status_idx  ON knowledge_documents(processing_status);
CREATE INDEX knowledge_docs_type_idx    ON knowledge_documents(document_type);

-- ── RPC: vector similarity search ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding    vector(768),
  match_count        int     DEFAULT 5,
  filter_exam_type   text    DEFAULT NULL,
  filter_subject     text    DEFAULT NULL,
  similarity_threshold float DEFAULT 0.35
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
    AND (filter_exam_type IS NULL OR filter_exam_type = ANY(kc.exam_types::text[]))
    AND (filter_subject   IS NULL OR kc.subject = filter_subject)
    AND 1 - (kc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks    ENABLE ROW LEVEL SECURITY;

-- Service-role (backend) bypasses RLS.
-- Authenticated students can read (needed for RAG lookups).
CREATE POLICY "Authenticated users read knowledge docs"
  ON knowledge_documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read knowledge chunks"
  ON knowledge_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

-- Updated-at trigger
CREATE TRIGGER knowledge_docs_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
