import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// simple env parser
const env = readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Invoking edge function get-r2-upload-url...");
  const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
    body: { fileName: 'test.png', contentType: 'image/png' }
  });
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
