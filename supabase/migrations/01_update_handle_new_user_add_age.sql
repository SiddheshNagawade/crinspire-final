-- Migration: Update handle_new_user trigger to also store age from auth metadata
-- This reads `age` from new.raw_user_meta_data or new.user_metadata and safely casts to integer.
-- Run this in Supabase SQL Editor (or via migrations).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_full_name text;
  v_age integer;
BEGIN
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.user_metadata ->> 'full_name', '');
  -- Safely parse age: if empty string, keep NULL
  IF (coalesce(new.raw_user_meta_data ->> 'age', new.user_metadata ->> 'age', '') = '') THEN
    v_age := NULL;
  ELSE
    BEGIN
      v_age := (coalesce(new.raw_user_meta_data ->> 'age', new.user_metadata ->> 'age'))::integer;
    EXCEPTION WHEN others THEN
      v_age := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, age, created_at)
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_age,
    now()
  ) ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;
