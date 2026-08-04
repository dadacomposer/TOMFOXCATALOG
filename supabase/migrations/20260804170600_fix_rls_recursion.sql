-- Create Security Definer Functions to bypass RLS for lookups
CREATE OR REPLACE FUNCTION public.is_project_owner(pid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tf_studio_projects WHERE id = pid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_collaborator(pid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tf_studio_collaborators WHERE project_id = pid AND email = (auth.jwt()->>'email')::text
  );
$$;

-- Fix tf_studio_projects policies
DROP POLICY IF EXISTS "Users can view their own studio projects" ON public.tf_studio_projects;
CREATE POLICY "Users can view their own studio projects" 
ON public.tf_studio_projects FOR SELECT 
USING (
  auth.uid() = user_id 
  OR requires_auth = false 
  OR is_admin()
  OR is_collaborator(id)
);

DROP POLICY IF EXISTS "Users and Admin can view studio projects" ON public.tf_studio_projects;
-- (Just dropping the duplicate, we only need one SELECT policy)

-- Fix tf_studio_collaborators policies
DROP POLICY IF EXISTS "Collaborators can view project collaborators" ON public.tf_studio_collaborators;
DROP POLICY IF EXISTS "Primary client can manage their project collaborators" ON public.tf_studio_collaborators;
DROP POLICY IF EXISTS "Admin can manage collaborators" ON public.tf_studio_collaborators;
DROP POLICY IF EXISTS "Users can view project collaborators" ON public.tf_studio_collaborators;
DROP POLICY IF EXISTS "Project owners and admins can insert collaborators" ON public.tf_studio_collaborators;
DROP POLICY IF EXISTS "Project owners and admins can delete collaborators" ON public.tf_studio_collaborators;


CREATE POLICY "Users can view project collaborators" 
ON public.tf_studio_collaborators FOR SELECT 
USING (
  email = (auth.jwt()->>'email')::text 
  OR is_project_owner(project_id)
  OR is_admin()
);

CREATE POLICY "Project owners and admins can insert collaborators" 
ON public.tf_studio_collaborators FOR INSERT 
WITH CHECK (
  is_project_owner(project_id) OR is_admin()
);

CREATE POLICY "Project owners and admins can delete collaborators" 
ON public.tf_studio_collaborators FOR DELETE 
USING (
  is_project_owner(project_id) OR is_admin()
);

-- Fix tf_studio_assets policies
DROP POLICY IF EXISTS "Users can view public assets for their projects" ON public.tf_studio_assets;
CREATE POLICY "Users can view public assets for their projects" 
ON public.tf_studio_assets FOR SELECT 
USING (
  is_public = true AND 
  (
    is_project_owner(project_id)
    OR (SELECT requires_auth FROM tf_studio_projects WHERE id = project_id) = false
    OR is_collaborator(project_id)
    OR is_admin()
  )
);

-- Fix tf_studio_comments policies
DROP POLICY IF EXISTS "Users can view comments on their projects" ON public.tf_studio_comments;
CREATE POLICY "Users can view comments on their projects" 
ON public.tf_studio_comments FOR SELECT 
USING (
  is_project_owner(project_id)
  OR (SELECT requires_auth FROM tf_studio_projects WHERE id = project_id) = false
  OR is_collaborator(project_id)
  OR is_admin()
);
