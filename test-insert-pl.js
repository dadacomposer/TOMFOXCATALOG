import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const newId = crypto.randomUUID();
  const { data, error } = await supabase.from('playlists').insert([{ id: newId, title: 'Test Admin', cover_url: null }]).select();
  console.log('Insert Result:', data);
  console.log('Error:', JSON.stringify(error, null, 2));
}
run();
