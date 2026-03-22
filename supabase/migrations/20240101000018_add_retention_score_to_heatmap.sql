-- Add avg_retention_score to daily_activity_heatmap
-- Populated by retention_service._update_heatmap() on each card review
ALTER TABLE daily_activity_heatmap
  ADD COLUMN IF NOT EXISTS avg_retention_score NUMERIC(4,3) DEFAULT 0;
