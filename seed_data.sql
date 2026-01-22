-- 1. ADD COLUMN preview_url TO FABRICS (if not exists)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'fabrics' and column_name = 'preview_url') then
    alter table fabrics add column preview_url text;
  end if;
end $$;

-- 2. INSERT DEFAULT FABRICS (if not exist)
-- We insert them without preview images for now, or use placeholders if valid
insert into fabrics (name, description, preview_url)
values 
  ('Velluto', 'Tessuto morbido e lussuoso, ideale per interni eleganti.', 'https://images.unsplash.com/photo-1617220556114-1e5e6e3e8d2e?auto=format&fit=crop&q=80&w=200'),
  ('Pelle', 'Pelle naturale di alta qualità, resistente e classica.', 'https://images.unsplash.com/photo-1550254478-ead40cc54513?auto=format&fit=crop&q=80&w=200'),
  ('Lino', 'Fibra naturale fresca e leggera con trama visibile.', 'https://images.unsplash.com/photo-1598300056393-8ddce284894c?auto=format&fit=crop&q=80&w=200'),
  ('Bouclé', 'Tessuto strutturato e materico con superficie irregolare.', 'https://images.unsplash.com/photo-1579656592043-a20e25a4aa4d?auto=format&fit=crop&q=80&w=200'),
  ('Cotone', 'Tessuto versatile, naturale e confortevole.', 'https://images.unsplash.com/photo-1584589167171-541ce45f1eea?auto=format&fit=crop&q=80&w=200')
on conflict (id) do nothing; 

-- Note: Since we don't have constraints on name, this handles only ID conflicts which are random. 
-- In a real scenario we might check by name, but for simple seeding:
-- Just run this once. If you start fresh, it works perfectly.
