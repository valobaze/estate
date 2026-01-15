/*
  # Add Visitor Code Categories and Details

  1. Changes
    - Add `visit_type` column to support different visitor categories (pickup, delivery, food_delivery)
    - Add pickup-related fields: `pickup_service`, `driver_license_plate`, `car_color`, `car_name`
    - Add delivery-related field: `delivery_service`
  
  2. Purpose
    - Enable tenants to specify visit types for better tracking
    - Store vehicle details for pickup services (Bolt, Uber, Indrive, Taxi)
    - Store delivery service information (Jumia, Konga, Chowdeck, Glovo, etc.)
  
  3. Notes
    - All new fields are optional (nullable)
    - When visit_type is 'pickup', pickup fields become relevant
    - When visit_type is 'delivery' or 'food_delivery', delivery_service becomes relevant
*/

-- Add visit type and related detail columns to visitor_codes table
DO $$
BEGIN
  -- Add visit_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_codes' AND column_name = 'visit_type'
  ) THEN
    ALTER TABLE visitor_codes ADD COLUMN visit_type text CHECK (visit_type IN ('pickup', 'delivery', 'food_delivery'));
  END IF;

  -- Add pickup service field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_codes' AND column_name = 'pickup_service'
  ) THEN
    ALTER TABLE visitor_codes ADD COLUMN pickup_service text;
  END IF;

  -- Add driver license plate field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_codes' AND column_name = 'driver_license_plate'
  ) THEN
    ALTER TABLE visitor_codes ADD COLUMN driver_license_plate text;
  END IF;

  -- Add car color field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_codes' AND column_name = 'car_color'
  ) THEN
    ALTER TABLE visitor_codes ADD COLUMN car_color text;
  END IF;

  -- Add car name field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_codes' AND column_name = 'car_name'
  ) THEN
    ALTER TABLE visitor_codes ADD COLUMN car_name text;
  END IF;

  -- Add delivery service field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_codes' AND column_name = 'delivery_service'
  ) THEN
    ALTER TABLE visitor_codes ADD COLUMN delivery_service text;
  END IF;
END $$;
