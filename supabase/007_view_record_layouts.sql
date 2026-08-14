-- Atlas per-record placement inside database view components
-- Run once AFTER 006_asset_library.sql (or after 005 if 006 has not been run yet).

create table if not exists public.view_record_layouts (
  id uuid primary key default gen_random_uuid(),
  page_block_id uuid not null references public.page_blocks(id) on delete cascade,
  record_id uuid not null references public.records(id) on delete cascade,
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision not null default 180,
  height double precision not null default 160,
  rotation double precision not null default 0,
  z_index integer not null default 1,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(page_block_id, record_id)
);

create index if not exists idx_view_record_layouts_block on public.view_record_layouts(page_block_id);

alter table public.view_record_layouts enable row level security;

create policy "members can read view record layouts" on public.view_record_layouts
for select to authenticated using (
  exists (
    select 1
    from public.page_blocks pb
    join public.pages p on p.id = pb.page_id
    where pb.id = page_block_id and public.is_workspace_member(p.workspace_id)
  )
);

create policy "members can create view record layouts" on public.view_record_layouts
for insert to authenticated with check (
  exists (
    select 1
    from public.page_blocks pb
    join public.pages p on p.id = pb.page_id
    where pb.id = page_block_id and public.is_workspace_member(p.workspace_id)
  )
);

create policy "members can update view record layouts" on public.view_record_layouts
for update to authenticated using (
  exists (
    select 1
    from public.page_blocks pb
    join public.pages p on p.id = pb.page_id
    where pb.id = page_block_id and public.is_workspace_member(p.workspace_id)
  )
) with check (
  exists (
    select 1
    from public.page_blocks pb
    join public.pages p on p.id = pb.page_id
    where pb.id = page_block_id and public.is_workspace_member(p.workspace_id)
  )
);

create policy "members can delete view record layouts" on public.view_record_layouts
for delete to authenticated using (
  exists (
    select 1
    from public.page_blocks pb
    join public.pages p on p.id = pb.page_id
    where pb.id = page_block_id and public.is_workspace_member(p.workspace_id)
  )
);
