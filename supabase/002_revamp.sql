-- Atlas revamp migration
-- Run this once AFTER supabase/schema.sql in Supabase SQL Editor.
-- It preserves existing data while adding saved database views and surface/record-specific designs.

create table if not exists public.views (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (type in ('table','gallery','board')),
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_views_database on public.views(database_id, position);

alter table public.views enable row level security;

drop policy if exists "members can read views" on public.views;
create policy "members can read views"
on public.views for select to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

drop policy if exists "members can create views" on public.views;
create policy "members can create views"
on public.views for insert to authenticated
with check (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

drop policy if exists "members can update views" on public.views;
create policy "members can update views"
on public.views for update to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
))
with check (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

drop policy if exists "members can delete views" on public.views;
create policy "members can delete views"
on public.views for delete to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

alter table public.layouts add column if not exists surface text;
alter table public.layouts add column if not exists record_id uuid references public.records(id) on delete cascade;

update public.layouts set surface = 'record' where surface is null;
alter table public.layouts alter column surface set default 'record';
alter table public.layouts alter column surface set not null;

alter table public.layouts drop constraint if exists layouts_surface_check;
alter table public.layouts add constraint layouts_surface_check check (surface in ('record','gallery','board'));

create index if not exists idx_layouts_surface on public.layouts(database_id, surface, record_id);
create unique index if not exists idx_layouts_default_surface_unique
  on public.layouts(database_id, surface)
  where record_id is null;
create unique index if not exists idx_layouts_record_surface_unique
  on public.layouts(database_id, surface, record_id)
  where record_id is not null;

-- Existing layouts become the default record-page design for their database.
-- New gallery and board designs are created lazily by Atlas when first opened.
