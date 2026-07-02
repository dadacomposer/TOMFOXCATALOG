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
  
  // 1. Put newspaper image back to "Great for explainers"
  const newspaperImg = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8bmV3c3BhcGVyJTIwam91cm5hbGlzbSUyMHJlYWRpbmd8ZW58MHx8fHwxNzgyNTc1Mzg3fDA&ixlib=rb-4.1.0&q=80&w=1080';
  sql += `UPDATE playlists SET cover_url = '${newspaperImg}' WHERE title ILIKE '%Great for explainers%';\n`;

  // 2. Synthesizer ONLY
  const url = await getUnsplashUrl("moog synthesizer keyboard hardware analog");
  if (url) {
    sql += `UPDATE playlists SET cover_url = '${url}' WHERE title ILIKE '%Synth Calm Digital%';\n`;
  }
  
  fs.writeFileSync('fix_synth.sql', sql);
  console.log("SQL generated!");
}
run();
