import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: playlists, error } = await supabase.from('playlists').select('*');
  
  if (error) {
    console.error(error);
    return;
  }

  const getMatched = (regex) => playlists.filter(p => p.title?.toLowerCase()?.match(regex));

  const catPercussion = getMatched(/drum|percussive|beat|rhythm|octane|pulse/);
  const catCinematic = getMatched(/film|space|cinematic|score|trailer|dramatic|epic/);
  const catDark = getMatched(/dark|shadow|breach|tension|suspense|thriller/);
  const catSynth = getMatched(/synth|tech|code|electronic/);
  const catCalm = getMatched(/piano|nostalgia|morning|ambient|chill|calm|emotion/);
  const catDocs = getMatched(/vox|explainer|documentary|session|underscore/);
  const catJazz = getMatched(/jazz|organic|acoustic/);

  const assignments = {
    "Percussion & Rhythm": catPercussion,
    "Cinematic & Film": catCinematic,
    "Dark & Tension": catDark,
    "Electronic & Synth": catSynth,
    "Calm & Reflective": catCalm,
    "Documentary & Explainer": catDocs,
    "Jazz & Organic": catJazz,
  };

  const updates = playlists.map(p => {
    const categories = [];
    for (const [catName, catPlaylists] of Object.entries(assignments)) {
      if (catPlaylists.some(cp => cp.id === p.id)) {
        categories.push(catName);
      }
    }
    return { ...p, categories };
  });

  for (const update of updates) {
    if (update.categories.length > 0) {
      await supabase.from('playlists').update({ categories: update.categories }).eq('id', update.id);
      console.log(`Updated ${update.title} with categories: ${update.categories.join(', ')}`);
    }
  }
}

main();
