import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { slug } = await req.json();
    if (typeof slug !== "string" || !slug.trim() || slug.length > 200) throw new Error("Invalid share link");
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: link, error } = await db.from("shared_links").select("track_ids, can_download, notes").eq("slug", slug).eq("is_active", true).single();
    if (error || !link) throw new Error("Link not found");
    const ids = Array.isArray(link.track_ids) ? link.track_ids : [];
    const { data: tracks, error: tracksError } = await db.from("tracks").select("*").in("id", ids);
    if (tracksError) throw tracksError;
    const byId = new Map((tracks ?? []).map((track) => [track.id, track]));
    return new Response(JSON.stringify({ link: { can_download: link.can_download, notes: link.notes }, tracks: ids.map((id) => byId.get(id)).filter(Boolean) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Invalid share link" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
