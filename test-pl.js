import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('='))
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Let's insert a playlist and see the exact error. We use 'title' as expected by fetchPlaylists.
  const { data, error } = await supabase.from('playlists').insert([{ title: 'test_insert', description: 'desc' }]).select();
  console.log('Insert Result:', data, error);
}
run();
