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
    // Admin client (Service Role) required to bypass RLS and delete users from Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user ID from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get profile data to find stripe_customer_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    // 1. Process Prorated Refunds and Delete Customer from Stripe
    if (profile?.stripe_customer_id) {
      try {
        // Find active subscriptions to refund
        const subscriptions = await stripe.subscriptions.list({ 
          customer: profile.stripe_customer_id, 
          status: 'active' 
        });

        for (const sub of subscriptions.data) {
          const latestInvoiceId = sub.latest_invoice as string;
          if (latestInvoiceId) {
            const invoice = await stripe.invoices.retrieve(latestInvoiceId);
            const chargeId = invoice.charge as string;
            
            if (chargeId) {
               const now = Math.floor(Date.now() / 1000);
               const totalPeriod = sub.current_period_end - sub.current_period_start;
               const remainingPeriod = sub.current_period_end - now;
               
               if (remainingPeriod > 0 && totalPeriod > 0) {
                  const ratio = remainingPeriod / totalPeriod;
                  const refundAmount = Math.floor(invoice.amount_paid * ratio);
                  
                  // Minimum refund threshold (e.g., $1.00) to avoid Stripe errors
                  if (refundAmount > 100) { 
                     await stripe.refunds.create({
                       charge: chargeId,
                       amount: refundAmount,
                       reason: 'requested_by_customer'
                     });
                  }
               }
            }
          }
        }
        
        // Deleting the customer automatically cancels all active subscriptions immediately
        await stripe.customers.del(profile.stripe_customer_id);
      } catch (stripeErr) {
        console.error("Error processing refund or deleting Stripe customer:", stripeErr);
        // Continue even if Stripe deletion fails (e.g. customer already deleted), but log it.
      }
    }

    // 2. Delete the user's workspaces
    // Workspaces should ideally be deleted via RLS/triggers or foreign keys ON DELETE CASCADE.
    // However, to be absolutely safe and wipe out all data, we do it explicitly using the admin role.
    const { data: workspaces } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner');
      
    if (workspaces && workspaces.length > 0) {
      const workspaceIds = workspaces.map(w => w.workspace_id);
      await supabaseAdmin.from('workspaces').delete().in('id', workspaceIds);
    }

    // 3. Delete Profile
    // (Auth deletion usually cascades to public.profiles if foreign keys are setup properly, but doing it manually is safer if unsure)
    await supabaseAdmin.from('profiles').delete().eq('id', user.id);

    // 4. Finally, delete the Auth User from Supabase
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      throw deleteUserError;
    }

    return new Response(
      JSON.stringify({ success: true }),
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
