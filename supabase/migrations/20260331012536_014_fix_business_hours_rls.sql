/*
  # Fix Business Hours RLS Policies

  1. Changes
    - Add policy for anon users to read business hours
    - Add policy for anon users to read business_hours_config
  
  2. Security
    - Read-only access for unauthenticated users to business hours
    - This allows the login page and public areas to access SLA info if needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'business_hours'::regclass 
    AND polname = 'Public read access to business hours'
  ) THEN
    CREATE POLICY "Public read access to business hours"
      ON business_hours
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'business_hours_config'::regclass 
    AND polname = 'Public read access to business hours config'
  ) THEN
    CREATE POLICY "Public read access to business hours config"
      ON business_hours_config
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;