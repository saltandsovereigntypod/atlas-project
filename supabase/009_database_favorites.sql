alter table public.databases
add column if not exists favorite boolean not null default false;
