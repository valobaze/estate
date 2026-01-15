/*
  # Iroko Estate Management System Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `phone` (text)
      - `role` (text) - landlord, tenant, security, admin
      - `landlord_id` (uuid, nullable) - references landlord for tenants
      - `apartment_number` (text, nullable) - for tenants
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `tenant_tokens`
      - `id` (uuid, primary key)
      - `token` (text, unique) - registration token
      - `landlord_id` (uuid) - references profiles
      - `email` (text) - tenant email
      - `apartment_number` (text)
      - `used` (boolean)
      - `used_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)
    
    - `visitor_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - 6-digit code
      - `tenant_id` (uuid) - references profiles
      - `visitor_name` (text)
      - `visitor_phone` (text)
      - `purpose` (text)
      - `valid_from` (timestamptz)
      - `valid_until` (timestamptz)
      - `used` (boolean)
      - `verified_by` (uuid, nullable) - security staff id
      - `verified_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
    
    - `payment_types`
      - `id` (uuid, primary key)
      - `name` (text) - Security Levy, Waste Levy, Estate Management Levy
      - `amount` (numeric)
      - `frequency` (text) - monthly, quarterly, yearly
      - `active` (boolean)
      - `created_at` (timestamptz)
    
    - `payments`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid) - references profiles
      - `payment_type_id` (uuid) - references payment_types
      - `amount` (numeric)
      - `status` (text) - pending, completed, failed
      - `payment_date` (timestamptz, nullable)
      - `reference` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Landlords can manage their tenants
    - Tenants can generate codes and make payments
    - Security can verify codes
    - Admins have full access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('landlord', 'tenant', 'security', 'admin')),
  landlord_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  apartment_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenant_tokens table
CREATE TABLE IF NOT EXISTS tenant_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  landlord_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  apartment_number text NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Create visitor_codes table
CREATE TABLE IF NOT EXISTS visitor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  tenant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  visitor_phone text NOT NULL,
  purpose text,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz NOT NULL,
  used boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create payment_types table
CREATE TABLE IF NOT EXISTS payment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_type_id uuid NOT NULL REFERENCES payment_types(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date timestamptz,
  reference text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Landlords can view their tenants"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'landlord'
      AND profiles.landlord_id = p.id
    )
  );

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Tenant tokens policies
CREATE POLICY "Landlords can create tenant tokens"
  ON tenant_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'landlord'
      AND tenant_tokens.landlord_id = profiles.id
    )
  );

CREATE POLICY "Landlords can view their tokens"
  ON tenant_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'landlord'
      AND tenant_tokens.landlord_id = profiles.id
    )
  );

CREATE POLICY "Anyone can view valid tokens for registration"
  ON tenant_tokens FOR SELECT
  TO authenticated
  USING (used = false AND expires_at > now());

CREATE POLICY "Tokens can be updated when used"
  ON tenant_tokens FOR UPDATE
  TO authenticated
  USING (used = false AND expires_at > now())
  WITH CHECK (used = true);

-- Visitor codes policies
CREATE POLICY "Tenants can create visitor codes"
  ON visitor_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'tenant'
      AND visitor_codes.tenant_id = profiles.id
    )
  );

CREATE POLICY "Tenants can view their visitor codes"
  ON visitor_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'tenant'
      AND visitor_codes.tenant_id = profiles.id
    )
  );

CREATE POLICY "Security can view all visitor codes"
  ON visitor_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('security', 'admin')
    )
  );

CREATE POLICY "Security can verify visitor codes"
  ON visitor_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('security', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('security', 'admin')
    )
  );

CREATE POLICY "Admins can view all visitor codes"
  ON visitor_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Payment types policies
CREATE POLICY "Everyone can view active payment types"
  ON payment_types FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage payment types"
  ON payment_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Payments policies
CREATE POLICY "Tenants can create their payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'tenant'
      AND payments.tenant_id = profiles.id
    )
  );

CREATE POLICY "Tenants can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'tenant'
      AND payments.tenant_id = profiles.id
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Insert default payment types
INSERT INTO payment_types (name, amount, frequency, active) VALUES
  ('Security Levy', 5000, 'monthly', true),
  ('Waste Levy', 2000, 'monthly', true),
  ('Estate Management Levy', 3000, 'monthly', true)
ON CONFLICT (name) DO NOTHING;