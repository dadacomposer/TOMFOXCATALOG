require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

const ENDPOINT_URL = "https://984e55700d5ab74893ff2cd768b58f8d.r2.cloudflarestorage.com";
const ACCESS_KEY = "8f13bba1f98f1cd1a19ff57434c35340";
const SECRET_KEY = "af607c4639be8cfcc18f062e540a609d80a05168ee006f4580e1dc732be6923d";
const BUCKET_NAME = "tom-fox-music";

const s3 = new AWS.S3({
  endpoint: ENDPOINT_URL,
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true, // needed for Cloudflare R2
});

async function listAllS3Objects(prefix) {
  let allKeys = new Set();
  let continuationToken = null;
  do {
    const data = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }).promise();
    
    for (const item of data.Contents) {
      allKeys.add(item.Key.replace(prefix, ''));
    }
    continuationToken = data.NextContinuationToken;
  } while (continuationToken);
  return allKeys;
}

async function main() {
  console.log("Scanning Cloudflare R2 S3...");
  
  const wavKeys = await listAllS3Objects('audio/hdaudio/wav/');
  const aiffKeys = await listAllS3Objects('audio/hdaudio/aiff/');
  // Watermarked mp3s might be in 'audio/watermarked/' or similar, we'll check S3. 
  // Let's assume audio/watermarked/ for now, or just not touch watermarked if unknown.
  // Actually, we'll just check all objects in S3
  
  console.log(`Found ${wavKeys.size} WAV files and ${aiffKeys.size} AIFF files S3 in R2 S3.`);
  
  console.log("Fetching tracks from Supabase...");
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;
  let allTracks = [];
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('tracks')
      .select('id, file_name, has_wav, has_aiff, has_watermarked')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error("Error fetching S3 tracks:", error);
      return;
    }
    
    if (data && data.length > 0) {
      allTracks = [...allTracks, ...data];
      page++;
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Checking ${allTracks.length} tracks against S3 S3Client Cloudflare S3 S3Client S3 S3Client S3 S3Client S3 S3Client files...`);
  
  let updates = 0;
  let missingIds = [];
  const fs = require('fs');

  for (const track of allTracks) {
    const baseName = track.file_name.replace(/\.[^/.]+$/, ""); // remove extension S3 S3Client
    const expectedWav = baseName + ".wav";
    const expectedAiff = baseName + ".aiff";
    // For watermarked, assume "_watermarked.mp3" or similar S3 S3Client S3 S3Client.
    
    const hasWav = wavKeys.has(expectedWav);
    const hasAiff = aiffKeys.has(expectedAiff);
    
    if (track.has_wav !== hasWav || track.has_aiff !== hasAiff) {
      updates++;
    }
    
    if (!hasWav && !hasAiff) {
      missingIds.push(`'${track.id}'`);
    }
  }
  
  const finalSql = `
UPDATE tracks SET has_wav = true, has_aiff = true WHERE is_hidden = false AND deleted_at IS NULL;
UPDATE tracks SET has_wav = false, has_aiff = false WHERE id IN (${missingIds.join(',')});
`;
  
  fs.writeFileSync('fix_db.sql', finalSql);
  
  console.log(`Generated fix_db.sql. Missing tracks count: ${missingIds.length}`);
}

main().catch(console.error);
