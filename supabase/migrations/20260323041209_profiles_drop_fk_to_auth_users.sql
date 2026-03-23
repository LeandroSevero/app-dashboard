/*
  # Drop FK from profiles to auth.users

  ## Summary
  Removes the foreign key constraint between profiles.id and auth.users.id
  so that profile rows survive when an auth user is hard-deleted.
  This enables soft-delete: we set profiles.deleted_at before deleting
  the auth user, and the profile row stays as a historical record.

  ## Changes
  - Drop profiles_id_fkey constraint (previously CASCADE, then RESTRICT)
  - profiles.id remains the primary key (uuid), just no longer references auth.users

  ## Notes
  - The on_auth_user_created trigger still works (inserts profile on signup)
  - Deleted user profiles will remain in the profiles table with deleted_at set
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
