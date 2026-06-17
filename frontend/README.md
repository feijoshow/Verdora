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
│   ├── api/       # Auth, weather, chat, diagnosis, admin API layer
│   ├── analytics/ # Data collection (local + Supabase sync)
│   ├── supabase/  # Cloud repositories & client
│   ├── data/      # Per-user farmer data helpers
│   └── mocks/     # Mock delays & IDs for demo mode
├── types/         # Shared TypeScript types
├── constants/     # Theme, privacy copy
├── config/        # Environment config
└── data/          # Static crop knowledge & demo users
```

## Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) on your phone, updated to a version that supports **SDK 54**
- iPhone and dev machine on the same Wi‑Fi (for QR code / LAN connection)

## Commands

```bash
npm install
npm start              # Expo dev server (offline — avoids network fetch errors)
npm run start:clear    # Same, with Metro cache cleared
npm run start:online   # Expo dev server (requires network)
npm run typecheck
```

From the repo root you can run the same scripts via `npm start`, `npm run start:clear`, etc.

Use `npm start` instead of plain `npx expo start`. The default Expo CLI tries to reach Expo servers and can fail with `TypeError: fetch failed` when offline or behind a firewall.

## Run on a physical iPhone (Expo Go)

1. Install or update **Expo Go** from the App Store.
2. Start the dev server from this folder:
   ```bash
   npm start
   ```
3. Scan the QR code with the iPhone **Camera** app (or open the project from Expo Go if already connected).
4. Wait for the bundle to finish downloading — the app should load after that.

If you changed dependencies or see a stale build, restart with a clean cache:

```bash
npm run start:clear
```

Then force-close Expo Go on the phone, reopen it, and scan the QR code again.

## Environment

Copy `.env.example` to `.env` in this folder.

## Troubleshooting

### `private properties are not supported` (red screen on iPhone)

This usually means Expo Go or the Metro cache is out of date for SDK 54.

1. Update **Expo Go** on the App Store.
2. Restart the dev server with `npm run start:clear`.
3. Force-close Expo Go and reconnect to the project.

### `TypeError: fetch failed` when starting Expo

Use offline mode: `npm start` or `npm run start:clear` (both pass `--offline`).

### Fonts or icons not loading

`expo-font` is required by `@expo/vector-icons`. If you see font-related errors after a fresh clone, run:

```bash
npx expo install expo-font
```

### Check project health

```bash
npx expo-doctor
```

Fix any reported dependency or config mismatches before testing on a device.
