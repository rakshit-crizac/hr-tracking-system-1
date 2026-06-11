/*
  # Create Departments Table
  
  1. New Tables
    - `departments` - Company departments
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `code` (text, unique)
      - `is_active` (boolean)
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Basic read policy for authenticated users
*/

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);