-- Migration: create subscriptions table and subscription -> profile sync
-- Run in Supabase SQL editor or via migrations runner

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add necessary columns to profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expiry_date timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('monthly','six_months','quarterly','yearly')),
  price numeric(10,2) NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Function: refresh_profile_subscription(user_id)
-- This will set profiles.is_premium and subscription_start/expiry based on active subscriptions
CREATE OR REPLACE FUNCTION public.refresh_profile_subscription(p_user_id uuid)
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT id, tier, price, start_date, end_date
  INTO rec
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND start_date <= now()
    AND end_date > now()
  ORDER BY end_date DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
    SET is_premium = true,
        subscription_start_date = rec.start_date,
        subscription_expiry_date = rec.end_date
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET is_premium = false,
        subscription_start_date = NULL,
        subscription_expiry_date = NULL
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to call refresh on changes
CREATE OR REPLACE FUNCTION public.subscriptions_change_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_profile_subscription(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_profile_subscription(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to subscriptions table
DROP TRIGGER IF EXISTS trg_subscriptions_change ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_change
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.subscriptions_change_trigger();

-- Optional: ensure profiles for existing users are in sync (one-time run)
-- You can run the following to initialize profile flags from current subscriptions:
-- SELECT public.refresh_profile_subscription(id) FROM auth.users;
