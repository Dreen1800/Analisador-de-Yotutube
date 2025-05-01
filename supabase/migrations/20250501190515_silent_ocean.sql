/*
  # Fix API Keys RLS Policies

  1. Changes
    - Drop all existing policies for api_keys table
    - Create new granular policies with proper security checks
    - Ensure policies use correct auth.uid() checks
    - Add proper documentation for each policy

  2. Security
    - Enforce strict user-based access control
    - Prevent any unauthorized access to API keys
    - Maintain data isolation between users
*/

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON api_keys;
DROP POLICY IF EXISTS "Enable insert access for users based on user_id" ON api_keys;
DROP POLICY IF EXISTS "Enable update access for users based on user_id" ON api_keys;
DROP POLICY IF EXISTS "Enable delete access for users based on user_id" ON api_keys;

-- Recreate policies with proper security checks
CREATE POLICY "Enable read access for users based on user_id"
ON api_keys FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "Enable insert access for users based on user_id"
ON api_keys FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Enable update access for users based on user_id"
ON api_keys FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Enable delete access for users based on user_id"
ON api_keys FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);