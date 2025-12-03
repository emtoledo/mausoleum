-- Initialize the first master admin
-- Run this after creating the master_admins table

-- Insert the first master admin
-- Note: Replace the email with the actual email from auth.users for this UID
INSERT INTO master_admins (id, email, name)
VALUES (
  '7d84fab0-b48c-4c81-a859-838761a1218d',
  (SELECT email FROM auth.users WHERE id = '7d84fab0-b48c-4c81-a859-838761a1218d'),
  'Master Admin'
)
ON CONFLICT (id) DO NOTHING;

