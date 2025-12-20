-- COMPREHENSIVE FIX: Ensure safe question ordering and prevent accidental deletion
-- This migration:
-- 1. Ensures position column exists and is properly indexed
-- 2. Backfills position for any NULL rows
-- 3. Documents the CASCADE DELETE issue (manual fix needed in Supabase)

-- Add position column if it doesn't exist
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Backfill position for any NULL or zero rows (using CTE to avoid window function error)
WITH numbered_questions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY paper_id, section_name ORDER BY created_at ASC) as row_num
  FROM public.questions
  WHERE position IS NULL OR position = 0
)
UPDATE public.questions q
SET position = nq.row_num
FROM numbered_questions nq
WHERE q.id = nq.id;

-- Create composite index for efficient ordering per exam + section
CREATE INDEX IF NOT EXISTS idx_questions_paper_section_position
ON public.questions(paper_id, section_name, position);

-- Reload PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';

-- IMPORTANT NOTE:
-- The current schema has "ON DELETE CASCADE" on questions.paper_id
-- This means deleting a paper deletes ALL its questions!
-- 
-- The app-level fix in handleAdminSave() now uses UPSERT instead of DELETE+INSERT
-- to prevent accidental question loss. However, manually applying the schema fix is recommended:
--
-- To fix in Supabase manually:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Run:
--    ALTER TABLE questions DROP CONSTRAINT questions_paper_id_fkey;
--    ALTER TABLE questions ADD CONSTRAINT questions_paper_id_fkey 
--      FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE SET NULL;
-- 3. Verify: SELECT constraint_name FROM information_schema.table_constraints 
--           WHERE table_name='questions' AND constraint_type='FOREIGN KEY';
--
-- This way, if a paper is deleted, questions are preserved (paper_id becomes NULL)
-- instead of being automatically deleted.
