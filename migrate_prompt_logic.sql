-- 1. ADD texture_prompt TO FABRICS
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'fabrics' and column_name = 'texture_prompt') then
    alter table fabrics add column texture_prompt text;
  end if;
end $$;

-- 2. (Optional) REMOVE texture_prompt FROM COLORS (Cleanup)
-- do $$
-- begin
--   if exists (select 1 from information_schema.columns where table_name = 'colors' and column_name = 'texture_prompt') then
--     alter table colors drop column texture_prompt;
--   end if;
-- end $$;

-- 3. UPDATE DEFAULT FABRIC PROMPTS
update fabrics set texture_prompt = 'Soft and luxurious velvet fabric with subtle sheen' where name = 'Velluto';
update fabrics set texture_prompt = 'High quality genuine leather texture, smooth finish' where name = 'Pelle';
update fabrics set texture_prompt = 'Natural linen fabric with visible weave texture' where name = 'Lino';
update fabrics set texture_prompt = 'Textured bouclé fabric with looped yarn surface' where name = 'Bouclé';
update fabrics set texture_prompt = 'Versatile cotton canvas fabric, matte finish' where name = 'Cotone';
