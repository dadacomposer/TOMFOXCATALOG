const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jicrumwdnwmjkotkbjtg.supabase.co', 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D');

async function run() {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text: 'romantic' }
    });
    console.log('Embedding response:', !!data, error);
    if (data && data.embedding) {
      console.log('Got vector of length', data.embedding.length);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
run();
