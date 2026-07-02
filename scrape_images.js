const https = require('https');

async function getUnsplashId(query) {
  return new Promise((resolve) => {
    https.get(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=5`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            // Find a horizontal or square image if possible, else just the first one
            resolve(json.results[0].id);
          } else {
            resolve('1485846234645-a62644f84728'); // fallback
          }
        } catch (e) {
          resolve('1485846234645-a62644f84728');
        }
      });
    }).on('error', () => resolve('1485846234645-a62644f84728'));
  });
}

const queries = [
  "arcade neon retro game", // Arcade Overdrive
  "dice physical game play", // Playful Curiosity
  "newspaper journalism reading", // Serious Journalism
  "messy desk papers intellectual", // Great for explainers
  "analog audio oscilloscope waveform", // Signal Curiosity
  "synthesizer music studio", // Synth Calm Digital
  "colorful graphic design abstract", // Staff Picks
  "synthesizer keyboard neon", // Radiant Synths
  "audio processing gear", // Epic Synth
  "audio signal processing dark", // Shadow pulse
  "galaxy space cosmos", // Exploring space
  "dark silhouette crowd", // Dark news
  "person standing on mountain top", // High stakes
  "people hugging human connection", // Human stories
  "coffee cup cafe", // Light Explainer
  "drummer playing drums", // Drum solo energy
  "dark jazz club saxophone", // Shadow Jazz
  "dark dramatic lighting cinematic", // Dark Atmosphere
  "technology circuit board futuristic", // Tech pulse
  "record player vinyl", // Lo fi
  "grand piano keys", // Solo piano
  "drumsticks percussion", // Minimal percussive underscore
  "drum kit dark", // Slow drum solo
  "computer code hacker glitch", // Code Breach
  "nostalgic polaroid vintage", // Nostalgia
  "sci fi space station" // Space
];

async function run() {
  const results = {};
  for (const q of queries) {
    const id = await getUnsplashId(q);
    results[q] = id;
    console.log(`Query: ${q} -> ID: ${id}`);
  }
}
run();
