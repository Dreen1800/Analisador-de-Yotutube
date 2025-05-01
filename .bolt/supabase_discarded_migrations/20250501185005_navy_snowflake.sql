/*
  # Initial Schema Setup

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key)
      - `name` (text)
      - `key` (text)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references auth.users)
      - `is_active` (boolean)
      - `usage_count` (integer)
    
    - `channels`
      - `id` (uuid, primary key)
      - `channel_id` (text)
      - `title` (text)
      - `thumbnail_url` (text)
      - `subscriber_count` (integer)
      - `video_count` (integer)
      - `view_count` (integer)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references auth.users)
    
    - `channel_analyses`
      - `id` (uuid, primary key)
      - `channel_id` (text)
      - `videos` (jsonb)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL,
  is_active boolean DEFAULT false,
  usage_count integer DEFAULT 0
);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL,
  title text NOT NULL,
  thumbnail_url text NOT NULL,
  subscriber_count integer NOT NULL,
  video_count integer NOT NULL,
  view_count integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL,
  UNIQUE(channel_id, user_id)
);

-- Create channel_analyses table
CREATE TABLE IF NOT EXISTS channel_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL,
  videos jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for api_keys
CREATE POLICY "Users can manage their own API keys"
  ON api_keys
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for channels
CREATE POLICY "Users can manage their own channels"
  ON channels
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for channel_analyses
CREATE POLICY "Users can manage their own analyses"
  ON channel_analyses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);