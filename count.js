import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jicrumwdnwmjkotkbjtg.supabase.co', 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D');
async function run() {
  const { data: pData } = await supabase.from('playlists').select('*');
  const newPlaylist = pData.find(p => p.title.toLowerCase().includes('new music'));
  if (newPlaylist) {
    const { count } = await supabase.from('playlist_tracks').select('*', { count: 'exact', head: true }).eq('playlist_id', newPlaylist.id);
    console.log("New Music tracks:", count);
  }
}
run();
