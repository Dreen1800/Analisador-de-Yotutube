/*
  # Add unique constraint to channel_id

  1. Changes
    - Add unique constraint to `channel_id` column in `channels` table
    - This enables upsert operations using `ON CONFLICT (channel_id)`

  2. Security
    - No changes to RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'channels_channel_id_key'
  ) THEN
    ALTER TABLE channels 
    ADD CONSTRAINT channels_channel_id_key 
    UNIQUE (channel_id);
  END IF;
END $$;