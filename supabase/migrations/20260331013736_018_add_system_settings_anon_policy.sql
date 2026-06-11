/*
  # Add Anon Update Policy for System Settings

  1. Changes
    - Add update policy for anon users (demo mode)
  
  2. Notes
    - Application-level authorization handles admin access control
    - These policies enable the demo/mock auth system to work
*/

CREATE POLICY "Anon can update system settings"
  ON system_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);