import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/dada/.gemini/antigravity/scratch/tom-fox-frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
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
