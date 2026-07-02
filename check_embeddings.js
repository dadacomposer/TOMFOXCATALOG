import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('tracks').select('id, file_name, embedding').limit(5);
  console.log('Error:', error);
  console.log('Tracks:', data?.map(d => ({ file_name: d.file_name, has_embedding: !!d.embedding })));
}
check();
