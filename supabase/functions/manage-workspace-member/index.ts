import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Action = 'leave' | 'remove' | 'set_role'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')

    const { workspaceId, memberId, action, role } = await req.json() as {
      workspaceId?: string
      memberId?: string
      action?: Action
      role?: string
    }
    if (!workspaceId || !memberId || !action) throw new Error('workspaceId, memberId, and action are required')
    if (!['leave', 'remove', 'set_role'].includes(action)) throw new Error('Unsupported member action')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const token = authHeader.slice('Bearer '.length)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Unauthorized')

    const [{ data: workspace, error: workspaceError }, { data: requesterMembership, error: requesterError }, { data: targetMembership, error: targetError }] = await Promise.all([
      supabaseAdmin.from('workspaces').select('id, user_id').eq('id', workspaceId).maybeSingle(),
      supabaseAdmin.from('workspace_members').select('id, role, user_id').eq('workspace_id', workspaceId).eq('user_id', userData.user.id).maybeSingle(),
      supabaseAdmin.from('workspace_members').select('id, role, user_id').eq('workspace_id', workspaceId).eq('user_id', memberId).maybeSingle(),
    ])

    if (workspaceError || !workspace) throw new Error('Workspace not found')
    if (requesterError || targetError) throw new Error('Could not verify workspace membership')
    if (!requesterMembership && workspace.user_id !== userData.user.id) throw new Error('You are not a member of this workspace')

    const requesterIsOwner = workspace.user_id === userData.user.id || requesterMembership?.role === 'owner'
    const requesterIsAdmin = requesterMembership?.role === 'admin'
    const targetIsOwner = workspace.user_id === memberId || targetMembership?.role === 'owner'

    if (action === 'leave') {
      if (memberId !== userData.user.id) throw new Error('You can only leave a workspace for yourself')
      if (targetIsOwner) throw new Error('Transfer ownership before leaving this workspace')
      if (!targetMembership) throw new Error('Workspace membership not found')

      const { error } = await supabaseAdmin.from('workspace_members').delete().eq('id', targetMembership.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true, action }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!requesterIsOwner && !requesterIsAdmin) throw new Error('Only workspace owners and admins can manage members')
    if (!targetMembership) throw new Error('Workspace membership not found')
    if (targetIsOwner) throw new Error('Transfer ownership before changing the owner')

    if (action === 'remove') {
      if (memberId === userData.user.id) throw new Error('Use the leave action to leave this workspace')
      if (requesterIsAdmin && targetMembership.role !== 'member') {
        throw new Error('Admins can only remove workspace members')
      }

      const { error } = await supabaseAdmin.from('workspace_members').delete().eq('id', targetMembership.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true, action }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!requesterIsOwner) throw new Error('Only the workspace owner can change roles')
    if (memberId === userData.user.id) throw new Error('The workspace owner role cannot be changed here')
    if (!['member', 'admin'].includes(role ?? '')) throw new Error('Role must be member or admin')

    const { error } = await supabaseAdmin
      .from('workspace_members')
      .update({ role })
      .eq('id', targetMembership.id)
    if (error) throw error

    return new Response(JSON.stringify({ success: true, action, role }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Workspace member action failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
