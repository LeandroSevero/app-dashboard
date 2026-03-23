/*
  # Add mongo_collection field to applications table

  ## Summary
  Adds a `mongo_collection` column to the `applications` table to store the default
  collection name created when a MongoDB application is provisioned. The collection
  name matches the database name for easy identification.

  ## Changes
  - `applications` table: new column `mongo_collection` (text, nullable)
    - Stores the default MongoDB collection name created at provisioning time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'mongo_collection'
  ) THEN
    ALTER TABLE applications ADD COLUMN mongo_collection text;
  END IF;
END $$;
