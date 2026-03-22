-- Video transcript PageIndex columns
-- Stores a PageIndex-style tree (one node per structured-note section)
-- and the corresponding page_texts array in processed_videos.
-- Idempotent — safe to run multiple times.

ALTER TABLE processed_videos
  ADD COLUMN IF NOT EXISTS page_index_tree JSONB,
  ADD COLUMN IF NOT EXISTS page_texts      JSONB;

CREATE INDEX IF NOT EXISTS processed_videos_tree_idx
  ON processed_videos USING GIN (page_index_tree jsonb_path_ops);
