CREATE OR REPLACE FUNCTION get_suggested_playlists(p_user_id uuid)
RETURNS TABLE (playlist_id uuid) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_play_count int;
  top_genres text[];
  top_moods text[];
BEGIN
  -- 1. Check if user has at least 3 distinct tracks played
  SELECT COUNT(DISTINCT pe.track_id) INTO v_play_count
  FROM play_events pe
  WHERE pe.user_id = p_user_id;

  IF v_play_count < 3 THEN
    RETURN; -- Returns empty result set
  END IF;

  -- 2. Extract top 2 genres
  SELECT array_agg(genre) INTO top_genres
  FROM (
    SELECT t.genre
    FROM play_events pe
    JOIN tracks t ON pe.track_id = t.id
    WHERE pe.user_id = p_user_id AND t.genre IS NOT NULL
    GROUP BY t.genre
    ORDER BY count(*) DESC
    LIMIT 2
  ) sub;

  -- 3. Extract top 3 moods
  SELECT array_agg(mood) INTO top_moods
  FROM (
    SELECT unnest(t.moods) as mood
    FROM play_events pe
    JOIN tracks t ON pe.track_id = t.id
    WHERE pe.user_id = p_user_id AND t.moods IS NOT NULL
    GROUP BY mood
    ORDER BY count(*) DESC
    LIMIT 3
  ) sub;

  -- 4. Query matching playlists
  -- A playlist matches if it has tracks with matching genres OR matching moods.
  -- We'll rank them by how many matching tracks they have.
  RETURN QUERY
  SELECT p.id
  FROM playlists p
  WHERE p.user_id IS NULL AND p.track_count > 0
  ORDER BY (
    SELECT COUNT(*)
    FROM playlist_tracks pt
    JOIN tracks t ON pt.track_id = t.id
    WHERE pt.playlist_id = p.id
      AND t.is_hidden = false
      AND t.deleted_at IS NULL
      AND (
        (t.genre = ANY(top_genres)) OR
        (t.moods && top_moods)
      )
  ) DESC, p.created_at DESC
  LIMIT 16;
END;
$$;
