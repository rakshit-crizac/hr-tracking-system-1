/*
  # Create Categories and Subcategories Tables
  
  1. New Tables
    - `ticket_categories` - HR ticket categories
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `code` (text, unique)
      - `description` (text)
      - `is_sensitive` (boolean) - for POSH/sensitive cases
      - `is_active` (boolean)
      - `display_order` (integer)
      - `created_at`, `updated_at` (timestamptz)
    
    - `ticket_subcategories` - Subcategories under main categories
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key)
      - `name` (text)
      - `code` (text)
      - `is_active` (boolean)
      - `display_order` (integer)
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Read access for authenticated users
*/

CREATE TABLE IF NOT EXISTS ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  is_sensitive boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON ticket_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON ticket_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update categories"
  ON ticket_categories FOR UPDATE
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

CREATE TABLE IF NOT EXISTS ticket_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, code)
);

ALTER TABLE ticket_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subcategories"
  ON ticket_subcategories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert subcategories"
  ON ticket_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update subcategories"
  ON ticket_subcategories FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON ticket_subcategories(category_id);