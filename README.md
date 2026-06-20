# Verdora

Agricultural intelligence platform — crop scanning, plantation calendar, weather, AI chat, and analytics for farmers and admins.

**Full app reference:** [docs/VERDORA_APP.md](docs/VERDORA_APP.md) — complete documentation of every screen, service, data flow, and configuration detail.

## Project structure

```
Verdora/
├── frontend/              # Expo (React Native) mobile app
├── supabase/              # ← SQL schema, migrations, Edge Functions
│   ├── schema.sql         # run this in Supabase SQL Editor
│   ├── migrations/
│   │   ├── 001_core_tables.sql
│   │   ├── 002_intelligence_platform.sql
│   │   └── 003_rls_and_auth.sql
│   ├── fix_permissions.sql
│   └── seed_admin.sql
├── backend/               # Data architecture docs
├── AGENTS.md
└── package.json
```

## Quick start

1. **Backend (Supabase)** — see [supabase/SETUP.md](supabase/SETUP.md)
   - Create a **new** Supabase project
   - Run [supabase/schema.sql](supabase/schema.sql) once in the SQL Editor
   - Enable **Email** auth in Supabase Authentication settings

2. **Frontend (Expo app)**

   ```bash
   cd frontend
   cp .env.example .env
   # Add your Supabase URL and anon key
   npm install
   npm start
   ```

   From the repo root you can also run: `npm install` then `npm start`.

   To test on an iPhone, install **Expo Go** (SDK 54), run `npm start`, and scan the QR code. See [frontend/README.md](frontend/README.md) for details.

3. **First use** — open the app and tap **Create Account** to register a farmer account.

For demos and tester builds, see [`supabase/DEMO_SETUP.md`](supabase/DEMO_SETUP.md) and [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

## Environment

Copy `frontend/.env.example` to `frontend/.env`. Required:

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — auth and cloud data

Optional:

- `EXPO_PUBLIC_API_URL` — custom REST backend
- `EXPO_PUBLIC_OPENWEATHER_API_KEY` — live weather (OpenWeather)
- `EXPO_PUBLIC_CLAUDE_API_KEY` — AI chat assistant (Claude)
- `EXPO_PUBLIC_GEMINI_API_KEY` — crop scan analysis (Gemini vision)
