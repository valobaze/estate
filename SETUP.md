# Setup Guide for Iroko Estate

## Quick Setup

### Step 1: Create Test Users in Supabase

You need to manually create users in Supabase Authentication first, then add their profiles.

#### Method 1: Using Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Authentication** > **Users**
3. Click **Add User** (or **Invite User**)
4. Create these users:

**Admin User:**
- Email: `admin@irokoestate.com`
- Password: `admin123456`

**Landlord User:**
- Email: `landlord@irokoestate.com`
- Password: `landlord123456`

**Security User:**
- Email: `security@irokoestate.com`
- Password: `security123456`

5. After creating each user, note their UUID (shown in the users list)

#### Method 2: Using SQL (if you have service role key)

Run this in Supabase SQL Editor:

```sql
-- Note: You'll need to get the actual user IDs after auth signup
-- This is a helper to create profiles after you've created auth users

-- Example: After creating admin@irokoestate.com in Auth
INSERT INTO profiles (id, email, full_name, phone, role)
VALUES (
  'paste-user-uuid-here',
  'admin@irokoestate.com',
  'Estate Admin',
  '+234 800 000 0001',
  'admin'
);

-- Example: After creating landlord@irokoestate.com in Auth
INSERT INTO profiles (id, email, full_name, phone, role)
VALUES (
  'paste-user-uuid-here',
  'landlord@irokoestate.com',
  'John Landlord',
  '+234 800 000 0002',
  'landlord'
);

-- Example: After creating security@irokoestate.com in Auth
INSERT INTO profiles (id, email, full_name, phone, role)
VALUES (
  'paste-user-uuid-here',
  'security@irokoestate.com',
  'Security Guard',
  '+234 800 000 0003',
  'security'
);
```

### Step 2: Test the Application

#### Test as Admin
1. Login with: `admin@irokoestate.com` / `admin123456`
2. You should see the Admin Dashboard with estate overview

#### Test as Landlord
1. Login with: `landlord@irokoestate.com` / `landlord123456`
2. Create a tenant registration token:
   - Click "Create Token"
   - Email: `tenant1@example.com`
   - Apartment: `A101`
3. Copy the generated token

#### Test Tenant Registration
1. Logout and go back to login page
2. Click "New tenant? Register with token"
3. Paste the token from the landlord
4. Complete registration:
   - Full Name: `Jane Tenant`
   - Phone: `+234 800 000 0004`
   - Password: `tenant123456`
5. Login with new credentials

#### Test as Tenant
1. Login with: `tenant1@example.com` / `tenant123456`
2. Generate a visitor code:
   - Visitor Name: `John Visitor`
   - Phone: `+234 800 000 0005`
   - Purpose: `Social visit`
   - Valid Until: Select a future date/time
3. Note the 6-digit code generated
4. Try making a payment in the Estate Dues tab

#### Test as Security
1. Login with: `security@irokoestate.com` / `security123456`
2. Enter the visitor code you generated as tenant
3. Verify the visitor information
4. Click "Grant Access" to verify the code
5. See the code appear in recent verifications

### Step 3: Verify Everything Works

Check these workflows:

- [ ] Admin can view all residents, payments, and visitors
- [ ] Landlord can create tokens and view tenants
- [ ] Tenant can register with valid token
- [ ] Tenant can generate visitor codes
- [ ] Tenant can make payments
- [ ] Security can verify visitor codes
- [ ] Visitor codes expire after validity period
- [ ] Used codes cannot be used again

## Common Issues

### Issue: Can't login after registration
**Solution**: Make sure the profile was created in the `profiles` table with the correct user ID from auth.

### Issue: Token validation fails
**Solution**:
- Check that the token hasn't expired (7 days from creation)
- Ensure the token hasn't been used already
- Verify the token string is correct (case-sensitive)

### Issue: RLS policy error
**Solution**: Make sure you're logged in as the correct user role for the operation you're trying to perform.

### Issue: Cannot see visitor code verification
**Solution**: Make sure you're logged in as a security or admin user.

## Production Considerations

Before deploying to production:

1. **Remove test users** or change their passwords
2. **Configure email templates** in Supabase for tenant registration
3. **Set up proper payment gateway** (currently simulated)
4. **Add backup admin users** for redundancy
5. **Enable email verification** if needed
6. **Set up monitoring** for security alerts
7. **Configure proper CORS** policies
8. **Add rate limiting** for sensitive operations

## Support

For issues or questions, check the main README.md file for system documentation.
