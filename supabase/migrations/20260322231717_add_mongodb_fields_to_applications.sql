/*
  # Add MongoDB fields to applications table

  ## Summary
  Adds columns needed to store MongoDB Atlas instance credentials for a new
  "mongodb" application type, alongside the existing rabbitmq and lavinmq types.

  ## New Columns (applications table)
  - `mongo_db` (text) — the isolated database name for this user (e.g. "app_<id>")
  - `mongo_user` (text) — the MongoDB Atlas user created for this instance
  - `mongo_password` (text) — the password for the MongoDB Atlas user
  - `connection_url` (text) — the ready-to-use mongodb+srv connection string

  ## Notes
  - Existing rows are unaffected (columns are nullable)
  - No RLS changes required; existing policies already cover the applications table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'mongo_db'
  ) THEN
    ALTER TABLE applications ADD COLUMN mongo_db text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'mongo_user'
  ) THEN
    ALTER TABLE applications ADD COLUMN mongo_user text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'mongo_password'
  ) THEN
    ALTER TABLE applications ADD COLUMN mongo_password text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'connection_url'
  ) THEN
    ALTER TABLE applications ADD COLUMN connection_url text;
  END IF;
END $$;
