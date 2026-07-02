import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('playlist_tracks').select('track_id, playlists(title)').limit(2);
  console.log(JSON.stringify(data, null, 2));
}
run();
