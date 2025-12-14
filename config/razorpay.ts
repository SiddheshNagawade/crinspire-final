// Razorpay configuration
// NOTE: API Key is public and safe to expose in client code
// Secret key is NOT included here for security

export const RAZORPAY_CONFIG = {
  keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
};

// Subscription plans - customize as needed
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'plan_monthly',
    name: 'Monthly Premium',
    price: 59, // in INR (monthly price)
    currency: 'INR',
    duration_months: 1,
    description: '1 Month of Premium Access',
  },
  quarterly: {
    id: 'plan_quarterly',
    name: 'Quarterly Premium',
    price: 249, // in INR
    currency: 'INR',
    duration_months: 3,
    description: '3 Months of Premium Access',
  },
  six_months: {
    id: 'plan_six_months',
    name: 'Pro Saver (6 months)',
    price: 299, // in INR one-time for 6 months
    currency: 'INR',
    duration_months: 6,
    description: '6 Months of Premium Access',
  },
  yearly: {
    id: 'plan_yearly',
    name: 'Yearly Premium',
    price: 799, // in INR
    currency: 'INR',
    duration_months: 12,
    description: '12 Months of Premium Access',
  },
};
