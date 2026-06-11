/*
  # Create Business Hours Configuration Table

  1. New Tables
    - `business_hours_config`
      - `id` (uuid, primary key)
      - `timezone` (text) - System timezone for SLA calculations (e.g., 'Asia/Kolkata', 'America/Chicago')
      - `cutoff_time` (time) - Daily SLA cutoff time; tickets after this start next working day
      - `exclude_non_working_days` (boolean) - Whether to exclude weekends/holidays from SLA
      - `break_enabled` (boolean) - Whether break time is enabled
      - `break_start` (time) - Break start time
      - `break_end` (time) - Break end time
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `business_hours_config` table
    - Add policy for authenticated users to read config
    - Add policy for admins to manage config

  3. Seed Data
    - Insert default configuration row
*/

CREATE TABLE IF NOT EXISTS business_hours_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  cutoff_time time NOT NULL DEFAULT '17:00:00',
  exclude_non_working_days boolean NOT NULL DEFAULT true,
  break_enabled boolean NOT NULL DEFAULT false,
  break_start time DEFAULT '13:00:00',
  break_end time DEFAULT '14:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_hours_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view business hours config"
  ON business_hours_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update business hours config"
  ON business_hours_config
  FOR UPDATE
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

CREATE POLICY "Admins can insert business hours config"
  ON business_hours_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

INSERT INTO business_hours_config (timezone, cutoff_time, exclude_non_working_days, break_enabled, break_start, break_end)
VALUES ('Asia/Kolkata', '17:00:00', true, false, '13:00:00', '14:00:00')
ON CONFLICT DO NOTHING;