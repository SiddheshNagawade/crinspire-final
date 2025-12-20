-- Create a dedicated `sections` table for stable section ordering
-- This replaces relying on implicit sections from questions.section_name

CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(paper_id, name)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_sections_paper_id_position 
ON public.sections(paper_id, position);

-- Add foreign key from questions to sections (optional but recommended for data integrity)
-- Assuming questions.section_name is TEXT. This is a soft reference via name + paper_id.
-- We'll keep questions.section_name as-is for backward compatibility.

-- Backfill existing sections from questions
-- For each paper, extract unique section_name values and assign positions
INSERT INTO public.sections (paper_id, name, position)
SELECT DISTINCT
    q.paper_id,
    q.section_name,
    ROW_NUMBER() OVER (PARTITION BY q.paper_id ORDER BY MIN(q.created_at)) - 1 AS rn
FROM public.questions q
WHERE q.section_name IS NOT NULL
    AND q.paper_id IS NOT NULL
GROUP BY q.paper_id, q.section_name
ON CONFLICT (paper_id, name) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
