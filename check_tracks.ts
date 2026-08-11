import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTracks() {
  const { data, error } = await supabase.from('tracks').select('id, file_name, composers').limit(5);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

checkTracks();
