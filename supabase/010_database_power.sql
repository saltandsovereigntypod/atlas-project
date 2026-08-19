-- Atlas database power migration
-- Run once in Supabase Dashboard > SQL Editor after prior Atlas migrations.
-- Adds richer property types and native rule automations without changing existing records.

alter table public.fields drop constraint if exists fields_type_check;
alter table public.fields add constraint fields_type_check check (
  type in (
    'text','long_text','number','date','checkbox','select','multi_select','status',
    'url','email','phone','image','files','relation','created_time','last_edited_time'
  )
);

create table if not exists public.database_automations (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  enabled boolean not null default true,
  trigger_type text not null check (trigger_type in ('record_created','field_changed')),
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null check (action_type in ('set_field','set_today','set_checkbox')),
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_database_automations_database on public.database_automations(database_id, created_at);
alter table public.database_automations enable row level security;

drop policy if exists "members can read database automations" on public.database_automations;
create policy "members can read database automations"
on public.database_automations for select to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

drop policy if exists "members can create database automations" on public.database_automations;
create policy "members can create database automations"
on public.database_automations for insert to authenticated
with check (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

drop policy if exists "members can update database automations" on public.database_automations;
create policy "members can update database automations"
on public.database_automations for update to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
))
with check (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));

drop policy if exists "members can delete database automations" on public.database_automations;
create policy "members can delete database automations"
on public.database_automations for delete to authenticated
using (exists (
  select 1 from public.databases d
  where d.id = database_id and public.is_workspace_member(d.workspace_id)
));
