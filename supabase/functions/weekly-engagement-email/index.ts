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

    // 1. Get tracks that were added in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: newTracks, error: tracksError } = await supabaseAdmin
      .from('tracks')
      .select('file_name')
      .or(`created_at.gte.${sevenDaysAgo.toISOString()},release_date.gte.${sevenDaysAgo.toISOString()}`)

    if (tracksError) throw tracksError

    if (!newTracks || newTracks.length === 0) {
      console.log('No new tracks in the last 7 days. Exiting.')
      return new Response(JSON.stringify({ success: true, message: 'No new tracks' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Get users who opted in to notifications
    const { data: subscribedEmails, error: profilesError } = await supabaseAdmin
      .rpc('get_subscribed_emails')

    if (profilesError) throw profilesError

    if (!subscribedEmails || subscribedEmails.length === 0) {
      console.log('No users to notify. Exiting.')
      return new Response(JSON.stringify({ success: true, message: 'No users to notify' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Format the email content
    const trackListHtml = newTracks.map(t => `<li style="margin-bottom: 8px;"><strong>${(t.file_name || 'Unknown Track').replace(/\.wav$|\.mp3$|\.aiff$/i, '')}</strong></li>`).join('')
    
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
  p { font-size: 14px; line-height: 1.6; color: rgba(0,0,0,0.6); margin-bottom: 24px; max-width: 480px; }
  ul { padding-left: 20px; font-size: 14px; color: rgba(0,0,0,0.8); margin-bottom: 40px; }
  .btn { display: inline-block; background-color: #000000; color: #FFFFFF !important; text-decoration: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 16px 32px; border-radius: 12px; }
  .footer { margin-top: 48px; font-size: 11px; color: rgba(0,0,0,0.4); text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo"><img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" alt="TOM FOX." /></div>
    <div class="title">New Releases</div>
    <h1>New Music is Here.</h1>
    <p>Check out the latest additions to the Tom Fox Catalog this week:</p>
    <ul>
      ${trackListHtml}
    </ul>
    <a href="https://tomfoxcatalog.com/browse?playlist=d9e3f532-1b03-4791-bf8b-025499e64b43" class="btn" style="color: #ffffff;">Listen Now</a>
  </div>
  <div class="footer">You're receiving this because you opted into new music notifications.<br>To unsubscribe, update your preferences in your Account Settings.</div>
</body>
</html>
    `

    // 4. Send emails via Resend (Bcc to all users)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const recipientEmails = subscribedEmails.map((p: any) => p.email).filter(Boolean) as string[]

    const resResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Tom Fox Catalog <noreply@tomfoxcatalog.com>',
        to: 'noreply@tomfoxcatalog.com', // Sending to self, BCC everyone else
        bcc: recipientEmails,
        subject: 'New Music on Tom Fox Catalog',
        html: emailHtml
      })
    })

    if (!resResponse.ok) {
      const errorData = await resResponse.text()
      console.error('Failed to send Resend email:', errorData)
      throw new Error('Failed to send notification email')
    }

    return new Response(
      JSON.stringify({ success: true, count: recipientEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error handling weekly engagement email:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
