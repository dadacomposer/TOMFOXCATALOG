import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

export const supabase = createClient(supabaseUrl, supabaseKey);

const filterDeletedVersions = (tracks: any[]) => {
  return tracks.map(t => {
    if (t.versions && Array.isArray(t.versions)) {
      t.versions = t.versions.filter((v: any) => v.deleted_at === null);
    }
    return t;
  });
};

// Helper function to fetch a specific page of tracks
export async function fetchTracks(page: number = 1, pageSize: number = 20, filters: Record<string, any> = {}, sortBy: string = 'relevance', searchIds?: string[]) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('tracks')
    .select('*, versions:tracks!parent_track_id(*)')
    .eq('status', 'published')
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .eq('track_type', 'main');
    
  if (searchIds && searchIds.length > 0) {
    query = query.in('id', searchIds);
  } else if (searchIds && searchIds.length === 0) {
    // If searchIds is explicitly empty, it means the search returned no results.
    return [];
  }
    
  if (sortBy === 'newest') query = query.order('release_date', { ascending: false });
  else if (sortBy === 'oldest') query = query.order('release_date', { ascending: true });
  else if (sortBy === 'most_played') query = query.order('play_count', { ascending: false });
  else if (sortBy === 'a-z') query = query.order('file_name', { ascending: true });
  else if (sortBy === 'z-a') query = query.order('file_name', { ascending: false });
  else {
    // relevance default
    if (!searchIds || searchIds.length === 0) {
      query = query.order('release_date', { ascending: false });
    }
    // If searchIds is present, we do not order in SQL so we can order in memory later
  }
    
  // Apply filters — each key uses OR within its category, AND between categories
  for (const [key, values] of Object.entries(filters)) {
    if (!values || (Array.isArray(values) && values.length === 0)) continue;

    if (key === 'genre') {
      // genre is a plain text column — OR across selected values
      const conditions = (values as string[]).map(v => `genre.ilike.%${v}%`).join(',');
      query = query.or(conditions);
    } else if (key === 'energy_level') {
      // energy_level is a plain text column — OR across selected values
      const conditions = (values as string[]).map(v => `energy_level.eq.${v}`).join(',');
      query = query.or(conditions);
    } else if (['subgenre', 'moods', 'instruments', 'textures', 'scenarios', 'human_tags', 'movement'].includes(key)) {
      // All are text[] arrays — use Postgres && operator via .overlaps (OR logic within category)
      query = query.overlaps(key, values as string[]);
    }
  }
  let data, error;

  if (searchIds && searchIds.length > 0 && sortBy === 'relevance') {
    // Fetch all matching IDs without DB pagination to sort them exactly by the searchIds array in memory
    const result = await query;
    error = result.error;
    if (result.data) {
      const trackMap = new Map(result.data.map(t => [t.id, t]));
      data = searchIds.map(id => trackMap.get(id)).filter(Boolean);
      data = data.slice(from, to + 1);
    }
  } else {
    // Normal query with DB pagination
    const result = await query.range(from, to);
    data = result.data;
    error = result.error;
  }    
  if (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }
  
  return data ? filterDeletedVersions(data) : [];
}


export async function fetchSimilarTracks(trackId: string, limit: number = 5, offset: number = 0) {
  // Uses the match_similar_tracks RPC if available, otherwise falls back to a basic query
  // For simplicity since we don't know if match_similar_tracks RPC exists, we'll fetch random tracks or use a client-side filter if we had the track object.
  // Actually, let's fetch the track's tags and do a basic OR query on moods/instruments, or just fetch random tracks if no tags.
  // We can use RPC 'match_tracks' if we had the embedding. Since we don't have it here, we will just fetch 10 random tracks from the same subgenre if possible, or just random.
  
  // Let's fetch the track to get its subgenre/moods
  const { data: trackData } = await supabase.from('tracks').select('subgenre, moods').eq('id', trackId).single();
  
  let query = supabase.from('tracks').select('*').eq('is_hidden', false).is('deleted_at', null).eq('track_type', 'main').neq('id', trackId).range(offset, offset + limit - 1);
  
  if (trackData) {
    if (trackData.subgenre && Array.isArray(trackData.subgenre) && trackData.subgenre.length > 0) {
      // subgenre is now text[] — use overlaps to find tracks sharing any genre tag
      query = query.overlaps('subgenre', trackData.subgenre.slice(0, 3));
    }
  }
  
  const { data, error } = await query;
  
  if (error || !data || data.length === 0) {
    // fallback to just random
    const fallback = await supabase.from('tracks').select('*').eq('is_hidden', false).is('deleted_at', null).eq('track_type', 'main').neq('id', trackId).range(offset, offset + limit - 1);
    return fallback.data || [];
  }
  
  return data;
}

