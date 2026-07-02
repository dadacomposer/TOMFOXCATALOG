import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://jicrumwdnwmjkotkbjtg.supabase.co", process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { count } = await supabase.from('playlist_tracks').select('*', { count: 'exact', head: true });
  console.log('Total playlist tracks:', count);
}
run();
