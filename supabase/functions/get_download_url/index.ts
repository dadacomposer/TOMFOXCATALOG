import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Auth client to verify user token (if present)
    const authHeader = req.headers.get('Authorization');
    let token = null;
    if (authHeader) {
      token = authHeader.replace('Bearer ', '');
      // If the token is just the Anon Key, we treat it as unauthenticated
      if (token === supabaseAnonKey) {
        token = null;
      }
    }
    
    let user = null;
    let profile = null;
    let hasPremiumAccess = false;
    let isSubscribed = false;

    if (token) {
      const authSupabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: authError } = await authSupabase.auth.getUser(token);
      
      if (!authError && userData?.user) {
        user = userData.user;
        
        // Use service role to bypass RLS and fetch profile
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('subscription_status, is_admin')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          profile = profileData;
          isSubscribed = profile.subscription_status === 'active' || profile.subscription_status === 'trialing';
          hasPremiumAccess = isSubscribed || profile.is_admin;
        }
      }
    }

    const { trackId, format } = await req.json();
    if (!trackId || !format) throw new Error('Missing trackId or format');
    
    // Use service role to fetch settings and track
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // FETCH FEATURE FLAGS
    const { data: settings } = await supabase
      .from('site_settings')
      .select('free_watermarks_enabled, free_hd_enabled')
      .eq('id', 'default')
      .single();

    const free_watermarks = settings?.free_watermarks_enabled ?? true;
    const free_hd = settings?.free_hd_enabled ?? false;

    // CHECK PERMISSIONS based on format
    if (format === 'watermarked') {
       if (!free_watermarks && !hasPremiumAccess) {
         throw new Error('Forbidden: Draft downloads are currently disabled for free users');
       }
    } else if (format === 'mp3') {
       if (!hasPremiumAccess && !free_hd) {
         throw new Error('Forbidden: Clean MP3 downloads require an active subscription');
       }
    } else if (format === 'wav' || format === 'aiff') {
       if (!hasPremiumAccess && !free_hd) {
         throw new Error('Forbidden: High-quality downloads require an active subscription');
       }
    } else {
       throw new Error(`Invalid format requested: ${format}`);
    }

    // FETCH TRACK
    const { data: track } = await supabase
      .from('tracks')
      .select('wav_url, aiff_url, r2_url, watermarked_url, file_name')
      .eq('id', trackId)
      .single();
      
    if (!track) throw new Error('Track not found');
    
    let dbUrl = null;
    if (format === 'wav') dbUrl = track.wav_url;
    else if (format === 'aiff') dbUrl = track.aiff_url;
    else if (format === 'mp3') dbUrl = track.r2_url;
    else if (format === 'watermarked') dbUrl = track.watermarked_url;
    
    if (!dbUrl) throw new Error(`Format ${format} not available for this track`);
    
    // Extract R2 key from public URL
    // Format: https://pub-[hash].r2.dev/audio/hdaudio/TrackName.wav
    let key = '';
    try {
       const urlObj = new URL(dbUrl);
       key = decodeURIComponent(urlObj.pathname);
       if (key.startsWith('/')) key = key.substring(1); // Remove leading slash
    } catch (e) {
       throw new Error(`Invalid URL found in database for format ${format}`);
    }
    
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID') || '984e55700d5ab74893ff2cd768b58f8d';
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'tom-fox-music';

    if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
      throw new Error('R2 credentials not configured');
    }

    const S3 = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    });

    // Provide friendly download filename if downloading (optional, but good UX)
    const baseName = track.file_name.replace(/\.[^/.]+$/, "");
    let downloadExt = 'mp3';
    if (format === 'wav') downloadExt = 'wav';
    else if (format === 'aiff') downloadExt = 'aiff';
    else if (format === 'watermarked' && dbUrl.endsWith('.m4a')) downloadExt = 'm4a';
    
    let suffix = '';
    if (format === 'watermarked') suffix = '_watermarked';
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${baseName}${suffix}.${downloadExt}"`
    });

    const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    
    // LOGGING TO DOWNLOAD AUDIT LOGS
    if (user && (format === 'wav' || format === 'aiff' || format === 'mp3' || format === 'watermarked')) {
      const { error: logError } = await supabase
        .from('download_audit_logs')
        .insert({
          user_id: user.id,
          track_id: trackId,
          format: format,
          subscription_tier_at_download: profile?.subscription_status || 'none'
        });
        
      if (logError) {
        console.error("Failed to insert audit log", logError);
      }
    }
    
    return new Response(JSON.stringify({ url: presignedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error: any) {
    console.error("get_download_url Error:", error.message);
    const isForbidden = error.message.includes('Forbidden') || error.message.includes('Unauthorized');
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: isForbidden ? 403 : 400,
    });
  }
});
