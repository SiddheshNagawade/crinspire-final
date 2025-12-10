# Admin Access Control Setup Guide

This guide explains how the admin dashboard is now secured to only allow whitelisted instructors.

## What Changed

✅ **Secure Admin Authentication**
- Only emails in the `admin_whitelist` table can access the admin dashboard
- Admin validation happens BEFORE password authentication
- Multiple layers of protection (login + app-level checks)

## How It Works

### 1. Login Flow (Secure)
When an instructor tries to login:
1. Email is checked against `admin_whitelist` table
2. If NOT whitelisted → Access denied immediately (no password check)
3. If whitelisted → Password is verified with Supabase auth
4. If password correct → Instructor gains access to admin panel

### 2. Dashboard Access (Double Check)
Even if someone bypasses login, the app double-checks:
- When loading the app, user's email is verified against whitelist
- If not in whitelist → `isAuthenticatedInstructor` stays `false`
- Admin panel is hidden/restricted

## Managing Admins

### Add a New Admin Email

Go to Supabase Dashboard → **SQL Editor** and run:

```sql
-- Add a new admin to the whitelist
insert into public.admin_whitelist (email)
values ('newinstructor@example.com');
```

Or use the provided utility in your code:

```typescript
import { addAdminEmail } from './utils/adminAuth';

const result = await addAdminEmail('newinstructor@example.com');
if (result.success) {
  console.log('Admin added successfully');
} else {
  console.error(result.error);
}
```

### Remove an Admin

```sql
-- Remove an admin from the whitelist
delete from public.admin_whitelist
where email = 'instructor@example.com';
```

Or use the utility:

```typescript
import { removeAdminEmail } from './utils/adminAuth';

const result = await removeAdminEmail('instructor@example.com');
```

### View All Admins

```sql
-- See all whitelisted admin emails
select email, created_at from public.admin_whitelist
order by created_at desc;
```

Or:

```typescript
import { getAdminWhitelist } from './utils/adminAuth';

const admins = await getAdminWhitelist();
console.log('Authorized instructors:', admins);
```

## Initial Setup

### Step 1: Add Your Admin Email

After creating your Supabase project and running the schema.sql, add your email to the whitelist:

```sql
insert into public.admin_whitelist (email)
values ('your-admin-email@example.com');
```

### Step 2: Sign Up / Create Auth Account

Use Supabase auth to create an account with the whitelisted email and a strong password.

### Step 3: Login to Admin Dashboard

Use the whitelisted email and the password you set. You should now see the admin panel.

## Security Notes

🔒 **What's Protected:**
- Admin panel is only accessible if your email is in `admin_whitelist`
- Unauthorized users see: "Access denied. Your email is not authorized as an instructor."
- Passwords are securely handled by Supabase auth
- Email addresses are the only identifier needed

⚠️ **Best Practices:**
1. **Add admins carefully** — Only add trusted people
2. **Remove old admins** — When someone leaves, remove their email immediately
3. **Use strong passwords** — Advise all admins to use strong, unique passwords
4. **Monitor admin whitelist** — Regularly review who has access
5. **RLS policies** — The `admin_whitelist` table has RLS enabled (authenticated users can read)

## Troubleshooting

### "Access denied. Your email is not authorized"
- Check if your email is in `admin_whitelist` table
- Ask a current admin to add you using the SQL commands above

### "Login successful but admin panel not showing"
- Refresh the browser page
- Check browser console for errors
- Verify your email is exactly matching in the whitelist (case-sensitive)

### "Forgot which emails are admins"
- Run the `select * from admin_whitelist;` query in Supabase SQL Editor

## Admin-Only Features

These areas are now protected:

1. **Admin Panel** (`/admin` route) — Can only be accessed if user is whitelisted
2. **Exam Management** — Create, edit, delete exams (admins only)
3. **Question Editor** — Add/edit questions (admins only)
4. **Admin Navigation** — Admin button only shows for whitelisted users

## Technical Details

**Files modified:**
- `components/LoginScreen.tsx` — Now validates against admin_whitelist before login
- `LoginScreen.tsx` — Same validation
- `App.tsx` — Double-checks admin status on app load
- `utils/adminAuth.ts` — New file with admin authentication utilities

**Key functions:**
- `authenticateInstructor()` — Validates email against whitelist, then auth
- `isEmailAdminWhitelisted()` — Checks if email exists in admin_whitelist
- `checkCurrentUserAdminStatus()` — Verifies current session user is admin
- `addAdminEmail()` — Add new admin (admin-only)
- `removeAdminEmail()` — Remove admin (admin-only)

---

Questions? Check the RAZORPAY_SETUP.md and other documentation files in the project root.
