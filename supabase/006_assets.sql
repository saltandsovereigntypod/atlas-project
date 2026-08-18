-- Atlas reusable asset library
-- Run after 005_canvas_sections.sql.

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image','font','emoji','file')),
  name text not null,
  storage_path text,
  public_url text,
  value text,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assets_workspace_kind on public.assets(workspace_id, kind, created_at desc);

alter table public.assets enable row level security;

drop policy if exists "members can read assets" on public.assets;
create policy "members can read assets" on public.assets for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create assets" on public.assets;
create policy "members can create assets" on public.assets for insert to authenticated
with check (public.is_workspace_member(workspace_id) and owner_id = auth.uid());

drop policy if exists "members can update assets" on public.assets;
create policy "members can update assets" on public.assets for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can delete assets" on public.assets;
create policy "members can delete assets" on public.assets for delete to authenticated
using (public.is_workspace_member(workspace_id));

insert into storage.buckets (id, name, public)
values ('atlas-assets', 'atlas-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "atlas members upload assets" on storage.objects;
create policy "atlas members upload assets" on storage.objects for insert to authenticated
with check (
  bucket_id = 'atlas-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "atlas owners update assets" on storage.objects;
create policy "atlas owners update assets" on storage.objects for update to authenticated
using (
  bucket_id = 'atlas-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "atlas owners delete assets" on storage.objects;
create policy "atlas owners delete assets" on storage.objects for delete to authenticated
using (
  bucket_id = 'atlas-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
