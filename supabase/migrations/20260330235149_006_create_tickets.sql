/*
  # Create Tickets Table
  
  1. New Tables
    - `tickets` - Main tickets table with full data model
      - `id` (uuid, primary key)
      - `ticket_number` (text, unique, auto-generated HR-1000+)
      - `title` (text)
      - `description` (text)
      - `category_id`, `subcategory_id` (foreign keys)
      - `requester_id`, `requester_name`, `department_id`
      - `priority`, `source`, `status`
      - `assigned_agent_id`
      - SLA tracking fields
      - Breach and escalation fields
      - Rating and closure fields
      - Timestamps
  
  2. Security
    - Enable RLS
    - Role-based access policies
*/

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT 'HR-' || nextval('ticket_number_seq')::text,
  title text NOT NULL,
  description text NOT NULL,
  category_id uuid NOT NULL REFERENCES ticket_categories(id),
  subcategory_id uuid REFERENCES ticket_subcategories(id),
  requester_id uuid NOT NULL REFERENCES users(id),
  requester_name text NOT NULL,
  department_id uuid REFERENCES departments(id),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  source text NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'email', 'phone', 'walk_in')),
  assigned_agent_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'assigned', 'acknowledged', 'in_progress', 
    'waiting_for_employee', 'waiting_for_internal_review', 
    'resolved', 'closed', 'reopened', 'escalated'
  )),
  sla_policy_id uuid REFERENCES sla_policies(id),
  acknowledgement_due_at timestamptz,
  resolution_due_at timestamptz,
  first_response_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  reopened_count integer DEFAULT 0,
  escalation_status text DEFAULT 'none' CHECK (escalation_status IN ('none', 'pending', 'escalated', 'resolved')),
  escalation_level integer DEFAULT 0,
  is_acknowledgement_breached boolean DEFAULT false,
  is_resolution_breached boolean DEFAULT false,
  breach_reason text,
  employee_rating integer CHECK (employee_rating >= 1 AND employee_rating <= 5),
  rating_comment text,
  closure_notes text,
  is_sensitive boolean DEFAULT false,
  sla_paused_at timestamptz,
  sla_pause_duration_minutes integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "HR agents can view eligible tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_hr_agent = true
      AND (
        tickets.assigned_agent_id = auth.uid()
        OR (
          tickets.is_sensitive = false
          AND EXISTS (
            SELECT 1 FROM agent_category_mappings acm
            WHERE acm.agent_id = auth.uid()
            AND acm.category_id = tickets.category_id
            AND acm.is_active = true
          )
        )
        OR (tickets.is_sensitive = true AND u.is_posh_handler = true)
      )
    )
  );

CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_admin = true
    )
  );

CREATE POLICY "Employees can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "HR agents can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND (u.is_hr_agent = true OR u.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND (u.is_hr_agent = true OR u.is_admin = true)
    )
  );

CREATE POLICY "Employees can update own tickets for rating"
  ON tickets FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ack_due ON tickets(acknowledgement_due_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_res_due ON tickets(resolution_due_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_sensitive ON tickets(is_sensitive) WHERE is_sensitive = true;