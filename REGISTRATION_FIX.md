# Registration Fix: Email Verification & Profile Data

## Changes Made

### ✅ 1. Updated Success Message
**Before:**
- "Registration successful! Please login." (confusing - user doesn't know they need to verify email)

**After:**
- "✅ Registration successful! Check your email to verify your account, then you can login." (clear instructions)

### ✅ 2. Fixed Age & Name Not Being Saved
The registration details (name and age) were not being saved to the `profiles` table. Now they are saved in TWO ways:

**Method 1: Automatic via Database Trigger** (LoginScreen.tsx)
- When user signs up, Supabase creates their auth account
- The `handle_new_user()` trigger automatically creates a profile with:
  - `id` (user UUID)
  - `email`
  - `full_name` (from signup metadata)
  - `age` (from signup metadata)
  - `created_at` (timestamp)

**Method 2: Explicit Save** (components/LoginScreen.tsx)
- Uses `upsertProfileFromClient()` to ensure profile is saved with all details
- More reliable for existing users

### ✅ 3. Migration File
Created migration to ensure database trigger is updated: `supabase/migrations/05_fix_profile_age_field.sql`

---

## Setup Instructions

### Step 1: Apply the Database Migration

**Option A: Manual (Recommended)**
1. Go to Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy-paste contents of: `supabase/migrations/05_fix_profile_age_field.sql`
5. Click **Run**

**Option B: Via Supabase CLI**
```bash
supabase migration up
```

### Step 2: Restart Your Dev Server

```bash
npm run dev
```

### Step 3: Test Registration

1. Go to http://localhost:5173
2. Click **Candidate** tab
3. Fill in:
   - Name: Test Student
   - Email: test@example.com
   - Age: 20
   - Password: TestPass123!
4. Click **Register**
5. You should see: "✅ Registration successful! Check your email to verify your account, then you can login."

### Step 4: Verify Email & Login

1. Check your email inbox (Gmail, etc.)
2. Look for verification link from Supabase
3. Click the verification link
4. You'll be redirected - click to go back to login
5. Login with your email and password
6. Check Supabase Dashboard → Database → `profiles` table
7. Verify your row has:
   - `full_name` = "Test Student"
   - `age` = 20
   - `email` = test@example.com

---

## File Changes

### 1. LoginScreen.tsx (Root)
- Updated success message to be clearer
- Added form clearing after successful registration
- Better error handling

### 2. components/LoginScreen.tsx
- Updated success messages
- Uses `upsertProfileFromClient()` for explicit saving

### 3. supabase/schema.sql
- Updated `handle_new_user()` trigger to save age field
- Now extracts both `full_name` and `age` from signup metadata

### 4. supabase/migrations/05_fix_profile_age_field.sql
- New migration file to update database trigger
- Run this in Supabase to apply the fix

---

## What Users Will See

### Registration Flow:
1. Fill registration form (name, email, age, password)
2. Click Register
3. See: **"✅ Registration successful! Check your email to verify your account, then you can login."**
4. User goes to Gmail (or email provider)
5. Clicks verification link from Supabase
6. Returns to app and sees login form
7. Logs in with email and password
8. Gets dashboard access

### Data Flow:
```
User Registration Form
    ↓
Supabase Auth.signUp()
    ↓
Sends Verification Email
    ↓
handle_new_user() trigger fires
    ↓
Creates profile with name, age, email
    ↓
User clicks email link to verify
    ↓
User can now login
    ↓
Profile shows in database with all details
```

---

## Troubleshooting

### Problem: "Still not saving age/name"
**Solution:**
1. Make sure you ran the migration (Step 1)
2. Restart dev server (Step 2)
3. Create a NEW user account (don't try with old one)
4. Check Supabase → Database → profiles table

### Problem: "Registration message still old"
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. Restart dev server
3. Try again

### Problem: "Email not being sent"
**Solution:**
1. Check Supabase Settings → Email Templates
2. Make sure email provider is configured
3. Check spam/promotions folder in email
4. Wait 2-3 minutes (sometimes delayed)

### Problem: "Can't click verification link"
**Solution:**
1. Copy the link from email manually
2. Paste in browser address bar
3. Or check email for direct link

---

## Verification Checklist

- [ ] Ran migration in Supabase SQL Editor
- [ ] Restarted dev server (`npm run dev`)
- [ ] Tested registration flow
- [ ] Received verification email
- [ ] Clicked verification link
- [ ] Successfully logged in
- [ ] Checked profiles table - name and age saved ✓

---

## Database Query to Verify

In Supabase SQL Editor, run:

```sql
SELECT id, email, full_name, age, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;
```

You should see your new registered users with all their details!

---

**Status:** ✅ Ready to test - apply migration and restart dev server
