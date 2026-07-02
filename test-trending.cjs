const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const titles = [
    'Little More Time', 'Oneness', 'Neutral Pulse 1', 'Growing Current',
    'Ready Current', 'Final Current C', 'Dry Thought', 'Train Runner',
    'New Formalities', 'Key Message', 'Please No War', 'City Repetitions',
    'Doors Opening', 'Cause'
  ];
  
  const orString = titles.map(t => `file_name.ilike.%${t}%`).join(',');
  const { data } = await supabase.from('tracks').select('id, file_name').or(orString);
  console.log('Found:', data.length);
  for (let t of titles) {
    const match = data.find(d => d.file_name.toLowerCase().includes(t.toLowerCase()));
    if (!match) console.log('MISSING:', t);
  }
}
run();
