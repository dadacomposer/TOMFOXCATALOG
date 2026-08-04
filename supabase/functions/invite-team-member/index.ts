import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, workspaceId } = await req.json()

    if (!email || !workspaceId) {
      throw new Error('Email and workspaceId are required')
    }

    // Create Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // First insert into workspace_invites
    const { error: inviteError } = await supabaseAdmin
      .from('workspace_invites')
      .insert([{ workspace_id: workspaceId, email, status: 'pending' }])
      
    if (inviteError) {
      throw inviteError
    }

    const origin = req.headers.get('origin') || 'https://tomfoxcatalog.com'
    const redirectTo = `${origin}/login?accept_invite=true`

    // Try to invite the user natively
    const { data: inviteData, error: nativeInviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo
    })

    if (nativeInviteError) {
      // If user already exists, Supabase throws "User already registered" (Status 400, or 422)
      console.log('Native invite failed (likely user exists):', nativeInviteError.message)
      
      // Generate magic link for existing user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo
        }
      })

      if (linkError) {
        throw linkError
      }

      // Send Email via Resend using the exact same HTML template as native invite
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY is not set')
      }

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
    <div class="title">Invitation</div>
    <h1>You're Invited.</h1>
    <p>You have been invited to join a team workspace on Tom Fox Catalog. Follow the link below to review and accept the invitation.</p>
    <a href="${linkData.properties?.action_link || ''}" class="btn" style="color: #ffffff;">Review Invitation</a>
  </div>
  <div class="footer">If you believe this invitation was sent in error, you can safely ignore this email.</div>
</body>
</html>
      `

      const resResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Tom Fox Catalog <noreply@tomfoxcatalog.com>',
          to: email,
          subject: 'You have been invited to a workspace',
          html: emailHtml
        })
      })

      if (!resResponse.ok) {
        const errorData = await resResponse.text()
        console.error('Failed to send Resend email:', errorData)
        throw new Error('Failed to send notification email')
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error handling team invitation:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
