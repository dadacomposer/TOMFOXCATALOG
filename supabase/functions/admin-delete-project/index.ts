import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const extractR2Key = (urlOrKey: string | null | undefined): string | null => {
  if (!urlOrKey) return null;
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    try {
      const parsed = new URL(urlOrKey);
      let key = parsed.pathname;
      if (key.startsWith('/')) key = key.substring(1);
      return key || null;
    } catch {
      return null;
    }
  }
  return urlOrKey;
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
      throw new Error('Missing Authorization header');
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

    const isAllowedEmail = adminUser.email === 'dadacomposer@gmail.com' || adminUser.email === 'licensing@tomfoxcatalog.com';
    if (!adminProfile?.is_admin && !isAllowedEmail) {
      throw new Error('Unauthorized');
    }

    const { projectId } = await req.json();
    if (!projectId) {
      throw new Error('projectId is required');
    }

    // 1. Gather all R2 asset keys to delete
    const keysToDelete = new Set<string>();

    // Fetch assets
    const { data: assets } = await supabaseAdmin
      .from('tf_studio_assets')
      .select('*')
      .eq('project_id', projectId);

    if (assets) {
      for (const item of assets) {
        for (const field of ['file_url', 'video_url', 'audio_url', 'waveform_url', 'r2_key', 'video_r2_key', 'audio_r2_key']) {
          if (item[field]) {
            const k = extractR2Key(item[field]);
            if (k) keysToDelete.add(k);
          }
        }
      }
    }

    // Fetch project files
    const { data: files } = await supabaseAdmin
      .from('tf_studio_project_files')
      .select('*')
      .eq('project_id', projectId);

    if (files) {
      for (const fileItem of files) {
        for (const field of ['file_url', 'r2_key']) {
          if (fileItem[field]) {
            const k = extractR2Key(fileItem[field]);
            if (k) keysToDelete.add(k);
          }
        }
      }
    }

    // Fetch project record itself
    const { data: projectRecord } = await supabaseAdmin
      .from('tf_studio_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectRecord) {
      for (const field of ['video_url', 'audio_url', 'waveform_url', 'video_r2_key', 'audio_r2_key']) {
        if (projectRecord[field]) {
          const k = extractR2Key(projectRecord[field]);
          if (k) keysToDelete.add(k);
        }
      }
    }

    // 2. Delete from R2 bucket if credentials present
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'tom-fox-music';

    if (r2AccountId && r2AccessKey && r2SecretKey) {
      const S3 = new S3Client({
        region: "auto",
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      });

      for (const key of keysToDelete) {
        try {
          await S3.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          }));
        } catch (s3Err) {
          console.error(`Failed to delete key ${key} from R2:`, s3Err);
        }
      }
    }

    // 3. Delete database records in order
    await supabaseAdmin.from('tf_studio_comments').delete().eq('project_id', projectId);
    await supabaseAdmin.from('tf_studio_project_files').delete().eq('project_id', projectId);
    await supabaseAdmin.from('tf_studio_assets').delete().eq('project_id', projectId);

    // Delete project from tf_studio_projects (this also permanently deactivates client theater links)
    const { error: deleteError } = await supabaseAdmin
      .from('tf_studio_projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true, deletedR2ObjectsCount: keysToDelete.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
