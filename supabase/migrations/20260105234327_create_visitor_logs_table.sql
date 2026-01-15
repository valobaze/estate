/*
  # Create Visitor Entry/Exit Logs Table

  1. New Tables
    - visitor_logs: Tracks when visitors enter and exit the estate

  2. Columns
    - id: Primary key
    - visitor_code_id: References visitor_codes table
    - entry_time: When visitor entered
    - exit_time: When visitor exited (nullable)
    - entry_verified_by: Security guard who logged entry
    - exit_verified_by: Security guard who logged exit (nullable)
    - created_at: Record creation timestamp
    - updated_at: Record update timestamp

  3. Security
    - Enable RLS
    - Security guards can read all logs
    - Security guards can create and update logs
    - Admins can read all logs
*/

-- Create visitor_logs table
CREATE TABLE IF NOT EXISTS visitor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_code_id uuid NOT NULL REFERENCES visitor_codes(id) ON DELETE CASCADE,
  entry_time timestamptz NOT NULL DEFAULT now(),
  exit_time timestamptz,
  entry_verified_by uuid NOT NULL REFERENCES profiles(id),
  exit_verified_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- Security guards can read all visitor logs
CREATE POLICY "Security guards can read all visitor logs"
  ON visitor_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'security'
    )
  );

-- Security guards can create visitor logs
CREATE POLICY "Security guards can create visitor logs"
  ON visitor_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'security'
    )
  );

-- Security guards can update visitor logs
CREATE POLICY "Security guards can update visitor logs"
  ON visitor_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'security'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'security'
    )
  );

-- Admins can read all visitor logs
CREATE POLICY "Admins can read all visitor logs"
  ON visitor_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
