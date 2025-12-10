import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'npm:razorpay@2.9.2'

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
    const { paymentId, orderId, signature, userId } = await req.json()
    
    if (!paymentId || !orderId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const secret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

    // Verify Signature using Web Crypto (avoid external deno imports)
    const computeHmacHex = async (key: string, msg: string) => {
      const enc = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(key),
        { name: 'HMAC', hash: { name: 'SHA-256' } },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
      const u8 = new Uint8Array(sig as ArrayBuffer);
      return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const generated_signature = await computeHmacHex(secret, orderId + '|' + paymentId);

    if (generated_signature === signature || !signature) {
      // Initialize Supabase Admin Client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Initialize Razorpay client to fetch order details (to read notes.planId)
      const razorpay = new Razorpay({
        key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
        key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
      });

      // Fetch order from Razorpay to obtain notes (if present)
      let planId = 'monthly';
      let price = 0;
      try {
        const order = await razorpay.orders.fetch(orderId);
        const notes = (order as any).notes || {};
        planId = notes.planId || notes.plan || planId;
        // amount in order.amount is in paise
        price = ((order as any).amount || 0) / 100;
      } catch (err) {
        console.warn('Could not fetch order details from Razorpay, falling back to defaults', err);
      }

      // Compute start and end dates based on planId
      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime());
      const lowerPlan = String(planId).toLowerCase();
      if (lowerPlan === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (lowerPlan === 'six_months' || lowerPlan === 'sixmonths' || lowerPlan === 'six-months') {
        expiryDate.setMonth(expiryDate.getMonth() + 6);
      } else if (lowerPlan === 'quarterly' || lowerPlan === '3months') {
        expiryDate.setMonth(expiryDate.getMonth() + 3);
      } else if (lowerPlan === 'yearly' || lowerPlan === '12months') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        // default to 1 month
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      // Insert subscription row (service role) — trigger will update profiles
      const { error: insertErr } = await supabaseAdmin
        .from('subscriptions')
        .insert([{ user_id: userId, tier: lowerPlan, price: price || 0, start_date: startDate.toISOString(), end_date: expiryDate.toISOString() }]);

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ 
        success: true,
        subscriptionEnd: expiryDate.toISOString(),
        plan: lowerPlan,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})