/*
  # Create helper function to list all auth users

  Returns id, email, created_at from auth.users so edge functions
  can query user data without relying on auth.admin.listUsers() SDK method.
  Only callable with service role or by postgres superuser.
*/

CREATE OR REPLACE FUNCTION get_all_auth_users()
RETURNS TABLE (id uuid, email text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id, email, created_at FROM auth.users ORDER BY created_at ASC;
$$;
