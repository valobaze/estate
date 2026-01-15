/*
  # Allow Admins to View Visitor Codes
  
  1. Changes
    - Add policy for admins to view all visitor codes
    - This enables admins to see verification history with full visitor details
  
  2. Security
    - Only users with admin role can view all visitor codes
    - Maintains data integrity and proper access control
*/

-- Allow admins to view all visitor codes
CREATE POLICY "Admins can view all visitor codes"
  ON visitor_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );