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
  { title: "New Music", query: "sheet music piano hopeful bright" },
  { title: "Serious Journalism", query: "serious professional newspaper printing press" },
  { title: "Synth Calm Digital", query: "abstract digital music data flow computer" },
  { title: "Radiant Synths", query: "professional recording music studio desk speakers" }
];

async function run() {
  let sql = "";
  
  for (const item of map) {
    let url = await getUnsplashUrl(item.query);
    if (url) {
      const safeTitle = item.title.replace(/'/g, "''");
      sql += `UPDATE playlists SET cover_url = '${url}' WHERE title ILIKE '%${safeTitle}%';\n`;
    }
  }
  
  fs.writeFileSync('fix_covers_v3.sql', sql);
  console.log("SQL generated!");
}
run();
