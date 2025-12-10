-- Supabase schema for routing-crinspire-exam-simulator
-- Creates core tables, indexes, triggers and RLS policies recommended by the project checklist.
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query).

-- NOTE: This file is idempotent (uses IF NOT EXISTS / DROP IF EXISTS where appropriate).

-----------------------------
-- Extensions
-----------------------------
-- pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-----------------------------
-- profiles
-----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  age integer,
  is_premium boolean default false,
  subscription_start_date timestamptz,
  subscription_expiry_date timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_email on public.profiles (email);
create unique index if not exists profiles_email_unique on public.profiles (email);

-- Ensure is_premium defaults to false (for separating free vs premium users)
-- Update existing rows without a default set
alter table public.profiles alter column is_premium set default false;
alter table public.profiles alter column is_premium set not null;

-- Index on is_premium for efficient filtering of subscription status
create index if not exists idx_profiles_is_premium on public.profiles (is_premium);

-----------------------------
-- admin_whitelist
-----------------------------
create table if not exists public.admin_whitelist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-----------------------------
-- Helper: is_admin() checks admin_whitelist for current jwt email
-----------------------------
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.admin_whitelist aw
    where aw.email = current_setting('jwt.claims.email', true)
  );
$$;

-----------------------------
-- papers
-----------------------------
create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year integer,
  exam_type text,
  duration_minutes integer,
  is_premium boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_papers_year_exam_type on public.papers (year, exam_type);

-----------------------------
-- questions
-----------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.papers(id) on delete cascade,
  section_name text,
  text text,
  image_url text,
  type text,
  marks numeric,
  negative_marks numeric,
  options jsonb,
  correct_answer jsonb,
  category text,
  created_at timestamptz default now()
);

create index if not exists idx_questions_paper_id on public.questions (paper_id);

-----------------------------
-- user_attempts
-----------------------------
create table if not exists public.user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  paper_id uuid references public.papers(id) on delete cascade,
  responses jsonb,
  time_spent integer,
  score numeric,
  max_score numeric,
  accuracy numeric,
  created_at timestamptz default now()
);

create index if not exists idx_user_attempts_user_id on public.user_attempts (user_id);
create index if not exists idx_user_attempts_paper_id on public.user_attempts (paper_id);
create index if not exists idx_user_attempts_created_at on public.user_attempts (created_at desc);

-----------------------------
-- Trigger: auto-create profile on new auth.users
-----------------------------
-- Function that creates profiles for new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Insert basic profile if not exists
  insert into public.profiles (id, email, full_name, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.user_metadata ->> 'full_name', ''),
    now()
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-----------------------------
-- RLS: Enable and policies
-----------------------------

-- profiles: enable RLS
alter table public.profiles enable row level security;

-- Allow users to select/insert/update their own profile
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- admin_whitelist: enable RLS
alter table public.admin_whitelist enable row level security;
create policy "admin_whitelist_select_auth" on public.admin_whitelist
  for select using (auth.role() = 'authenticated');

-- papers: enable RLS
alter table public.papers enable row level security;
-- allow public SELECT
create policy "papers_select_public" on public.papers
  for select using (true);
-- allow admin to insert/update/delete
drop policy if exists "papers_mod_auth" on public.papers;
create policy "papers_mod_admin" on public.papers
  for all using (public.is_admin()) with check (public.is_admin());

-- questions: enable RLS
alter table public.questions enable row level security;
create policy "questions_select_public" on public.questions
  for select using (true);
create policy "questions_mod_admin" on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- user_attempts: enable RLS
alter table public.user_attempts enable row level security;
create policy "attempts_insert_own" on public.user_attempts
  for insert with check (auth.uid() = user_id);
create policy "attempts_select_own_or_admin" on public.user_attempts
  for select using (auth.uid() = user_id or public.is_admin());

-----------------------------
-- Subscription expiry helper
-----------------------------
-- Function to expire premium subscriptions (run via a scheduled job externally)
create or replace function public.expire_subscriptions()
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set is_premium = false
  where subscription_expiry_date is not null and subscription_expiry_date < now() and is_premium = true;
end;
$$;

-----------------------------
-- Notes for Storage (buckets)
-----------------------------
-- Create a storage bucket named `exam-images` via Supabase Dashboard: Storage -> Create new bucket
-- Recommended settings:
-- - Public read access: enable if you want images accessible without signed URLs.
-- - To restrict uploads/deletes to admins/authenticated users, use RLS policies on the Storage API or control access in your server logic.

-----------------------------
-- Helpful indexes and considerations
-----------------------------
-- Consider partial indexes for frequently queried columns or full text search.

-- End of schema