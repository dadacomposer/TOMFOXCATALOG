import fs from 'fs';

async function getUnsplashUrl(query) {
  try {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=5`);
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      const target = json.results[3] || json.results[2] || json.results[1]; // Get a different one
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
  const url = await getUnsplashUrl("abstract vivid color blur liquid shape");
  if (url) {
    sql += `UPDATE playlists SET cover_url = '${url}' WHERE title ILIKE '%New Music%';\n`;
  }
  
  fs.writeFileSync('fix_new_music_v2.sql', sql);
  console.log("SQL generated!");
}
run();
