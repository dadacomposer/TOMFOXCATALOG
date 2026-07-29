import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Creating daniel...");
  const { data: dData, error: dError } = await supabase.auth.signUp({
    email: 'dadacomposer@gmail.com',
    password: 'DaDa57263_1'
  });
  console.log('Daniel result:', dData?.user?.id, dError?.message);

  console.log("Creating tom...");
  const { data: tData, error: tError } = await supabase.auth.signUp({
    email: 'tomfox@admin.com',
    password: 'sfdfuhbo3487sd34u8sdfsuhiw_36y'
  });
  console.log('Tom result:', tData?.user?.id, tError?.message);
}
run();
