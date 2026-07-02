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
  
  // Abstract new music cover
  const url = await getUnsplashUrl("abstract contemporary digital art bright color geometric");
  if (url) {
    sql += `UPDATE playlists SET cover_url = '${url}' WHERE title ILIKE '%New Music%';\n`;
  }
  
  fs.writeFileSync('fix_new_music.sql', sql);
  console.log("SQL generated!");
}
run();
