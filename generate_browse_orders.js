import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

const trendingPlaylists = [
  'New Music', 'Curious Jazz', 'Light Explainer', 'Serious Journalism', 
  'Historical Discovery', 'Film', 'Playful Curiosity'
];

async function generate() {
  console.log("Fetching tracks...");
  const { data: tracks, error: tracksError } = await supabase.from('tracks').select('id');
  if (tracksError) throw tracksError;

  console.log("Fetching playlist tracks...");
  const { data: ptData, error: ptError } = await supabase
    .from('playlist_tracks')
    .select('track_id, playlists(title)');
  if (ptError) throw ptError;

  const tier1 = new Set();
  const tier2 = new Set();
  
  for (const pt of ptData) {
    const title = pt.playlists?.title;
    if (!title) continue;
    
    if (trendingPlaylists.includes(title)) {
      tier1.add(pt.track_id);
    } else {
      tier2.add(pt.track_id);
    }
  }

  const finalTier1 = Array.from(tier1);
  const finalTier2 = Array.from(tier2).filter(id => !tier1.has(id));
  const allTrackIds = tracks.map(t => t.id);
  const finalTier3 = allTrackIds.filter(id => !tier1.has(id) && !tier2.has(id));

  const shuffle = (array) => [...array].sort(() => 0.5 - Math.random());
  
  for (let i = 1; i <= 5; i++) {
    const order = [...shuffle(finalTier1), ...shuffle(finalTier2), ...shuffle(finalTier3)];
    fs.writeFileSync(`public/browse_order_${i}.json`, JSON.stringify(order));
    console.log(`Generated public/browse_order_${i}.json`);
  }
}

generate().catch(console.error);
