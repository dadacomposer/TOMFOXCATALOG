-- Recently Played must reflect a completed/abandoned listen, not a tap on a
-- play button. Preserve the current history as a one-time baseline, then use
-- only completed listens going forward.
INSERT INTO public.play_events (
  track_id,
  user_id,
  session_id,
  duration,
  event_type,
  created_at
)
SELECT history.track_id, history.user_id, 'legacy-history', 0, 'complete', history.created_at
FROM (
  SELECT DISTINCT ON (pe.user_id, pe.track_id)
    pe.track_id,
    pe.user_id,
    pe.created_at
  FROM public.play_events pe
  WHERE pe.user_id IS NOT NULL
    AND pe.track_id IS NOT NULL
    AND pe.event_type IN ('start', 'ping')
  ORDER BY pe.user_id, pe.track_id, pe.created_at DESC
) AS history
WHERE NOT EXISTS (
  SELECT 1
  FROM public.play_events completed
  WHERE completed.user_id = history.user_id
    AND completed.track_id = history.track_id
    AND completed.event_type = 'complete'
);

-- All personalised shelves start by filtering the playback log by user. This
-- covering index avoids scanning the entire analytics table as it grows.
CREATE INDEX IF NOT EXISTS play_events_user_event_track_created_idx
  ON public.play_events (user_id, event_type, track_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_recently_played_tracks(p_user_id uuid)
RETURNS TABLE (track_id uuid)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH completed_tracks AS (
    SELECT pe.track_id, MAX(pe.created_at) AS completed_at
    FROM public.play_events pe
    WHERE pe.user_id = p_user_id
      AND pe.event_type = 'complete'
    GROUP BY pe.track_id
  )
  SELECT track_id
  FROM completed_tracks
  WHERE (SELECT COUNT(*) FROM completed_tracks) >= 3
  ORDER BY completed_at DESC
  LIMIT 16;
$$;
