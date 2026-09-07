-- Migration: Add role-based access to mediateca folders

BEGIN;

-- Add roles column to mediateca_folders
ALTER TABLE mediateca_folders
  ADD COLUMN IF NOT EXISTS allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS folder_description TEXT NOT NULL DEFAULT '';

-- Create index for faster role queries
CREATE INDEX IF NOT EXISTS mediateca_folders_allowed_roles_idx ON mediateca_folders USING gin(allowed_roles);

COMMIT;
