/*
  # Create Notifications and System Settings Tables
  
  1. New Tables
    - `notifications` - In-app notifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `type` (text) - ticket_created, assigned, sla_warning, etc.
      - `title` (text)
      - `message` (text)
      - `ticket_id` (uuid, optional)
      - `is_read` (boolean)
      - `created_at` (timestamptz)
    
    - `system_settings` - Configurable system settings
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (jsonb)
      - `description` (text)
      - `updated_by` (uuid)
      - `updated_at` (timestamptz)
    
    - `escalation_rules` - Escalation configuration
      - `id` (uuid, primary key)
      - `category_id` (uuid, optional)
      - `level` (integer)
      - `trigger_after_hours` (numeric)
      - `notify_user_ids` (uuid[])
      - `is_active` (boolean)
  
  2. Security
    - Enable RLS with appropriate policies
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  ticket_number text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE TABLE IF NOT EXISTS escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES ticket_categories(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 1,
  trigger_after_hours numeric NOT NULL,
  notify_user_ids uuid[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read escalation rules"
  ON escalation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage escalation rules"
  ON escalation_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update escalation rules"
  ON escalation_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_escalation_category ON escalation_rules(category_id);