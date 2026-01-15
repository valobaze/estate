/*
  # Allow Security Staff to View Tenant Profiles
  
  1. Changes
    - Add policy to allow security staff to view tenant profiles
    - Enables security guards to verify visitor codes with tenant information
  
  2. Security
    - Security staff can only view profiles, not modify them
    - Restricted to viewing tenant information needed for visitor verification
*/

-- Allow security staff to view tenant profiles for visitor verification
CREATE POLICY "Security can view tenant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'security'
    )
    AND profiles.role = 'tenant'
  );