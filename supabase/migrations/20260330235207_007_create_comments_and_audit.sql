/*
  # Create Comments and Audit Log Tables
  
  1. New Tables
    - `ticket_comments` - Comments/replies on tickets
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `content` (text)
      - `is_internal` (boolean) - internal notes vs public replies
      - `created_at` (timestamptz)
    
    - `audit_logs` - System-wide audit trail
      - `id` (uuid, primary key)
      - `entity_type` (text) - ticket, user, category, etc.
      - `entity_id` (uuid)
      - `action` (text)
      - `old_values` (jsonb)
      - `new_values` (jsonb)
      - `performed_by` (uuid)
      - `ip_address` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS with appropriate access policies
*/

CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  user_name text NOT NULL,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket owners can view public comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM tickets t 
      WHERE t.id = ticket_comments.ticket_id 
      AND t.requester_id = auth.uid()
    )
  );

CREATE POLICY "HR can view all comments on accessible tickets"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND (u.is_hr_agent = true OR u.is_admin = true)
    )
  );

CREATE POLICY "Users can add comments to accessible tickets"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tickets t 
      WHERE t.id = ticket_comments.ticket_id
      AND (
        t.requester_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND (u.is_hr_agent = true OR u.is_admin = true)
        )
      )
    )
  );

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  ticket_number text,
  action text NOT NULL,
  description text,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES users(id),
  performed_by_name text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_admin = true
    )
  );

CREATE POLICY "HR can view ticket-related audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    entity_type = 'ticket'
    AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_hr_agent = true
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON ticket_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ticket_number ON audit_logs(ticket_number);