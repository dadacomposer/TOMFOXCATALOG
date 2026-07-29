import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) throw new Error('Unauthorized');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    if (!callerProfile?.is_admin) {
      throw new Error('Forbidden: Admins only');
    }

    const body = await req.json();
    const { action, targetUserId, payload } = body;
    
    if (!targetUserId) throw new Error("targetUserId is required");

    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (profileError || !targetProfile) throw new Error("Target user not found");

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    switch (action) {
      case 'comp_account':
        // Comp the account by creating a 100% off coupon and a subscription
        if (!targetProfile.stripe_customer_id) {
          throw new Error("User does not have a Stripe Customer ID");
        }
        
        let subId = targetProfile.stripe_subscription_id;
        
        // Ensure a 100% off forever coupon exists
        let couponId = 'COMP_100_FOREVER';
        try {
          await stripe.coupons.retrieve(couponId);
        } catch (e) {
          await stripe.coupons.create({
            id: couponId,
            percent_off: 100,
            duration: 'forever',
            name: '100% Admin Comp'
          });
        }
        
        if (subId) {
          // Apply to existing subscription
          await stripe.subscriptions.update(subId, {
            coupon: couponId,
            cancel_at_period_end: false
          });
        } else {
          // Create new subscription for the first plan we find (defaulting to enterprise if none)
          let priceId = payload?.priceId;
          if (!priceId) {
            const { data: plans } = await supabase.from('subscription_plans').select('stripe_price_id').limit(1);
            if (plans && plans.length > 0) {
              priceId = plans[0].stripe_price_id;
            } else {
              throw new Error("No subscription plans found in database to comp");
            }
          }
          
          await stripe.subscriptions.create({
            customer: targetProfile.stripe_customer_id,
            items: [{ price: priceId }],
            coupon: couponId,
          });
        }
        
        return new Response(JSON.stringify({ success: true, message: 'Account comped successfully via Stripe' }), { headers: corsHeaders });

      case 'cancel_subscription':
        if (!targetProfile.stripe_subscription_id) {
          throw new Error("User does not have an active subscription");
        }
        await stripe.subscriptions.cancel(targetProfile.stripe_subscription_id);
        return new Response(JSON.stringify({ success: true, message: 'Subscription canceled' }), { headers: corsHeaders });
        
      case 'ban_user':
        const isBanning = payload?.ban === true;
        await supabase
          .from('profiles')
          .update({ banned_at: isBanning ? new Date().toISOString() : null })
          .eq('id', targetUserId);
          
        // Optional: Call Supabase Admin API to suspend auth account
        await supabase.auth.admin.updateUserById(targetUserId, {
          ban_duration: isBanning ? '87600h' : 'none', // 10 years or none
        });
        
        return new Response(JSON.stringify({ success: true, message: isBanning ? 'User banned' : 'User unbanned' }), { headers: corsHeaders });
        
      case 'set_role':
        const isAdmin = payload?.isAdmin === true;
        await supabase
          .from('profiles')
          .update({ is_admin: isAdmin })
          .eq('id', targetUserId);
        return new Response(JSON.stringify({ success: true, message: 'Role updated' }), { headers: corsHeaders });
        
      case 'reset_password':
        // Get the user's email via Auth Admin
        const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
        if (userData?.user?.email) {
          await supabase.auth.resetPasswordForEmail(userData.user.email);
          return new Response(JSON.stringify({ success: true, message: 'Password reset email sent' }), { headers: corsHeaders });
        }
        throw new Error("Could not find user email");
        
      case 'force_remove_workspace':
        const workspaceId = payload?.workspaceId;
        if (!workspaceId) throw new Error("workspaceId is required");
        await supabase
          .from('workspace_members')
          .delete()
          .match({ workspace_id: workspaceId, user_id: targetUserId });
        return new Response(JSON.stringify({ success: true, message: 'Removed from workspace' }), { headers: corsHeaders });
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (err: any) {
    console.error(`Admin Action Error: ${err.message}`);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
