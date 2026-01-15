/*
  # Allow Security Guards to View and Update Visitor Codes
  
  1. Changes
    - Add policy for security guards to view all visitor codes
    - Add policy for security guards to update visitor codes (mark as used)
    - Enables security guards to verify visitor codes at the gate
  
  2. Security
    - Security guards can view all visitor codes for verification
    - Security guards can update codes to mark them as used
    - Maintains data integrity for visitor verification system
*/

-- Allow security guards to view all visitor codes
CREATE POLICY "Security can view all visitor codes"
  ON visitor_codes FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'security');

-- Allow security guards to update visitor codes (mark as used, add verification info)
CREATE POLICY "Security can update visitor codes"
  ON visitor_codes FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'security')
  WITH CHECK (public.get_user_role(auth.uid()) = 'security');