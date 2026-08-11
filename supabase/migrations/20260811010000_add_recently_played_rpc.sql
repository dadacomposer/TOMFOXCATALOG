CREATE OR REPLACE FUNCTION get_recently_played_tracks(p_user_id uuid)
RETURNS TABLE (track_id uuid) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_play_count int;
BEGIN
  -- Check if user has at least 3 distinct tracks played
  SELECT COUNT(DISTINCT pe.track_id) INTO v_play_count
  FROM play_events pe
  WHERE pe.user_id = p_user_id;

  IF v_play_count < 3 THEN
    RETURN; -- Returns empty
  END IF;

  RETURN QUERY
  SELECT pe.track_id
  FROM play_events pe
  WHERE pe.user_id = p_user_id
  GROUP BY pe.track_id
  ORDER BY MAX(pe.created_at) DESC
  LIMIT 16;
END;
$$;
