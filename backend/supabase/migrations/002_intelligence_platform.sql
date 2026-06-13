-- Verdora intelligence platform — disease alerts, knowledge gaps, planting insights
-- Requires PostGIS for geospatial outbreak clustering.
-- Run after schema.sql in Supabase SQL Editor.

create extension if not exists postgis;

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

-- Find alerts within radius of a farmer location (km)
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

-- ─── KNOWLEDGE GAP REPORTS (chat topic clusters by region) ───
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

-- ─── PLANTING INSIGHTS (calendar + weather aggregation) ───
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

alter table public.disease_alerts enable row level security;
alter table public.knowledge_gap_reports enable row level security;
alter table public.planting_insights enable row level security;
alter table public.aggregation_runs enable row level security;

grant select, insert, update, delete on public.disease_alerts to anon, authenticated;
grant select, insert, update, delete on public.knowledge_gap_reports to anon, authenticated;
grant select, insert, update, delete on public.planting_insights to anon, authenticated;
grant select, insert, update, delete on public.aggregation_runs to anon, authenticated;

-- Development policies (replace with auth.uid() policies in production)
create policy "Allow anon disease_alerts" on public.disease_alerts for all to anon, authenticated using (true) with check (true);
create policy "Allow anon knowledge_gaps" on public.knowledge_gap_reports for all to anon, authenticated using (true) with check (true);
create policy "Allow anon planting_insights" on public.planting_insights for all to anon, authenticated using (true) with check (true);
create policy "Allow anon aggregation_runs" on public.aggregation_runs for all to anon, authenticated using (true) with check (true);

-- Geospatial index on scans for aggregation queries
create index if not exists idx_scans_disease_geo on public.scans (disease, scanned_at desc)
  where disease is not null and latitude is not null and longitude is not null;
