-- Add can_download column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_download BOOLEAN DEFAULT TRUE;

-- Update existing profiles to ensure they have the default value
UPDATE profiles SET can_download = TRUE WHERE can_download IS NULL;
