import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");
    const { playlistId } = await req.json();
    if (typeof playlistId !== "string") throw new Error("Invalid playlist");
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: playlist } = await db.from("playlists").select("id, title").eq("id", playlistId).eq("user_id", user.id).single();
    if (!playlist) throw new Error("Playlist not found");
    const { data: mappings, error } = await db.from("playlist_tracks").select("track_id").eq("playlist_id", playlistId).order("position");
    if (error) throw error;
    const trackIds = (mappings ?? []).map((item) => item.track_id);
    if (!trackIds.length) throw new Error("Cannot share an empty playlist");
    const slug = crypto.randomUUID();
    const { error: insertError } = await db.from("shared_links").insert({ track_ids: trackIds, can_download: false, slug, notes: `Shared Playlist: ${playlist.title}`, created_by: user.id });
    if (insertError) throw insertError;
    return new Response(JSON.stringify({ slug }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unable to create share link" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
