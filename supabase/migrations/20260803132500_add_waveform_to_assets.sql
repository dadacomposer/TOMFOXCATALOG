ALTER TABLE public.tf_studio_assets
ADD COLUMN IF NOT EXISTS waveform_data jsonb DEFAULT '[]'::jsonb;
