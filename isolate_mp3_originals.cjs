const fs = require('fs');
const path = require('path');

const ORIGINALS_DIR = '/Volumes/DADAfiles/TOMFOX/originals';
const WAV_DIR = '/Volumes/DADAfiles/TOMFOX/.wav';
const AIFF_DIR = '/Volumes/DADAfiles/TOMFOX/.aiff';
const DEST_DIR = '/Volumes/DADAfiles/TOMFOX/MP3ORIGINALS - to do';

function findMp3sRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMp3sRecursively(fullPath, fileList);
    } else if (entry.name.toLowerCase().endsWith('.mp3')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function main() {
  console.log("Scanning originals directory for MP3 files...");
  
  const allMp3s = findMp3sRecursively(ORIGINALS_DIR);
  console.log(`Found ${allMp3s.length} total MP3 files in originals.`);
  
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
    console.log(`Created destination directory: ${DEST_DIR}`);
  }

  let copied = 0;
  let alreadyHasHD = 0;
  let failed = 0;

  for (const sourcePath of allMp3s) {
    const filename = path.basename(sourcePath);
    const basename = filename.slice(0, -4); // remove .mp3
    
    // Check if WAV exists
    const wavPath = path.join(WAV_DIR, `${basename}.wav`);
    const aiffPath1 = path.join(AIFF_DIR, `${basename}.aiff`);
    const aiffPath2 = path.join(AIFF_DIR, `${basename}.aif`);
    
    const hasWav = fs.existsSync(wavPath);
    const hasAiff = fs.existsSync(aiffPath1) || fs.existsSync(aiffPath2);

    if (hasWav || hasAiff) {
      alreadyHasHD++;
    } else {
      const destPath = path.join(DEST_DIR, filename);
      try {
        fs.copyFileSync(sourcePath, destPath);
        copied++;
        console.log(`Copied: ${filename} (No WAV/AIFF found)`);
      } catch (err) {
        console.error(`Error copying ${filename}:`, err.message);
        failed++;
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total MP3s scanned: ${allMp3s.length}`);
  console.log(`MP3s that already have a WAV/AIFF: ${alreadyHasHD}`);
  console.log(`Successfully isolated to "to do": ${copied}`);
  console.log(`Failed to copy: ${failed}`);
}

main();
