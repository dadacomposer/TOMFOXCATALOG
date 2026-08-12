-- Add new columns
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS functions TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS music_for TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS character TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS arrangement TEXT[];
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS tempo TEXT[];

-- Migrate data
UPDATE tracks
SET 
  functions = textures,
  music_for = scenarios,
  character = human_tags,
  tempo = CASE 
            WHEN energy_level IS NULL OR energy_level = '' THEN NULL
            ELSE ARRAY[energy_level]
          END,
  genre = CASE 
            WHEN subgenre IS NOT NULL AND array_length(subgenre, 1) > 0 THEN genre || ', ' || array_to_string(subgenre, ', ')
            ELSE genre
          END;

-- Drop old columns
ALTER TABLE tracks DROP COLUMN IF EXISTS subgenre;
ALTER TABLE tracks DROP COLUMN IF EXISTS textures;
ALTER TABLE tracks DROP COLUMN IF EXISTS scenarios;
ALTER TABLE tracks DROP COLUMN IF EXISTS human_tags;
ALTER TABLE tracks DROP COLUMN IF EXISTS energy_level;

-- Update get_filter_options function
CREATE OR REPLACE FUNCTION get_filter_options()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'genre', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT trim(g) as value, COUNT(*)::int as count
        FROM tracks, unnest(string_to_array(genre, ',')) as g
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
          AND genre IS NOT NULL AND genre != ''
        GROUP BY trim(g)
        ORDER BY count DESC
      ) t
    ),
    'moods', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT m as value, COUNT(*)::int as count
        FROM tracks, unnest(moods) as m
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY m
        ORDER BY count DESC
      ) t
    ),
    'instruments', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT i as value, COUNT(*)::int as count
        FROM tracks, unnest(instruments) as i
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY i
        ORDER BY count DESC
      ) t
    ),
    'functions', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT x as value, COUNT(*)::int as count
        FROM tracks, unnest(functions) as x
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY x
        ORDER BY count DESC
      ) t
    ),
    'music_for', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT x as value, COUNT(*)::int as count
        FROM tracks, unnest(music_for) as x
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY x
        ORDER BY count DESC
      ) t
    ),
    'character', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT x as value, COUNT(*)::int as count
        FROM tracks, unnest(character) as x
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY x
        ORDER BY count DESC
      ) t
    ),
    'movement', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT m as value, COUNT(*)::int as count
        FROM tracks, unnest(movement) as m
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY m
        ORDER BY count DESC
      ) t
    ),
    'arrangement', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT m as value, COUNT(*)::int as count
        FROM tracks, unnest(arrangement) as m
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY m
        ORDER BY count DESC
      ) t
    ),
    'tempo', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT e as value, COUNT(*)::int as count
        FROM tracks, unnest(tempo) as e
        WHERE status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main'
        GROUP BY e
        ORDER BY count DESC
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
