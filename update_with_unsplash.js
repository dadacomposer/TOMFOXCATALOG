const ids = [
  '1485846234645-a62644f84728', '1517230878791-4d28214057c2', '1557672172-298e090bd0f1',
  '1618005182384-a83a8bd57fbe', '1478760327741-6cb31eda2283', '1518609878373-06d740f60d8b',
  '1493246507139-91e8fad9978e', '1470225620780-dba8ba36b745', '1507608616759-54f48f0af0ee',
  '1534447677768-be436bb09401', '1550684848-fac1c5b4e853', '1604076913837-52f5d4e82f47',
  '1518837695005-2083093222e4', '1500462918059-b1a0cb512f1d', '1506157786151-b8491531f063'
];

const playlists = [
  "New Music", "Pop Culture Quirk", "Arcade Overdrive", "Playful Curiosity", "Serious Journalism",
  "Great For: Explainers", "Signal Curiosity", "Synth: Calm, Digital", "Staff Picks",
  "Vox Borders Sessions, Vol. 4", "Historical Discovery", "Ethereal Dreamy", "Radiant Synths",
  "Closing Remarks", "Epic Synth", "Shadow Pulse", "Exploring Space", "Dark News", "High Stakes",
  "Drop The Beat", "Human Stories", "Light Explainer", "Drum Solo Energy", "Shadow Jazz",
  "Floating Uncertainty", "Curious Jazz", "Dark Atmosphere", "Tech Pulse", "Lo-Fi", "Solo Piano",
  "Minimal Percussive Underscore", "Slow Drum Solo", "Dark Arpeggio", "Code Breach", "Nostalgia",
  "Cool Hip Hop", "Film", "Space", "Dark Explainer", "Classical Hybrid", "Dark Texture",
  "Vox Borders Sessions, Vol. 3", "Vox Borders Sessions, Vol. 2"
];

let sql = '';
for (let i = 0; i < playlists.length; i++) {
  const p = playlists[i];
  const id = ids[i % ids.length];
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=800`;
  sql += `UPDATE playlists SET cover_url = '${url}' WHERE title = '${p.replace(/'/g, "''")}';\n`;
}

console.log(sql);
