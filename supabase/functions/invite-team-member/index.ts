import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const productionOrigin = 'https://tomfoxcatalog.com'

const resolveRedirectOrigin = (origin: string | null) => {
  // Invitation links must not be turned into open redirects by a forged Origin.
  // Localhost remains available for development, all other environments use
  // the canonical public site.
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return productionOrigin
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email: rawEmail, workspaceId } = await req.json()
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(authHeader.slice('Bearer '.length))
    if (userError || !userData.user) throw new Error('Unauthorized')

    const [{ data: membership, error: membershipError }, { data: workspace, error: workspaceError }] = await Promise.all([
      supabaseAdmin.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', userData.user.id).maybeSingle(),
      supabaseAdmin.from('workspaces').select('id, name, user_id').eq('id', workspaceId).maybeSingle(),
    ])
    if (membershipError || workspaceError || !workspace) throw new Error('Workspace not found')
    const canInvite = workspace.user_id === userData.user.id || membership?.role === 'owner' || membership?.role === 'admin'
    if (!canInvite) throw new Error('Only workspace owners and admins can invite team members')

    // Resending an existing pending invitation is intentional. It should not
    // duplicate data or turn a delivery retry into a database failure.
    const { data: existingInvite, error: existingInviteError } = await supabaseAdmin
      .from('workspace_invites')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('email', email)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()
    if (existingInviteError) throw existingInviteError

    let invitationId = existingInvite?.id
    if (!invitationId) {
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('workspace_invites')
        .insert([{ workspace_id: workspaceId, email, status: 'pending' }])
        .select('id')
        .single()
      if (inviteError || !invitation) throw inviteError || new Error('Could not create invitation')
      invitationId = invitation.id
    }

    // Login is presented as a global modal, not a standalone /login route.
    // Returning to the home route lets InviteManager open the pending invite
    // after either sign-in or account creation.
    const redirectTo = `${resolveRedirectOrigin(req.headers.get('origin'))}/?accept_invite=true`

    // generateLink gives us a signed link but sends no native Supabase email.
    // Resend is therefore the only delivery path and reports delivery errors
    // back to the client for both new and existing users.
    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo },
    })
    if (linkError) {
      const fallback = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      })
      linkData = fallback.data
      linkError = fallback.error
    }
    if (linkError || !linkData?.properties?.action_link) throw linkError || new Error('Could not generate invitation link')

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('Email service is not configured')

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
    <p>You have been invited to join ${workspace.name || 'a team workspace'} on Tom Fox Catalog. Follow the link below to review and accept the invitation.</p>
    <a href="${linkData.properties.action_link}" class="btn" style="color: #ffffff;">Review Invitation</a>
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
        bcc: ['dadacomposer@gmail.com'],
        subject: `Invitation to ${workspace.name || 'a Tom Fox Catalog workspace'}`,
        html: emailHtml
      })
    })

    if (!resResponse.ok) {
      const errorData = await resResponse.text()
      console.error('Failed to send Resend email:', errorData)
      throw new Error('The invitation email could not be delivered')
    }

    return new Response(
      JSON.stringify({ success: true, invitationId }),
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
