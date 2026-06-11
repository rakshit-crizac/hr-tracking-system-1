/*
  # Add Ticket Tracking Fields for Operational Clarity
  
  1. New Columns on `tickets` table
    - `last_updated_by` (uuid) - User who last modified the ticket
    - `last_updated_by_name` (text) - Name of user for quick display
    - `last_visible_reply_at` (timestamptz) - Timestamp of last public comment
    - `last_visible_reply_by` (text) - Name of user who posted last public reply
    - `pending_with` (text) - Who the ticket is waiting on ('employee', 'hr_agent', 'internal')
    - `next_action_expected` (text) - Description of what action is expected next
    - `reopen_reason` (text) - Required reason when ticket is reopened
    - `is_read_only` (boolean) - Marks closed tickets as read-only
  
  2. New Table: `ticket_assignment_history`
    - Tracks all assignment changes with reasons
    - Preserves full assignment audit trail
  
  3. Security
    - Enable RLS on new table
    - HR agents and admins can view assignment history
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'last_updated_by'
  ) THEN
    ALTER TABLE tickets ADD COLUMN last_updated_by uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'last_updated_by_name'
  ) THEN
    ALTER TABLE tickets ADD COLUMN last_updated_by_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'last_visible_reply_at'
  ) THEN
    ALTER TABLE tickets ADD COLUMN last_visible_reply_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'last_visible_reply_by'
  ) THEN
    ALTER TABLE tickets ADD COLUMN last_visible_reply_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'pending_with'
  ) THEN
    ALTER TABLE tickets ADD COLUMN pending_with text CHECK (pending_with IN ('employee', 'hr_agent', 'internal', 'none'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'next_action_expected'
  ) THEN
    ALTER TABLE tickets ADD COLUMN next_action_expected text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'reopen_reason'
  ) THEN
    ALTER TABLE tickets ADD COLUMN reopen_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'is_read_only'
  ) THEN
    ALTER TABLE tickets ADD COLUMN is_read_only boolean DEFAULT false;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ticket_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  from_agent_id uuid REFERENCES users(id),
  from_agent_name text,
  to_agent_id uuid REFERENCES users(id),
  to_agent_name text,
  assignment_reason text,
  assigned_by uuid NOT NULL REFERENCES users(id),
  assigned_by_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_assignment_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ticket_assignment_history' 
    AND policyname = 'HR agents can view assignment history'
  ) THEN
    CREATE POLICY "HR agents can view assignment history"
      ON ticket_assignment_history FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND (u.is_hr_agent = true OR u.is_admin = true)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ticket_assignment_history' 
    AND policyname = 'HR agents can insert assignment history'
  ) THEN
    CREATE POLICY "HR agents can insert assignment history"
      ON ticket_assignment_history FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND (u.is_hr_agent = true OR u.is_admin = true)
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignment_history_ticket ON ticket_assignment_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_created ON ticket_assignment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_pending_with ON tickets(pending_with);
CREATE INDEX IF NOT EXISTS idx_tickets_last_updated ON tickets(last_updated_by);

UPDATE tickets 
SET pending_with = CASE
  WHEN status = 'waiting_for_employee' THEN 'employee'
  WHEN status IN ('waiting_for_internal_review', 'escalated') THEN 'internal'
  WHEN status IN ('open', 'assigned', 'acknowledged', 'in_progress', 'reopened') THEN 'hr_agent'
  ELSE 'none'
END
WHERE pending_with IS NULL;