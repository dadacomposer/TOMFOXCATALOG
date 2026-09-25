-- A membership is the authoritative link between a person and a workspace.
-- Keep one record per person/workspace before enforcing that invariant.
WITH ranked_memberships AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY workspace_id, user_id
      ORDER BY
        CASE role
          WHEN 'owner' THEN 3
          WHEN 'admin' THEN 2
          ELSE 1
        END DESC,
        created_at ASC,
        id ASC
    ) AS rank
  FROM public.workspace_members
)
DELETE FROM public.workspace_members AS membership
USING ranked_memberships AS ranked
WHERE membership.id = ranked.id
  AND ranked.rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_user_unique
  ON public.workspace_members (workspace_id, user_id);

-- Invitation emails are stored normalized by the sender, but existing records
-- may predate that convention. Normalizing comparisons keeps an invite valid
-- even when the recipient's Auth email uses different casing or whitespace.
UPDATE public.workspace_invites
SET email = lower(btrim(email))
WHERE email IS DISTINCT FROM lower(btrim(email));

CREATE OR REPLACE FUNCTION public.get_my_workspace_invites()
RETURNS TABLE(
  id uuid,
  workspace_id uuid,
  email text,
  status text,
  created_at timestamptz,
  workspace_name text,
  workspace_avatar text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    invitation.id,
    invitation.workspace_id,
    invitation.email,
    invitation.status,
    invitation.created_at,
    workspace.name,
    workspace.avatar_url
  FROM public.workspace_invites AS invitation
  JOIN public.workspaces AS workspace ON workspace.id = invitation.workspace_id
  WHERE lower(btrim(invitation.email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    AND invitation.status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_invite_email text;
  v_current_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT invitation.workspace_id, invitation.email
  INTO v_workspace_id, v_invite_email
  FROM public.workspace_invites AS invitation
  WHERE invitation.id = p_invite_id
    AND invitation.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already processed';
  END IF;

  v_current_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  IF lower(btrim(v_invite_email)) <> v_current_email THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, auth.uid(), 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_invites
  SET status = 'accepted'
  WHERE id = p_invite_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_workspace_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT invitation.email
  INTO v_invite_email
  FROM public.workspace_invites AS invitation
  WHERE invitation.id = p_invite_id
    AND invitation.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already processed';
  END IF;

  IF lower(btrim(v_invite_email)) <> lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.workspace_invites
  SET status = 'declined'
  WHERE id = p_invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_workspace_invites() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_workspace_invite(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_workspace_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_workspace_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_workspace_invite(uuid) TO authenticated;
