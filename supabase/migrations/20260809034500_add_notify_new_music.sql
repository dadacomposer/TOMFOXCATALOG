-- Migration to add notify_new_music preference
ALTER TABLE public.profiles 
ADD COLUMN notify_new_music boolean DEFAULT true NOT NULL;
