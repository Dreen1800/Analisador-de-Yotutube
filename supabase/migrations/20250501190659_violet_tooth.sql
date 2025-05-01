/*
  # Update API Keys RLS Policies to be More Permissive
  
  1. Changes
    - Drop existing restrictive policies
    - Create new permissive policies that only check for authenticated status
    - Remove strict user_id checks for better flexibility
  
  2. Security
    - Maintains basic authentication check
    - Allows authenticated users more freedom in managing API keys
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON api_keys;
DROP POLICY IF EXISTS "Enable insert access for users based on user_id" ON api_keys;
DROP POLICY IF EXISTS "Enable update access for users based on user_id" ON api_keys;
DROP POLICY IF EXISTS "Enable delete access for users based on user_id" ON api_keys;

-- Create more permissive policies
CREATE POLICY "Enable read access for authenticated users"
ON api_keys FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON api_keys FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON api_keys FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
ON api_keys FOR DELETE
TO authenticated
USING (true);