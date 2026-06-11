/*
  # Add CRUD Policies for Departments Table

  1. Changes
    - Add insert policy for anon users (demo mode)
    - Add update policy for anon users (demo mode)
    - Add delete policy for anon users (demo mode)
  
  2. Notes
    - Application-level authorization handles admin access control
    - These policies enable the demo/mock auth system to work
*/

CREATE POLICY "Anon can insert departments"
  ON departments
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update departments"
  ON departments
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete departments"
  ON departments
  FOR DELETE
  TO anon
  USING (true);