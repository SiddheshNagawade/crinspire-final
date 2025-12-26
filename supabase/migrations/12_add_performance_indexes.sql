-- =============================================
-- Migration: Add performance indexes for admin operations
-- =============================================
-- This migration adds covering indexes to prevent statement timeouts
-- when fetching/deleting exams with many questions.

-- Index for efficient question fetching with ordering
-- Covers the query: paper_id IN (...) ORDER BY paper_id, section_name, position, created_at
create index concurrently if not exists idx_questions_paper_section_pos_created
  on public.questions (paper_id, section_name, position, created_at);

-- Index for sections ordering
create index concurrently if not exists idx_sections_paper_position
  on public.sections (paper_id, position);

-- Index for efficient paper_id lookups (if not already present)
create index concurrently if not exists idx_questions_paper_id
  on public.questions (paper_id);

-- Index for user_attempts cleanup during exam deletion
create index concurrently if not exists idx_user_attempts_paper_id
  on public.user_attempts (paper_id);

-- Comments
comment on index idx_questions_paper_section_pos_created is 'Composite index for fast question fetching with section/position ordering';
comment on index idx_sections_paper_position is 'Index for deterministic section ordering';
comment on index idx_questions_paper_id is 'Fast paper_id lookup for deletion cascades';
comment on index idx_user_attempts_paper_id is 'Fast cleanup of user attempts during exam deletion';
