/*
  # Fix Token Update Policy for Tenant Registration

  1. Problem
    - When a tenant completes registration, they need to mark their token as "used"
    - The current UPDATE policy doesn't verify the token email matches the user's email
    - This causes RLS violations when newly registered users try to update their token
  
  2. Solution
    - Drop the old UPDATE policy
    - Create new policy that checks the token email matches the authenticated user's email
    - This allows newly registered tenants to mark their own token as used
  
  3. Security
    - Users can only update tokens where the email matches their auth email
    - Can only update unused, non-expired tokens
    - Can only set the token to "used = true"
*/

-- Drop the old UPDATE policy
DROP POLICY IF EXISTS "Tokens can be updated when used" ON tenant_tokens;

-- Create new policy that checks email match
CREATE POLICY "Users can mark their own token as used"
  ON tenant_tokens FOR UPDATE
  TO authenticated
  USING (
    used = false 
    AND expires_at > now() 
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (used = true);
