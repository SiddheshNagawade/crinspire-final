-- Migration: Link admin_whitelist entries to auth.users by user_id
-- Safe, idempotent steps to add `user_id`, populate it from `auth.users` by email,
-- add a unique index and FK constraint, and update the `is_admin()` helper to prefer user_id.
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query).

-----------------------------
-- 1) Add column `user_id` if missing
-----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_whitelist' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.admin_whitelist ADD COLUMN user_id uuid;
  END IF;
END$$;

-----------------------------
-- 2) Populate user_id by matching emails (case-insensitive)
-----------------------------
-- This will set user_id for rows where a corresponding auth.users.email exists.
UPDATE public.admin_whitelist aw
SET user_id = u.id
FROM auth.users u
WHERE aw.user_id IS NULL
  AND lower(aw.email) = lower(u.email);

-----------------------------
-- 3) Create a unique partial index on user_id (only for non-null entries)
-----------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_whitelist_user_id_unique
ON public.admin_whitelist (user_id)
WHERE user_id IS NOT NULL;

-----------------------------
-- 4) Add foreign key constraint to auth.users(id) if not exists
-- Note: Postgres does not support ADD CONSTRAINT IF NOT EXISTS, so use a DO block.
-----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_whitelist_user_id_fkey'
  ) THEN
    ALTER TABLE public.admin_whitelist
      ADD CONSTRAINT admin_whitelist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;

-----------------------------
-- 5) Replace is_admin() helper to prefer user_id, fallback to email
-----------------------------
-- This function uses `auth.uid()` (Supabase auth helper) to check the JWT subject.
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
         OR (aw.email IS NOT NULL AND lower(aw.email) = lower(current_setting('jwt.claims.email', true)))
  );
$$;

-----------------------------
-- 6) Optional: If you want to enforce that every whitelist row with a matching auth user must have user_id set,
-- you can run the following to update remaining rows and then set the column NOT NULL. Proceed only after verifying.
--
-- UPDATE public.admin_whitelist aw
-- SET user_id = u.id
-- FROM auth.users u
-- WHERE aw.user_id IS NULL
--   AND lower(aw.email) = lower(u.email);
--
-- ALTER TABLE public.admin_whitelist ALTER COLUMN user_id SET NOT NULL;
--
-- Use caution before setting NOT NULL: ensure every row has a valid user_id.

-- End of migration
