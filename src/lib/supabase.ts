import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to fetch a specific page of tracks
export async function fetchTracks(page: number = 1, pageSize: number = 20, filters: Record<string, string[]> = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('tracks')
    .select('*')
    .order('file_name', { ascending: true });
    
  // Apply filters
  for (const [key, values] of Object.entries(filters)) {
    if (values && values.length > 0) {
      if (key === 'subgenre') {
        // subgenre is a text column containing JSON string, so we use ilike
        const conditions = values.map(v => `subgenre.ilike.%${v}%`).join(',');
        query = query.or(conditions);
      } else {
        // moods, instruments, scenarios, human_tags are jsonb columns
        // Supabase allows .contains for checking if jsonb array contains elements
        query = query.contains(key, values);
      }
    }
  }
  
  const { data, error } = await query.range(from, to);
    
  if (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }
  
  return data || [];
}

export async function fetchSimilarTracks(trackId: string, limit: number = 5, offset: number = 0) {
  // Uses the match_similar_tracks RPC if available, otherwise falls back to a basic query
  // For simplicity since we don't know if match_similar_tracks RPC exists, we'll fetch random tracks or use a client-side filter if we had the track object.
  // Actually, let's fetch the track's tags and do a basic OR query on moods/instruments, or just fetch random tracks if no tags.
  // We can use RPC 'match_tracks' if we had the embedding. Since we don't have it here, we will just fetch 10 random tracks from the same subgenre if possible, or just random.
  
  // Let's fetch the track to get its subgenre/moods
  const { data: trackData } = await supabase.from('tracks').select('subgenre, moods').eq('id', trackId).single();
  
  let query = supabase.from('tracks').select('*').neq('id', trackId).range(offset, offset + limit - 1);
  
  if (trackData) {
    if (trackData.subgenre) {
      const sg = Array.isArray(trackData.subgenre) ? trackData.subgenre[0] : trackData.subgenre;
      if (typeof sg === 'string' && sg.length > 0) {
        query = query.ilike('subgenre', `%${sg}%`);
      }
    }
  }
  
  const { data, error } = await query;
  
  if (error || !data || data.length === 0) {
    // fallback to just random
    const fallback = await supabase.from('tracks').select('*').neq('id', trackId).range(offset, offset + limit - 1);
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
    .select('*')
    .in('id', ids);
    
  if (error) {
    console.error('Error fetching tracks by ids:', error);
    return [];
  }
  
  // Sort data to match the exact order of the `ids` array
  const trackMap = new Map(data.map(t => [t.id, t]));
  return ids.map(id => trackMap.get(id)).filter(Boolean);
}

export async function fetchTrendingTracks() {
  const trendingTitles = [
    'Little More Time', 'Oneness', 'Neutral Pulse 1', 'Growing Current',
    'Ready Current', 'Final Current C', 'Dry Thought', 'Train Runner',
    'New Formalities', 'Key Message', 'Please No War', 'City Repetitions',
    'Doors Opening', 'Cause', 'Old Guard', 'Middleman'
  ];

  // 1. Fetch the exact trending tracks
  const orQuery = trendingTitles.map(t => `file_name.ilike.%${t}%`).join(',');
  const { data: exactData, error: exactError } = await supabase
    .from('tracks')
    .select('id, file_name')
    .or(orQuery);
    
  let fixedIds: string[] = [];
  if (exactData) {
    const orderedData: { id: string, file_name: string }[] = [];
    for (const title of trendingTitles) {
      const match = exactData.find(d => d.file_name.toLowerCase().includes(title.toLowerCase()));
      if (match && !orderedData.find(d => d.id === match.id)) {
        orderedData.push(match);
      }
    }
    fixedIds = orderedData.map(d => d.id);
  }

  const finalIds = Array.from(new Set([...fixedIds]));
  if (finalIds.length === 0) return [];
  
  // 4. Hydrate in exact order
  const fullTracks = await fetchTracksByIds(finalIds);
  return fullTracks;
}

export async function searchTracksByTitle(query: string) {
  // Try full text search first (handles stemming: investigation -> investig)
  const { data: ftsData, error: ftsError } = await supabase
    .from('tracks')
    .select('*')
    .textSearch('file_name', query, {
      type: 'websearch',
      config: 'english'
    })
    .limit(100);
    
  if (!ftsError && ftsData && ftsData.length > 0) {
    return ftsData;
  }

  // Fallback to simple ilike if full text search returns nothing
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .ilike('file_name', `%${query}%`)
    .limit(100);
    
  if (error) {
    console.error('Error fetching tracks by title:', error);
    return [];
  }
  
  return data || [];
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

export async function fetchPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }
  return data || [];
}

export async function fetchPlaylistTrackIds(playlistId: string) {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select('position, tracks (id)')
    .eq('playlist_id', playlistId)
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

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/browse`,
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
    .select()
    .single();
    
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from('workspace_invites')
    .insert([{ workspace_id: workspaceId, email }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}



