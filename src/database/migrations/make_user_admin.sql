-- Make a specific user an admin by their email
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
