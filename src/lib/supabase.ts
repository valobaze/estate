import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type UserRole = 'landlord' | 'tenant' | 'security' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  landlord_id: string | null;
  apartment_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantToken {
  id: string;
  token: string;
  landlord_id: string;
  email: string;
  apartment_number: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface VisitorCode {
  id: string;
  code: string;
  tenant_id: string;
  visitor_name: string;
  visitor_phone: string;
  purpose: string | null;
  valid_from: string;
  valid_until: string;
  used: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  visit_type: 'pickup' | 'delivery' | 'food_delivery' | null;
  pickup_service: string | null;
  driver_license_plate: string | null;
  car_color: string | null;
  car_name: string | null;
  delivery_service: string | null;
}

export interface PaymentType {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  payment_type_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  payment_date: string | null;
  reference: string | null;
  created_at: string;
}

export interface VisitorLog {
  id: string;
  visitor_code_id: string;
  entry_time: string;
  exit_time: string | null;
  entry_verified_by: string;
  exit_verified_by: string | null;
  created_at: string;
  updated_at: string;
}
