-- Verdora 004 — structured location fields on users
-- Renames free-text location to location_legacy; adds region/town columns for KYC picker.
-- Safe to re-run.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'location'
  ) then
    alter table public.users rename column location to location_legacy;
  end if;
end $$;

alter table public.users add column if not exists region_id text;
alter table public.users add column if not exists region_name text;
alter table public.users add column if not exists town_id text;
alter table public.users add column if not exists town_name text;
alter table public.users add column if not exists constituency text;
alter table public.users add column if not exists is_custom_town boolean not null default false;

-- Best-effort backfill from legacy free-text (demo farmer pattern)
update public.users
set
  region_id = 'oshana',
  region_name = 'Oshana',
  town_id = 'oshakati',
  town_name = 'Oshakati',
  constituency = 'Oshakati East',
  is_custom_town = false
where region_id is null
  and (
    location_legacy ilike '%oshakati%'
    or location_legacy ilike '%oshana%'
  );

update public.users
set
  region_id = 'khomas',
  region_name = 'Khomas',
  town_id = 'windhoek',
  town_name = 'Windhoek',
  constituency = 'Windhoek East',
  is_custom_town = false
where region_id is null
  and location_legacy ilike '%windhoek%';

create index if not exists idx_users_region_id on public.users (region_id);
