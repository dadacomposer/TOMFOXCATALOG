-- Keep the denormalized playlist count authoritative at the database boundary.
-- Every insertion, removal, or move of a playlist membership updates the affected
-- catalog or user playlist in the same transaction.
CREATE OR REPLACE FUNCTION public.sync_playlist_track_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.playlists
    SET track_count = (
      SELECT count(*)::integer
      FROM public.playlist_tracks
      WHERE playlist_id = NEW.playlist_id
    )
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.playlists
    SET track_count = (
      SELECT count(*)::integer
      FROM public.playlist_tracks
      WHERE playlist_id = OLD.playlist_id
    )
    WHERE id = OLD.playlist_id;
  ELSIF OLD.playlist_id IS DISTINCT FROM NEW.playlist_id THEN
    UPDATE public.playlists
    SET track_count = (
      SELECT count(*)::integer
      FROM public.playlist_tracks
      WHERE playlist_id = OLD.playlist_id
    )
    WHERE id = OLD.playlist_id;

    UPDATE public.playlists
    SET track_count = (
      SELECT count(*)::integer
      FROM public.playlist_tracks
      WHERE playlist_id = NEW.playlist_id
    )
    WHERE id = NEW.playlist_id;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_playlist_track_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_playlist_track_count_on_membership ON public.playlist_tracks;
CREATE TRIGGER sync_playlist_track_count_on_membership
AFTER INSERT OR DELETE OR UPDATE OF playlist_id ON public.playlist_tracks
FOR EACH ROW
EXECUTE FUNCTION public.sync_playlist_track_count();

-- Backfill any legacy mismatch before the trigger takes over.
UPDATE public.playlists AS playlist
SET track_count = COALESCE((
  SELECT count(*)::integer
  FROM public.playlist_tracks AS membership
  WHERE membership.playlist_id = playlist.id
), 0)
WHERE playlist.track_count IS DISTINCT FROM COALESCE((
  SELECT count(*)::integer
  FROM public.playlist_tracks AS membership
  WHERE membership.playlist_id = playlist.id
), 0);

-- The Playlist Manager saves its metadata and membership list atomically. This
-- prevents a partial save if a network request or validation fails mid-update.
CREATE OR REPLACE FUNCTION public.save_catalog_playlist(
  p_playlist_id uuid,
  p_title text,
  p_categories text[],
  p_is_featured boolean,
  p_cover_url text,
  p_tracks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(COALESCE(p_tracks, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Playlist tracks must be an array';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_tracks, '[]'::jsonb))
      AS incoming(track_id uuid, position integer, is_hidden boolean)
    GROUP BY track_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Playlist tracks cannot contain duplicates';
  END IF;

  UPDATE public.playlists
  SET
    title = p_title,
    categories = COALESCE(p_categories, '{}'::text[]),
    is_featured = COALESCE(p_is_featured, false),
    cover_url = p_cover_url
  WHERE id = p_playlist_id
    AND user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catalog playlist not found';
  END IF;

  DELETE FROM public.playlist_tracks AS membership
  WHERE membership.playlist_id = p_playlist_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(COALESCE(p_tracks, '[]'::jsonb))
        AS incoming(track_id uuid, position integer, is_hidden boolean)
      WHERE incoming.track_id = membership.track_id
    );

  INSERT INTO public.playlist_tracks (playlist_id, track_id, position, is_hidden)
  SELECT
    p_playlist_id,
    incoming.track_id,
    incoming.position,
    COALESCE(incoming.is_hidden, false)
  FROM jsonb_to_recordset(COALESCE(p_tracks, '[]'::jsonb))
    AS incoming(track_id uuid, position integer, is_hidden boolean)
  ON CONFLICT (playlist_id, track_id) DO UPDATE
  SET
    position = EXCLUDED.position,
    is_hidden = EXCLUDED.is_hidden;
END;
$$;

REVOKE ALL ON FUNCTION public.save_catalog_playlist(uuid, text, text[], boolean, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalog_playlist(uuid, text, text[], boolean, text, jsonb) TO authenticated;
