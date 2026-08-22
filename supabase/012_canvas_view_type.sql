-- Allow Canvas Cards to be stored as a first-class database view.
-- Safe to run repeatedly; it preserves all existing views and only replaces
-- the views.type check constraint with the expanded value list.

alter table public.views drop constraint if exists views_type_check;

alter table public.views add constraint views_type_check
check (type in ('table','gallery','board','canvas'));
