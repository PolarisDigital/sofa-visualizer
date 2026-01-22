-- Create FABRICS table
create table fabrics (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text
);

-- Create COLORS table
create table colors (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  fabric_id uuid references fabrics(id) on delete cascade not null,
  name text not null,
  hex_value text,
  preview_url text, -- URL of the uploaded image
  texture_prompt text -- Optional prompt override for AI
);

-- Enable RLS (Row Level Security)
alter table fabrics enable row level security;
alter table colors enable row level security;

-- Policies for FABRICS
-- Everyone can view fabrics
create policy "Public fabrics are viewable by everyone"
  on fabrics for select using (true);

-- Only admins can insert/update/delete (We'll assume authenticated for now, refine later)
create policy "Authenticated users can insert fabrics"
  on fabrics for insert with check (auth.role() = 'authenticated');
  
create policy "Authenticated users can update fabrics"
  on fabrics for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete fabrics"
  on fabrics for delete using (auth.role() = 'authenticated');

-- Policies for COLORS
-- Everyone can view colors
create policy "Public colors are viewable by everyone"
  on colors for select using (true);

-- Only admins can insert/update/delete
create policy "Authenticated users can insert colors"
  on colors for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update colors"
  on colors for update using (auth.role() = 'authenticated');
  
create policy "Authenticated users can delete colors"
  on colors for delete using (auth.role() = 'authenticated');

-- STORAGE BUCKET POLICY (Execute this if you haven't created the bucket separately)
-- insert into storage.buckets (id, name, public) values ('textures', 'textures', true);

-- Storage Policy: Public Read
-- create policy "Public Access"
--   on storage.objects for select
--   using ( bucket_id = 'textures' );

-- Storage Policy: Auth Upload
-- create policy "Auth Upload"
--   on storage.objects for insert
--   with check ( bucket_id = 'textures' and auth.role() = 'authenticated' );
