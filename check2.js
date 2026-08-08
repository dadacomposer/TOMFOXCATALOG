import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: pt } = await supabase.from('playlist_tracks').select('*').eq('playlist_id', '8630d797-8827-4cf1-bde1-2a234d45498d');
  console.log("Playlist tracks:", pt);
  if (pt && pt.length > 0) {
    const { data: t } = await supabase.from('tracks').select('id, file_name').eq('id', pt[0].track_id);
    console.log("Track details:", t);
  }
}
check();
