-- Add position column to questions table to preserve insertion order
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_questions_paper_position 
ON public.questions(paper_id, position);

-- Backfill existing questions with position based on created_at
-- This preserves the original insertion order for existing data
WITH numbered_questions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY paper_id ORDER BY created_at) as row_num
  FROM public.questions
)
UPDATE public.questions q
SET position = nq.row_num
FROM numbered_questions nq
WHERE q.id = nq.id;
