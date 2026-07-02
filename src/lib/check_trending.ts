import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGETS = [
  "little more time", "oneness", "neutral pulse 1", "theme for mary moss", 
  "growing current", "ready current", "final current c", "dry thought", 
  "train runner", "new formalities", "key message", "please no war", 
  "city repetitions", "doors opening", "couse"
];

async function check() {
  const { data, error } = await supabase.from('tracks').select('file_name');
  if (error) {
    console.error(error);
    return;
  }
  
  const found = [];
  for (const track of data) {
    const title = track.file_name.toLowerCase();
    for (const target of TARGETS) {
      if (title.includes(target)) {
        found.push(track.file_name);
      }
    }
  }
  
  console.log("Total targets:", TARGETS.length);
  console.log("Found in DB:", found.length);
  console.log("List:", found);
}
check();
