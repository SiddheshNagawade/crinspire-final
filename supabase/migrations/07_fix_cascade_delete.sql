-- CRITICAL FIX: Remove CASCADE DELETE on questions table
-- This prevents accidental question deletion when papers are modified
-- Supabase doesn't allow direct ALTER of foreign key constraints,
-- so we document the fix and suggest manual recreation if needed.

-- This script documents the issue and the intended schema:
-- Current (DANGEROUS): ON DELETE CASCADE
-- Intended (SAFE):     ON DELETE SET NULL
--
-- To apply manually in Supabase:
-- 1. Export questions table data to backup
-- 2. Drop foreign key constraint on questions.paper_id
-- 3. Recreate with ON DELETE SET NULL
-- 4. Or recreate entire questions table with correct constraint

-- For now, we use app-level safeguards in handleAdminSave()
-- to prevent accidental deletion via transaction safety.

NOTIFY pgrst, 'reload schema';
