
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS movement text[];

-- Recreate get_filter_options without bpm_range and with movement
CREATE OR REPLACE FUNCTION public.get_filter_options()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS \$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'genre',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT genre as value, COUNT(*)::int as count
        FROM tracks
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND genre IS NOT NULL
          AND genre != ''
        GROUP BY genre
        ORDER BY count DESC
        LIMIT 60
      ) r
    ),
    'subgenre',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT val as value, COUNT(*)::int as count
        FROM tracks,
          unnest(
            CASE
              WHEN subgenre IS NULL OR subgenre = '' THEN ARRAY[]::text[]
              WHEN subgenre LIKE '[%' THEN ARRAY(SELECT jsonb_array_elements_text(subgenre::jsonb))
              ELSE ARRAY[subgenre]
            END
          ) AS val
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND val != ''
        GROUP BY val
        ORDER BY count DESC
        LIMIT 80
      ) r
    ),
    'moods',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT val as value, COUNT(*)::int as count
        FROM tracks,
          unnest(COALESCE(moods, ARRAY[]::text[])) AS val
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND val != ''
        GROUP BY val
        ORDER BY count DESC
        LIMIT 80
      ) r
    ),
    'instruments',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT val as value, COUNT(*)::int as count
        FROM tracks,
          unnest(COALESCE(instruments, ARRAY[]::text[])) AS val
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND val != ''
        GROUP BY val
        ORDER BY count DESC
        LIMIT 80
      ) r
    ),
    'textures',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT val as value, COUNT(*)::int as count
        FROM tracks,
          unnest(COALESCE(textures, ARRAY[]::text[])) AS val
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND val != ''
        GROUP BY val
        ORDER BY count DESC
        LIMIT 80
      ) r
    ),
    'scenarios',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT val as value, COUNT(*)::int as count
        FROM tracks,
          unnest(COALESCE(scenarios, ARRAY[]::text[])) AS val
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND val != ''
        GROUP BY val
        ORDER BY count DESC
        LIMIT 80
      ) r
    ),
    'human_tags',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT val as value, COUNT(*)::int as count
        FROM tracks,
          jsonb_array_elements_text(COALESCE(human_tags, '[]'::jsonb)) AS val
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND val != ''
        GROUP BY val
        ORDER BY count DESC
        LIMIT 100
      ) r
    ),
    'movement',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT val as value, COUNT(*)::int as count
        FROM tracks,
          unnest(COALESCE(movement, ARRAY[]::text[])) AS val
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND val != ''
        GROUP BY val
        ORDER BY count DESC
        LIMIT 80
      ) r
    ),
    'energy_level',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.count DESC), '[]'::jsonb)
      FROM (
        SELECT energy_level as value, COUNT(*)::int as count
        FROM tracks
        WHERE is_hidden = false
          AND deleted_at IS NULL
          AND track_type = 'main'
          AND energy_level IS NOT NULL
          AND energy_level != ''
        GROUP BY energy_level
        ORDER BY count DESC
      ) r
    )
  ) INTO result;

  RETURN result;
END;
\$;

CREATE OR REPLACE FUNCTION public.search_tracks_by_tag(search_term text)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS \$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.id
  FROM tracks t
  WHERE t.is_hidden = false
    AND t.deleted_at IS NULL
    AND t.track_type = 'main'
    AND (
      EXISTS (
        SELECT 1 FROM unnest(t.moods) AS m WHERE lower(m) LIKE lower('%' || search_term || '%')
      )
      OR EXISTS (
        SELECT 1 FROM unnest(t.instruments) AS i WHERE lower(i) LIKE lower('%' || search_term || '%')
      )
      OR EXISTS (
        SELECT 1 FROM unnest(t.textures) AS tx WHERE lower(tx) LIKE lower('%' || search_term || '%')
      )
      OR EXISTS (
        SELECT 1 FROM unnest(t.scenarios) AS s WHERE lower(s) LIKE lower('%' || search_term || '%')
      )
      OR EXISTS (
        SELECT 1 FROM unnest(t.movement) AS mv WHERE lower(mv) LIKE lower('%' || search_term || '%')
      )
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(COALESCE(t.human_tags, '[]'::jsonb)) AS ht
        WHERE lower(ht) LIKE lower('%' || search_term || '%')
      )
    );
END;
\$;
