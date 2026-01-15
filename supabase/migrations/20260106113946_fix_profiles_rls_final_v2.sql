/*
  # Fix Profile RLS Policies - Final Solution
  
  1. Changes
    - Drop all policies that depend on current_user_role()
    - Drop and recreate helper function with explicit RLS bypass
    - Recreate policies with proper logic
  
  2. Security
    - Maintains proper access control
    - Uses function with explicit RLS bypass
*/

-- Drop all existing SELECT policies on profiles that use the function
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Security can view tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Landlords can view their tenants" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles for others" ON profiles;

-- Now drop the function
DROP FUNCTION IF EXISTS public.current_user_role();

-- Create new helper function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = user_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- Recreate SELECT policies with simplified logic
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Security can view tenant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'security' AND role = 'tenant'
  );

CREATE POLICY "Landlords can view their tenants"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'landlord' AND landlord_id = auth.uid()
  );

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can create profiles for others"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');