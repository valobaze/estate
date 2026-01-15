# Iroko Estate Management System

A comprehensive gated estate management system for managing residents, visitor access, and estate dues.

## Features

### For Landlords
- Create registration tokens for tenants
- View all registered tenants
- Track tenant apartment assignments
- Monitor tenant registration status

### For Tenants
- Register using landlord-provided tokens
- Generate visitor codes with validity periods
- Make estate dues payments (Security Levy, Waste Levy, Estate Management Levy)
- View payment history
- Track visitor code status

### For Security Staff
- Verify visitor codes in real-time
- View visitor information and host details
- Track verification history
- Grant or deny access based on code validity

### For Admins
- View estate overview with statistics
- Manage all residents
- Monitor all payments
- Access complete visitor history
- Generate reports and analytics

## Getting Started

### Creating Test Users

You'll need to create test users for each role. Here's how:

#### 1. Create Admin User
```sql
-- First, sign up via Supabase Auth Dashboard or use the signup API
-- Then run this in Supabase SQL Editor:
INSERT INTO profiles (id, email, full_name, phone, role)
VALUES (
  'your-user-id-from-auth',
  'admin@irokoestate.com',
  'Estate Admin',
  '+234 800 000 0001',
  'admin'
);
```

#### 2. Create Landlord User
```sql
INSERT INTO profiles (id, email, full_name, phone, role)
VALUES (
  'your-user-id-from-auth',
  'landlord@irokoestate.com',
  'John Landlord',
  '+234 800 000 0002',
  'landlord'
);
```

#### 3. Create Security User
```sql
INSERT INTO profiles (id, email, full_name, phone, role)
VALUES (
  'your-user-id-from-auth',
  'security@irokoestate.com',
  'Security Guard',
  '+234 800 000 0003',
  'security'
);
```

### User Flow

#### Landlord Flow
1. Login with landlord credentials
2. Click "Create Token" button
3. Enter tenant email and apartment number
4. Share the generated token with the tenant (valid for 7 days)
5. View registered tenants

#### Tenant Registration Flow
1. Click "New tenant? Register with token" on login page
2. Enter the token provided by landlord
3. Validate token
4. Complete registration with personal details
5. Login with new credentials

#### Tenant Flow
1. Login with tenant credentials
2. **Generate Visitor Codes:**
   - Click "Generate Code" under Visitor Codes tab
   - Enter visitor name, phone, and purpose
   - Set validity period
   - Share the 6-digit code with visitor
3. **Pay Estate Dues:**
   - Switch to Estate Dues tab
   - Click "Make Payment"
   - Select payment type (Security/Waste/Estate Management Levy)
   - Complete payment

#### Security Flow
1. Login with security credentials
2. Enter 6-digit visitor code in search box
3. View visitor details and host information
4. Check code validity status
5. Click "Grant Access" if code is valid
6. View recent verifications

#### Admin Flow
1. Login with admin credentials
2. View estate overview with statistics
3. Access residents, payments, and visitor history
4. Monitor estate operations

## Estate Dues

The system comes with three pre-configured payment types:

- **Security Levy**: ₦5,000/month
- **Waste Levy**: ₦2,000/month
- **Estate Management Levy**: ₦3,000/month

Admins can add more payment types through the database.

## Security Features

- Role-based access control (RLS policies)
- JWT-based authentication via Supabase
- Secure token generation for tenant registration
- Time-limited visitor codes
- Verification tracking and audit trail
- Secure payment processing

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Build Tool**: Vite

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

## Database Schema

### Tables
- **profiles**: User profiles with roles
- **tenant_tokens**: Registration tokens for tenants
- **visitor_codes**: Generated visitor access codes
- **payment_types**: Estate dues types and amounts
- **payments**: Payment transaction records

All tables have Row Level Security enabled with role-based policies.

## Notes

- Visitor codes are 6-digit numeric codes
- Registration tokens expire after 7 days
- Tokens can only be used once
- Visitor codes have custom validity periods set by tenants
- All financial amounts are in Nigerian Naira (₦)
