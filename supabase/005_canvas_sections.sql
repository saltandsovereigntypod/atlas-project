-- Atlas true-canvas editor migration
-- Run once AFTER 004_universal_pages.sql.

alter table public.page_blocks drop constraint if exists page_blocks_type_check;
alter table public.page_blocks add constraint page_blocks_type_check check (type in (
  'heading','text','image','database_view','divider','callout','property','button','metric','progress','section'
));
