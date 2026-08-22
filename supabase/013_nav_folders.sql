create table if not exists public.nav_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('page','database')),
  name text not null default 'New folder' check (char_length(name) between 1 and 120),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages
add column if not exists nav_folder_id uuid references public.nav_folders(id) on delete set null;

alter table public.databases
add column if not exists nav_folder_id uuid references public.nav_folders(id) on delete set null;

create index if not exists idx_nav_folders_workspace on public.nav_folders(workspace_id, kind, position);
create index if not exists idx_pages_nav_folder on public.pages(nav_folder_id);
create index if not exists idx_databases_nav_folder on public.databases(nav_folder_id);

alter table public.nav_folders enable row level security;

create policy "members can read nav folders" on public.nav_folders for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "members can create nav folders" on public.nav_folders for insert to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "members can update nav folders" on public.nav_folders for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "members can delete nav folders" on public.nav_folders for delete to authenticated
using (public.is_workspace_member(workspace_id));
