-- Migration: Track completed exams for users
-- Adds a table to store which exams have been fully completed by users

CREATE TABLE IF NOT EXISTS public.completed_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, exam_id),
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_completed_exams_user_id ON public.completed_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_exams_exam_id ON public.completed_exams(exam_id);

-- Enable RLS
ALTER TABLE public.completed_exams ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view/edit their own completed exams
CREATE POLICY "Users can view their own completed exams"
  ON public.completed_exams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completed exams"
  ON public.completed_exams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed exams"
  ON public.completed_exams FOR DELETE
  USING (auth.uid() = user_id);
