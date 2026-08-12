CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.search_tracks_intelligent(search_query text, max_results integer DEFAULT 100)
 RETURNS TABLE(id uuid, relevance_score double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    GREATEST(
      word_similarity(search_query, REPLACE(REPLACE(t.file_name, '-', ' '), '_', ' ')) * 1.5,
      word_similarity(search_query, COALESCE(t.genre, '')) * 1.2,
      word_similarity(search_query, array_to_string(COALESCE(t.moods, '{}'), ' ')),
      word_similarity(search_query, array_to_string(COALESCE(t.instruments, '{}'), ' ')),
      word_similarity(search_query, array_to_string(COALESCE(t.functions, '{}'), ' ')),
      word_similarity(search_query, array_to_string(COALESCE(t.music_for, '{}'), ' ')),
      word_similarity(search_query, array_to_string(COALESCE(t.character, '{}'), ' ')),
      word_similarity(search_query, array_to_string(COALESCE(t.movement, '{}'), ' ')),
      word_similarity(search_query, array_to_string(COALESCE(t.tempo, '{}'), ' ')),
      word_similarity(search_query, array_to_string(COALESCE(t.arrangement, '{}'), ' '))
    )::double precision as relevance_score
  FROM tracks t
  WHERE 
    t.status = 'published' 
    AND t.is_hidden = false 
    AND t.deleted_at IS NULL 
    AND t.track_type = 'main'
    AND (
      REPLACE(REPLACE(t.file_name, '-', ' '), '_', ' ') ILIKE '%' || REPLACE(REPLACE(search_query, '-', ' '), '_', ' ') || '%' OR
      word_similarity(search_query, REPLACE(REPLACE(t.file_name, '-', ' '), '_', ' ')) > 0.3 OR
      word_similarity(search_query, COALESCE(t.genre, '')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.moods, '{}'), ' ')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.instruments, '{}'), ' ')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.functions, '{}'), ' ')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.music_for, '{}'), ' ')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.character, '{}'), ' ')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.movement, '{}'), ' ')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.tempo, '{}'), ' ')) > 0.3 OR
      word_similarity(search_query, array_to_string(COALESCE(t.arrangement, '{}'), ' ')) > 0.3
    )
  ORDER BY relevance_score DESC
  LIMIT max_results;
END;
$function$;
