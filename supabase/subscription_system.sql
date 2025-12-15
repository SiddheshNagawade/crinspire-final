-- Migration: Complete Subscription System with Auto-Cancellation
-- Run this in Supabase SQL Editor

-- 1) Create subscriptions table if not exists
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'monthly',
  price numeric(10, 2) not null default 0,
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, start_date)
);

-- 2) Create indexes on subscriptions
create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id);
create index if not exists idx_subscriptions_end_date on public.subscriptions (end_date);

-- 3) Enable RLS on subscriptions
alter table public.subscriptions enable row level security;

-- 4) RLS Policies for subscriptions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_select_own'
  ) then
    create policy "subscriptions_select_own" on public.subscriptions
      for select using (auth.uid() = user_id or public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_insert_own'
  ) then
    create policy "subscriptions_insert_own" on public.subscriptions
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- 5) Function to check if user has active subscription
create or replace function public.is_premium_active(p_user_id uuid)
returns boolean as $$
declare
  v_active_sub boolean;
begin
  select exists(
    select 1 from public.subscriptions
    where user_id = p_user_id and end_date > now()
    limit 1
  ) into v_active_sub;
  
  return coalesce(v_active_sub, false);
end;
$$ language plpgsql security definer;

-- 6) Function to get current subscription details
create or replace function public.get_active_subscription(p_user_id uuid)
returns table(
  id uuid,
  tier text,
  start_date timestamptz,
  end_date timestamptz,
  days_remaining integer
) as $$
begin
  return query
  select 
    s.id,
    s.tier,
    s.start_date,
    s.end_date,
    floor(extract(epoch from (s.end_date - now())) / 86400)::integer as days_remaining
  from public.subscriptions s
  where s.user_id = p_user_id and s.end_date > now()
  order by s.end_date desc
  limit 1;
end;
$$ language plpgsql security definer;

-- 7) Function to auto-cancel expired subscriptions and update profiles
create or replace function public.auto_cancel_expired_subscriptions()
returns table(cancelled_count integer) as $$
declare
  v_cancelled_count integer;
begin
  -- Find all expired subscriptions where is_premium is still true
  with expired as (
    select distinct p.id
    from public.profiles p
    where p.is_premium = true
      and not exists (
        select 1 from public.subscriptions s
        where s.user_id = p.id and s.end_date > now()
      )
  )
  update public.profiles
  set 
    is_premium = false,
    subscription_expiry_date = null
  where id in (select id from expired);

  get diagnostics v_cancelled_count = row_count;

  return query select v_cancelled_count;
end;
$$ language plpgsql security definer;

-- 8) Create a scheduled job to auto-cancel expired subscriptions (daily at 00:00 UTC)
-- Note: This requires pg_cron extension enabled on your Supabase project
-- Contact Supabase support to enable pg_cron if not already enabled
-- Uncomment the line below if pg_cron is enabled:
-- select cron.schedule('auto-cancel-expired-subscriptions', '0 0 * * *', 'select public.auto_cancel_expired_subscriptions()');

-- If pg_cron is not available, auto-cancellation will run:
-- - On every app session load (checkUserSession checks expiry)
-- - Via manual trigger: SELECT public.auto_cancel_expired_subscriptions();

-- 9) Grant function execute permissions
grant execute on function public.is_premium_active(uuid) to authenticated;
grant execute on function public.get_active_subscription(uuid) to authenticated;
grant execute on function public.auto_cancel_expired_subscriptions() to authenticated;

-- 10) Notes:
-- - When user completes payment, verify-payment function now updates profiles.is_premium = true
-- - Each day, expired subscriptions are detected and is_premium is set to false
-- - Manual trigger: SELECT public.auto_cancel_expired_subscriptions();
-- - Check active subscription: SELECT * FROM public.get_active_subscription(user_id);
-- - Check if premium: SELECT public.is_premium_active(user_id);
