-- Add option_details column to questions table (used for MCQ/MSQ option objects including images)
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS option_details jsonb;

-- Ensure position exists (ordering)
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_questions_paper_position
ON public.questions(paper_id, position);

-- Backfill position for existing rows where null
UPDATE public.questions
SET position = 0
WHERE position IS NULL;

-- Ask PostgREST (Supabase API) to reload schema cache (works on Supabase)
NOTIFY pgrst, 'reload schema';
