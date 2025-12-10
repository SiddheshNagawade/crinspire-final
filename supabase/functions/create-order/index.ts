import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Razorpay from "npm:razorpay@2.9.2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency, planId, userId, email, fullName, description } = await req.json()
    
    if (!amount || !currency || !planId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
    })

    // Normalize incoming planId into canonical keys used across the system
    const rawPlan = String(planId || '').toLowerCase();
    let canonicalPlan = 'monthly';
    if (rawPlan.includes('six') || rawPlan.includes('6') || rawPlan.includes('saver')) canonicalPlan = 'six_months';
    else if (rawPlan.includes('quarter') || rawPlan.includes('3')) canonicalPlan = 'quarterly';
    else if (rawPlan.includes('year') || rawPlan.includes('12')) canonicalPlan = 'yearly';
    else if (rawPlan.includes('month')) canonicalPlan = 'monthly';

    const options = {
      amount: amount, // in paise
      currency: currency,
      receipt: `order_${userId.slice(0, 8)}_${Date.now()}`,
      notes: {
        planId: canonicalPlan,
        userId,
        email,
        fullName,
        description,
      },
    };

    const order = await razorpay.orders.create(options);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      amount: order.amount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})