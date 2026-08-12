import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const { 
      name, 
      email, 
      website_url, 
      business_type, 
      project_details,
      content_focus_ad,
      paid_ad_campaign,
      contains_sponsorships,
      monetized,
      paywalled,
      timeline,
      track_name 
    } = await req.json();

    if (!name || !email || !business_type || !timeline) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subject = track_name 
      ? `New Licensing Request from ${name} for track: ${track_name}`
      : `New General Licensing Request from ${name}`;

    const usageFlags = [
      content_focus_ad ? "Content primary focus is to advertise/promote" : null,
      paid_ad_campaign ? "Paid advertisement campaign" : null,
      contains_sponsorships ? "Contains sponsorships" : null,
      monetized ? "Content is monetized" : null,
      paywalled ? "Content lives behind a paywall" : null
    ].filter(Boolean);

    const html = `
      <h2>New Licensing Request</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${website_url ? `<p><strong>Website/Portfolio:</strong> ${website_url}</p>` : ''}
      <p><strong>Business Type:</strong> ${business_type}</p>
      <p><strong>Timeline:</strong> ${timeline}</p>
      
      ${track_name ? `<p><strong>Requested Track:</strong> ${track_name}</p>` : ''}

      ${usageFlags.length > 0 ? `
        <h3>Usage details:</h3>
        <ul>
          ${usageFlags.map(flag => `<li>${flag}</li>`).join('')}
        </ul>
      ` : '<p><strong>Usage details:</strong> None selected</p>'}
      
      ${project_details ? `
        <h3>Project Details:</h3>
        <p style="white-space: pre-wrap;">${project_details}</p>
      ` : ''}
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Tom Fox Catalog <licensing@tomfoxcatalog.com>",
        to: ["dadacomposer@gmail.com", "licensing@tomfoxcatalog.com"],
        reply_to: email,
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-licensing-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
