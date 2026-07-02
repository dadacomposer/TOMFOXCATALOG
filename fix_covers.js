import fs from 'fs';

async function getUnsplashUrl(query) {
  try {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=5`);
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      const freeImg = json.results.find(r => !r.premium);
      const target = freeImg || json.results[0];
      if (target && target.urls && target.urls.regular) {
        return target.urls.regular;
      }
    }
  } catch (e) {}
  return null;
}

const map = [
  { title: "Ethereal dreamy", query: "hot air balloon dreamy sky" },
  { title: "Curious Jazz", query: "curious jazz music saxophone" },
  { title: "Historical Discovery", query: "old map parchment exploration" },
  { title: "Dark Texture", query: "dark abstract texture macro" },
  { title: "Great for explainers", query: "newspaper journalism reading" },
  { title: "Serious Journalism", query: "investigation detective magnifying glass board" },
  { title: "Radiant Synths", query: "beautiful neon synthesizer studio" }
];

async function run() {
  let sql = "";
  
  // 1. VOX Borders Fix (Inline path)
  const voxSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#aec6cf" /><g transform="translate(10,30) scale(0.66)"><path fill="#333" d="M55.1.9h1.7l.2-.8H35.6l-.2.8h3.1c2.7 0 4.9 1.9 4.9 5.6 0 2.1-.9 4.8-2.4 8.1L27.1 45.3 23.7 5.4C23.4 2.3 25 .9 28.5.9h2l.2-.8H.5L.2.9h1.9c2.4 0 3.3 1.5 3.5 4.3L11 56.8h12.7L45 11.7C48.3 5 51.7.9 55.1.9zM52.6 57c-1.9 0-3.1-.6-3.1-3.8 0-4 1.5-11.9 3.1-19.1.2 3.3 2.5 6.6 5.9 6.6.8 0 1.5-.1 2.2-.2C57.5 54.2 56.3 57 52.6 57zm60.6-27.1c4 0 6.6-3.3 6.6-7.1 0-3.2-2.3-5.6-5.6-5.6-5.9 0-8.7 4.7-13.6 13.3-1-5.4-3.5-12.4-9.7-12.4-7 0-15.1 10-22.5 16.2C65 37.2 61.3 39 58.3 39c-3.1 0-4.9-3.1-4.9-8.6 2.2-9 3.3-11.3 6.7-11.3 2.3 0 3.3 1.3 3.3 4 0 2.9-.6 7.7-1.9 13.8 3.3-1 8.3-5.2 12.5-9.7-2.2-5.3-7-8.9-13.8-8.9-12.7 0-23.9 11.4-23.9 24.2 0 8.8 6.3 15.5 16.1 15.5 16.2 0 23-14 23-23.8 0-1.4-.1-2.4-.2-3.7 2.5-2.7 5.7-5.3 8.3-5.3 3 0 5.4 7.5 7.7 18.8-2.1 2.3-4.2 6.7-5.2 7.5-.4-4-3.1-6.5-6.6-6.5-4 0-6.7 3.8-6.7 7 0 3.6 2.5 6 5.8 6 6.9 0 8.8-6.5 13.1-12.3C92.9 51.9 96 58 101.3 58c6.3 0 12.1-5.4 15.1-9.2l-.6-.9c-1.9 1.9-3.8 3.1-6 3.1-3.9 0-6.7-8.4-8.8-18.6 1.3-1.7 3.3-6.1 4.7-7.7.9 1.8 2.9 5.2 7.5 5.2z"/></g></svg>`;
  const voxBase64 = Buffer.from(voxSvg).toString('base64');
  const voxUri = `data:image/svg+xml;base64,${voxBase64}`;
  sql += `UPDATE playlists SET cover_url = '${voxUri}' WHERE title ILIKE '%Vox Borders Sessions%';\n`;

  // 2. Fetch new Unsplash URLs
  for (const item of map) {
    let url = await getUnsplashUrl(item.query);
    if (url) {
      const safeTitle = item.title.replace(/'/g, "''");
      sql += `UPDATE playlists SET cover_url = '${url}' WHERE title ILIKE '%${safeTitle}%';\n`;
    }
  }
  
  fs.writeFileSync('fix_covers.sql', sql);
  console.log("SQL generated!");
}
run();
