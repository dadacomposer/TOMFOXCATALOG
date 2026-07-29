import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");
    
    const token = authHeader.replace('Bearer ', '');

    const { trackId } = await req.json()
    if (!trackId) throw new Error("Missing trackId")

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    
    // Auth client to verify token
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) throw new Error('Unauthorized');
    
    // Admin check
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    if (!profile || !profile.is_admin) throw new Error('Forbidden: Admins only');

    // Get track from DB
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single()

    if (trackError || !track) throw new Error("Track not found")
    if (!track.r2_url) throw new Error("Track has no R2 URL")

    const r2Url = track.r2_url
    const fileName = track.file_name || 'track'

    // Fetch the audio file from R2
    const fileRes = await fetch(r2Url)
    if (!fileRes.ok || !fileRes.body) throw new Error(`Failed to fetch file from R2: ${fileRes.statusText}`)
    
    const contentLength = fileRes.headers.get('content-length')
    const mimeType = fileRes.headers.get('content-type') || 'audio/wav'

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY")

    console.log(`Uploading ${fileName} to Gemini... (Size: ${contentLength} bytes)`)

    // Stream the file directly to Gemini's REST API using raw upload
    // Deno allows streaming the response body directly to another fetch!
    const geminiUploadRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'raw',
        'X-Goog-Upload-Command': 'start, upload, finalize',
        'X-Goog-Upload-Header-Content-Length': contentLength || '',
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': mimeType,
      },
      body: fileRes.body,
      // @ts-ignore - Deno specific extension for streaming request bodies
      duplex: 'half' 
    })

    if (!geminiUploadRes.ok) {
      const errText = await geminiUploadRes.text()
      throw new Error(`Gemini upload failed: ${errText}`)
    }

    const fileInfo = await geminiUploadRes.json()
    const geminiFileUri = fileInfo.file.uri

    console.log(`Successfully uploaded to Gemini. File URI: ${geminiFileUri}. Generating tags...`)

    // Now call Gemini to generate the tags
    const prompt = `
        You are an expert music supervisor and audio tagger. Actively listen to the provided audio track.
        Provide an extremely precise, highly specific, and non-redundant set of tags. 
        WE NEED A HUGE AMOUNT OF METADATA. Be exhaustive. Generate as many accurate tags as possible for each category.
        
        CRITICAL RULE FOR DIVERSITY: 
        When generating \`scenarios\` and \`human_tags\`, cast a wide net. Ensure the scenarios cover completely different and disparate contexts that still accurately fit the music. 
        For example, if a track is light and bouncy, do not just list 10 variations of "corporate presentation". Include "children's educational video", "cooking tutorial", "morning vlog", "indie puzzle game", etc. 
        Give it diverse use-cases so it appears in many different user searches!
        
        Return a strict JSON object with this exact schema:
        - genre: (string) The main overarching genre.
        - subgenre: (array of strings) Generate AT LEAST 5 to 8 highly specific subgenres.
        - moods: (array of strings) Generate AT LEAST 10 to 15 exact emotional states and feelings.
        - instruments: (array of strings) Generate AT LEAST 8 to 12 prominent instruments and how they are played.
        - textures: (array of strings) Generate AT LEAST 8 to 12 sonic qualities (e.g. ethereal, gritty, warm).
        - scenarios: (array of strings) Generate AT LEAST 8 to 12 highly specific, DIAMETRICALLY DIVERSE use-case scenarios. 
        - energy_level: (string) "Low", "Medium", or "High".
        - human_tags: (array of strings) Generate AT LEAST 15 to 20 other relevant comma-separated tags (tempo feelings, era, specific styles, cultural vibes).
        - description: (string) A rich, evocative 2-3 sentence narrative description.
        
        Respond ONLY with valid JSON.
    `

    const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { fileData: { fileUri: geminiFileUri, mimeType: mimeType } },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    })

    if (!generateRes.ok) {
      const errText = await generateRes.text()
      throw new Error(`Gemini generation failed: ${errText}`)
    }

    const genData = await generateRes.json()
    const contentText = genData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!contentText) throw new Error("Empty response from Gemini")

    let tags = {}
    try {
      tags = JSON.parse(contentText)
    } catch (e) {
      throw new Error(`Failed to parse Gemini JSON: ${contentText}`)
    }

    console.log(`Tags generated successfully. Saving to database...`)

    const mergedSubgenre = JSON.stringify(tags.subgenre || [])

    // Update the track in Supabase using the service role key (bypasses RLS)
    const { error: updateError } = await supabase
      .from('tracks')
      .update({
        subgenre: mergedSubgenre,
        moods: tags.moods || [],
        instruments: tags.instruments || [],
        textures: tags.textures || [],
        scenarios: tags.scenarios || [],
        human_tags: tags.human_tags || [],
        genre: tags.genre || "",
        description: tags.description || ""
      })
      .eq('id', trackId)

    if (updateError) throw new Error(`Database update failed: ${updateError.message}`)

    // Cleanup: Delete file from Gemini servers
    try {
      await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileInfo.file.name}?key=${GEMINI_API_KEY}`, {
        method: 'DELETE'
      })
    } catch (cleanupErr) {
      console.warn("Failed to delete file from Gemini:", cleanupErr)
    }

    return new Response(JSON.stringify({ success: true, tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Gemini Tagger Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
