/*
  # Fix Infinite Recursion in Profiles Policies
  
  1. Changes
    - Create helper function to get current user's role without triggering RLS
    - Drop problematic policies that cause infinite recursion
    - Recreate policies using the helper function
  
  2. Security
    - Maintains same security model without recursion
    - Uses SECURITY DEFINER function to bypass RLS for role checks
*/

-- Create helper function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Security can view tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles for others" ON profiles;
DROP POLICY IF EXISTS "Landlords can view their tenants" ON profiles;

-- Recreate policies using the helper function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "Security can view tenant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'security'
    AND profiles.role = 'tenant'
  );

CREATE POLICY "Admins can create profiles for others"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Landlords can view their tenants"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'landlord'
    AND profiles.landlord_id = auth.uid()
  );