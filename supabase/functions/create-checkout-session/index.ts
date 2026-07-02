import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { planId, success_url, cancel_url, type, amount, trackName } = await req.json();

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status === 'active' && type !== 'one_time') {
      throw new Error('User already has an active subscription. Please manage via Customer Portal.');
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabaseUUID: user.id,
        },
      });
      customerId = customer.id;
      
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const finalSuccessUrl = success_url || `${req.headers.get('origin')}/account?session_id={CHECKOUT_SESSION_ID}&success=true`;
    const finalCancelUrl = cancel_url || `${req.headers.get('origin')}/pricing?canceled=true`;

    let session;

    if (type === 'one_time') {
      if (!amount || !trackName) {
        throw new Error('Amount and track name are required for one-time purchases');
      }
      
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `One-Time License - ${trackName}`,
              },
              unit_amount: amount * 100, // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        metadata: {
          type: 'one_time',
          trackName: trackName,
          supabaseUUID: user.id,
        },
      });
    } else {
      if (!planId) {
        throw new Error('Plan ID is required for subscriptions');
      }

      // Fetch the price ID from the database
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('stripe_price_id')
        .eq('id', planId)
        .single();

      if (planError || !planData) {
        throw new Error('Invalid plan ID');
      }

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: planData.stripe_price_id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        metadata: {
          planId: planId, // Important to know what they subscribed to!
          supabaseUUID: user.id,
        },
      });
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error("Function error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
