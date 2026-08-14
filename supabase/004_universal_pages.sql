-- Atlas universal page migration
-- Run once AFTER 003_pages.sql.

alter table public.pages add column if not exists context_type text not null default 'page';
alter table public.pages add column if not exists context_database_id uuid references public.databases(id) on delete cascade;
alter table public.pages add column if not exists context_record_id uuid references public.records(id) on delete cascade;
alter table public.pages add column if not exists parent_id uuid references public.pages(id) on delete set null;
alter table public.pages add column if not exists favorite boolean not null default false;
alter table public.pages add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.pages drop constraint if exists pages_context_type_check;
alter table public.pages add constraint pages_context_type_check check (context_type in ('home','page','database','record'));

create unique index if not exists idx_pages_home_unique on public.pages(workspace_id) where context_type='home';
create unique index if not exists idx_pages_database_context_unique on public.pages(context_database_id) where context_type='database';
create unique index if not exists idx_pages_record_context_unique on public.pages(context_record_id) where context_type='record';
create index if not exists idx_pages_parent on public.pages(parent_id, position);

alter table public.page_blocks drop constraint if exists page_blocks_type_check;
alter table public.page_blocks add constraint page_blocks_type_check check (type in (
  'heading','text','image','database_view','divider','callout','property','button','metric','progress'
));
