import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action = 'upload', fileName, contentType, filePath } = await req.json();

    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'tom-fox-music';

    if (!r2AccountId || !r2AccessKey || !r2SecretKey || !bucketName) {
      throw new Error('R2 credentials not configured on the Edge Function');
    }

    const S3 = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    });

    // If filePath is provided, use it exactly (for specific formats like audio/hdaudio/...)
    // Otherwise fallback to the old versions/ behavior for backwards compatibility
    let key = filePath;
    if (!key && fileName) {
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      key = `versions/${Date.now()}_${cleanFileName}`;
    }

    if (!key) {
      throw new Error('Missing filePath or fileName');
    }

    if (action === 'delete') {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await S3.send(command);
      return new Response(
        JSON.stringify({ success: true, message: 'File deleted successfully', key }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Default: upload action
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    // URL valid for 1 hour
    const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    
    // Construct the public URL
    const publicUrlBase = Deno.env.get('R2_PUBLIC_URL_BASE') || 'https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev';
    const publicUrl = `${publicUrlBase}/${key}`;

    return new Response(
      JSON.stringify({ presignedUrl, publicUrl, key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
