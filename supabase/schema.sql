-- Verdora — complete schema for a NEW Supabase project
-- Run once in SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Prerequisites: enable Email auth in Authentication → Providers

-- ─── Extensions ───
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- ─── USERS (linked to Supabase Auth) ───
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default 'Farmer',
  role text not null check (role in ('farmer', 'admin')),
  location_legacy text,
  region_id text,
  region_name text,
  town_id text,
  town_name text,
  constituency text,
  is_custom_town boolean not null default false,
  latitude double precision,
  longitude double precision,
  farm_size text,
  farmer_type text check (farmer_type in ('small-scale', 'commercial')),
  crop_preferences jsonb not null default '[]'::jsonb,
  soil_type text,
  farming_methods jsonb not null default '[]'::jsonb,
  data_consent boolean not null default false,
  data_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_location_legacy on public.users (location_legacy);
create index if not exists idx_users_region_id on public.users (region_id);

-- ─── FIELDS (multi-plot farms) — must exist before crops/scans FKs ───
create table if not exists public.fields (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  latitude double precision,
  longitude double precision,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_fields_user_id on public.fields (user_id);

-- ─── CROPS (farming activity) ───
create table if not exists public.crops (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  crop_name text not null,
  plant_date date not null,
  harvest_date date,
  location text,
  field_name text,
  field_id text references public.fields (id) on delete set null,
  soil_type text,
  farming_methods jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crops_user_id on public.crops (user_id);
create index if not exists idx_crops_crop_name on public.crops (crop_name);
create index if not exists idx_crops_plant_date on public.crops (plant_date);

-- ─── SCANS (crop AI diagnosis) ───
create table if not exists public.scans (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
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
create index if not exists idx_scans_disease_geo on public.scans (disease, scanned_at desc)
  where disease is not null and latitude is not null and longitude is not null;

-- ─── WEATHER_LOGS ───
create table if not exists public.weather_logs (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
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
  user_id uuid not null references public.users (id) on delete cascade,
  location text,
  question text not null,
  ai_response text,
  asked_at timestamptz not null default now()
);

create index if not exists idx_chat_logs_user_id on public.chat_logs (user_id);
create index if not exists idx_chat_logs_asked_at on public.chat_logs (asked_at desc);

-- ─── DISEASE ALERTS (geospatial outbreak clusters) ───
create table if not exists public.disease_alerts (
  id text primary key,
  disease text not null,
  crop_types jsonb not null default '[]'::jsonb,
  scan_count integer not null default 0,
  radius_km double precision not null default 50,
  center_lat double precision not null,
  center_lng double precision not null,
  center geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography
  ) stored,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  region_label text,
  active boolean not null default true,
  detected_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_disease_alerts_active on public.disease_alerts (active, detected_at desc);
create index if not exists idx_disease_alerts_disease on public.disease_alerts (disease);
create index if not exists idx_disease_alerts_center on public.disease_alerts using gist (center);

-- ─── KNOWLEDGE GAP REPORTS ───
create table if not exists public.knowledge_gap_reports (
  id text primary key,
  topic text not null,
  region text not null,
  question_count integer not null default 0,
  sample_question text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  locations jsonb not null default '[]'::jsonb,
  report_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic, region, report_date)
);

create index if not exists idx_knowledge_gap_region on public.knowledge_gap_reports (region, question_count desc);
create index if not exists idx_knowledge_gap_topic on public.knowledge_gap_reports (topic);

-- ─── PLANTING INSIGHTS ───
create table if not exists public.planting_insights (
  id text primary key,
  crop_name text not null,
  region text not null,
  optimal_months jsonb not null default '[]'::jsonb,
  observed_plant_months jsonb not null default '[]'::jsonb,
  farmer_count integer not null default 0,
  avg_temperature double precision,
  avg_humidity double precision,
  recommendation text not null,
  report_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (crop_name, region, report_date)
);

create index if not exists idx_planting_insights_region on public.planting_insights (region, crop_name);

-- ─── AGGREGATION RUN LOG ───
create table if not exists public.aggregation_runs (
  id text primary key,
  run_type text not null default 'nightly',
  status text not null check (status in ('running', 'success', 'failed')),
  alerts_created integer not null default 0,
  gaps_created integer not null default 0,
  planting_insights_created integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ─── updated_at automation ───
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_fields_updated_at on public.fields;
create trigger trg_fields_updated_at
  before update on public.fields
  for each row execute function public.set_updated_at();

drop trigger if exists trg_crops_updated_at on public.crops;
create trigger trg_crops_updated_at
  before update on public.crops
  for each row execute function public.set_updated_at();

drop trigger if exists trg_disease_alerts_updated_at on public.disease_alerts;
create trigger trg_disease_alerts_updated_at
  before update on public.disease_alerts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_knowledge_gap_updated_at on public.knowledge_gap_reports;
create trigger trg_knowledge_gap_updated_at
  before update on public.knowledge_gap_reports
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planting_insights_updated_at on public.planting_insights;
create trigger trg_planting_insights_updated_at
  before update on public.planting_insights
  for each row execute function public.set_updated_at();

-- ─── Helpers ───
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.disease_alerts_near(
  farmer_lat double precision,
  farmer_lng double precision,
  max_km double precision default 50
)
returns setof public.disease_alerts
language sql
stable
as $$
  select *
  from public.disease_alerts
  where active = true
    and (expires_at is null or expires_at > now())
    and st_dwithin(
      center,
      st_setsrid(st_makepoint(farmer_lng, farmer_lat), 4326)::geography,
      max_km * 1000
    )
  order by scan_count desc, detected_at desc;
$$;

-- Auto-create profile row when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', 'Farmer'),
    'farmer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for auth users created before the trigger existed
insert into public.users (id, email, name, role)
select
  au.id,
  coalesce(au.email, ''),
  coalesce(au.raw_user_meta_data->>'name', 'Farmer'),
  'farmer'
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- ─── Row Level Security ───
alter table public.users enable row level security;
alter table public.fields enable row level security;
alter table public.crops enable row level security;
alter table public.scans enable row level security;
alter table public.weather_logs enable row level security;
alter table public.chat_logs enable row level security;
alter table public.disease_alerts enable row level security;
alter table public.knowledge_gap_reports enable row level security;
alter table public.planting_insights enable row level security;
alter table public.aggregation_runs enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on function public.disease_alerts_near(double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

-- Drop legacy dev policies (safe on fresh DB)
drop policy if exists "Allow anon read users" on public.users;
drop policy if exists "Allow anon insert users" on public.users;
drop policy if exists "Allow anon update users" on public.users;
drop policy if exists "Allow anon crops" on public.crops;
drop policy if exists "Allow anon scans" on public.scans;
drop policy if exists "Allow anon weather" on public.weather_logs;
drop policy if exists "Allow anon chat" on public.chat_logs;
drop policy if exists "Allow anon fields" on public.fields;
drop policy if exists "Allow anon crops select" on public.crops;
drop policy if exists "Allow anon crops insert" on public.crops;
drop policy if exists "Allow anon crops update" on public.crops;
drop policy if exists "Allow anon crops delete" on public.crops;
drop policy if exists "Allow anon fields select" on public.fields;
drop policy if exists "Allow anon fields insert" on public.fields;
drop policy if exists "Allow anon fields update" on public.fields;
drop policy if exists "Allow anon fields delete" on public.fields;
drop policy if exists "Allow anon scans select" on public.scans;
drop policy if exists "Allow anon scans insert" on public.scans;
drop policy if exists "Allow anon scans update" on public.scans;
drop policy if exists "Allow anon scans delete" on public.scans;
drop policy if exists "Allow anon weather select" on public.weather_logs;
drop policy if exists "Allow anon weather insert" on public.weather_logs;
drop policy if exists "Allow anon weather update" on public.weather_logs;
drop policy if exists "Allow anon weather delete" on public.weather_logs;
drop policy if exists "Allow anon chat select" on public.chat_logs;
drop policy if exists "Allow anon chat insert" on public.chat_logs;
drop policy if exists "Allow anon chat update" on public.chat_logs;
drop policy if exists "Allow anon chat delete" on public.chat_logs;
drop policy if exists "Allow anon disease_alerts" on public.disease_alerts;
drop policy if exists "Allow anon knowledge_gaps" on public.knowledge_gap_reports;
drop policy if exists "Allow anon planting_insights" on public.planting_insights;
drop policy if exists "Allow anon aggregation_runs" on public.aggregation_runs;

drop policy if exists "Users read own profile or admin reads all" on public.users;
drop policy if exists "Users insert own profile" on public.users;
drop policy if exists "Users update own profile or admin updates all" on public.users;
drop policy if exists "Owner or admin select fields" on public.fields;
drop policy if exists "Owner insert fields" on public.fields;
drop policy if exists "Owner or admin update fields" on public.fields;
drop policy if exists "Owner or admin delete fields" on public.fields;
drop policy if exists "Owner or admin select crops" on public.crops;
drop policy if exists "Owner insert crops" on public.crops;
drop policy if exists "Owner or admin update crops" on public.crops;
drop policy if exists "Owner or admin delete crops" on public.crops;
drop policy if exists "Owner or admin select scans" on public.scans;
drop policy if exists "Owner insert scans" on public.scans;
drop policy if exists "Owner or admin update scans" on public.scans;
drop policy if exists "Owner or admin delete scans" on public.scans;
drop policy if exists "Owner or admin select weather_logs" on public.weather_logs;
drop policy if exists "Owner insert weather_logs" on public.weather_logs;
drop policy if exists "Owner or admin update weather_logs" on public.weather_logs;
drop policy if exists "Owner or admin delete weather_logs" on public.weather_logs;
drop policy if exists "Owner or admin select chat_logs" on public.chat_logs;
drop policy if exists "Owner insert chat_logs" on public.chat_logs;
drop policy if exists "Owner or admin update chat_logs" on public.chat_logs;
drop policy if exists "Owner or admin delete chat_logs" on public.chat_logs;
drop policy if exists "Authenticated read disease_alerts" on public.disease_alerts;
drop policy if exists "Authenticated read knowledge_gap_reports" on public.knowledge_gap_reports;
drop policy if exists "Authenticated read planting_insights" on public.planting_insights;
drop policy if exists "Admin read aggregation_runs" on public.aggregation_runs;

-- users
create policy "Users read own profile or admin reads all"
  on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Users insert own profile"
  on public.users for insert to authenticated
  with check (id = auth.uid());

create policy "Users update own profile or admin updates all"
  on public.users for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Farmer-owned tables (fields, crops, scans, weather, chat)
create policy "Owner or admin select fields"
  on public.fields for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner insert fields"
  on public.fields for insert to authenticated
  with check (user_id = auth.uid());

create policy "Owner or admin update fields"
  on public.fields for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin delete fields"
  on public.fields for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin select crops"
  on public.crops for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner insert crops"
  on public.crops for insert to authenticated
  with check (user_id = auth.uid());

create policy "Owner or admin update crops"
  on public.crops for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin delete crops"
  on public.crops for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin select scans"
  on public.scans for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner insert scans"
  on public.scans for insert to authenticated
  with check (user_id = auth.uid());

create policy "Owner or admin update scans"
  on public.scans for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin delete scans"
  on public.scans for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin select weather_logs"
  on public.weather_logs for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner insert weather_logs"
  on public.weather_logs for insert to authenticated
  with check (user_id = auth.uid());

create policy "Owner or admin update weather_logs"
  on public.weather_logs for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin delete weather_logs"
  on public.weather_logs for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin select chat_logs"
  on public.chat_logs for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Owner insert chat_logs"
  on public.chat_logs for insert to authenticated
  with check (user_id = auth.uid());

create policy "Owner or admin update chat_logs"
  on public.chat_logs for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "Owner or admin delete chat_logs"
  on public.chat_logs for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Regional intelligence (read-only for app; Edge Function writes via service role)
create policy "Authenticated read disease_alerts"
  on public.disease_alerts for select to authenticated
  using (true);

create policy "Authenticated read knowledge_gap_reports"
  on public.knowledge_gap_reports for select to authenticated
  using (true);

create policy "Authenticated read planting_insights"
  on public.planting_insights for select to authenticated
  using (true);

create policy "Admin read aggregation_runs"
  on public.aggregation_runs for select to authenticated
  using (public.is_admin());
