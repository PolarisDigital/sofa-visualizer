-- Add is_active column to fabrics table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'fabrics' and column_name = 'is_active') then
    alter table fabrics add column is_active boolean default true;
  end if;
end $$;
