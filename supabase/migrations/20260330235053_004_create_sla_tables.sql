/*
  # Create SLA Configuration Tables
  
  1. New Tables
    - `sla_policies` - SLA rules per category and priority
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key)
      - `priority` (text) - low, medium, high, critical
      - `acknowledgement_hours` (numeric) - business hours
      - `resolution_hours` (numeric) - business hours
      - `first_action_hours` (numeric) - for sensitive cases
      - `is_active` (boolean)
      - `created_at`, `updated_at` (timestamptz)
    
    - `business_hours` - Configurable business hours
      - `id` (uuid, primary key)
      - `day_of_week` (integer) - 0=Sunday, 6=Saturday
      - `start_time` (time)
      - `end_time` (time)
      - `is_working_day` (boolean)
      - `created_at`, `updated_at` (timestamptz)
    
    - `holidays` - Holiday calendar
      - `id` (uuid, primary key)
      - `name` (text)
      - `holiday_date` (date)
      - `is_recurring` (boolean) - for annual holidays
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Read access for authenticated users
    - Write access for admins
*/

CREATE TABLE IF NOT EXISTS sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  acknowledgement_hours numeric NOT NULL DEFAULT 4,
  resolution_hours numeric NOT NULL DEFAULT 24,
  first_action_hours numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, priority)
);

ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read SLA policies"
  ON sla_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert SLA policies"
  ON sla_policies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update SLA policies"
  ON sla_policies FOR UPDATE
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

CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL DEFAULT '09:00:00',
  end_time time NOT NULL DEFAULT '18:00:00',
  is_working_day boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(day_of_week)
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read business hours"
  ON business_hours FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert business hours"
  ON business_hours FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update business hours"
  ON business_hours FOR UPDATE
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

CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  holiday_date date NOT NULL,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(holiday_date)
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read holidays"
  ON holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert holidays"
  ON holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update holidays"
  ON holidays FOR UPDATE
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

CREATE POLICY "Admins can delete holidays"
  ON holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_sla_policies_category ON sla_policies(category_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);