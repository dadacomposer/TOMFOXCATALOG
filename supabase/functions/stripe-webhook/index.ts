import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    let event;

    if (webhookSecret) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret,
          undefined,
          cryptoProvider
        );
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }
    } else {
      // Fallback for local testing if secret is not set, though highly unrecommended for production
      event = JSON.parse(body);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Processing event type: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const supabaseUUID = session.metadata?.supabaseUUID;
      const planId = session.metadata?.planId;

      if (supabaseUUID) {
        // Strip out the _monthly or _yearly to get the base tier name
        const subscriptionTier = planId ? planId.replace('_monthly', '').replace('_yearly', '') : null;
        
        await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
            subscription_tier: subscriptionTier,
          })
          .eq('id', supabaseUUID);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('stripe_customer_id', subscription.customer as string)
        .single();
        
      if (profile) {
        const currentPeriodEnd = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
        const currentPeriodEndStr = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null;
        
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const billingInterval = subscription.items?.data?.[0]?.plan?.interval || 'month';
        const priceId = subscription.items?.data?.[0]?.price?.id;

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
        
        const updateData: any = {
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          cancel_at_period_end: cancelAtPeriodEnd,
          billing_interval: billingInterval,
        };
        
        if (currentPeriodEndStr) {
          updateData.current_period_end = currentPeriodEndStr;
        }
        
        if (newTier) {
          updateData.subscription_tier = newTier;
        }
        
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', subscription.customer as string)
        .single();
        
      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_tier: null,
            stripe_subscription_id: null,
            current_period_end: null,
            cancel_at_period_end: false,
            billing_interval: null,
          })
          .eq('id', profile.id);
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();
          
        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', profile.id);
        }
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      // If payment succeeds, we can reset past_due to active
      // (though customer.subscription.updated will likely fire and handle this anyway)
      if (invoice.subscription) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, subscription_status')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();
          
        if (profile && profile.subscription_status === 'past_due') {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
            })
            .eq('id', profile.id);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    console.error(`Error processing webhook: ${err.message}`);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
