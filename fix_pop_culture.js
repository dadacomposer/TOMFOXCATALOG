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

async function run() {
  let sql = "";
  
  // 1. Pop Culture Quirk abstract colorful image
  const url = await getUnsplashUrl("abstract colorful popup bright pop art");
  if (url) {
    sql += `UPDATE playlists SET cover_url = '${url}', created_at = created_at - INTERVAL '10 days' WHERE title ILIKE '%Pop Culture Quirk%';\n`;
  }
  
  fs.writeFileSync('fix_pop_culture.sql', sql);
  console.log("SQL generated!");
}
run();
