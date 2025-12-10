// Payment utilities for Razorpay integration
import { supabase } from '../supabaseClient';
import { RAZORPAY_CONFIG, SUBSCRIPTION_PLANS } from '../config/razorpay';

/**
 * Load Razorpay script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initiate a payment order with Razorpay
 * Calls the backend verify-payment function to create the order
 */
export const initiatePayment = async (
  planId: keyof typeof SUBSCRIPTION_PLANS,
  userId: string,
  email: string,
  fullName: string
) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error('Invalid plan selected');

    // Call the Supabase function to create a Razorpay order
    const { data, error } = await supabase.functions.invoke('create-order', {
      body: {
        amount: plan.price * 100, // Razorpay expects amount in paise
        currency: plan.currency,
        planId,
        userId,
        email,
        fullName,
        description: plan.description,
      },
    });

    if (error) throw error;
    if (!data || !data.order_id) throw new Error('Failed to create order');

    return {
      orderId: data.order_id,
      amount: plan.price,
      plan,
    };
  } catch (error: any) {
    console.error('Payment initiation error:', error);
    throw new Error(error.message || 'Failed to initiate payment');
  }
};

/**
 * Open Razorpay checkout modal and handle payment
 */
export const openRazorpayCheckout = (
  orderId: string,
  amount: number,
  email: string,
  fullName: string,
  onSuccess: (paymentId: string, orderId: string, signature?: string) => void,
  onError: (error: string) => void
) => {
  // Ensure Razorpay is loaded
  if (!(window as any).Razorpay) {
    onError('Razorpay script failed to load');
    return;
  }

  const options = {
    key: RAZORPAY_CONFIG.keyId,
    amount: amount * 100, // Amount in paise
    currency: 'INR',
    name: 'Crinspire Exam Simulator',
    description: 'Premium Subscription',
    order_id: orderId,
    prefill: {
      name: fullName,
      email: email,
    },
    theme: {
      color: '#1F2937',
    },
    handler: (response: any) => {
      // Pass along signature so backend verification can use it
      onSuccess(response.razorpay_payment_id, orderId, response.razorpay_signature);
    },
    modal: {
      ondismiss: () => {
        onError('Payment cancelled');
      },
    },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
};

/**
 * Verify payment on the backend and update user subscription
 */
export const verifyPayment = async (
  paymentId: string,
  orderId: string,
  signature: string,
  userId: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: {
        paymentId,
        orderId,
        signature,
        userId,
      },
    });

    if (error) throw error;
    if (!data || !data.success) throw new Error('Payment verification failed');

    return {
      success: true,
      subscriptionEnd: data.subscriptionEnd,
    };
  } catch (error: any) {
    console.error('Payment verification error:', error);
    throw new Error(error.message || 'Failed to verify payment');
  }
};

/**
 * Update user's subscription status in profiles table
 */
export const updateUserSubscription = async (
  userId: string,
  isPremium: boolean,
  subscriptionEnd?: Date
) => {
  try {
    const updateData: any = {
      is_premium: isPremium,
    };

    if (subscriptionEnd) {
      updateData.subscription_start_date = new Date();
      updateData.subscription_expiry_date = subscriptionEnd;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Subscription update error:', error);
    throw new Error(error.message || 'Failed to update subscription');
  }
};
