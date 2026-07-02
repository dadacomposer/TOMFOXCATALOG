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
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile to find their stripe_customer_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.stripe_customer_id) {
      return new Response(JSON.stringify({ success: true, message: "No stripe customer found, skipping sync" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Retrieve active subscriptions for the customer from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const cancelAtPeriodEnd = subscription.cancel_at_period_end;
      const billingInterval = subscription.items.data[0]?.plan?.interval || 'month';
      const priceId = subscription.items.data[0]?.price?.id;

      // Infer the new subscription tier based on the price ID and user role
      let newTier = null;
      if (priceId) {
        const { data: matchingPlans } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('stripe_price_id', priceId);
          
        if (matchingPlans && matchingPlans.length > 0) {
          const roleStr = profile.role || '';
          let matched = matchingPlans.find(p => p.id.includes(roleStr));
          if (!matched) {
            matched = matchingPlans[0];
          }
          newTier = matched.id.replace('_monthly', '').replace('_yearly', '');
        }
      }
      
      await supabase
        .from('profiles')
        .update({
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          billing_interval: billingInterval,
          ...(newTier ? { subscription_tier: newTier } : {})
        })
        .eq('id', user.id);
        
      return new Response(JSON.stringify({ success: true, action: 'synced_active' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, action: 'no_active_subscription' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (err: any) {
    console.error("Sync Subscription Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
