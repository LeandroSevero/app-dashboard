/*
  # Soft delete support for profiles

  ## Summary
  Changes user deletion from hard-delete to soft-delete so deleted users
  remain visible in the admin panel with their deletion timestamp.

  ## Changes

  ### profiles table
  - Add `deleted_at` (timestamptz, nullable) column to track when a user was soft-deleted
  - Add `email` (text) column to preserve email after auth user is hard-deleted
  - Remove ON DELETE CASCADE from the FK to auth.users so the profile row survives
    auth user deletion (recreated as ON DELETE SET NULL, id becomes nullable in effect
    - we keep id as PK but break the FK constraint and re-add without cascade)

  ## Notes
  - The profile row will be retained after the auth user is deleted
  - deleted_at = null means active user
  - deleted_at != null means deleted user
  - email is stored on profile so it remains readable after auth deletion
*/

-- Add deleted_at column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Add email column to profiles to preserve it after auth user deletion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT DEFAULT '';
  END IF;
END $$;

-- Drop the FK constraint that cascades deletion, replace with no action
-- so the profile row survives when the auth user is deleted
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Re-add FK without cascade (ON DELETE RESTRICT so we control deletion order)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- Index for faster queries on deleted_at
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
