-- Fix match_tracks RPC signature by removing unused columns and returning only ID and similarity
-- This fixes a type mismatch error when the tracks table changed text columns into arrays (like subgenre)

DROP FUNCTION IF EXISTS public.match_tracks(vector, double precision, integer);

CREATE OR REPLACE FUNCTION public.match_tracks(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    id,
    1 - (description_embedding <=> query_embedding) AS similarity
  FROM tracks
  WHERE description_embedding IS NOT NULL
    AND 1 - (description_embedding <=> query_embedding) > match_threshold
  ORDER BY description_embedding <=> query_embedding
  LIMIT match_count;
$function$;
