import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('playlists').select('*').limit(1);
  console.log('playlists:', data, error);
  const { data: d2, error: e2 } = await supabase.from('playlist_tracks').select('*').limit(1);
  console.log('playlist_tracks:', d2, e2);
}
run();
