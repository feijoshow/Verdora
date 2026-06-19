# Verdora

Agricultural intelligence platform — crop scanning, plantation calendar, weather, AI chat, and analytics for farmers and admins.

## Project structure

```
Verdora/
├── frontend/          # Expo (React Native) mobile app
├── backend/           # Supabase schema & data architecture docs
├── AGENTS.md          # Agent / Expo SDK notes
└── package.json       # Workspace root (runs frontend scripts)
```

## Quick start

1. **Backend (Supabase)** — see [backend/README.md](backend/README.md)
   - Create a Supabase project
   - Run `backend/supabase/schema.sql` and migrations in the SQL editor
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

## Environment

Copy `frontend/.env.example` to `frontend/.env`. Required:

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — auth and cloud data

Optional:

- `EXPO_PUBLIC_API_URL` — custom REST backend
- `EXPO_PUBLIC_OPENWEATHER_API_KEY` — live weather
- `EXPO_PUBLIC_GEMINI_API_KEY` — AI chat assistant
