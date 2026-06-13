# Nightly Intelligence Aggregation

Supabase Edge Function that runs disease clustering, knowledge gap analysis, and planting window optimization.

## Deploy

```bash
cd backend
supabase functions deploy nightly-aggregation --no-verify-jwt
```

Set secrets (service role key is auto-injected in Supabase):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Schedule (nightly at 2 AM UTC)

In Supabase Dashboard → Edge Functions → nightly-aggregation → Schedules:

- Cron: `0 2 * * *`

Or via SQL using `pg_cron` + `http` extension to invoke the function URL.

## Manual trigger

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/nightly-aggregation" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Prerequisites

Run migrations in order:

1. `supabase/schema.sql`
2. `supabase/migrations/002_intelligence_platform.sql` (PostGIS + intelligence tables)

## What it produces

| Table | Output |
|-------|--------|
| `disease_alerts` | Geospatial clusters (3+ scans / 50 km / 30 days) |
| `knowledge_gap_reports` | Chat topic × region (2+ questions) |
| `planting_insights` | Calendar + weather by crop × region |
| `aggregation_runs` | Job audit log |

Farmers see alerts via `disease_alerts_near()` RPC. Admins see full intelligence in the **Intel** tab.
