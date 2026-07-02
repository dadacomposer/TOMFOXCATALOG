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

    const { planId } = await req.json();
    if (!planId) {
      throw new Error("Missing planId");
    }

    // Get user profile to find their stripe_subscription_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.stripe_subscription_id) {
      throw new Error("User does not have an active subscription");
    }

    // Look up the new Stripe Price ID based on the planId
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('stripe_price_id')
      .eq('id', planId)
      .single();

    if (!planData || !planData.stripe_price_id) {
      throw new Error("Invalid plan selection");
    }

    // Retrieve the existing subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const subscriptionItemId = subscription.items.data[0].id;
    const currentPriceId = subscription.items.data[0].price.id;

    if (currentPriceId === planData.stripe_price_id) {
      throw new Error("You are already on this plan.");
    }

    // Compare prices to determine if it's an upgrade or downgrade
    const currentPrice = await stripe.prices.retrieve(currentPriceId);
    const newPrice = await stripe.prices.retrieve(planData.stripe_price_id);
    
    // Default to 0 if amount is missing (e.g. metered billing, which we don't use here)
    const currentAmount = currentPrice.unit_amount || 0;
    const newAmount = newPrice.unit_amount || 0;

    const isUpgrade = newAmount >= currentAmount; // Equal price is treated as upgrade (immediate swap)

    if (isUpgrade) {
      // UPGRADE: Immediate change, reset billing cycle, invoice immediately
      const updatedSubscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{
          id: subscriptionItemId,
          price: planData.stripe_price_id,
        }],
        proration_behavior: 'create_prorations',
        billing_cycle_anchor: 'now',
        metadata: {
          planId: planId
        }
      });
      
      return new Response(JSON.stringify({ success: true, action: 'upgraded', subscription: updatedSubscription.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // DOWNGRADE: Schedule change for the end of the current billing period
      let scheduleId = subscription.schedule;
      
      // If there isn't a schedule yet, create one from the active subscription
      if (!scheduleId) {
        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: profile.stripe_subscription_id,
        });
        scheduleId = schedule.id;
      }

      // Retrieve the schedule to get the current phase dates
      const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId as string);
      const currentPhase = schedule.phases[0];
      
      // Update schedule to switch to the new plan when the current period ends
      await stripe.subscriptionSchedules.update(scheduleId as string, {
        end_behavior: 'release',
        phases: [
          {
            start_date: currentPhase.start_date,
            end_date: currentPhase.end_date,
            items: [{
              price: currentPriceId,
              quantity: 1,
            }],
          },
          {
            start_date: currentPhase.end_date,
            items: [{
              price: planData.stripe_price_id,
              quantity: 1,
            }],
            metadata: { planId }
          }
        ]
      });

      return new Response(JSON.stringify({ success: true, action: 'downgraded_scheduled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err: any) {
    console.error("Update Subscription Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
