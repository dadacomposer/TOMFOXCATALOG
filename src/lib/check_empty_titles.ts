import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

const cleanTitle = (filename: string) => {
  return filename.replace(/\.(mp3|wav|aif)$/i, '').replace(/^\d+\s*-?\s*/, '').trim();
};

async function check() {
  const { data, error } = await supabase.from('tracks').select('file_name').order('file_name', { ascending: true }).limit(10);
  if (error) {
    console.error(error);
    return;
  }
  
  for (const track of data) {
    console.log(`Original: "${track.file_name}" -> Cleaned: "${cleanTitle(track.file_name)}"`);
  }
}
check();