let cachedDefaultOrder: string[] | null = null;

export async function fetchDefaultTrackOrder(): Promise<string[]> {
  if (cachedDefaultOrder) return cachedDefaultOrder;

  try {
    // 1. Fetch ALL track IDs and names (bypassing the 1000 Supabase limit)
    let allTracks: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
      const { data: chunk, error: tracksError } = await supabase
        .from('tracks')
        .select('id, file_name')
        .eq('is_hidden', false)
        .is('deleted_at', null)
        .eq('track_type', 'main')
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (tracksError) throw tracksError;
      
      if (chunk && chunk.length > 0) {
        allTracks = [...allTracks, ...chunk];
        page++;
        if (chunk.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    if (allTracks.length === 0) return [];

    // 2. Identify trending tracks
    const trendingTitles = [
      'Little More Time', 'Oneness', 'Neutral Pulse 1', 'Growing Current',
      'Ready Current', 'Final Current C', 'Dry Thought', 'Train Runner',
      'New Formalities', 'Key Message', 'Please No War', 'City Repetitions',
      'Doors Opening', 'Cause', 'Old Guard', 'Middleman'
    ];
    
    const trendingIds = new Set<string>();
    for (const track of allTracks) {
      for (const title of trendingTitles) {
        if (track.file_name.toLowerCase().includes(title.toLowerCase())) {
          trendingIds.add(track.id);
          break;
        }
      }
    }

    // 3. Fetch playlist mappings
    const { data: ptData, error: ptError } = await supabase.from('playlist_tracks').select('playlist_id, tracks(id)');
    if (ptError) throw ptError;

    const tracksInAnyPlaylist = new Set<string>();
    const trendingPlaylists = new Set<string>();

    // Pass 1: Find which playlists contain at least one trending track
    if (ptData) {
      for (const row of ptData) {
        const trackId = (row.tracks as any)?.id;
        if (trackId) {
          tracksInAnyPlaylist.add(trackId);
          if (trendingIds.has(trackId)) {
            trendingPlaylists.add(row.playlist_id);
          }
        }
      }
    }

    // Pass 2: Find all tracks that belong to those trending playlists
    const tracksInTrendingPlaylist = new Set<string>();
    if (ptData) {
      for (const row of ptData) {
        const trackId = (row.tracks as any)?.id;
        if (trackId && trendingPlaylists.has(row.playlist_id)) {
          tracksInTrendingPlaylist.add(trackId);
        }
      }
    }

    // 4. Tier them
    const tier1: string[] = []; // Tracks in trending playlists
    const tier2: string[] = []; // Tracks in any other playlist
    const tier3: string[] = []; // Tracks in no playlist

    for (const track of allTracks) {
      if (tracksInTrendingPlaylist.has(track.id)) {
        tier1.push(track.id);
      } else if (tracksInAnyPlaylist.has(track.id)) {
        tier2.push(track.id);
      } else {
        tier3.push(track.id);
      }
    }

    // 5. Shuffle within tiers
    const shuffle = (array: string[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    cachedDefaultOrder = [...shuffle(tier1), ...shuffle(tier2), ...shuffle(tier3)];
    return cachedDefaultOrder;

  } catch (error) {
    console.error('Error calculating default track order:', error);
    return [];
  }
}

export async function fetchTracksByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('tracks')
    .select('*, versions:tracks!parent_track_id(*)')
    .eq('status', 'published')
    .is('deleted_at', null)
    .in('id', ids);
    
  if (error) {
    console.error('Error fetching tracks by ids:', error);
    return [];
  }
  
  // Sort data to match the exact order of the `ids` array
  const cleanData = data ? filterDeletedVersions(data) : [];
  const trackMap = new Map(cleanData.map(t => [t.id, t]));
  return ids.map(id => trackMap.get(id)).filter(Boolean);
}

export async function fetchTrendingTracks() {
  // 1. Fetch top tracks by play_count
  const { data: topTracks, error } = await supabase
    .from('tracks')
    .select('id')
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .eq('track_type', 'main')
    .order('play_count', { ascending: false, nullsFirst: false })
    .limit(16);

  if (error) {
    console.error('Error fetching trending track IDs:', error);
    return [];
  }
  if (!topTracks || topTracks.length === 0) return [];
  
  const finalIds = topTracks.map(t => t.id);
  
  // 2. Hydrate in exact order
  const fullTracks = await fetchTracksByIds(finalIds);
  return fullTracks;
}

export async function fetchSuggestedTracks(userId: string) {
  if (!userId) return [];
  const { data, error } = await supabase.rpc('get_suggested_tracks', {
    p_user_id: userId
  });
  
  if (error) {
    console.error('Error fetching suggested tracks:', error);
    return [];
  }
  
  if (!data || data.length === 0) return [];
  
  const finalIds = data.map((t: { track_id: string }) => t.track_id);
  const fullTracks = await fetchTracksByIds(finalIds);
  return fullTracks;
}

export async function fetchRecentlyPlayedTracks(userId: string) {
  if (!userId) return [];
  const { data, error } = await supabase.rpc('get_recently_played_tracks', {
    p_user_id: userId
  });
  
  if (error) {
    console.error('Error fetching recently played tracks:', error);
    return [];
  }
  
  if (!data || data.length === 0) return [];
  
  const finalIds = data.map((t: { track_id: string }) => t.track_id);
  const fullTracks = await fetchTracksByIds(finalIds);
  return fullTracks;
}

export async function fetchSuggestedPlaylists(userId: string) {
  if (!userId) return [];
  const { data, error } = await supabase.rpc('get_suggested_playlists', {
    p_user_id: userId
  });
  
  if (error) {
    console.error('Error fetching suggested playlists:', error);
    return [];
  }
  
  if (!data || data.length === 0) return [];
  
  const finalIds = data.map((p: { playlist_id: string }) => p.playlist_id);
  
  // Now fetch full playlist objects
  const { data: playlistsData, error: playlistsError } = await supabase
    .from('playlists')
    .select('*')
    .in('id', finalIds);
    
  if (playlistsError) {
    console.error('Error hydrating suggested playlists:', playlistsError);
    return [];
  }
  
  // Reorder playlists based on the RPC result order
  const hydratedPlaylists = finalIds
    .map((id: string) => playlistsData?.find(p => p.id === id))
    .filter(Boolean);
    
  return hydratedPlaylists;
}


export async function searchTracksByTitle(query: string) {
  // Try full text search first (handles stemming: investigation -> investig)
  const { data: ftsData, error: ftsError } = await supabase
    .from('tracks')
    .select('*, versions:tracks!parent_track_id(*)')
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .eq('track_type', 'main')
    .textSearch('file_name', query, {
      type: 'websearch',
      config: 'english'
    })
    .limit(100);
    
  if (!ftsError && ftsData && ftsData.length > 0) {
    return filterDeletedVersions(ftsData);
  }

  // Fallback to simple ilike if full text search returns nothing
  const { data, error } = await supabase
    .from('tracks')
    .select('*, versions:tracks!parent_track_id(*)')
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .eq('track_type', 'main')
    .ilike('file_name', `%${query}%`)
    .limit(100);
    
  if (error) {
    console.error('Error fetching tracks by title:', error);
    return [];
  }
  
  return data ? filterDeletedVersions(data) : [];
}

// Search across ALL tag fields: moods, instruments, textures, scenarios, human_tags, genre, subgenre, description
export async function searchTracksByTags(query: string) {
  const q = query.trim();
  if (!q) return [];
  
  // Build an OR across all text fields containing the query
  const conditions = [
    `file_name.ilike.%${q}%`,
    `genre.ilike.%${q}%`,
    `description.ilike.%${q}%`,
    `energy_level.ilike.%${q}%`,
  ].join(',');
  
  const { data: textData } = await supabase
    .from('tracks')
    .select('id')
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .eq('track_type', 'main')
    .or(conditions)
    .limit(100);
    
  // Also check array fields via RPC for moods/instruments/textures/scenarios/human_tags
  const { data: tagData } = await supabase.rpc('search_tracks_by_tag', { search_term: q }).limit(100);
  
  const ids = new Set<string>();
  (textData || []).forEach((r: any) => ids.add(r.id));
  (tagData || []).forEach((r: any) => ids.add(r.id));
  
  return Array.from(ids);
}

// Fetch all distinct filter options from the DB dynamically
export async function fetchFilterOptions() {
  const { data, error } = await supabase.rpc('get_filter_options');
  if (error) {
    console.error('Error fetching filter options:', error);
    return null;
  }
  return data as {
    genre: { value: string; count: number }[];
    subgenre: { value: string; count: number }[];
    moods: { value: string; count: number }[];
    instruments: { value: string; count: number }[];
    textures: { value: string; count: number }[];
    scenarios: { value: string; count: number }[];
    human_tags: { value: string; count: number }[];
    energy_level: { value: string; count: number }[];
    movement: { value: string; count: number }[];
  };
}

export async function searchTracksByEmbedding(embedding: number[]) {
  const { data, error } = await supabase.rpc('match_tracks', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 100
  });
  
  if (error) {
    console.error('Error matching tracks:', error);
    return [];
  }
  return data || [];
}

export async function fetchTrackVersions(parentTrackId: string) {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('parent_track_id', parentTrackId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching track versions:', error);
    return [];
  }
  return data || [];
}

export async function fetchPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .is('user_id', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }
  return data || [];
}

export async function fetchUserPlaylists(userId: string) {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching user playlists:', error);
    return [];
  }
  return data || [];
}

