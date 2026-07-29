import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const q = '%romantic%';
  const { data, error } = await supabase
    .from('tracks')
    .select('id, file_name, subgenre, moods, human_tags')
    .or(`file_name.ilike.${q},subgenre.ilike.${q},moods.ilike.${q},human_tags.ilike.${q}`)
    .limit(2);
  
  if (error) console.error("Error:", error);
  else console.log("Success:", data);
}
run();
