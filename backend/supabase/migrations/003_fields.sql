-- Multi-plot farms: first-class fields table
-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.fields (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  name text not null,
  latitude double precision,
  longitude double precision,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_fields_user_id on public.fields (user_id);

alter table public.crops add column if not exists field_id text references public.fields (id) on delete set null;
alter table public.scans add column if not exists field_id text references public.fields (id) on delete set null;
alter table public.scans add column if not exists field_name text;

alter table public.fields enable row level security;

grant select, insert, update, delete on public.fields to anon, authenticated;

drop policy if exists "Allow anon fields" on public.fields;
create policy "Allow anon fields select" on public.fields for select to anon, authenticated using (true);
create policy "Allow anon fields insert" on public.fields for insert to anon, authenticated with check (true);
create policy "Allow anon fields update" on public.fields for update to anon, authenticated using (true);
create policy "Allow anon fields delete" on public.fields for delete to anon, authenticated using (true);
