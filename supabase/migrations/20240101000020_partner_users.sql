-- MODULE 20: PARTNER PORTAL USERS
-- Links Supabase auth users to partner organizations so partners can
-- log into the Partner Portal with email/password instead of API keys.

CREATE TABLE IF NOT EXISTS partner_users (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id    uuid        NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  role          text        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_id)
);

CREATE INDEX idx_partner_users_user_id    ON partner_users(user_id);
CREATE INDEX idx_partner_users_partner_id ON partner_users(partner_id);

-- webhook_url on partner_organizations (used by settings page)
ALTER TABLE partner_organizations
  ADD COLUMN IF NOT EXISTS webhook_url text;
