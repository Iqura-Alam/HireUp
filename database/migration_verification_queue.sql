-- Migration: Add is_verified column to employer and trainer_profile tables
-- Purpose: Implement User & Identity Management Verification Queue

BEGIN;

-- Add is_verified to employer
ALTER TABLE employer 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Add is_verified to trainer_profile
ALTER TABLE trainer_profile 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
