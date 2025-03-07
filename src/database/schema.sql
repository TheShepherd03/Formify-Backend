-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS but allow all operations for now since we're handling auth in our service
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (we handle authorization in our service)
CREATE POLICY users_all ON users FOR ALL USING (true);

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS service_role_manage_users ON users;
