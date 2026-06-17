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
   - Run `backend/supabase/schema.sql` in the SQL editor

2. **Frontend (Expo app)**

   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your API keys
   npm install
   npm start
   ```

   From the repo root you can also run: `npm install` then `npm start`.

   To test on an iPhone, install **Expo Go** (SDK 54), run `npm start`, and scan the QR code. See [frontend/README.md](frontend/README.md) for device setup and troubleshooting.

3. **Demo login** (mock API): `farmer@verdora.com` / `admin@verdora.com` — password `verdora123`

## Environment

Copy `frontend/.env.example` to `frontend/.env`. Key variables:

- `EXPO_PUBLIC_USE_MOCK_API` — `true` for offline demo auth
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — cloud data sync
- `EXPO_PUBLIC_OPENWEATHER_API_KEY` / `EXPO_PUBLIC_GEMINI_API_KEY` — optional live APIs
