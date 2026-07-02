import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

const trendingTitles = [
    'Little More Time', 'Oneness', 'Neutral Pulse 1', 'Growing Current',
    'Ready Current', 'Final Current C', 'Dry Thought', 'Train Runner',
    'New Formalities', 'Key Message', 'Please No War', 'City Repetitions',
    'Doors Opening', 'Cause', 'Old Guard', 'Middleman'
];

async function run() {
  const orQuery = trendingTitles.map(t => `file_name.ilike.%${t}%`).join(',');
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, file_name')
    .or(orQuery);

  if (error) {
    console.error(error);
    return;
  }

  const trackIds = tracks.map(t => t.id);

  const { data: playlistTracks, error: ptError } = await supabase
    .from('playlist_tracks')
    .select('track_id, playlists(title)')
    .in('track_id', trackIds);

  if (ptError) {
    console.error(ptError);
    return;
  }

  // Group by track
  const result = {};
  for (const track of tracks) {
    result[track.file_name] = [];
  }

  for (const pt of playlistTracks) {
    const track = tracks.find(t => t.id === pt.track_id);
    if (track && pt.playlists) {
      result[track.file_name].push(pt.playlists.title);
    }
  }

  for (const trackTitle of trendingTitles) {
    const track = tracks.find(t => t.file_name.toLowerCase().includes(trackTitle.toLowerCase()));
    if (track) {
      console.log(`- ${trackTitle}: ${result[track.file_name].join(', ') || 'Nessuna playlist'}`);
    } else {
      console.log(`- ${trackTitle}: (Traccia non trovata nel database)`);
    }
  }
}

run();
