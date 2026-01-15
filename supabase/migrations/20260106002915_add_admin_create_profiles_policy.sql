/*
  # Allow Admins to Create Profiles for Security Guards
  
  1. Changes
    - Add policy to allow admins to create profiles for security staff
    - Enables admin enrollment of security guards
  
  2. Security
    - Only admins can create profiles for others
    - Prevents non-admins from creating profiles for other users
*/

-- Allow admins to create profiles for security staff and other users
CREATE POLICY "Admins can create profiles for others"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );