import fs from 'fs';

async function getUnsplashUrl(query) {
  try {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=15`);
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      // Find one that is not 1602450069437
      const target = json.results.find(r => !r.premium && !r.urls.regular.includes("1602450069437"));
      if (target && target.urls && target.urls.regular) {
        return target.urls.regular;
      }
    }
  } catch (e) {}
  return null;
}

async function run() {
  let sql = "";
  
  const url = await getUnsplashUrl("retro graphic design pop art poster vibrant colorful");
  if (url) {
    sql += `UPDATE playlists SET cover_url = '${url}' WHERE title ILIKE '%New Music%';\n`;
  }
  
  fs.writeFileSync('fix_new_music_v3.sql', sql);
  console.log("SQL generated! " + url);
}
run();
