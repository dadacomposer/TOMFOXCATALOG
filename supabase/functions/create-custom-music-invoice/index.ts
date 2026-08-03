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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { project_id, amount } = await req.json();

    if (!project_id || !amount) {
      throw new Error('Missing project_id or amount');
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('tf_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    // Get project and client details
    const { data: project, error: projectError } = await supabase
      .from('tf_studio_projects')
      .select('*, tf_profiles!user_id(*)')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    const clientProfile = project.tf_profiles;
    let customerId = clientProfile.stripe_customer_id;

    if (!customerId) {
      // Create a Stripe customer
      const customer = await stripe.customers.create({
        email: clientProfile.email,
        name: `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || undefined,
        metadata: {
          supabase_uid: clientProfile.id
        }
      });
      customerId = customer.id;

      await supabase
        .from('tf_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', clientProfile.id);
    }

    // Create an Invoice Item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      description: `Custom Music Project: ${project.title}`,
    });

    // Create the Invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 7, // 7 days to pay
    });

    // Send the invoice email
    await stripe.invoices.sendInvoice(invoice.id);

    // Update project status to 'accepted'
    const { error: updateError } = await supabase
      .from('tf_studio_projects')
      .update({ status: 'accepted' })
      .eq('id', project_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, invoice_id: invoice.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
