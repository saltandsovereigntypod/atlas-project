-- Atlas Studio v0.1
-- Run this entire file once in Supabase Dashboard > SQL Editor.
-- It creates the app schema, row level security policies, and a public asset bucket.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.databases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (type in ('text','long_text','number','date','checkbox','select','multi_select','url','image','relation')),
  position integer not null default 0,
  required boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  title text not null default 'Untitled',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.layouts (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  name text not null default 'Default card',
  canvas_width integer not null default 900 check (canvas_width between 320 and 5000),
  canvas_height integer not null default 560 check (canvas_height between 240 and 5000),
  background text not null default '#f8f4ec',
  created_at timestamptz not null default now()
);

create table if not exists public.layout_elements (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.layouts(id) on delete cascade,
  type text not null check (type in ('text','field','shape')),
  binding_field_id uuid references public.fields(id) on delete set null,
  x integer not null default 0,
  y integer not null default 0,
  width integer not null default 240 check (width > 0),
  height integer not null default 80 check (height > 0),
  rotation numeric not null default 0,
  z_index integer not null default 0,
  props jsonb not null default '{}'::jsonb
);

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_databases_workspace on public.databases(workspace_id);
create index if not exists idx_fields_database on public.fields(database_id, position);
create index if not exists idx_records_database on public.records(database_id, updated_at desc);
create index if not exists idx_layouts_database on public.layouts(database_id);
create index if not exists idx_layout_elements_layout on public.layout_elements(layout_id, z_index);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.add_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists trg_workspace_owner_membership on public.workspaces;
create trigger trg_workspace_owner_membership
after insert on public.workspaces
for each row execute function public.add_workspace_owner_membership();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.databases enable row level security;
alter table public.fields enable row level security;
alter table public.records enable row level security;
alter table public.layouts enable row level security;
alter table public.layout_elements enable row level security;

-- Workspaces
create policy "workspace members can read workspaces"
on public.workspaces for select
to authenticated
using (owner_id = auth.uid() or public.is_workspace_member(id));

create policy "users can create their own workspaces"
on public.workspaces for insert
to authenticated
with check (owner_id = auth.uid());

create policy "workspace owners can update workspaces"
on public.workspaces for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "workspace owners can delete workspaces"
on public.workspaces for delete
to authenticated
using (owner_id = auth.uid());

-- Workspace membership
create policy "members can read their membership"
on public.workspace_members for select
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.workspaces w
  where w.id = workspace_id and w.owner_id = auth.uid()
));

create policy "owners can add workspace members"
on public.workspace_members for insert
to authenticated
with check (exists (
  select 1 from public.workspaces w
  where w.id = workspace_id and w.owner_id = auth.uid()
));

create policy "owners can update workspace members"
on public.workspace_members for update
to authenticated
using (exists (
  select 1 from public.workspaces w
  where w.id = workspace_id and w.owner_id = auth.uid()
));

create policy "owners can remove workspace members"
on public.workspace_members for delete
to authenticated
using (exists (
  select 1 from public.workspaces w
  where w.id = workspace_id and w.owner_id = auth.uid()
));

-- Databases
create policy "members can read databases"
on public.databases for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "members can create databases"
on public.databases for insert to authenticated
with check (public.is_workspace_member(workspace_id));
create policy "members can update databases"
on public.databases for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "members can delete databases"
on public.databases for delete to authenticated
using (public.is_workspace_member(workspace_id));

-- Fields
create policy "members can read fields"
on public.fields for select to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can create fields"
on public.fields for insert to authenticated
with check (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can update fields"
on public.fields for update to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can delete fields"
on public.fields for delete to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

-- Records
create policy "members can read records"
on public.records for select to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can create records"
on public.records for insert to authenticated
with check (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can update records"
on public.records for update to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can delete records"
on public.records for delete to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

-- Layouts
create policy "members can read layouts"
on public.layouts for select to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can create layouts"
on public.layouts for insert to authenticated
with check (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can update layouts"
on public.layouts for update to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can delete layouts"
on public.layouts for delete to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

-- Layout elements
create policy "members can read layout elements"
on public.layout_elements for select to authenticated
using (exists (
  select 1
  from public.layouts l
  join public.databases d on d.id = l.database_id
  where l.id = layout_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can create layout elements"
on public.layout_elements for insert to authenticated
with check (exists (
  select 1
  from public.layouts l
  join public.databases d on d.id = l.database_id
  where l.id = layout_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can update layout elements"
on public.layout_elements for update to authenticated
using (exists (
  select 1
  from public.layouts l
  join public.databases d on d.id = l.database_id
  where l.id = layout_id and public.is_workspace_member(d.workspace_id)
));
create policy "members can delete layout elements"
on public.layout_elements for delete to authenticated
using (exists (
  select 1
  from public.layouts l
  join public.databases d on d.id = l.database_id
  where l.id = layout_id and public.is_workspace_member(d.workspace_id)
));

-- Optional public asset bucket. The current UI accepts image URLs directly,
-- but this is ready for a native uploader in the next iteration.
insert into storage.buckets (id, name, public)
values ('user-assets', 'user-assets', true)
on conflict (id) do update set public = excluded.public;

create policy "authenticated users can upload their own assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users can update their own assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users can delete their own assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public bucket objects are readable through their public URLs.
