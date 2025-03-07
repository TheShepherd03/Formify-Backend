-- Add user_id column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Update existing forms to have a default user if any exist
UPDATE forms SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;

-- Make user_id required for new forms
ALTER TABLE forms ALTER COLUMN user_id SET NOT NULL;
