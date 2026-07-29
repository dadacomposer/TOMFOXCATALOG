import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('tracks').select('id, file_name, track_type, waveform_data, deleted_at').eq('waveform_data', '[]');
  if (error) console.error(error);
  console.log("Tracks with empty array waveform:");
  console.log(data?.map(d => ({ file_name: d.file_name, type: d.track_type, deleted_at: d.deleted_at })));
}
check();
