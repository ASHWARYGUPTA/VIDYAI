-- Run this in Supabase SQL Editor if the migration doesn't auto-apply.
-- Idempotent — safe to run multiple times.

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS page_index_tree JSONB,
  ADD COLUMN IF NOT EXISTS page_texts      JSONB;

CREATE INDEX IF NOT EXISTS knowledge_docs_tree_idx
  ON knowledge_documents USING GIN (page_index_tree jsonb_path_ops);
