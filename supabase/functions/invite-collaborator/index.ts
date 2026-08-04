import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

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

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !callerUser) {
      throw new Error('Not authenticated');
    }

    const { projectId, email } = await req.json();

    if (!projectId || !email) {
      throw new Error('Missing projectId or email');
    }

    // Check if caller has permission (Admin or Primary Client)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', callerUser.id)
      .single();

    const isAdmin = profile?.is_admin || false;

    const { data: project } = await supabaseAdmin
      .from('tf_studio_projects')
      .select('id, user_id, title')
      .eq('id', projectId)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    if (!isAdmin && project.user_id !== callerUser.id) {
      throw new Error('Unauthorized. Only project owner or admin can invite collaborators.');
    }

    const origin = req.headers.get('origin') || 'https://tomfoxcatalog.com';

    let collUserId = null;
    let collActionLink = `${origin}/studio/${projectId}`;

    const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
    if (existingProfile) {
      collUserId = existingProfile.id;
    }

    // Add to db
    const { error: insertError } = await supabaseAdmin.from('tf_studio_collaborators').insert({
      project_id: projectId,
      email: email,
      user_id: collUserId
    });

    if (insertError && !insertError.message.includes('duplicate key value')) {
      throw insertError;
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
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
    <p>You have been invited to join the project: <strong>${project.title}</strong> as a collaborator.</p>
    <a href="${collActionLink}" class="btn" style="color: #ffffff;">Access Project</a>
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
          to: email,
          subject: 'You have been invited to collaborate on project: ' + project.title,
          html: emailHtml
        })
      }).catch(e => console.error('Failed to send Resend email:', e));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error inviting collaborator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
