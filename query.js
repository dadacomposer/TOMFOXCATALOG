import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlaylists() {
  const { data: playlists } = await supabase.from('playlists').select('id, title, is_featured');
  console.log("Playlists:", playlists);
  
  if (playlists) {
    for (const p of playlists) {
      const { data: tracks } = await supabase.from('playlist_tracks').select('track_id').eq('playlist_id', p.id);
      console.log(`Playlist '${p.title}' (featured: ${p.is_featured}) has ${tracks?.length} tracks`);
    }
  }
}
checkPlaylists();