export async function fetchPlaylistTrackIds(playlistId: string) {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select('position, is_hidden, tracks (id)')
    .eq('playlist_id', playlistId)
    .eq('is_hidden', false)
    .order('position', { ascending: true });
    
  if (error) {
    console.error('Error fetching playlist tracks:', error);
    return [];
  }

  const ids = data.map(d => (d.tracks as any)?.id).filter(Boolean);
  return ids as string[];
}

export async function fetchPlaylistTracks(playlistId: string) {
  const ids = await fetchPlaylistTrackIds(playlistId);
  if (ids.length === 0) return [];
  const fullTracks = await fetchTracksByIds(ids as string[]);
  return fullTracks;
}

// -----------------------------------------------------------------------------
// AUTHENTICATION HELPERS
// -----------------------------------------------------------------------------

export async function signInWithGoogle(redirectTo?: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/browse`,
    },
  });
  if (error) throw error;
  return data;
}

// -----------------------------------------------------------------------------
// PROFILE & WORKSPACE HELPERS
// -----------------------------------------------------------------------------

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
  }
  return data;
}

export async function createProfile(userId: string, data: any) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert([{ id: userId, ...data }])
    .select()
    .single();
    
  if (error) throw error;
  return profile;
}

export async function updateProfile(userId: string, data: any) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...data })
    .select()
    .single();
    
  if (error) throw error;
  return profile;
}

export async function getUserWorkspaces(userId: string) {
  // Now we fetch all workspaces where the user is a member (or owner)
  // Because RLS is enabled and allows viewing workspaces they are members of,
  // we can simply select from workspaces and the DB handles the security.
  // BUT to be explicit and ensure we get only those, we can join with workspace_members.
  // Actually, thanks to the RLS policy "Users can view workspaces they are members of",
  // a simple `select('*')` will return all their workspaces.
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data || [];
}

export async function getUserStudioProjects() {
  const { data, error } = await supabase
    .from('tf_studio_projects')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Failed to fetch user studio projects', error);
    return [];
  }
  return data || [];
}
export async function createWorkspace(userId: string, name: string, avatarUrl?: string, companyName?: string, companyIndustry?: string) {
  const { data, error } = await supabase.rpc('create_new_workspace', {
    p_name: name,
    p_avatar_url: avatarUrl,
    p_company_name: companyName,
    p_company_industry: companyIndustry
  });
    
  if (error) throw error;
  return data;
}

export async function updateWorkspace(workspaceId: string, updates: { name?: string, company_name?: string, company_industry?: string, avatar_url?: string }) {
  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .select();
    
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Permission denied or workspace not found.");
  return data[0];
}

export async function getWorkspaceMembers(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      id,
      role,
      profiles:user_id ( id, first_name, last_name, avatar_url ),
      user_id
    `)
    .eq('workspace_id', workspaceId);
    
  if (error) throw error;
  return data || [];
}

export async function updateWorkspaceMember(workspaceId: string, userId: string, updates: { role: string }) {
  const { data, error } = await supabase
    .from('workspace_members')
    .update(updates)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function inviteTeamMember(workspaceId: string, email: string) {
  const { data, error } = await supabase.functions.invoke('invite-team-member', {
    body: { workspaceId, email }
  });
    
  if (error) throw error;
  return data;
}

export async function getMyWorkspaceInvites() {
  const { data, error } = await supabase.rpc('get_my_workspace_invites');
  if (error) throw error;
  return data || [];
}

export async function acceptWorkspaceInvite(inviteId: string) {
  const { error } = await supabase.rpc('accept_workspace_invite', { p_invite_id: inviteId });
  if (error) throw error;
}

export async function declineWorkspaceInvite(inviteId: string) {
  const { error } = await supabase.rpc('decline_workspace_invite', { p_invite_id: inviteId });
  if (error) throw error;
}



