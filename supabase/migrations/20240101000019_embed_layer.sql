-- MODULE 19: EMBED LAYER
-- Enables secure browser-side embedding via short-lived tokens.
-- Partner server exchanges API key → embed token (et_*) → passes to browser SDK.

-- Per-partner allowed CORS origins (for embed SDK on partner domains)
ALTER TABLE partner_organizations
  ADD COLUMN IF NOT EXISTS allowed_origins text[] DEFAULT '{}';

-- Short-lived embed sessions created by partner server, consumed by browser SDK
CREATE TABLE embed_sessions (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash    text        UNIQUE NOT NULL,   -- SHA-256 of the raw et_* token
  partner_id    uuid        NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  student_id    text        NOT NULL,           -- external student ID (partner's own ID)
  features      text[]      NOT NULL DEFAULT '{}',
  exam_type     text,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX es_token_hash_idx ON embed_sessions(token_hash);
CREATE INDEX es_expires_idx    ON embed_sessions(expires_at);
CREATE INDEX es_partner_idx    ON embed_sessions(partner_id);

-- Webhook delivery log (Phase D — created now so schema is stable)
CREATE TABLE webhook_deliveries (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id      uuid        NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,   -- e.g. "video.processed", "plan.generated"
  payload         jsonb       NOT NULL DEFAULT '{}',
  target_url      text        NOT NULL,
  signature       text        NOT NULL,   -- X-VidyAI-Signature header value
  status          text        NOT NULL DEFAULT 'pending',  -- pending | delivered | failed
  attempts        integer     NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  delivered_at    timestamptz,
  error_message   text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX wd_partner_idx ON webhook_deliveries(partner_id, created_at DESC);
CREATE INDEX wd_status_idx  ON webhook_deliveries(status) WHERE status IN ('pending', 'failed');
