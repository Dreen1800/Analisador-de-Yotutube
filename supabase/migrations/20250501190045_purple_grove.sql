/*
  # Fix API Keys RLS Policies

  1. Changes
    - Drop existing RLS policy for api_keys table
    - Create new policies for:
      - Selecting own API keys
      - Inserting own API keys
      - Updating own API keys
      - Deleting own API keys
    
  2. Security
    - Ensures users can only access their own API keys
    - Maintains data isolation between users
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own API keys" ON api_keys;

-- Create separate policies for each operation
CREATE POLICY "Users can view their own API keys"
ON api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
ON api_keys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
ON api_keys FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
ON api_keys FOR DELETE
TO authenticated
USING (auth.uid() = user_id);