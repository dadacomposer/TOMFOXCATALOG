import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('tf_studio_projects').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Row:", data);
  }
}
run();
