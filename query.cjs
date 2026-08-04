const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jicrumwdnwmjkotkbjtg.supabase.co', 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D');

async function run() {
  const { data, error } = await supabase.from('tracks').select('file_name, moods, genre, subgenre, track_type, is_hidden').eq('is_hidden', false).eq('track_type', 'main');
  if (error) { console.error(error); return; }
  
  const romantic = data.filter(t => 
    (t.file_name && t.file_name.toLowerCase().includes('romantic')) ||
    (t.moods && JSON.stringify(t.moods).toLowerCase().includes('romantic')) ||
    (t.genre && t.genre.toLowerCase().includes('romantic')) ||
    (t.subgenre && t.subgenre.toLowerCase().includes('romantic'))
  );
  
  console.log('Total romantic tracks in table via JS filter:', romantic.length);
  
  const { data: tagData } = await supabase.rpc('search_tracks_by_tag', { search_term: 'romantic' }).limit(100);
  console.log('Total romantic tracks from RPC:', tagData?.length);
  
}
run();
