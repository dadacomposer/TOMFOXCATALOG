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

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id || !profile?.stripe_subscription_id) {
      throw new Error('No active subscription found for this user');
    }

    const { action } = await req.json();

    if (action !== 'cancel' && action !== 'resume') {
      throw new Error('Invalid action. Must be cancel or resume.');
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

    if (subscription.schedule) {
      // If the subscription is attached to a schedule (e.g. from a pending downgrade),
      // we must release it first, otherwise Stripe blocks updating cancel_at_period_end.
      await stripe.subscriptionSchedules.release(subscription.schedule as string);
    }

    const updatedSubscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: action === 'cancel',
      }
    );

    // Update DB right away so UI feels snappy (webhook will also do this but might be delayed)
    await supabase
      .from('profiles')
      .update({ cancel_at_period_end: action === 'cancel' })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cancel_at_period_end: updatedSubscription.cancel_at_period_end 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
