/*
  # Create Agent Category Mappings Table
  
  1. New Tables
    - `agent_category_mappings` - Maps HR agents to categories they can handle
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to users)
      - `category_id` (uuid, foreign key to ticket_categories)
      - `is_active` (boolean)
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Read access for HR agents and admins
    - Write access for admins
*/

CREATE TABLE IF NOT EXISTS agent_category_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, category_id)
);

ALTER TABLE agent_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR agents can read own mappings"
  ON agent_category_mappings FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_admin = true
    )
  );

CREATE POLICY "Admins can insert mappings"
  ON agent_category_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update mappings"
  ON agent_category_mappings FOR UPDATE
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

CREATE POLICY "Admins can delete mappings"
  ON agent_category_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_agent_mappings_agent ON agent_category_mappings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_mappings_category ON agent_category_mappings(category_id);