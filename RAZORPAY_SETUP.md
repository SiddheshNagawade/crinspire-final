# Razorpay Payment Integration Guide

This guide walks you through setting up Razorpay payments in your Crinspire Exam Simulator app.

## What's Been Implemented

✅ **PaymentModal Component** (`components/PaymentModal.tsx`)
- Beautiful subscription plan selection UI
- Monthly, Quarterly, and Yearly plans
- Integrated Razorpay checkout
- Real-time payment status feedback

✅ **Payment Utilities** (`utils/paymentUtils.ts`)
- `loadRazorpayScript()` - Dynamically load Razorpay script
- `initiatePayment()` - Create order via Supabase function
- `openRazorpayCheckout()` - Open checkout modal
- `verifyPayment()` - Verify payment on backend
- `updateUserSubscription()` - Update profile subscription status

✅ **Configuration** (`config/razorpay.ts`)
- API key management
- Subscription plan definitions (Monthly: ₹99, Quarterly: ₹249, Yearly: ₹799)
- Customizable as per your pricing

✅ **Supabase Edge Functions**
- **create-order** - Creates Razorpay order
- **verify-payment** - Verifies payment and updates user subscription

## Setup Steps

### Step 1: Configure Razorpay in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings → Secrets/Environment Variables** (or Project Settings)
3. Add two environment variables:
   ```
   RAZORPAY_KEY_ID = rzp_live_RpqkWtha2RHs0K
   RAZORPAY_KEY_SECRET = zKfIejARz6z9cxZenqWLA5Z0
   ```
4. Save and deploy

### Step 2: Deploy Edge Functions

Deploy the updated functions to Supabase:

```bash
supabase functions deploy create-order
supabase functions deploy verify-payment
```

If you don't have Supabase CLI installed:
```bash
npm install -g supabase
supabase login  # Use your Supabase account
```

### Step 3: Update supabaseClient Configuration

Make sure your `supabaseClient.ts` has the correct project URL and anon key:

```typescript
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### Step 4: Add Payment Button to ProfileDashboard

In `components/ProfileDashboard.tsx`, add the PaymentModal and button:

```tsx
import PaymentModal from './PaymentModal';
import { Zap } from 'lucide-react';

// In the component state:
const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

// In the JSX, add a button like:
{!userProfile?.is_premium ? (
  <button
    onClick={() => setIsPaymentModalOpen(true)}
    className="flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
  >
    <Zap size={18} className="mr-2" />
    Upgrade to Premium
  </button>
) : (
  <span className="text-green-600 font-semibold">
    Premium • Expires {new Date(userProfile.subscription_expiry_date).toLocaleDateString()}
  </span>
)}

{/* Add the modal */}
<PaymentModal
  isOpen={isPaymentModalOpen}
  onClose={() => setIsPaymentModalOpen(false)}
  userId={session?.user.id || ''}
  email={session?.user.email || ''}
  fullName={userProfile?.full_name || 'User'}
  onPaymentSuccess={(subscriptionEnd) => {
    // Refresh profile data
    fetchUserProfile();
    alert(`Payment successful! Premium access until ${subscriptionEnd.toLocaleDateString()}`);
  }}
/>
```

## Subscription Plans

Current pricing (in INR):

| Plan | Price | Duration |
|------|-------|----------|
| Monthly | ₹99 | 1 Month |
| Quarterly | ₹249 | 3 Months |
| Yearly | ₹799 | 12 Months |

Edit prices in `config/razorpay.ts` → `SUBSCRIPTION_PLANS`

## Payment Flow

1. **User clicks "Upgrade to Premium"** → PaymentModal opens
2. **User selects a plan** → Modal shows selected plan
3. **User clicks "Pay Now"** → initiatePayment() creates Razorpay order
4. **Razorpay checkout opens** → User enters card/UPI details
5. **Payment succeeds** → verifyPayment() confirms on backend
6. **Profile updated** → is_premium = true, expiry dates set
7. **Success message** → User sees confirmation

## Testing with Razorpay Test Mode

Your current keys are for **production** (live). For testing, use:

**Test Card Details:**
- Card Number: `4111 1111 1111 1111`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)

To use test mode, add test keys to your Supabase secrets:
```
RAZORPAY_KEY_ID = rzp_test_XXXXX  (from Razorpay dashboard)
RAZORPAY_KEY_SECRET = XXXXX_test_secret
```

## Handling Premium-Only Content

Once you have `is_premium` field in profiles, you can restrict content:

```tsx
// In any component that shows premium exams:
{userProfile?.is_premium ? (
  <ExamList />
) : (
  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
    <p>Premium feature. Please upgrade to access all exams.</p>
    <button onClick={() => setIsPaymentModalOpen(true)}>
      Upgrade Now
    </button>
  </div>
)}
```

## Troubleshooting

### "Razorpay script failed to load"
- Check if Razorpay CDN is accessible
- Verify API key in config/razorpay.ts is correct

### "Failed to create order"
- Verify Supabase edge function `create-order` is deployed
- Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase secrets
- Check browser console for detailed error

### "Payment verification failed"
- Ensure `verify-payment` function is deployed
- Confirm Supabase service role key is set correctly in edge function

### "Column is_premium does not exist"
- Run the separate SQL snippet provided to add the column to your profiles table
- Or re-run the complete schema.sql if you haven't yet

## Next Steps

1. Test the payment flow with a test card (if using test keys)
2. Add logic to show/hide premium content based on `is_premium` status
3. Add a "My Subscription" section in ProfileDashboard showing expiry date
4. Optional: Add subscription renewal reminders (email 7 days before expiry)
5. Optional: Add admin dashboard to manage subscriptions

## Security Notes

✅ **Safe:**
- API Key (public, safe in client code)
- Razorpay script from official CDN

⚠️ **Secret (keep safe):**
- Secret Key (stored in Supabase secrets, never exposed)
- Service Role Key (for edge functions only, never in client code)

All payment verification happens server-side in Supabase edge functions, so users cannot manipulate payment status.

---

For more info: https://razorpay.com/docs/
