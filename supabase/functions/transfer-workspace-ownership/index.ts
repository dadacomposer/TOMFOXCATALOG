import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')

    const { workspaceId, newOwnerId } = await req.json()
    if (!workspaceId || !newOwnerId) {
      throw new Error('workspaceId and newOwnerId are required')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const token = authHeader.slice('Bearer '.length)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Unauthorized')
    if (newOwnerId === userData.user.id) throw new Error('This member already owns the workspace')

    const [{ data: workspace, error: workspaceError }, { data: requesterMembership, error: requesterError }, { data: recipientMembership, error: recipientError }] = await Promise.all([
      supabaseAdmin.from('workspaces').select('id, user_id').eq('id', workspaceId).maybeSingle(),
      supabaseAdmin.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', userData.user.id).maybeSingle(),
      supabaseAdmin.from('workspace_members').select('user_id').eq('workspace_id', workspaceId).eq('user_id', newOwnerId).maybeSingle(),
    ])

    if (workspaceError || !workspace) throw new Error('Workspace not found')
    if (requesterError || recipientError) throw new Error('Could not verify workspace membership')
    if (workspace.user_id !== userData.user.id && requesterMembership?.role !== 'owner') {
      throw new Error('Only the current workspace owner can transfer ownership')
    }
    if (!recipientMembership) throw new Error('The new owner must already be a workspace member')

    // Keep the canonical owner and roles synchronized. The previous owner
    // remains an admin, so a handover never removes their workspace access.
    const { error: demoteOwnersError } = await supabaseAdmin
      .from('workspace_members')
      .update({ role: 'admin' })
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
    if (demoteOwnersError) throw demoteOwnersError

    const { error: promoteError } = await supabaseAdmin
      .from('workspace_members')
      .update({ role: 'owner' })
      .eq('workspace_id', workspaceId)
      .eq('user_id', newOwnerId)
    if (promoteError) throw promoteError

    const { error: workspaceUpdateError } = await supabaseAdmin
      .from('workspaces')
      .update({ user_id: newOwnerId })
      .eq('id', workspaceId)
    if (workspaceUpdateError) throw workspaceUpdateError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Workspace ownership transfer failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
