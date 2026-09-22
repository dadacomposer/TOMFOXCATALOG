-- Shared links are resolved through a narrow Edge Function; direct table access is admin-only.
ALTER TABLE public.shared_links ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin users can manage shared_links" ON public.shared_links;
CREATE POLICY "Admins manage shared links" ON public.shared_links FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- The catalog is public, but drafts, hidden and deleted tracks are not.
DROP POLICY IF EXISTS "Enable read access for all users on tracks" ON public.tracks;
DROP POLICY IF EXISTS "Admin users can manage tracks" ON public.tracks;
CREATE POLICY "Public reads published catalog tracks" ON public.tracks FOR SELECT TO anon, authenticated
  USING (status = 'published' AND is_hidden = false AND deleted_at IS NULL AND track_type = 'main');
CREATE POLICY "Admins manage tracks" ON public.tracks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Licensing requests contain PII: public submission remains available, management is admin-only.
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.licensing_requests;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.licensing_requests;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.licensing_requests;
CREATE POLICY "Admins manage licensing requests" ON public.licensing_requests FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Analytics are writable anonymously but visible only to admins.
DROP POLICY IF EXISTS "Allow auth select play_events" ON public.play_events;
DROP POLICY IF EXISTS "Allow auth select search_events" ON public.search_events;
DROP POLICY IF EXISTS "Allow auth select filter_events" ON public.filter_events;
CREATE POLICY "Admins read play events" ON public.play_events FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read search events" ON public.search_events FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read filter events" ON public.filter_events FOR SELECT TO authenticated USING (public.is_admin());

-- Tickets are internal-only.
DROP POLICY IF EXISTS "Permetti delete a utenti autenticati" ON public.developer_tickets;
DROP POLICY IF EXISTS "Permetti insert a utenti autenticati" ON public.developer_tickets;
DROP POLICY IF EXISTS "Permetti select a utenti autenticati" ON public.developer_tickets;
DROP POLICY IF EXISTS "Permetti update a utenti autenticati" ON public.developer_tickets;

-- Studio: a guest project is view/comment only; editing requires owner, invited collaborator, or admin.
DROP POLICY IF EXISTS "Users and Admin can update studio projects" ON public.tf_studio_projects;
CREATE POLICY "Owners and admins update studio projects" ON public.tf_studio_projects FOR UPDATE TO authenticated
  USING (public.is_project_owner(id) OR public.is_admin())
  WITH CHECK (public.is_project_owner(id) OR public.is_admin());

DROP POLICY IF EXISTS "Users and Admin can insert assets" ON public.tf_studio_assets;
DROP POLICY IF EXISTS "Users and Admin can update assets" ON public.tf_studio_assets;
DROP POLICY IF EXISTS "Users and Admin can delete assets" ON public.tf_studio_assets;
DROP POLICY IF EXISTS "Users can insert assets for their own projects" ON public.tf_studio_assets;
DROP POLICY IF EXISTS "Users and Admin can view assets" ON public.tf_studio_assets;
DROP POLICY IF EXISTS "Users can view public assets for their projects" ON public.tf_studio_assets;
CREATE POLICY "Authorized users view studio assets" ON public.tf_studio_assets FOR SELECT TO anon, authenticated
  USING (is_public = true AND (EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.requires_auth = false) OR public.is_project_owner(project_id) OR public.is_collaborator(project_id) OR public.is_admin()));
CREATE POLICY "Authorized users write studio assets" ON public.tf_studio_assets FOR ALL TO authenticated
  USING (public.is_project_owner(project_id) OR public.is_collaborator(project_id) OR public.is_admin())
  WITH CHECK (public.is_project_owner(project_id) OR public.is_collaborator(project_id) OR public.is_admin());

DROP POLICY IF EXISTS "Users and Admin can insert project files" ON public.tf_studio_project_files;
DROP POLICY IF EXISTS "Users and Admin can delete project files" ON public.tf_studio_project_files;
DROP POLICY IF EXISTS "Users can insert project files for their projects" ON public.tf_studio_project_files;
DROP POLICY IF EXISTS "Users can delete project files for their projects" ON public.tf_studio_project_files;
DROP POLICY IF EXISTS "Users and Admin can view project files" ON public.tf_studio_project_files;
DROP POLICY IF EXISTS "Users can view project files for their projects" ON public.tf_studio_project_files;
CREATE POLICY "Authorized users view studio files" ON public.tf_studio_project_files FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND (p.requires_auth = false OR public.is_project_owner(project_id) OR public.is_collaborator(project_id) OR public.is_admin())));
CREATE POLICY "Authorized users write studio files" ON public.tf_studio_project_files FOR ALL TO authenticated
  USING (public.is_project_owner(project_id) OR public.is_collaborator(project_id) OR public.is_admin())
  WITH CHECK (public.is_project_owner(project_id) OR public.is_collaborator(project_id) OR public.is_admin());

DROP POLICY IF EXISTS "Users and Admin can insert comments" ON public.tf_studio_comments;
DROP POLICY IF EXISTS "Users and Admin can update comments" ON public.tf_studio_comments;
DROP POLICY IF EXISTS "Users and Admin can delete comments" ON public.tf_studio_comments;
DROP POLICY IF EXISTS "Users can insert comments on their projects" ON public.tf_studio_comments;
CREATE POLICY "Guests add comments to open projects" ON public.tf_studio_comments FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND coalesce(is_admin, false) = false AND EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.requires_auth = false));
CREATE POLICY "Authorized users add comments" ON public.tf_studio_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND coalesce(is_admin, false) = false AND (public.is_project_owner(project_id) OR public.is_collaborator(project_id) OR public.is_admin()));
CREATE POLICY "Authors owners and admins edit comments" ON public.tf_studio_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_project_owner(project_id) OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_project_owner(project_id) OR public.is_admin());
CREATE POLICY "Authors owners and admins delete comments" ON public.tf_studio_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_project_owner(project_id) OR public.is_admin());

-- Do not expose internal functions to anonymous callers.
REVOKE EXECUTE ON FUNCTION public.get_subscribed_emails() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tomfox_password(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_track_format(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_track_tags_rpc(uuid, text, text[], text[], text[], text[], jsonb, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_statistics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_new_workspace(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_workspace_invites() FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_workspace_invite(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decline_workspace_invite(uuid) FROM anon;
