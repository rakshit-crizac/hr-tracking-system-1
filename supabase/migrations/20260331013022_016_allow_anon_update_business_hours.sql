/*
  # Allow Anonymous Updates for Business Hours (Demo Mode)

  1. Changes
    - Add policies for anon role to update business hours
    - This is for demo/development purposes only
  
  2. Notes
    - In production, these should be restricted to authenticated/admin users
    - Application-level auth still enforces admin-only access to the UI
*/

CREATE POLICY "Anon can update business hours"
  ON business_hours
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can update business hours config"
  ON business_hours_config
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);