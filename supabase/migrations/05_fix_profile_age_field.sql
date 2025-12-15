-- Migration: Fix user profile creation to include age field
-- This updates the handle_new_user trigger to properly save the age field from signup metadata

-- Drop the old trigger
drop trigger if exists on_auth_user_created on auth.users;

-- Drop the old function
drop function if exists public.handle_new_user();

-- Create the improved function that saves both full_name and age
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Insert profile with both full_name and age from user metadata
  insert into public.profiles (id, email, full_name, age, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.user_metadata ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'age')::integer, (new.user_metadata ->> 'age')::integer, null),
    now()
  ) on conflict (id) do nothing;
  return new;
end;
$$;

-- Recreate the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Verify the profiles table has the age column
-- (It should already exist, but this ensures it does)
alter table public.profiles add column if not exists age integer;
