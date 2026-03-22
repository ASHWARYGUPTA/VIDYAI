-- MODULE 10: NOTIFICATIONS

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  revision_reminders boolean DEFAULT true,
  revision_time time DEFAULT '08:00',
  test_reminders boolean DEFAULT true,
  streak_alerts boolean DEFAULT true,
  plan_updates boolean DEFAULT true,
  push_enabled boolean DEFAULT false,
  email_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT false,
  fcm_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  sent_at timestamptz,
  read_at timestamptz,
  channel text NOT NULL CHECK (channel IN ('push', 'email', 'whatsapp', 'in_app')),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX notifs_user_unread_idx ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

CREATE TRIGGER np_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
