-- Migration: Add account_status to users table
-- Purpose: Support Suspended and Banned account states

BEGIN;

-- 1. Create the account_status_type ENUM if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status_type') THEN
        CREATE TYPE account_status_type AS ENUM ('Active', 'Suspended', 'Banned');
    END IF;
END$$;

-- 2. Add the account_status column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_status account_status_type NOT NULL DEFAULT 'Active';

-- 3. Ensure consistency: if is_active is false but no status set (for existing deactivated users), or vice versa
-- For existing data, if is_active is false, we'll default it to 'Suspended' unless it's a soft delete
UPDATE users 
SET account_status = 'Suspended' 
WHERE is_active = FALSE AND deleted_at IS NULL AND account_status = 'Active';

COMMIT;
