/*
  # Add INSERT policy for profiles table

  1. Changes
    - Add policy to allow authenticated users to insert their own profile
    - This enables self-registration for landlords and other users
  
  2. Security
    - Users can only insert a profile with their own auth.uid()
    - Prevents users from creating profiles for other users
*/

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
