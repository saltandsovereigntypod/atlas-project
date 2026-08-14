-- Atlas page-first workspace migration
-- Run once AFTER 002_revamp.sql.

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default 'Untitled page' check (char_length(title) between 1 and 200),
  icon text,
  cover text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null check (type in ('heading','text','image','database_view','divider','callout')),
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pages_workspace on public.pages(workspace_id, position);
create index if not exists idx_page_blocks_page on public.page_blocks(page_id, position);

alter table public.pages enable row level security;
alter table public.page_blocks enable row level security;

create policy "members can read pages" on public.pages for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "members can create pages" on public.pages for insert to authenticated
with check (public.is_workspace_member(workspace_id));
create policy "members can update pages" on public.pages for update to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members can delete pages" on public.pages for delete to authenticated
using (public.is_workspace_member(workspace_id));

create policy "members can read page blocks" on public.page_blocks for select to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and public.is_workspace_member(p.workspace_id)));
create policy "members can create page blocks" on public.page_blocks for insert to authenticated
with check (exists (select 1 from public.pages p where p.id = page_id and public.is_workspace_member(p.workspace_id)));
create policy "members can update page blocks" on public.page_blocks for update to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and public.is_workspace_member(p.workspace_id)))
with check (exists (select 1 from public.pages p where p.id = page_id and public.is_workspace_member(p.workspace_id)));
create policy "members can delete page blocks" on public.page_blocks for delete to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and public.is_workspace_member(p.workspace_id)));
