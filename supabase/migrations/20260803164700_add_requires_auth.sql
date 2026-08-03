ALTER TABLE public.tf_studio_projects ADD COLUMN IF NOT EXISTS requires_auth boolean DEFAULT true;

-- Update RLS policies to respect requires_auth
CREATE POLICY "Anyone can view projects without auth" 
ON public.tf_studio_projects FOR SELECT 
USING (requires_auth = false);

CREATE POLICY "Anyone can view assets of projects without auth" 
ON public.tf_studio_assets FOR SELECT 
USING (
  is_public = true AND 
  EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.requires_auth = false)
);

CREATE POLICY "Anyone can view comments of projects without auth" 
ON public.tf_studio_comments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.requires_auth = false)
);

CREATE POLICY "Anyone can insert comments on projects without auth" 
ON public.tf_studio_comments FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.requires_auth = false)
);
