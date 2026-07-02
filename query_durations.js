import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('tracks').select('file_name, duration');
  if (error) {
    console.error(error);
    return;
  }
  
  const shortTracks25 = [];
  const shortTracks35 = [];
  const shortTracks50 = [];
  
  data.forEach(t => {
     const dur = parseFloat(t.duration);
     if (dur < 25) shortTracks25.push(`${t.file_name} (${dur}s)`);
     else if (dur < 35) shortTracks35.push(`${t.file_name} (${dur}s)`);
     else if (dur < 50) shortTracks50.push(`${t.file_name} (${dur}s)`);
  });
  
  console.log("--- < 25s ---");
  console.log(shortTracks25.slice(0, 5).join('\n'));
  console.log("--- < 35s ---");
  console.log(shortTracks35.slice(0, 5).join('\n'));
  console.log("--- < 50s ---");
  console.log(shortTracks50.slice(0, 5).join('\n'));
}

run();
