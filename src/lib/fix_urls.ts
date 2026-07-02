import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUrls() {
  console.log("Fetching tracks...");
  const { data, error } = await supabase
    .from('tracks')
    .select('id, r2_url')
    .like('r2_url', '%pub-984e55700d5ab74893ff2cd768b58f8d%');
    
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log(`Found ${data.length} tracks to fix.`);
  let updatedCount = 0;
  for (const track of data) {
    const newUrl = track.r2_url.replace('pub-984e55700d5ab74893ff2cd768b58f8d.r2.dev', 'pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev');
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ r2_url: newUrl })
      .eq('id', track.id);
      
    if (updateError) {
      console.error('Failed to update', track.id, updateError);
    } else {
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} tracks!`);
}

fixUrls();
