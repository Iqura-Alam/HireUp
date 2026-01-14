-- Add user_id to employer table to link with users table
ALTER TABLE employer 
ADD COLUMN IF NOT EXISTS user_id BIGINT UNIQUE REFERENCES users(user_id) ON DELETE CASCADE;
