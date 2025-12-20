-- Add section_index column to preserve section ordering
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS section_index INTEGER DEFAULT 0;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_questions_section_index 
ON questions(paper_id, section_index, section_name);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
