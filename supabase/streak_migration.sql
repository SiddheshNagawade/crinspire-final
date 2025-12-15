-- Migration: Add Daily Streak Tracking to Profiles
-- Run this in Supabase SQL Editor

-- 1) Add streak columns to profiles table
alter table public.profiles
  add column if not exists current_streak integer default 0,
  add column if not exists longest_streak integer default 0,
  add column if not exists last_activity_date date default null,
  add column if not exists streak_updated_at timestamptz default now();

-- 2) Create user_activity table to track daily exam attempts
create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  exam_attempted boolean default false,
  questions_attempted integer default 0,
  created_at timestamptz default now(),
  unique(user_id, activity_date)
);

-- 3) Create indexes for faster queries
create index if not exists idx_user_activity_user_id on public.user_activity (user_id);
create index if not exists idx_user_activity_date on public.user_activity (activity_date);
create index if not exists idx_user_activity_user_date on public.user_activity (user_id, activity_date);

-- Always drop before recreate to avoid return type mismatch errors
drop function if exists public.update_user_streak(uuid);

create or replace function public.update_user_streak(p_user_id uuid)
returns table(current_streak integer, longest_streak integer, last_activity_date date) as $$
declare
  v_today date := current_date;
  v_yesterday date := current_date - interval '1 day';
  v_last_activity_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_has_activity_today boolean;
begin
  -- Get user's current streak info
  select last_activity_date, current_streak, longest_streak
  into v_last_activity_date, v_current_streak, v_longest_streak
  from public.profiles where id = p_user_id;

  -- Default values if user is new
  if v_current_streak is null then
    v_current_streak := 0;
  end if;
  if v_longest_streak is null then
    v_longest_streak := 0;
  end if;

  -- Check if user has activity today
  select exam_attempted into v_has_activity_today
  from public.user_activity
  where user_id = p_user_id and activity_date = v_today;

  -- If already has activity today, don't update streak again
  if v_has_activity_today then
    -- Fix: Ensure the return matches the RETURNS TABLE signature (3 columns)
    return query select v_current_streak, v_longest_streak, v_last_activity_date;
    return;
  end if;

  -- If last activity was yesterday, increment streak
  if v_last_activity_date = v_yesterday then
    v_current_streak := v_current_streak + 1;
  -- If last activity was today or null, start/continue streak
  elsif v_last_activity_date = v_today then
    -- Already counted today, no change
    null;
  -- If last activity was more than 1 day ago, reset streak
  else
    v_current_streak := 1;
  end if;

  -- Update longest streak if current exceeds it
  if v_current_streak > v_longest_streak then
    v_longest_streak := v_current_streak;
  end if;

  -- Update profiles table
  update public.profiles
  set 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    streak_updated_at = now()
  where id = p_user_id;

  -- Insert or update activity log
  insert into public.user_activity (user_id, activity_date, exam_attempted)
  values (p_user_id, v_today, true)
  on conflict (user_id, activity_date)
  do update set exam_attempted = true;

  return query select v_current_streak, v_longest_streak, v_today::date;
end;
$$ language plpgsql security definer;

-- 5) Function to check streak status (useful for frontend)
create or replace function public.check_user_streak(p_user_id uuid)
returns table(
  current_streak integer,
  longest_streak integer,
  last_activity_date date,
  days_until_reset integer
) as $$
declare
  v_last_activity_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_days_until_reset integer;
begin
  select 
    last_activity_date,
    current_streak,
    longest_streak
  into v_last_activity_date, v_current_streak, v_longest_streak
  from public.profiles
  where id = p_user_id;

  -- Calculate days until streak resets (if user doesn't do activity tomorrow)
  if v_last_activity_date = current_date then
    v_days_until_reset := 1; -- Reset tomorrow if no activity
  elsif v_last_activity_date = current_date - interval '1 day' then
    v_days_until_reset := 1; -- Reset tomorrow if no activity
  else
    v_days_until_reset := 0; -- Already reset
  end if;

  return query select v_current_streak, v_longest_streak, v_last_activity_date, v_days_until_reset;
end;
$$ language plpgsql security definer;

-- 6) Enable RLS on user_activity table
alter table public.user_activity enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_activity' and policyname = 'users_view_own_activity'
  ) then
    create policy "users_view_own_activity" on public.user_activity
      for select using (auth.uid() = user_id or public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_activity' and policyname = 'users_insert_own_activity'
  ) then
    create policy "users_insert_own_activity" on public.user_activity
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_activity' and policyname = 'users_update_own_activity'
  ) then
    create policy "users_update_own_activity" on public.user_activity
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- 9) Ensure RLS and policies on profiles for streak updates
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    create policy "profiles_select_own" on public.profiles
      for select using (id = auth.uid() or public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own_streak'
  ) then
    create policy "profiles_update_own_streak" on public.profiles
      for update
      using (id = auth.uid())
      with check (
        id = auth.uid()
      );
  end if;
end $$;

-- 10) Grant function execute to authenticated users
revoke all on function public.update_user_streak(uuid) from public;
grant execute on function public.update_user_streak(uuid) to authenticated;

revoke all on function public.check_user_streak(uuid) from public;
grant execute on function public.check_user_streak(uuid) to authenticated;

-- 8) Notes:
-- - When user completes an exam, call: SELECT public.update_user_streak(current_user_id)
-- - To check streak: SELECT * FROM public.check_user_streak(current_user_id)
-- - current_streak: How many consecutive days the user has been active
-- - longest_streak: Highest streak achieved by the user
-- - last_activity_date: Last date user attempted an exam
-- - If user misses 1 day, streak resets to 0
-- - Streak increments only once per day even if multiple exams completed
