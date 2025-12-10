-- Admin Setup and Debug Script
-- Run this in Supabase SQL Editor to verify and set up admin access

-----------------------------
-- 1. VERIFY ADMIN WHITELIST
-----------------------------
-- See all whitelisted admin emails
SELECT 'Admin Whitelist Contents:' as status;
SELECT email, created_at FROM public.admin_whitelist ORDER BY created_at DESC;

-- Count total admins
SELECT COUNT(*) as total_admins FROM public.admin_whitelist;

-----------------------------
-- 2. CHECK AUTH USERS
-----------------------------
-- See all auth users and their emails
SELECT 'Auth Users in System:' as status;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-----------------------------
-- 3. VERIFY SPECIFIC ADMIN
-----------------------------
-- Check if your email exists in admin_whitelist
SELECT 'Is siddheshnagawade1807@gmail.com in admin_whitelist?' as question;
SELECT EXISTS(
  SELECT 1 FROM public.admin_whitelist 
  WHERE email = 'siddheshnagawade1807@gmail.com'
) as is_whitelisted;

-- Check if auth account exists for your email
SELECT 'Does auth.users have siddheshnagawade1807@gmail.com?' as question;
SELECT EXISTS(
  SELECT 1 FROM auth.users 
  WHERE email = 'siddheshnagawade1807@gmail.com'
) as auth_exists;

-----------------------------
-- 4. TROUBLESHOOTING CHECKS
-----------------------------
-- View profiles linked to your email
SELECT 'Profiles with your email:' as status;
SELECT id, email, full_name, is_premium, created_at 
FROM public.profiles 
WHERE email = 'siddheshnagawade1807@gmail.com';

-- Check if is_admin() function works
SELECT 'Testing is_admin() function:' as status;
SELECT public.is_admin() as is_admin_now;

-----------------------------
-- 5. RLS POLICIES CHECK
-----------------------------
-- View RLS policies on admin_whitelist
SELECT 'RLS Policies on admin_whitelist:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'admin_whitelist';

-----------------------------
-- 6. FIX: IF EMAIL NOT IN WHITELIST
-----------------------------
-- Uncomment and run if your email is NOT in the whitelist:
-- INSERT INTO public.admin_whitelist (email) 
-- VALUES ('siddheshnagawade1807@gmail.com');

-----------------------------
-- 7. FIX: IF AUTH ACCOUNT DOESN'T EXIST
-----------------------------
-- You must create an auth account via the Supabase Dashboard UI:
-- 1. Go to Supabase Dashboard -> Authentication -> Users
-- 2. Click "Add User" or "Invite User"
-- 3. Enter: siddheshnagawade1807@gmail.com
-- 4. Set a password (or send invite link)
-- 5. Confirm the email

-----------------------------
-- SUMMARY CHECKS
-----------------------------
-- Run all these together to get full status
SELECT 'ADMIN SETUP VERIFICATION' as check_type;
SELECT COUNT(*) as admins_in_whitelist FROM public.admin_whitelist;
SELECT COUNT(*) as total_auth_users FROM auth.users;
SELECT 
  CASE WHEN EXISTS(SELECT 1 FROM public.admin_whitelist WHERE email = 'siddheshnagawade1807@gmail.com') 
    THEN 'YES - Email in whitelist' 
    ELSE 'NO - Email NOT in whitelist' 
  END as email_whitelisted,
  CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'siddheshnagawade1807@gmail.com') 
    THEN 'YES - Auth account exists' 
    ELSE 'NO - Auth account missing' 
  END as auth_account_exists;
