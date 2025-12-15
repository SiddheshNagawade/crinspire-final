#!/bin/bash

# Payment Integration Diagnostic Script
# Run this to check if your payment setup is correct

echo "🔍 Crinspire Payment Integration Diagnostic"
echo "=========================================="
echo ""

# Check 1: Environment variables
echo "✓ Checking environment variables..."
if [ -f .env.local ]; then
    if grep -q "VITE_RAZORPAY_KEY_ID" .env.local; then
        echo "  ✓ VITE_RAZORPAY_KEY_ID found"
    else
        echo "  ✗ VITE_RAZORPAY_KEY_ID missing in .env.local"
    fi
    
    if grep -q "VITE_SUPABASE_URL" .env.local; then
        echo "  ✓ VITE_SUPABASE_URL found"
    else
        echo "  ✗ VITE_SUPABASE_URL missing in .env.local"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env.local; then
        echo "  ✓ VITE_SUPABASE_ANON_KEY found"
    else
        echo "  ✗ VITE_SUPABASE_ANON_KEY missing in .env.local"
    fi
else
    echo "  ✗ .env.local file not found"
    echo "    Run: cp .env.example .env.local"
fi

echo ""

# Check 2: Edge Functions
echo "✓ Checking Edge Functions..."
if [ -d "supabase/functions/create-order" ]; then
    echo "  ✓ create-order function exists"
else
    echo "  ✗ create-order function missing"
fi

if [ -d "supabase/functions/verify-payment" ]; then
    echo "  ✓ verify-payment function exists"
else
    echo "  ✗ verify-payment function missing"
fi

echo ""

# Check 3: Supabase CLI
echo "✓ Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo "  ✓ supabase CLI installed"
    supabase --version
else
    echo "  ✗ supabase CLI not installed"
    echo "    Install: npm install -g supabase"
fi

echo ""

# Check 4: Razorpay configuration
echo "✓ Checking Razorpay config..."
if [ -f "config/razorpay.ts" ] || [ -f "config/razorpay.js" ]; then
    echo "  ✓ Razorpay config file exists"
else
    echo "  ✗ Razorpay config file not found"
fi

echo ""
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. CRITICAL - Set Supabase Secrets:"
echo "   - Go to Supabase Dashboard → Functions → Secrets"
echo "   - Add RAZORPAY_KEY_ID (from https://dashboard.razorpay.com/app/keys)"
echo "   - Add RAZORPAY_KEY_SECRET (from https://dashboard.razorpay.com/app/keys)"
echo ""
echo "2. Deploy Edge Functions:"
echo "   supabase functions deploy create-order"
echo "   supabase functions deploy verify-payment"
echo ""
echo "3. Fill .env.local with your credentials:"
echo "   VITE_RAZORPAY_KEY_ID=your_key_id"
echo "   VITE_SUPABASE_URL=your_url"
echo "   VITE_SUPABASE_ANON_KEY=your_key"
echo ""
echo "4. Restart dev server:"
echo "   npm run dev"
echo ""
echo "5. Check Edge Function Logs:"
echo "   - Supabase Dashboard → Functions → create-order → Logs"
echo ""
echo "See PAYMENT_SETUP.md for detailed setup instructions"
echo ""
