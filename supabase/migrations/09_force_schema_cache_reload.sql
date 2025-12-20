-- URGENT: Force Supabase schema cache reload
-- The 'position' column exists but PostgREST API cache doesn't see it yet

-- Ensure position column exists
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Update all questions to have valid positions if not set (using CTE to avoid window function error)
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

-- Recreate index to refresh metadata
DROP INDEX IF EXISTS idx_questions_paper_section_position;
CREATE INDEX idx_questions_paper_section_position
ON public.questions(paper_id, section_name, position);

-- FORCE PostgREST schema cache reload (this is the critical fix)
NOTIFY pgrst, 'reload schema';

-- Alternative: If above doesn't work, run these in Supabase CLI:
-- supabase db push
-- or restart the PostgREST service in Supabase Dashboard

-- Verify column exists:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'questions' AND column_name = 'position';
