# Quick Fix: "Edge Function returned a non-2xx status code" Error

## What This Error Means
Your browser is getting an error response (non-2xx = not 200-299) from the Supabase Edge Function when trying to create a payment order.

## The 3-Step Fix

### ✅ Step 1: Add Razorpay Secrets to Supabase (CRITICAL)

**This is 90% likely the cause of your error.**

1. Open https://dashboard.razorpay.com/app/keys
2. Copy your **Key ID** and **Key Secret**
3. Go to: **Supabase Dashboard** → **Settings** → **Functions** → **Secrets**
4. Click **"New Secret"** and add:

   **First Secret:**
   - Name: `RAZORPAY_KEY_ID`
   - Value: Paste your Key ID

   **Second Secret:**
   - Name: `RAZORPAY_KEY_SECRET`  
   - Value: Paste your Key Secret

5. Click **Add Secret** for each one

### ✅ Step 2: Redeploy Functions

```bash
cd /Users/siddhesh/Downloads/Apps/My_creations/routing-crinspire-exam-simulator

supabase functions deploy create-order
supabase functions deploy verify-payment
```

### ✅ Step 3: Fill .env.local

Make sure your `.env.local` file has:

```
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from:
- **Razorpay**: https://dashboard.razorpay.com/app/keys
- **Supabase**: Project Settings → API → URL & Anon Key

---

## Verify It's Fixed

1. **Check Function Logs:**
   - Supabase Dashboard → Functions → create-order → Logs
   - If you see "Razorpay credentials not configured" → Secrets not set (redo Step 1)
   - If you see success response → Working!

2. **Test Payment:**
   - Go to pricing page and click a payment button
   - Should open Razorpay checkout modal
   - If error appears → check logs again

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Razorpay credentials not configured" | Secrets not added to Supabase (Step 1) |
| Still getting non-2xx error | Restart dev server: `npm run dev` |
| "Failed to create order" | Check that Razorpay API keys are correct and active |
| Payment modal doesn't open | Check `VITE_RAZORPAY_KEY_ID` is set in .env.local |

---

## Using Test Mode First (Recommended)

1. Go to https://dashboard.razorpay.com/
2. Toggle **Test Mode** ON (toggle at top-right)
3. Copy test Mode keys
4. Follow Step 1 above with test keys
5. Test card: `4111 1111 1111 1111` (from https://razorpay.com/docs/payments/paymentlinks/test-card-details/)

Once verified working, switch to production keys.

---

## Immediate Test After Setup

1. Restart dev server: `npm run dev`
2. Go to http://localhost:5173/pricing
3. Click any payment button
4. Should see Razorpay checkout modal
5. If error: Check Supabase function logs immediately

**Expected flow:**
1. Click Pay → Creates order via Edge Function → Opens Razorpay modal
2. Enter card details → Razorpay returns payment_id & signature
3. Backend verifies signature → Updates subscription → Success!

---

**Still stuck?** Check PAYMENT_SETUP.md for detailed setup guide
