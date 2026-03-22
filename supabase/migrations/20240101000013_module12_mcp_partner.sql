-- MODULE 12: MCP / PARTNER LAYER

CREATE TABLE partner_organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  website text,
  contact_email text NOT NULL,
  tier partner_tier DEFAULT 'starter',
  monthly_call_limit integer DEFAULT 50000,
  calls_used_this_month integer DEFAULT 0,
  billing_cycle_start date,
  stripe_customer_id text,
  is_active boolean DEFAULT true,
  allowed_features text[] DEFAULT ARRAY['tutor','retention','planner','mcq','content'],
  webhook_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE partner_api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id uuid NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  name text,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  total_calls integer DEFAULT 0,
  expires_at timestamptz,
  scopes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE partner_api_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id uuid NOT NULL REFERENCES partner_organizations(id),
  api_key_id uuid NOT NULL REFERENCES partner_api_keys(id),
  tool_name text NOT NULL,
  called_at timestamptz DEFAULT now(),
  latency_ms integer,
  tokens_used integer,
  status_code integer,
  error_message text,
  request_metadata jsonb DEFAULT '{}'
);

CREATE TABLE partner_student_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id uuid NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  external_student_id text NOT NULL,
  vidyai_user_id uuid REFERENCES profiles(id),
  exam_type exam_type,
  created_at timestamptz DEFAULT now(),
  UNIQUE (partner_id, external_student_id)
);

-- No RLS on partner tables — accessed via service role only
-- Indexes
CREATE INDEX pau_partner_called_idx ON partner_api_usage(partner_id, called_at DESC);
CREATE INDEX pak_partner_active_idx ON partner_api_keys(partner_id) WHERE is_active = true;
CREATE INDEX psm_partner_idx ON partner_student_mappings(partner_id);

CREATE TRIGGER po_updated_at BEFORE UPDATE ON partner_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pak_updated_at BEFORE UPDATE ON partner_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at();
