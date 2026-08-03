-- Update tf_studio_projects for Custom Music Brief details

ALTER TABLE public.tf_studio_projects
ADD COLUMN IF NOT EXISTS project_type text,
ADD COLUMN IF NOT EXISTS budget text,
ADD COLUMN IF NOT EXISTS reference_links text[],
ADD COLUMN IF NOT EXISTS media_file_url text;
