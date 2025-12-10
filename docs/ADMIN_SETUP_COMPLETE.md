# Complete Admin Setup Guide

This guide will help you get admin access working step by step.

## The Problem

You added `siddheshnagawade1807@gmail.com` to `admin_whitelist`, but login still says "Access denied."

**Why?** Two things must be true for admin access:
1. ✅ Email must be in `admin_whitelist` table (you did this)
2. ❌ Supabase auth account must exist with that email (you might be missing this)

## The Solution

### Step 1: Verify Email is in Whitelist ✅

Run this in Supabase SQL Editor:

```sql
SELECT email FROM public.admin_whitelist 
WHERE email = 'siddheshnagawade1807@gmail.com';
```

If you see your email → ✅ Step 1 complete
If you don't see it → Run this to add it:
```sql
INSERT INTO public.admin_whitelist (email) 
VALUES ('siddheshnagawade1807@gmail.com');
```

### Step 2: Create Auth Account (This is likely what's missing) ❌

**IMPORTANT: You MUST create a Supabase auth account with your email!**

#### Option A: Create via Supabase Dashboard UI (Recommended)

1. Go to your Supabase project
2. Click **Authentication** in the left sidebar
3. Click **Users** tab
4. Click **Add user** button (top right)
5. Fill in:
   - Email: `siddheshnagawade1807@gmail.com`
   - Password: (create a strong password, e.g., `Admin@12345`)
   - Auto confirm user email: **Toggle ON** (optional but recommended)
6. Click **Save**

**Now you have:**
- ✅ Email in whitelist
- ✅ Auth account created

#### Option B: Create via SQL (Advanced)

Only if you have direct access to the `auth.users` table. Run in SQL Editor:

```sql
-- Note: In most cases, this won't work because auth.users requires
-- special Supabase admin functions. Use Option A instead.
```

### Step 3: Login Test

1. Go to your app → **Instructor** tab
2. Enter:
   - Email: `siddheshnagawade1807@gmail.com`
   - Password: (the password you set in Step 2)
3. Click **Sign In**

Expected results:
- ✅ If whitelist + auth account both exist → **Access granted, admin panel opens**
- ❌ If only whitelist exists → "Access denied. Your email is not authorized..."
- ❌ If only auth account exists → "Invalid credentials" (wrong password) or auth error

### Step 4: Verify Everything Works

After successful login:
1. You should see the **Admin Panel** button in the top navbar
2. The admin dashboard should load without "Access denied" message
3. You can create, edit, and delete exams

## Troubleshooting

### Error: "Access denied. Your email is not authorized as an instructor."

**Cause:** Email is NOT in `admin_whitelist` table

**Fix:**
```sql
-- Check if email is in whitelist
SELECT * FROM public.admin_whitelist 
WHERE email = 'siddheshnagawade1807@gmail.com';

-- If nothing returned, add it:
INSERT INTO public.admin_whitelist (email) 
VALUES ('siddheshnagawade1807@gmail.com');
```

### Error: "Invalid credentials" or "Auth error"

**Cause:** Auth account doesn't exist, or password is wrong

**Fix:**
1. Go to Supabase Dashboard → **Authentication → Users**
2. Look for your email in the list
3. If it exists → Try your password again (case-sensitive)
4. If it doesn't exist → Create it (follow Step 2)

### Error: "Email doesn't exist" (registration error)

**Cause:** Trying to sign up instead of sign in

**Fix:**
1. Make sure you're on the **Instructor** tab (not Candidate)
2. Use **Sign In** (not Register)
3. If you don't have an auth account yet, create it first (Step 2)

### Still Not Working?

Run the debug script:

```sql
-- Copy the entire contents of docs/ADMIN_SETUP_DEBUG.sql
-- and run in Supabase SQL Editor
```

This will show you:
- All emails in admin_whitelist
- All emails in auth.users
- Whether YOUR email exists in both
- Any RLS policy issues

## Quick Checklist

- [ ] Email is in `admin_whitelist` table
- [ ] Auth account exists in Supabase Authentication
- [ ] Password is correct and case-sensitive
- [ ] Using "Sign In" (not "Register") on Instructor tab
- [ ] Not using the demo account (123@gmail.com | 123)
- [ ] Browser refresh after login (in case of cache issues)

## Common Mistakes

❌ **Mistake 1:** Added email to whitelist but forgot to create auth account
- **Fix:** Create auth account in Supabase Dashboard (Step 2)

❌ **Mistake 2:** Email is lowercase in whitelist but uppercase in auth account
- **Fix:** Make sure email case matches exactly

❌ **Mistake 3:** Password has spaces or special characters
- **Fix:** Verify password is typed correctly (passwords are case-sensitive)

❌ **Mistake 4:** Trying to use demo credentials (123@gmail.com | 123)
- **Fix:** Use your real email + password from auth account

❌ **Mistake 5:** Not confirming email in auth
- **Fix:** Check "Auto confirm user email" when creating auth account, or click confirmation link

## Architecture Overview

```
User Login
    ↓
Email checked against admin_whitelist table
    ↓
If NOT in whitelist → "Access denied" ❌
    ↓
If in whitelist → Check auth credentials with Supabase ✅
    ↓
If password correct → Login success, admin panel shows ✅
    ↓
If password wrong → "Invalid credentials" ❌
```

## Security Notes

✅ **What's Secure:**
- Only whitelisted emails can attempt login
- Passwords are verified by Supabase auth (encrypted)
- Admin panel only shows after successful auth
- Double-check on app load ensures current user is still admin

⚠️ **Important:**
- Each admin must have their own auth account with a strong password
- Don't share passwords
- Remove emails from whitelist when admins leave

## Next Steps

1. **Verify whitelist:**
   - Run the SQL check to confirm email is in admin_whitelist

2. **Create auth account:**
   - Go to Supabase Dashboard → Authentication → Users → Add user

3. **Test login:**
   - Use your email + password to login as Instructor

4. **Access admin panel:**
   - Click Admin button to manage exams

5. **Add more admins (if needed):**
   - Repeat steps 1-3 for each new admin email

## Important Migration (if you previously had whitelist entries by email)

If you already have rows in `public.admin_whitelist` created before we linked entries to `auth.users`, run the migration file included in the repo to safely link rows by `user_id` and update the admin check to prefer `user_id`:

1. Open `supabase/migrations/link_admin_whitelist_user_id.sql` in this repository.
2. Copy its contents and paste into Supabase SQL Editor (Project → SQL Editor → New query).
3. Run the script. It will:
   - Add a nullable `user_id` column if missing
   - Populate `user_id` for rows where an `auth.users` entry matches by email
   - Add a unique partial index on `user_id`
   - Add a foreign key constraint to `auth.users(id)`
   - Replace the `public.is_admin()` helper to prefer `user_id` checks

After running the migration, test admin login again. If a whitelist row exists but no auth user is found for that email, the row will remain (with `user_id` NULL) and the email-based fallback will still allow access until you choose to enforce `user_id` NOT NULL.

---

Questions? Check the `ADMIN_ACCESS_CONTROL.md` file for more details about admin management.
