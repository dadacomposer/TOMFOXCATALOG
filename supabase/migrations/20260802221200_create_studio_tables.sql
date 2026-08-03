-- Migration for Studio Hub (TomFoxStudio)

CREATE TABLE IF NOT EXISTS public.tf_studio_projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'active', 'review', 'completed')),
    video_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tf_studio_assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.tf_studio_projects(id) ON DELETE CASCADE,
    asset_type text NOT NULL CHECK (asset_type IN ('audio', 'video')),
    file_url text NOT NULL,
    version_label text,
    track_group text NOT NULL, -- e.g., "V1", "SFX"
    revision_number integer DEFAULT 1,
    is_public boolean DEFAULT false, -- To hide internal working files from the client
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tf_studio_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.tf_studio_projects(id) ON DELETE CASCADE,
    asset_id uuid REFERENCES public.tf_studio_assets(id) ON DELETE CASCADE,
    timecode numeric NOT NULL,
    text text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    is_admin boolean DEFAULT false, -- true if Tom Fox commented, false if client
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.tf_studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tf_studio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tf_studio_comments ENABLE ROW LEVEL SECURITY;

-- Project Policies
CREATE POLICY "Users can view their own studio projects" 
ON public.tf_studio_projects FOR SELECT 
USING (auth.uid() = user_id OR (SELECT is_admin FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own studio projects" 
ON public.tf_studio_projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can update studio projects" 
ON public.tf_studio_projects FOR UPDATE 
USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()));

-- Asset Policies
CREATE POLICY "Users can view public assets for their projects" 
ON public.tf_studio_assets FOR SELECT 
USING (
  is_public = true AND 
  EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Admin can manage assets" 
ON public.tf_studio_assets FOR ALL 
USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()));

-- Comment Policies
CREATE POLICY "Users can view comments on their projects" 
ON public.tf_studio_comments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can insert comments on their projects" 
ON public.tf_studio_comments FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tf_studio_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid())
);
