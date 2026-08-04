ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Recalculate track_count for all playlists to fix any discrepancies
UPDATE public.playlists p
SET track_count = (
  SELECT COUNT(*)
  FROM public.playlist_tracks pt
  WHERE pt.playlist_id = p.id
);
