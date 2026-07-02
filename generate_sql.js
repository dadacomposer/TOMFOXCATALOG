const playlists = [
  {title: "New Music", q: "music studio"},
  {title: "Pop Culture Quirk", q: "pop art colors"},
  {title: "Arcade Overdrive", q: "neon arcade"},
  {title: "Playful Curiosity", q: "abstract playful"},
  {title: "Serious Journalism", q: "newspaper press"},
  {title: "Great For: Explainers", q: "infographic abstract"},
  {title: "Signal Curiosity", q: "radio signal antenna"},
  {title: "Synth: Calm, Digital", q: "digital synth waves"},
  {title: "Staff Picks", q: "curated collection"},
  {title: "Vox Borders Sessions, Vol. 4", q: "border crossing map"},
  {title: "Historical Discovery", q: "old history book"},
  {title: "Ethereal Dreamy", q: "ethereal clouds"},
  {title: "Radiant Synths", q: "radiant light synth"},
  {title: "Closing Remarks", q: "empty stage"},
  {title: "Epic Synth", q: "epic synth"},
  {title: "Shadow Pulse", q: "shadow pulse"},
  {title: "Exploring Space", q: "deep space"},
  {title: "Dark News", q: "dark urban night"},
  {title: "High Stakes", q: "high stakes poker"},
  {title: "Drop The Beat", q: "dj drop beat"},
  {title: "Human Stories", q: "human face portrait"},
  {title: "Light Explainer", q: "light bulb idea"},
  {title: "Drum Solo Energy", q: "drum kit"},
  {title: "Shadow Jazz", q: "jazz trumpet shadow"},
  {title: "Floating Uncertainty", q: "floating abstract"},
  {title: "Curious Jazz", q: "saxophone jazz"},
  {title: "Dark Atmosphere", q: "dark atmosphere fog"},
  {title: "Tech Pulse", q: "tech circuit board"},
  {title: "Lo-Fi", q: "lofi hip hop vinyl"},
  {title: "Solo Piano", q: "grand piano keys"},
  {title: "Minimal Percussive Underscore", q: "minimal percussion"},
  {title: "Slow Drum Solo", q: "slow drum"},
  {title: "Dark Arpeggio", q: "dark synthesizer"},
  {title: "Code Breach", q: "hacker code screen"},
  {title: "Nostalgia", q: "vintage nostalgia film"},
  {title: "Cool Hip Hop", q: "cool hip hop street"},
  {title: "Film", q: "cinema film camera"},
  {title: "Space", q: "space galaxy"},
  {title: "Dark Explainer", q: "dark abstract pattern"},
  {title: "Classical Hybrid", q: "classical cello"},
  {title: "Dark Texture", q: "dark grunge texture"},
  {title: "Vox Borders Sessions, Vol. 3", q: "passport travel"},
  {title: "Vox Borders Sessions, Vol. 2", q: "world map"}
];

const sql = playlists.map(p => {
  // We use source.unsplash.com or simply unplash premium placeholder images. 
  // Wait, source.unsplash is down. Let's use standard Unsplash image IDs.
  // Actually, random high quality image URLs from Unsplash can be obtained via a simple hash of the title.
  // I will use `https://picsum.photos/seed/${encodeURIComponent(p.title)}/800/800` for unique, consistent placeholders!
  return `UPDATE playlists SET cover_url = 'https://picsum.photos/seed/${encodeURIComponent(p.title.replace(/'/g, ''))}/800/800' WHERE title = '${p.title.replace(/'/g, "''")}';`;
}).join('\n');

console.log(sql);
