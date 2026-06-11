/*
  # Create Users Table
  
  1. New Tables
    - `users` - All system users (employees, HR agents, admins)
      - `id` (uuid, primary key)
      - `employee_code` (text, unique)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text) - employee, hr_agent, admin
      - `department_id` (uuid, foreign key)
      - `is_hr_agent` (boolean)
      - `is_admin` (boolean)
      - `is_active` (boolean)
      - `is_posh_handler` (boolean)
      - `last_assigned_at` (timestamptz)
      - `current_ticket_count` (integer)
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Policies for user access
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'hr_agent', 'admin')),
  department_id uuid REFERENCES departments(id),
  is_hr_agent boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_posh_handler boolean DEFAULT false,
  last_assigned_at timestamptz,
  current_ticket_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "HR agents can read users for assignment"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND (u.is_hr_agent = true OR u.is_admin = true)
    )
  );

CREATE POLICY "Admins can manage users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_hr_agent ON users(is_hr_agent) WHERE is_hr_agent = true;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);