# Verdora Data Collection Architecture

## Overview

Verdora is designed as an **agricultural intelligence & data collection platform**. All farmer interactions are structured, stored, and queryable for analytics.

## Storage Layers

| Layer | Purpose |
|-------|---------|
| **Supabase (cloud)** | Primary scalable store — tables linked by `user_id` |
| **AsyncStorage (local)** | Offline cache + fallback when Supabase is not configured |

## Database Schema

Base schema: `backend/supabase/schema.sql`

Intelligence platform (PostGIS): `backend/supabase/migrations/002_intelligence_platform.sql`

| Table | Purpose | Key fields |
|-------|---------|------------|
| `users` | Profile & consent | `location`, `latitude`, `longitude`, `data_consent` |
| `crops` | Farming activity | `plant_date`, `harvest_date`, `crop_name` |
| `scans` | AI crop diagnosis | `disease`, `confidence`, `latitude`, `longitude` |
| `weather_logs` | Environmental data | `temperature`, `recommendation_shown` |
| `chat_logs` | Chatbot interactions | `question`, `ai_response`, `location` |
| `disease_alerts` | Geospatial outbreak clusters | `center_lat`, `center_lng`, `scan_count`, `radius_km` |
| `knowledge_gap_reports` | Chat topic × region | `topic`, `region`, `question_count` |
| `planting_insights` | Calendar + weather optimization | `crop_name`, `region`, `optimal_months` |
| `aggregation_runs` | Nightly job audit log | `status`, `alerts_created` |

## Data Flow

```
Farmer action → Privacy check (consent) → Local analytics DB → Supabase insert
Nightly Edge Function → Cluster scans / chat / calendar → disease_alerts, knowledge_gap_reports, planting_insights
Farmer Home → disease_alerts_near(lat, lng) → Outbreak near you banner (aggregated, privacy-safe)
Admin Intel tab → Regional intelligence dashboard → Export PDF/JSON
```

## Regional Intelligence (live)

- **Disease alerts**: 3+ disease scans within 50 km → geospatial cluster with severity
- **Knowledge gaps**: Chat questions clustered by topic + region for NGO/extension reports
- **Planting windows**: Calendar plant dates + weather logs vs crop library optimal months

Local mock mode runs the same aggregation engine client-side; production uses the nightly Edge Function.

## Setup Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run `backend/supabase/schema.sql` then `backend/supabase/migrations/002_intelligence_platform.sql`
3. Deploy Edge Function: see `backend/supabase/functions/README.md`
4. Add to `frontend/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

## Privacy (mandatory)

- Consent notice at signup (required to register)
- Opt-out anytime in **Hub → Privacy & data collection**
- No sale of personal data
- Outbreak banners show **aggregated regional data only** — no individual farms identified
