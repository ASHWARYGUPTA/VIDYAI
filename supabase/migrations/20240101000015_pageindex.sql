-- MODULE 15: PAGEINDEX MIGRATION
-- Replace vector RAG (chunks + embeddings) with PageIndex tree-based retrieval.
-- Adds JSONB columns for hierarchical document index and extracted page texts.

-- ── Add PageIndex columns to knowledge_documents ─────────────────────────
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS page_index_tree JSONB,   -- PageIndex hierarchical tree (titles, summaries, page ranges)
  ADD COLUMN IF NOT EXISTS page_texts      JSONB;   -- Array of strings: page_texts[0] = page 1 text, etc.

-- ── Index for JSONB queries on the tree ──────────────────────────────────
CREATE INDEX IF NOT EXISTS knowledge_docs_tree_idx
  ON knowledge_documents USING GIN (page_index_tree jsonb_path_ops);
