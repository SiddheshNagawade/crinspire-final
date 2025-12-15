-- Migration: Add exam_submissions for review flow
-- Run this in Supabase SQL Editor

create table if not exists public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.papers(id) on delete cascade,
  student_answers jsonb not null,
  total_marks numeric not null,
  total_questions integer not null,
  passed boolean,
  submitted_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours'),
  constraint exam_submissions_valid_marks check (total_marks >= -1000000)
);

create index if not exists idx_exam_submissions_user on public.exam_submissions(user_id);
create index if not exists idx_exam_submissions_exam on public.exam_submissions(exam_id);

alter table public.exam_submissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_submissions' and policyname='exam_submissions_select_own'
  ) then
    create policy "exam_submissions_select_own" on public.exam_submissions
      for select using (auth.uid() = user_id or public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_submissions' and policyname='exam_submissions_insert_own'
  ) then
    create policy "exam_submissions_insert_own" on public.exam_submissions
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- Optional: cleanup expired submissions via cron if available
-- select cron.schedule('cleanup-expired-submissions', '0 1 * * *', $$delete from public.exam_submissions where expires_at < now();$$);
