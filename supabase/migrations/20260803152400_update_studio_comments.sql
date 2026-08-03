-- Migration for Studio Hub Comments (Chat and Replies)

-- 1. Allow timecode to be nullable (for general chat messages)
ALTER TABLE public.tf_studio_comments ALTER COLUMN timecode DROP NOT NULL;

-- 2. Add parent_id for threaded replies
ALTER TABLE public.tf_studio_comments ADD COLUMN parent_id uuid REFERENCES public.tf_studio_comments(id) ON DELETE CASCADE;
