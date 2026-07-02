import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('workspaces').select('*').limit(1);
  console.log("Workspaces:", data, error);
  
  const { data: members, error: memError } = await supabase.from('workspace_members').select('*').limit(1);
  console.log("Workspace Members:", members, memError);
}
run();
