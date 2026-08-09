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
      subscriptionTitle,
      amount,
      currency = 'usd',
      interval = 'month',
      daysUntilDue = 7
    } = await req.json();

    if (!subscriptionTitle || !amount || !interval) {
      throw new Error('Missing subscription details');
    }

    let targetUserId = existingUserId;
    let targetProfile = null;
    let actionLink = null;
    let customerEmail = email;

    const origin = req.headers.get('origin') || 'https://tomfoxcatalog.com';

    if (isNewUser) {
      if (!email) throw new Error('Email is required for new user');
      customerEmail = email;
      
      // Generate invite link silently instead of using createUser which sends the default email
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            organization: organization
          },
          redirectTo: `${origin}/studio`
        }
      });

      if (inviteError) {
        if (inviteError.message.toLowerCase().includes('already been registered') || inviteError.status === 422) {
          // Fallback to existing user flow
          const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

          if (existingProfileError || !existingProfile) {
            throw new Error(`User with email ${email} is registered but profile is missing.`);
          }

          targetUserId = existingProfile.id;
          targetProfile = existingProfile;
          customerEmail = existingProfile.email || email;
        } else {
          throw inviteError;
        }
      } else {
        targetUserId = inviteData.user.id;
        actionLink = inviteData.properties?.action_link;

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
      }

    } else {
      if (!targetUserId) throw new Error('Existing user ID is required');
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError || !profile) throw new Error('Client not found');
      targetProfile = profile;
      if (profile.email) customerEmail = profile.email;
    }

    if (!targetProfile) throw new Error('Failed to load target profile');

    // Handle Stripe
    let customerId = targetProfile?.stripe_customer_id;

    if (!customerId) {
      if (!customerEmail) throw new Error('Missing email for new customer');
      
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: `${targetProfile?.first_name || firstName || ''} ${targetProfile?.last_name || lastName || ''}`.trim() || undefined,
        metadata: {
          supabase_uid: targetUserId
        }
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', targetUserId);
    }

    // 1. Create Stripe Product
    const product = await stripe.products.create({
      name: `Tom Fox Subscription: ${subscriptionTitle}`
    });

    // 2. Create Stripe Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: daysUntilDue,
      items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product: product.id,
          recurring: {
            interval: interval.toLowerCase(),
          },
          unit_amount: Math.round(amount * 100),
        },
      }],
      expand: ['latest_invoice']
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const invoiceUrl = latestInvoice?.hosted_invoice_url || undefined;

    // 2. Create Subscription Record in Database
    const { error: subError } = await supabaseAdmin
      .from('tf_studio_subscriptions')
      .insert({
        user_id: targetUserId,
        stripe_subscription_id: subscription.id,
        amount: amount,
        currency: currency.toLowerCase(),
        interval: interval.toLowerCase(),
        status: subscription.status,
        invoice_url: invoiceUrl
      });

    if (subError) throw subError;

    // 3. Prepare and send custom email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey && customerEmail) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;700&display=swap');
  body { font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAFA; margin: 0; padding: 60px 20px; text-align: left; color: #000000; }
  .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid rgba(0,0,0,0.1); border-radius: 32px; padding: 48px 56px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
  .logo { margin-bottom: 40px; }
  .logo img { height: 24px; display: block; }
  .title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(0,0,0,0.4); margin-bottom: 12px; }
  h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.05em; text-transform: uppercase; margin: 0 0 16px 0; line-height: 1; color: #000000; }
  p { font-size: 14px; line-height: 1.6; color: rgba(0,0,0,0.6); margin-bottom: 40px; max-width: 480px; }
  .btn { display: inline-block; background-color: #000000; color: #FFFFFF !important; text-decoration: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 16px 32px; border-radius: 12px; }
  .footer { margin-top: 48px; font-size: 11px; color: rgba(0,0,0,0.4); text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo"><img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" alt="TOM FOX." /></div>
    <div class="title">New Subscription Invoice</div>
    <h1>Invoice Generated.</h1>
    <p>An invoice for your new ${interval}ly subscription <strong>${subscriptionTitle}</strong> has been generated by Tom Fox Catalog.</p>
    ${invoiceUrl ? `<a href="${invoiceUrl}" class="btn" style="color: #ffffff;">Pay Invoice</a>` : ''}
  </div>
  <div class="footer">If you believe this was sent in error, you can safely ignore this email.</div>
</body>
</html>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Tom Fox Catalog <noreply@tomfoxcatalog.com>',
          to: customerEmail,
          subject: `Your New Subscription: ${subscriptionTitle}`,
          html: emailHtml
        })
      }).catch(e => console.error('Failed to send Resend email:', e));
    }

    return new Response(JSON.stringify({ 
      success: true, 
      subscriptionId: subscription.id,
      invoiceUrl: invoiceUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
