import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jicrumwdnwmjkotkbjtg.supabase.co';
const supabaseKey = 'sb_publishable_qKmdOmdtIZYB6i_pQEkt_Q_A7bp127D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tom@tomfoxmusic.com',
    password: 'password123'
  });
  
  if (authError) {
    console.error("Auth failed:", authError.message);
    return;
  }

  const { data, error } = await supabase.functions.invoke('admin-create-project', {
    body: {
      isNewUser: true,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      organization: 'Test Org',
      existingUserId: '',
      projectTitle: 'Test Project',
      amount: 100,
      currency: 'usd',
      daysUntilDue: 7,
      projectType: 'Film',
      createInvoice: false,
      requiresAuth: true
    }
  });
  if (error) {
    if (error.context && typeof error.context.text === 'function') {
      const text = await error.context.text();
      console.error("Error invoking function:", error.message, "Body:", text);
    } else {
      console.error("Error invoking function:", error);
    }
  } else {
    console.log("Success:", data);
  }
}
run();
