/*
  # Fix Tenant Token Validation for Anonymous Users

  1. Problem
    - Tenant registration requires reading tokens from tenant_tokens table
    - Current policy only allows authenticated users to read tokens
    - But tenants are NOT authenticated during registration (they're signing up)
  
  2. Solution
    - Update the policy to allow anonymous (anon) users to view valid tokens
    - This enables token validation during the registration process
  
  3. Security
    - Only allows reading tokens that are:
      - Not yet used (used = false)
      - Not expired (expires_at > now())
    - Tokens cannot be modified by anonymous users
*/

-- Drop the existing policy that only allowed authenticated users
DROP POLICY IF EXISTS "Anyone can view valid tokens for registration" ON tenant_tokens;

-- Create new policy that allows both authenticated AND anonymous users to view valid tokens
CREATE POLICY "Allow viewing valid tokens for registration"
  ON tenant_tokens FOR SELECT
  TO anon, authenticated
  USING (used = false AND expires_at > now());
