-- Galleria Immagini Salvate - Database Migration
-- Run this in Supabase SQL Editor

-- 1. Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- email dell'utente
);

-- 2. Create saved_images table
CREATE TABLE IF NOT EXISTS saved_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- email dell'utente
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_images ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Global access for authenticated users
-- Folders: everyone can read, create, update, delete
CREATE POLICY "Allow all operations on folders for authenticated users" 
ON folders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Saved Images: everyone can read, create, update, delete
CREATE POLICY "Allow all operations on saved_images for authenticated users" 
ON saved_images FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_images_folder_id ON saved_images(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_images_created_at ON saved_images(created_at DESC);

-- ============================================
-- STORAGE BUCKET SETUP (run separately in Supabase Dashboard)
-- ============================================
-- Go to Storage > Create new bucket:
--   Name: generated-images
--   Public: YES (for reading images)
--   File size limit: 10MB
--
-- Then create policy:
--   Name: Allow authenticated uploads
--   Allowed operation: INSERT
--   Target roles: authenticated
--   WITH CHECK: true
--
--   Name: Allow public read
--   Allowed operation: SELECT
--   Target roles: public
--   USING: true
