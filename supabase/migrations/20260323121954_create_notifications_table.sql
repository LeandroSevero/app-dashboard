/*
  # Create notifications table

  ## Purpose
  Store in-app notifications for users, used to inform them when their
  TTL-based applications have been automatically deleted upon expiration.

  ## New Tables
  - `notifications`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to auth.users)
    - `title` (text) - notification title
    - `message` (text) - notification body
    - `type` (text) - 'app_expired' | 'info' | 'warning' | 'error'
    - `read` (boolean, default false)
    - `meta` (jsonb, nullable) - extra context (app_name, app_type, etc.)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; users can only read/update their own notifications
  - INSERT restricted to service role (server-side only)

  ## Notes
  1. Notifications are soft-read (mark as read, not deleted)
  2. Users can mark individual or all notifications as read
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
