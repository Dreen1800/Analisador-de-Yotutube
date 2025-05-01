/*
  # Fix API Keys RLS Policies

  1. Changes
    - Drop existing RLS policies for api_keys table
    - Create new, properly configured RLS policies
    
  2. Security
    - Maintain RLS enabled on api_keys table
    - Add policies for all CRUD operations
    - Ensure users can only access their own API keys
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;

-- Create new policies with proper security
CREATE POLICY "Enable read access for users based on user_id" ON api_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for users based on user_id" ON api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for users based on user_id" ON api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for users based on user_id" ON api_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);