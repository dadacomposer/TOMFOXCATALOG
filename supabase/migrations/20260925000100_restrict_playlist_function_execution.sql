-- Supabase grants EXECUTE to API roles by default for newly-created functions.
-- Make the intended access explicit: only signed-in callers can invoke the
-- admin-checked save RPC, while the trigger function remains internal.
REVOKE ALL ON FUNCTION public.sync_playlist_track_count() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.save_catalog_playlist(uuid, text, text[], boolean, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalog_playlist(uuid, text, text[], boolean, text, jsonb) TO authenticated;
