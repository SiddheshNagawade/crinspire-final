# Deployment Checklist for Crinspire Exam Simulator

## ✅ Pre-Deployment Tasks

### 1. Database Setup
- [ ] Run `supabase/schema.sql` in Supabase SQL Editor
- [ ] Run `supabase/exam_submissions.sql` in Supabase SQL Editor
- [ ] Verify all tables are created: `profiles`, `papers`, `questions`, `user_attempts`, `exam_submissions`, `admin_whitelist`
- [ ] Verify RLS (Row Level Security) policies are enabled on all tables
- [ ] Add at least one admin user to `admin_whitelist` table

### 2. Supabase Edge Functions
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login to Supabase: `supabase login`
- [ ] Deploy `create-order` function: `supabase functions deploy create-order`
- [ ] Deploy `verify-payment` function: `supabase functions deploy verify-payment`
- [ ] Verify functions are deployed in Supabase Dashboard → Edge Functions

### 3. Environment Variables
- [ ] Copy `.env.example` to `.env.local`
- [ ] Set `VITE_SUPABASE_URL` (from Supabase Dashboard → Project Settings → API)
- [ ] Set `VITE_SUPABASE_ANON_KEY` (from Supabase Dashboard → Project Settings → API)
- [ ] Set `VITE_RAZORPAY_KEY_ID` (from Razorpay Dashboard → Account Settings → API Keys)
- [ ] Verify Razorpay key is for production (not test mode)

### 4. Razorpay Configuration
- [ ] Create Razorpay account and complete KYC verification
- [ ] Generate production API keys
- [ ] Configure webhook URL: `<your-supabase-url>/functions/v1/verify-payment`
- [ ] Subscribe to `payment.captured` webhook event
- [ ] Test payment flow with small amount before going live

### 5. Code Quality
- [x] Remove all `console.log` statements from production code
- [x] Remove all debug comments (DEBUG, TODO, FIXME)
- [x] Create comprehensive README.md with setup instructions
- [x] Create .env.example file with all required variables
- [ ] Run `npm run build` to verify production build succeeds
- [ ] Run `npm run preview` to test production build locally

### 6. Security Checks
- [ ] Verify RLS policies restrict users to their own data
- [ ] Verify admin_whitelist table prevents unauthorized admin access
- [ ] Check that API keys are not hardcoded anywhere in the code
- [ ] Verify Edge Functions use proper authentication headers
- [ ] Test that users cannot access other users' exam submissions

### 7. Testing Checklist
- [ ] Test signup flow (with email confirmation if enabled)
- [ ] Test login flow
- [ ] Test exam taking (MCQ, MSQ, NAT questions)
- [ ] Test exam submission and result screen
- [ ] Test 24-hour solution review
- [ ] Test "View result & solutions" button from dashboard
- [ ] Test page reload on result screen (should load from cache)
- [ ] Test payment flow (test mode first, then production)
- [ ] Test subscription status updates after payment
- [ ] Test admin panel (create/edit/delete exams)
- [ ] Test streak system
- [ ] Test responsive design on mobile devices

## 🚀 Deployment Steps

### Option 1: Vercel (Recommended)
1. Push code to GitHub/GitLab
2. Connect repository to Vercel
3. Add environment variables in Vercel Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RAZORPAY_KEY_ID`
4. Deploy and verify

### Option 2: Other Platforms
1. Build: `npm run build`
2. Upload `dist/` folder to hosting provider
3. Configure environment variables
4. Set up custom domain (optional)

## 📝 Post-Deployment Tasks

### 1. Verify Core Features
- [ ] Visit deployed URL and verify homepage loads
- [ ] Test signup/login flow
- [ ] Create a test exam as admin
- [ ] Take the exam as a student
- [ ] Verify result screen and review page work
- [ ] Test payment flow with real money (small amount)

### 2. Monitoring Setup
- [ ] Check Vercel Analytics dashboard (if using Vercel)
- [ ] Monitor Supabase dashboard for errors
- [ ] Check Razorpay dashboard for payment status
- [ ] Set up error alerts (optional)

### 3. Admin Configuration
- [ ] Add production admin users to `admin_whitelist` table
- [ ] Create initial exam papers
- [ ] Configure pricing plans if needed
- [ ] Test all admin functions in production

### 4. Documentation
- [ ] Share login credentials with team members
- [ ] Document admin panel usage
- [ ] Create user guide (optional)
- [ ] Set up support email/contact form

## 🐛 Troubleshooting

### Common Issues

**Build fails with "Cannot find module..."**
- Run `npm install` to ensure all dependencies are installed
- Check that all imports are correct

**"Failed to fetch exams" error**
- Verify Supabase URL and keys are correct in environment variables
- Check Supabase RLS policies allow reads
- Check browser console for specific error messages

**Payment verification fails**
- Verify Razorpay keys are correct (production keys, not test)
- Check Edge Functions are deployed and accessible
- Verify webhook URL is configured correctly
- Check function logs in Supabase Dashboard

**"No result data found" error**
- Ensure `exam_submissions.sql` migration is run
- Check that user has completed an exam
- Remember results expire after 24 hours

**Users can't see admin panel**
- Verify user email is in `admin_whitelist` table
- Check that `user_id` matches their Supabase auth ID

## 🔒 Security Best Practices

- Never commit `.env.local` or any file containing API keys to version control
- Use production Razorpay keys only in production
- Regularly rotate API keys
- Monitor Supabase logs for suspicious activity
- Keep dependencies updated for security patches
- Use HTTPS for all production deployments

## 📊 Performance Optimization

- [ ] Enable Vercel Analytics to monitor performance
- [ ] Optimize images (if any large assets)
- [ ] Consider enabling CDN caching for static assets
- [ ] Monitor Supabase database query performance
- [ ] Set up database indexes for frequently queried fields

---

**Last Updated**: Ready for deployment after completing checklist
**Version**: 1.0.0
