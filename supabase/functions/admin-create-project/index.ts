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
      requiresAuth = true,
      collaboratorEmails = []
    } = await req.json();

    if (!projectTitle || !projectType || (createInvoice && !amount)) {
      throw new Error('Missing project details');
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
          // actionLink remains null so they get the standard project link
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

    if (createInvoice) {
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

    // Prepare and send custom email
    let finalLinkToEmail = actionLink;

    if (!requiresAuth) {
      finalLinkToEmail = `${origin}/studio/${newProject.id}`;
    } else if (actionLink) {
      try {
        const url = new URL(actionLink);
        url.searchParams.set('redirect_to', `${origin}/studio/${newProject.id}`);
        finalLinkToEmail = url.toString();
      } catch (e) {
        console.warn("Could not parse actionLink", e);
        finalLinkToEmail = `${origin}/studio/${newProject.id}`;
      }
    } else {
      finalLinkToEmail = `${origin}/studio/${newProject.id}`;
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    async function sendProjectEmail(toEmail, aLink, invUrl) {
      if (!resendApiKey || !toEmail) return;
      const invoiceBlock = (invUrl) 
        ? `<div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.1);">
             <p style="margin-bottom: 16px;">An invoice has been generated for this project.</p>
             <a href="${invUrl}" class="btn" style="background-color: transparent; color: #000000 !important; border: 1px solid #000000;">View Invoice</a>
           </div>`
        : '';

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
    <div class="title">Project Invitation</div>
    <h1>You're Invited.</h1>
    <p>You have been invited by the Tom Fox Catalog team to join the project: <strong>${newProject.title}</strong>.</p>
    <p>We are ready to create some amazing music for you.</p>
    <a href="${aLink}" class="btn" style="color: #ffffff;">Access Project</a>
    ${invoiceBlock}
  </div>
  <div class="footer">If you believe this invitation was sent in error, you can safely ignore this email.</div>
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
          to: toEmail,
          subject: `You have been invited to project: ${newProject.title}`,
          html: emailHtml
        })
      }).catch(e => console.error('Failed to send Resend email:', e));
    }

    // Send email to primary client
    await sendProjectEmail(customerEmail, finalLinkToEmail, createInvoice ? invoiceUrl : null);

    // Process collaborators
    if (Array.isArray(collaboratorEmails) && collaboratorEmails.length > 0) {
      for (const collEmail of collaboratorEmails) {
        if (!collEmail || collEmail === email) continue;

        let collActionLink = null;
        let collUserId = null;

        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: collEmail,
          options: {
            redirectTo: `${origin}/studio`
          }
        });

        if (inviteError) {
          if (inviteError.message.toLowerCase().includes('already been registered') || inviteError.status === 422) {
             const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id').eq('email', collEmail).single();
             if (existingProfile) collUserId = existingProfile.id;
          }
        } else {
           collUserId = inviteData.user.id;
           collActionLink = inviteData.properties?.action_link;
        }

        let finalCollLinkToEmail = collActionLink;

        if (!requiresAuth) {
          finalCollLinkToEmail = `${origin}/studio/${newProject.id}`;
        } else if (collActionLink) {
          try {
            const url = new URL(collActionLink);
            url.searchParams.set('redirect_to', `${origin}/studio/${newProject.id}`);
            finalCollLinkToEmail = url.toString();
          } catch (e) {}
        } else {
          finalCollLinkToEmail = `${origin}/studio/${newProject.id}`;
        }

        // Add to db
        await supabaseAdmin.from('tf_studio_collaborators').insert({
          project_id: newProject.id,
          email: collEmail,
          user_id: collUserId
        });

        // Send email to collaborator (no invoice attached for them)
        await sendProjectEmail(collEmail, finalCollLinkToEmail, null);
      }
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
