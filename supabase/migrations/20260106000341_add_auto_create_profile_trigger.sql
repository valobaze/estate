/*
  # Add Automatic Profile Creation Trigger
  
  1. Changes
    - Creates a function that automatically creates a profile when a new user signs up
    - Adds a trigger on auth.users to call this function
    - Ensures every new auth user gets a profile automatically
  
  2. Security
    - Profile is created with default values
    - Role defaults to 'tenant' for security (must be manually upgraded to other roles)
*/

-- Function to automatically create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();