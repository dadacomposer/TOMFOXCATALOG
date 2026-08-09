CREATE OR REPLACE FUNCTION get_suggested_tracks(p_user_id uuid)
RETURNS TABLE (track_id uuid) 
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

  -- 4. Query matching tracks excluding already played ones
  -- A track matches if it has at least one matching genre OR one matching mood.
  -- We'll rank them by how many matches they have, then fallback to play_count.
  RETURN QUERY
  SELECT t.id
  FROM tracks t
  WHERE t.is_hidden = false
    AND t.deleted_at IS NULL
    AND t.track_type = 'main'
    AND t.id NOT IN (
      SELECT pe2.track_id FROM play_events pe2 WHERE pe2.user_id = p_user_id
    )
    AND (
      (t.genre = ANY(top_genres)) OR
      (t.moods && top_moods) -- && means arrays overlap
    )
  ORDER BY 
    ((CASE WHEN t.genre = ANY(top_genres) THEN 1 ELSE 0 END) +
     (CASE WHEN t.moods && top_moods THEN 1 ELSE 0 END)) DESC,
    t.play_count DESC
  LIMIT 16;
END;
$$;
