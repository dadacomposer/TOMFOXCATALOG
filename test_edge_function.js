import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tom@tomfoxmusic.com', // Replace with the actual email if needed
    password: 'password123'       // Replace with the actual password if needed
  });

  // Just try to invoke it directly using fetch
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/get_download_url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ trackId: 'test', format: 'wav' })
  });
  
  const text = await res.text();
  console.log("Edge function response:", res.status, text);
}
test();
