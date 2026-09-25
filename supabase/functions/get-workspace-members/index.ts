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

    const { workspaceId } = await req.json()
    if (!workspaceId) throw new Error('workspaceId is required')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const token = authHeader.slice('Bearer '.length)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Unauthorized')

    const [{ data: workspace, error: workspaceError }, { data: requesterMembership, error: requesterError }] = await Promise.all([
      supabaseAdmin.from('workspaces').select('id, user_id').eq('id', workspaceId).maybeSingle(),
      supabaseAdmin.from('workspace_members').select('id').eq('workspace_id', workspaceId).eq('user_id', userData.user.id).maybeSingle(),
    ])

    if (workspaceError || !workspace) throw new Error('Workspace not found')
    if (requesterError) throw new Error('Could not verify workspace membership')
    if (workspace.user_id !== userData.user.id && !requesterMembership) {
      throw new Error('You are not a member of this workspace')
    }

    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('workspace_members')
      .select('id, workspace_id, user_id, role, profiles:user_id (id, first_name, last_name, avatar_url)')
      .eq('workspace_id', workspaceId)

    if (membershipsError) throw membershipsError

    const memberRows = memberships ?? []
    const memberIds = [...new Set(memberRows.map((member) => member.user_id))]
    if (workspace.user_id && !memberIds.includes(workspace.user_id)) memberIds.push(workspace.user_id)

    const usersById = new Map<string, { email: string | null }>()
    await Promise.all(memberIds.map(async (memberId) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(memberId)
      usersById.set(memberId, { email: data.user?.email ?? null })
    }))

    const normalizedMembers = memberRows.map((member: any) => ({
      ...member,
      role: member.user_id === workspace.user_id ? 'owner' : member.role,
      profiles: {
        ...(member.profiles ?? {}),
        email: usersById.get(member.user_id)?.email ?? null,
      },
    }))

    // Older workspaces can have a canonical owner without a legacy membership
    // row. Keep that person visible rather than rendering an incomplete team.
    if (workspace.user_id && !memberRows.some((member) => member.user_id === workspace.user_id)) {
      const { data: ownerProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', workspace.user_id)
        .maybeSingle()

      normalizedMembers.push({
        id: null,
        workspace_id: workspaceId,
        user_id: workspace.user_id,
        role: 'owner',
        profiles: {
          ...ownerProfile,
          email: usersById.get(workspace.user_id)?.email ?? null,
        },
      })
    }

    normalizedMembers.sort((left, right) => {
      const rank = (role: string) => role === 'owner' ? 0 : role === 'admin' ? 1 : 2
      const rankDifference = rank(left.role) - rank(right.role)
      if (rankDifference !== 0) return rankDifference
      return `${left.profiles?.first_name ?? ''} ${left.profiles?.last_name ?? ''}`.localeCompare(
        `${right.profiles?.first_name ?? ''} ${right.profiles?.last_name ?? ''}`,
      )
    })

    return new Response(JSON.stringify({ members: normalizedMembers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Failed to list workspace members:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
