-- Verdora agricultural intelligence platform schema
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── USERS ───
create table if not exists public.users (
  id text primary key,
  email text not null,
  name text not null default 'Farmer',
  role text not null check (role in ('farmer', 'admin')),
  location text,
  latitude double precision,
  longitude double precision,
  farm_size text,
  farmer_type text check (farmer_type in ('small-scale', 'commercial')),
  crop_preferences jsonb default '[]'::jsonb,
  soil_type text,
  farming_methods jsonb default '[]'::jsonb,
  data_consent boolean not null default false,
  data_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_location on public.users (location);

-- ─── CROPS (farming activity) ───
create table if not exists public.crops (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  crop_name text not null,
  plant_date date not null,
  harvest_date date,
  location text,
  field_name text,
  field_id text references public.fields (id) on delete set null,
  soil_type text,
  farming_methods jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crops_user_id on public.crops (user_id);
create index if not exists idx_crops_crop_name on public.crops (crop_name);
create index if not exists idx_crops_plant_date on public.crops (plant_date);

-- ─── FIELDS (plots on multi-plot farms) ───
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

-- ─── SCANS (crop AI diagnosis) ───
create table if not exists public.scans (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  image_url text,
  crop_type text not null,
  disease text,
  confidence double precision not null default 0,
  treatment text,
  location text,
  field_id text references public.fields (id) on delete set null,
  field_name text,
  latitude double precision,
  longitude double precision,
  scanned_at timestamptz not null default now()
);

create index if not exists idx_scans_user_id on public.scans (user_id);
create index if not exists idx_scans_disease on public.scans (disease);
create index if not exists idx_scans_scanned_at on public.scans (scanned_at desc);

-- ─── WEATHER_LOGS ───
create table if not exists public.weather_logs (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  location text not null,
  temperature double precision not null,
  humidity double precision not null,
  condition text not null,
  recommendation_shown text,
  rainfall_mm double precision,
  logged_at timestamptz not null default now()
);

create index if not exists idx_weather_logs_user_id on public.weather_logs (user_id);
create index if not exists idx_weather_logs_logged_at on public.weather_logs (logged_at desc);

-- ─── CHAT_LOGS ───
create table if not exists public.chat_logs (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  location text,
  question text not null,
  ai_response text,
  asked_at timestamptz not null default now()
);

create index if not exists idx_chat_logs_user_id on public.chat_logs (user_id);
create index if not exists idx_chat_logs_asked_at on public.chat_logs (asked_at desc);

-- Row Level Security (enable in production; adjust policies for your auth model)
alter table public.users enable row level security;
alter table public.fields enable row level security;
alter table public.crops enable row level security;
alter table public.scans enable row level security;
alter table public.weather_logs enable row level security;
alter table public.chat_logs enable row level security;

-- Required so the anon/authenticated API roles can access tables (fixes "permission denied")
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

-- Development: allow anon read/write (replace with proper policies when using Supabase Auth)
drop policy if exists "Allow anon read users" on public.users;
drop policy if exists "Allow anon insert users" on public.users;
drop policy if exists "Allow anon update users" on public.users;
drop policy if exists "Allow anon crops" on public.crops;
drop policy if exists "Allow anon scans" on public.scans;
drop policy if exists "Allow anon weather" on public.weather_logs;
drop policy if exists "Allow anon chat" on public.chat_logs;
drop policy if exists "Allow anon fields" on public.fields;

create policy "Allow anon read users" on public.users for select to anon, authenticated using (true);
create policy "Allow anon insert users" on public.users for insert to anon, authenticated with check (true);
create policy "Allow anon update users" on public.users for update to anon, authenticated using (true);

create policy "Allow anon crops select" on public.crops for select to anon, authenticated using (true);
create policy "Allow anon crops insert" on public.crops for insert to anon, authenticated with check (true);
create policy "Allow anon crops update" on public.crops for update to anon, authenticated using (true);
create policy "Allow anon crops delete" on public.crops for delete to anon, authenticated using (true);

create policy "Allow anon fields select" on public.fields for select to anon, authenticated using (true);
create policy "Allow anon fields insert" on public.fields for insert to anon, authenticated with check (true);
create policy "Allow anon fields update" on public.fields for update to anon, authenticated using (true);
create policy "Allow anon fields delete" on public.fields for delete to anon, authenticated using (true);

create policy "Allow anon scans select" on public.scans for select to anon, authenticated using (true);
create policy "Allow anon scans insert" on public.scans for insert to anon, authenticated with check (true);
create policy "Allow anon scans update" on public.scans for update to anon, authenticated using (true);
create policy "Allow anon scans delete" on public.scans for delete to anon, authenticated using (true);

create policy "Allow anon weather select" on public.weather_logs for select to anon, authenticated using (true);
create policy "Allow anon weather insert" on public.weather_logs for insert to anon, authenticated with check (true);
create policy "Allow anon weather update" on public.weather_logs for update to anon, authenticated using (true);
create policy "Allow anon weather delete" on public.weather_logs for delete to anon, authenticated using (true);

create policy "Allow anon chat select" on public.chat_logs for select to anon, authenticated using (true);
create policy "Allow anon chat insert" on public.chat_logs for insert to anon, authenticated with check (true);
create policy "Allow anon chat update" on public.chat_logs for update to anon, authenticated using (true);
create policy "Allow anon chat delete" on public.chat_logs for delete to anon, authenticated using (true);
