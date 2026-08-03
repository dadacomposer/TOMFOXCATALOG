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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !adminUser) {
      throw new Error('Not authenticated');
    }

    // Check if user is admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      throw new Error('Unauthorized');
    }

    const { 
      isNewUser,
      existingUserId,
      email,
      firstName,
      lastName,
      organization,
      projectTitle,
      projectType,
      amount,
      currency = 'usd',
      daysUntilDue = 7,
      createInvoice = true,
      requiresAuth = true
    } = await req.json();

    if (!projectTitle || !projectType || (createInvoice && !amount)) {
      throw new Error('Missing project details');
    }

    let targetUserId = existingUserId;
    let targetProfile = null;

    if (isNewUser) {
      if (!email) throw new Error('Email is required for new user');
      
      // Create user silently
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: Math.random().toString(36).slice(-10) + 'A1!',
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          organization: organization
        }
      });

      if (inviteError) throw inviteError;
      targetUserId = inviteData.user.id;

      // Upsert profile in case trigger doesn't exist or is slow
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: targetUserId,
          first_name: firstName,
          last_name: lastName,
          email: email
        })
        .select()
        .single();
        
      if (profileError) {
         console.warn("Could not upsert profile (might already exist from trigger)", profileError);
      }
      
      // Fetch the actual profile
      const { data: fetchedProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();
        
      targetProfile = fetchedProfile;

    } else {
      if (!targetUserId) throw new Error('Existing user ID is required');
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError || !profile) throw new Error('Client not found');
      targetProfile = profile;
    }

    if (!targetProfile) throw new Error('Failed to load target profile');

    // Handle Stripe
    let customerId = targetProfile.stripe_customer_id;

    if (createInvoice) {
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: targetProfile.email,
          name: `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim() || undefined,
          metadata: {
            supabase_uid: targetProfile.id
          }
        });
        customerId = customer.id;

        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', targetProfile.id);
      }
    }

    // Create Project
    const { data: newProject, error: projectError } = await supabaseAdmin
      .from('tf_studio_projects')
      .insert({
        user_id: targetUserId,
        title: projectTitle,
        project_type: projectType,
        status: 'accepted',
        budget: amount.toString(),
        requires_auth: requiresAuth,
      })
      .select()
      .single();

    if (projectError) throw projectError;

    let invoiceUrl = undefined;

    if (createInvoice) {
      // 1. Create the empty invoice FIRST
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: daysUntilDue,
        currency: currency.toLowerCase(),
      });

      // 2. Create the invoice item explicitly attached to this exact invoice
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        description: `Custom Music Project: ${newProject.title}`,
      });

      // 3. Send the invoice
      const finalizedInvoice = await stripe.invoices.sendInvoice(invoice.id);
      invoiceUrl = finalizedInvoice.hosted_invoice_url;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      project: newProject,
      invoiceUrl: invoiceUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
