-- First-class reusable content objects and media blocks. Additive and backwards compatible.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled document',
  body text not null default '',
  parent_page_id uuid references public.pages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_documents_workspace_updated on public.documents(workspace_id, updated_at desc);
alter table public.documents enable row level security;
create policy "members can read documents" on public.documents for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members can create documents" on public.documents for insert to authenticated with check (public.is_workspace_member(workspace_id) and owner_id = auth.uid());
create policy "members can update documents" on public.documents for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members can delete documents" on public.documents for delete to authenticated using (public.is_workspace_member(workspace_id));

alter table public.assets drop constraint if exists assets_kind_check;
alter table public.assets add constraint assets_kind_check check (kind in ('image','audio','font','emoji','file'));
alter table public.page_blocks drop constraint if exists page_blocks_type_check;
alter table public.page_blocks add constraint page_blocks_type_check check (type in (
  'heading','text','document','image','audio','file','database_view','divider','callout','property','button','metric','progress','section','widget'
));
