import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jicrumwdnwmjkotkbjtg.supabase.co', 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D');

async function run() {
  console.time('fetchPlaylists');
  const { data: pData } = await supabase.from('playlists').select('*');
  console.timeEnd('fetchPlaylists');

  if (pData && pData.length > 0) {
    console.time('fetchPlaylistTracks');
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select('position, tracks (id)')
      .eq('playlist_id', pData[0].id)
      .order('position', { ascending: true });
    
    if (data) {
       const trackIds = data.map((row) => row.tracks?.id).filter(Boolean);
       console.time('fetchTracksByIds');
       await supabase.from('tracks').select('*').in('id', trackIds);
       console.timeEnd('fetchTracksByIds');
    }
    console.timeEnd('fetchPlaylistTracks');
  }

  console.time('fetchTrending');
  const trendingTitles = ['Little More Time', 'Oneness', 'Neutral Pulse 1', 'Growing Current'];
  const orQuery = trendingTitles.map(t => `file_name.ilike.%${t}%`).join(',');
  const { data: exactData } = await supabase
    .from('tracks')
    .select('id, file_name')
    .or(orQuery);
  console.timeEnd('fetchTrending');
}
run();
