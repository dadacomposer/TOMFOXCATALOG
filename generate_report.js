import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateReport() {
  let allTracks = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  while (hasMore) {
    const { data: chunk, error: tracksError } = await supabase
      .from('tracks')
      .select('id, file_name')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (tracksError) throw tracksError;
    
    if (chunk && chunk.length > 0) {
      allTracks = [...allTracks, ...chunk];
      page++;
      if (chunk.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  const trendingTitles = [
    'Little More Time', 'Oneness', 'Neutral Pulse 1', 'Growing Current',
    'Ready Current', 'Final Current C', 'Dry Thought', 'Train Runner',
    'New Formalities', 'Key Message', 'Please No War', 'City Repetitions',
    'Doors Opening', 'Cause', 'Old Guard', 'Middleman'
  ];
  
  const trendingIds = new Set();
  for (const track of allTracks) {
    for (const title of trendingTitles) {
      if (track.file_name.toLowerCase().includes(title.toLowerCase())) {
        trendingIds.add(track.id);
        break;
      }
    }
  }

  // Fetch playlist mappings
  const { data: ptData, error: ptError } = await supabase.from('playlist_tracks').select('playlist_id, tracks(id)');
  if (ptError) throw ptError;

  const tracksInAnyPlaylist = new Set();
  const trendingPlaylists = new Set();

  if (ptData) {
    for (const row of ptData) {
      const trackId = row.tracks?.id || row.tracks?.id;
      if (trackId) {
        tracksInAnyPlaylist.add(trackId);
        if (trendingIds.has(trackId)) {
          trendingPlaylists.add(row.playlist_id);
        }
      }
    }
  }

  const tracksInTrendingPlaylist = new Set();
  if (ptData) {
    for (const row of ptData) {
      const trackId = row.tracks?.id || row.tracks?.id;
      if (trackId && trendingPlaylists.has(row.playlist_id)) {
        tracksInTrendingPlaylist.add(trackId);
      }
    }
  }

  allTracks.sort((a, b) => a.file_name.localeCompare(b.file_name));

  const tier1 = [];
  const tier2 = [];
  const tier3 = [];

  for (const track of allTracks) {
    if (tracksInTrendingPlaylist.has(track.id)) {
      tier1.push(track);
    } else if (tracksInAnyPlaylist.has(track.id)) {
      tier2.push(track);
    } else {
      tier3.push(track);
    }
  }

  let report = `# Report Ordine Brani (Tiering Logic)\n\n`;
  report += `**Totale Brani:** ${allTracks.length}\n`;
  report += `**Brani in Tier 1 (Playlist Trending):** ${tier1.length}\n`;
  report += `**Brani in Tier 2 (Altre Playlist):** ${tier2.length}\n`;
  report += `**Brani in Tier 3 (Nessuna Playlist):** ${tier3.length}\n\n`;

  report += `## Anteprima Tier 1 (Primi 20 brani)\n`;
  tier1.slice(0, 20).forEach((t, i) => {
    report += `${i + 1}. ${t.file_name}\n`;
  });

  report += `\n## Anteprima Tier 2 (Primi 20 brani)\n`;
  tier2.slice(0, 20).forEach((t, i) => {
    report += `${i + 1}. ${t.file_name}\n`;
  });

  report += `\n## Anteprima Tier 3 (Primi 20 brani)\n`;
  tier3.slice(0, 20).forEach((t, i) => {
    report += `${i + 1}. ${t.file_name}\n`;
  });

  fs.writeFileSync('/Users/dada/.gemini/antigravity/brain/ced4eddd-8ae2-464b-953c-963edb015475/tiering_report.md', report);
  console.log('Report generated.');
}

generateReport();
