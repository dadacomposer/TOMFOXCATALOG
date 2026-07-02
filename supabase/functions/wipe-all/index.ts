import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Delete all workspaces (this should cascade to workspace_members, but just in case)
    const { error: wsError } = await supabase.from('workspaces').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (wsError) console.error("Workspace delete error", wsError);

    // 2. Delete all users from Supabase Auth
    let hasMoreUsers = true;
    let page = 1;
    let usersDeleted = 0;
    while (hasMoreUsers) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      
      const users = data.users;
      if (users.length === 0) {
        hasMoreUsers = false;
        break;
      }

      for (const u of users) {
        await supabase.auth.admin.deleteUser(u.id);
        usersDeleted++;
      }
    }

    // 3. Delete all Stripe Customers (this cancels subscriptions automatically)
    let customersDeleted = 0;
    const customers = await stripe.customers.list({ limit: 100 });
    for (const c of customers.data) {
      try {
        await stripe.customers.del(c.id);
        customersDeleted++;
      } catch (e) {
        console.error("Error deleting customer", c.id, e);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      usersDeleted, 
      customersDeleted 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error("Wipe All Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
