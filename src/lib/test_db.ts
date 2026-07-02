import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('tracks').select('*').limit(3);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log("Tracks fetched:", data.length);
  for (const track of data) {
    console.log(`Checking ${track.file_name}`);
    console.log(`URL: ${track.r2_url}`);
    
    try {
      const response = await fetch(track.r2_url, { method: 'HEAD' });
      console.log(`Status: ${response.status} ${response.statusText}`);
    } catch(err) {
      console.error(`Fetch failed for URL:`, err);
    }
  }
}
check();
