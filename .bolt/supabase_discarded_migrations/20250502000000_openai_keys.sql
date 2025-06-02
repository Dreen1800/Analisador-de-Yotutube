/*
  # Create OpenAI Keys Table and RLS Policies

  1. Changes
    - Create a new openai_keys table
    - Configure proper RLS policies for security
    - Structure similar to existing api_keys table
    
  2. Security
    - Enable RLS on openai_keys table
    - Add policies for all CRUD operations
    - Ensure users can only access their own OpenAI keys
*/

-- Create new openai_keys table
CREATE TABLE IF NOT EXISTS openai_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE openai_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for openai_keys
CREATE POLICY "Enable read access for users based on user_id" ON openai_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for users based on user_id" ON openai_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for users based on user_id" ON openai_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for users based on user_id" ON openai_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id); 