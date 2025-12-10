-- Migration: Harden public.is_admin() to avoid casting empty strings and be more robust.
-- Run in Supabase SQL Editor.

-- Create a safe is_admin() implementation that:
-- - checks user_id only when auth.uid() is present and non-empty
-- - falls back to email check using jwt.claims.email
-- - avoids casting ''::uuid which causes errors

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE (
      aw.user_id IS NOT NULL
      AND auth.uid() IS NOT NULL
      AND aw.user_id::text = auth.uid()::text
    )
    OR (
      aw.email IS NOT NULL
      AND lower(aw.email) = lower(current_setting('jwt.claims.email', true))
    )
  );
$$;

-- After running this, test inserting into public.papers while signed in as the admin user.
-- If you still see RLS errors, follow the debugging steps below.
