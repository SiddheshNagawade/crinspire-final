# Razorpay Payment Integration Setup

## Issue: "Edge Function returned a non-2xx status code"

This error occurs when the Supabase Edge Functions can't access your Razorpay credentials.

## Solution

### Step 1: Get Your Razorpay API Keys

1. Go to https://dashboard.razorpay.com/
2. Log in to your account
3. Click on **Settings** (gear icon) → **API Keys**
4. Copy both:
   - **Key ID** (public key)
   - **Key Secret** (secret key - keep this safe!)

**For Testing**: Use your test keys first  
**For Production**: Use your live keys only

### Step 2: Add Secrets to Supabase

1. Go to **Supabase Dashboard**
2. Select your project
3. Go to **Settings** → **Functions** → **Secrets**
4. Click **Add Secret** and add these two:

**Secret 1:**
- Name: `RAZORPAY_KEY_ID`
- Value: `your_razorpay_key_id` (from Step 1)

**Secret 2:**
- Name: `RAZORPAY_KEY_SECRET`
- Value: `your_razorpay_key_secret` (from Step 1)

5. Click **Add Secret** for each

### Step 3: Verify Secrets Are Set

Run this command to verify:
```bash
supabase secrets list
```

You should see both secrets listed.

### Step 4: Redeploy Edge Functions

```bash
cd /Users/siddhesh/Downloads/Apps/My_creations/routing-crinspire-exam-simulator

# Deploy create-order function
supabase functions deploy create-order

# Deploy verify-payment function
supabase functions deploy verify-payment
```

### Step 5: Check Function Logs

1. Go to **Supabase Dashboard**
2. Click **Functions**
3. Select **create-order** function
4. Click **Logs** tab
5. Try making a payment and check for errors

Common errors:
- `Razorpay credentials not configured` → Secrets not set (Step 2)
- `Error: fetch failed` → Wrong API keys
- `Amount is required` → Frontend not sending amount

### Step 6: Test Payment

1. Use **Test Mode** API keys first
2. Get test card numbers from: https://razorpay.com/docs/payments/paymentlinks/test-card-details/
3. Common test card: `4111 1111 1111 1111`

### Step 7: Configure Environment Variables (Frontend)

Make sure `.env.local` has:
```
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Error: "Missing Razorpay credentials"
**Solution**: Secrets not set in Supabase
1. Go to Supabase Settings → Functions → Secrets
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
3. Redeploy functions

### Error: "Failed to create order"
**Solution**: Check Supabase function logs
1. Go to Functions → create-order → Logs
2. Look for the specific error message
3. Common causes:
   - Wrong API keys (check test vs production)
   - Rate limited (wait a minute, try again)
   - Invalid amount (must be > 0)

### Error: "Invalid signature" during verification
**Solution**: Ensure both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are identical in Supabase secrets and your local `.env`

### Payment page doesn't open
**Solution**: Verify Razorpay script loads
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check that `VITE_RAZORPAY_KEY_ID` is set correctly in `.env.local`

## Important Notes

⚠️ **NEVER** commit your Razorpay keys to GitHub  
⚠️ Keep `RAZORPAY_KEY_SECRET` private - only use in backend  
⚠️ Only use test keys for development/testing  
⚠️ Switch to live keys only when ready for production

## Testing Checklist

- [ ] Secrets added to Supabase
- [ ] Functions deployed successfully
- [ ] Test payment flow works
- [ ] Subscription status updates in database
- [ ] Results page loads after payment
- [ ] User can access premium features

## Support

If you still get errors:
1. Check Supabase function logs (Settings → Functions → Logs)
2. Check browser console (F12 → Console tab)
3. Verify API keys are correct (copy-paste to avoid typos)
4. Try using Razorpay test mode first
5. Restart the dev server: `npm run dev`

---

**Updated**: Ready for payment integration testing
