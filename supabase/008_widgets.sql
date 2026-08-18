-- Atlas widget system migration
-- Run once AFTER 007_view_record_layouts.sql (or after 005 if 007 is not required in your environment).

alter table public.page_blocks drop constraint if exists page_blocks_type_check;
alter table public.page_blocks add constraint page_blocks_type_check check (type in (
  'heading','text','image','database_view','divider','callout','property','button','metric','progress','section','widget'
));
