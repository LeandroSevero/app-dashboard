/*
  # Update user_limits to track per-type rate limits

  ## Changes
  - Adds `app_type` column to `user_limits` table so limits are tracked independently per type
  - Drops the old unique constraint on `user_id` alone
  - Adds a new unique constraint on `(user_id, app_type)`
  - Migrates existing rows to have app_type = 'rabbitmq' as a default

  ## Notes
  - This allows 1 RabbitMQ creation AND 1 LavinMQ creation every 24 hours per user
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'app_type'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN app_type text NOT NULL DEFAULT 'rabbitmq';
  END IF;
END $$;

UPDATE user_limits SET app_type = 'rabbitmq' WHERE app_type = 'rabbitmq';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_limits' AND constraint_name = 'user_limits_user_id_key'
  ) THEN
    ALTER TABLE user_limits DROP CONSTRAINT user_limits_user_id_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_limits' AND constraint_name = 'user_limits_user_id_app_type_key'
  ) THEN
    ALTER TABLE user_limits ADD CONSTRAINT user_limits_user_id_app_type_key UNIQUE (user_id, app_type);
  END IF;
END $$;
