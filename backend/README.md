# Verdora Backend

Cloud data layer for Verdora. The mobile app uses **Supabase** (PostgreSQL + Auth) with Row Level Security.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run:
   - [`supabase/schema.sql`](supabase/schema.sql)
   - [`supabase/migrations/002_intelligence_platform.sql`](supabase/migrations/002_intelligence_platform.sql)
3. Deploy nightly aggregation: [`supabase/functions/README.md`](supabase/functions/README.md)
4. Copy your project URL and anon key into `frontend/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

## Tables (all linked by `user_id`)

| Table | Purpose |
|-------|---------|
| `users` | Profiles, location, consent |
| `crops` | Planting / harvest activity |
| `scans` | Crop diagnosis events |
| `weather_logs` | Weather & recommendations |
| `chat_logs` | Farmer questions (optional AI responses) |
| `disease_alerts` | Geospatial disease outbreak clusters |
| `knowledge_gap_reports` | Chat topic gaps by region |
| `planting_insights` | Planting window optimization |
| `aggregation_runs` | Nightly job audit log |

## Architecture

See [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md) for collection flow, privacy, and analytics.

## Edge Functions

- `nightly-aggregation` — clusters disease scans, knowledge gaps, planting insights (cron: `0 2 * * *`)
