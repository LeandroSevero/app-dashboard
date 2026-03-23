/*
  # Update get_all_auth_users to include deleted_at

  Drops and recreates the function to add deleted_at column.
  Returns id, email, created_at, deleted_at from auth.users.
*/

DROP FUNCTION IF EXISTS get_all_auth_users();

CREATE OR REPLACE FUNCTION get_all_auth_users()
RETURNS TABLE (id uuid, email text, created_at timestamptz, deleted_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id, email, created_at, deleted_at FROM auth.users ORDER BY created_at ASC;
$$;
