import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('create_new_workspace', {
    p_name: 'testworkspace',
    p_avatar_url: null,
    p_company_name: null,
    p_company_industry: null
  });
  console.log(error || data);
}
test();
