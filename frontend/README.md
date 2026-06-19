# Verdora Frontend

Expo SDK 54 React Native app for farmers and admins.

## Structure

```
src/
├── components/    # UI, scanner, calendar, chat, weather, admin, privacy
├── screens/       # auth, farmer, admin screens
├── navigation/    # React Navigation stacks & tabs
├── context/       # Auth, Privacy, Diagnosis state
├── services/
│   ├── api/       # REST integrations (optional) + service layer
│   ├── analytics/ # Data collection (local + Supabase sync)
│   ├── supabase/  # Cloud repositories & client
│   └── data/      # Per-user farmer data helpers
├── types/         # Shared TypeScript types
├── constants/     # Theme, privacy copy
├── config/        # Environment config
├── data/          # Crop knowledge & planting guides (reference content)
└── utils/         # Shared helpers
```

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project with the Verdora schema applied (see `../backend/README.md`)
- [Expo Go](https://expo.dev/go) on your phone (SDK 54) for device testing

## Commands

```bash
npm install
npm start              # Expo dev server (offline — avoids network fetch errors)
npm run start:clear    # Same, with Metro cache cleared
npm run start:online   # Expo dev server (requires network)
npm run typecheck
```

From the repo root you can run the same scripts via `npm start`, `npm run start:clear`, etc.

## Deployment setup

1. Copy `.env.example` to `.env` and set your **Supabase URL and anon key** (required).
2. Optionally set `EXPO_PUBLIC_OPENWEATHER_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY`.
3. Optionally set `EXPO_PUBLIC_API_URL` if you deploy a separate REST backend.
4. Users register and sign in with real accounts via **Supabase Auth** (no demo credentials).

## Run on a physical iPhone (Expo Go)

1. Install or update **Expo Go** from the App Store.
2. Start the dev server: `npm start`
3. Scan the QR code with the iPhone **Camera** app.
4. Register a new account in the app (or sign in if you already have one).

If you see a stale build, run `npm run start:clear` and reconnect.

## Troubleshooting

### `private properties are not supported` (red screen on iPhone)

Update Expo Go on the App Store, then run `npm run start:clear` and reconnect.

### `TypeError: fetch failed` when starting Expo

Use `npm start` (offline mode).

### Authentication errors

Ensure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in `.env` and that Supabase Auth (email/password) is enabled in your project dashboard.

### Check project health

```bash
npx expo-doctor
```
