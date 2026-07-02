import fs from 'fs';

async function getUnsplashUrl(query) {
  try {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=5`);
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      // Find the first free (non-plus) image if possible
      const freeImg = json.results.find(r => !r.premium);
      const target = freeImg || json.results[0];
      if (target && target.urls && target.urls.regular) {
        return target.urls.regular;
      }
    }
  } catch (e) {}
  return 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800'; // Fallback
}

const map = [
  { title: "Arcade Overdrive", query: "arcade neon retro game" },
  { title: "Playful Curiosity", query: "dice physical game play" },
  { title: "Serious Journalism", query: "newspaper journalism reading" },
  { title: "Great for explainers", query: "messy desk papers intellectual" },
  { title: "Signal Curiosity", query: "analog audio oscilloscope waveform" },
  { title: "Synth Calm Digital", query: "synthesizer music studio" },
  { title: "Staff Picks", query: "colorful graphic design abstract" },
  { title: "Ethereal dreamy", id: "1478760327741-6cb31eda2283" },
  { title: "Radiant Synths", query: "synthesizer keyboard neon" },
  { title: "Epic Synth", query: "audio processing gear" },
  { title: "Shadow pulse", query: "audio signal processing dark" },
  { title: "Exploring space", query: "galaxy space cosmos" },
  { title: "Dark news", query: "dark silhouette crowd" },
  { title: "High stakes", query: "person standing on mountain top" },
  { title: "Drop the Beat", id: "1517230878791-4d28214057c2" },
  { title: "Human stories", query: "people hugging human connection" },
  { title: "Light Explainer", query: "coffee cup cafe" },
  { title: "Drum solo energy", query: "drummer playing drums" },
  { title: "Shadow Jazz", query: "dark jazz club saxophone" },
  { title: "Dark Atmosphere", query: "dark dramatic lighting cinematic" },
  { title: "Tech pulse", query: "technology circuit board futuristic" },
  { title: "Lo fi", query: "record player vinyl" },
  { title: "Solo piano", query: "grand piano keys" },
  { title: "Minimal percussive underscore", query: "drumsticks percussion" },
  { title: "Slow drum solo", query: "drum kit dark" },
  { title: "Code Breach", query: "computer code hacker glitch" },
  { title: "Nostalgia", query: "nostalgic polaroid vintage" },
  { title: "Film", id: "1485846234645-a62644f84728" },
  { title: "Space", query: "sci fi space station" },
  { title: "Dark explainer", query: "messy desk papers intellectual" }
];

async function run() {
  let sql = "";
  
  // Safe base64 Vox logo to avoid parsing issues
  const voxSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#aec6cf" /><image href="https://upload.wikimedia.org/wikipedia/commons/a/a2/Vox_logo.svg" x="20" y="35" width="60" height="30" /></svg>`;
  const voxBase64 = Buffer.from(voxSvg).toString('base64');
  const voxUri = `data:image/svg+xml;base64,${voxBase64}`;
  
  sql += `UPDATE playlists SET cover_url = '${voxUri}' WHERE title ILIKE '%Vox Borders Sessions%';\n`;

  for (const item of map) {
    let url = "";
    if (item.id) {
      url = `https://images.unsplash.com/photo-${item.id}?auto=format&fit=crop&q=80&w=800`;
    } else {
      url = await getUnsplashUrl(item.query);
    }
    const safeTitle = item.title.replace(/'/g, "''");
    sql += `UPDATE playlists SET cover_url = '${url}' WHERE title ILIKE '%${safeTitle}%';\n`;
  }
  
  fs.writeFileSync('update_covers_script_v2.sql', sql);
  console.log("SQL file generated: update_covers_script_v2.sql");
}

run();
