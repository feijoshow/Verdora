# Pre-test checklist — Verdora tester round (June 2026)

Use this document before handing a build to testers. All refinement phases (1–5) should be merged into **`testing`** first.

**Tester build branch:** `testing`  
**Tag when ready:** `v1.0.0-test1` (see [VERDORA_GIT_SETUP.md](./VERDORA_GIT_SETUP.md))

---

## 1. Environment & secrets

- [ ] Node.js 20+ installed
- [ ] `cd frontend && npm install` completes without errors
- [ ] `frontend/.env` exists (copy from `.env.example`) — **never commit**
- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] Supabase schema applied (`supabase/schema.sql` or migrations 001–003)
- [ ] Supabase **Email** auth enabled; **Confirm email** disabled for instant signup (recommended for test round)
- [ ] Optional keys set for full AI/weather demo:
  - [ ] `EXPO_PUBLIC_AI_API_URL=http://localhost:3001` + `ZAI_API_KEY` in `api/.env` — Scanner (recommended)
  - [ ] `EXPO_PUBLIC_ZAI_API_KEY` — Scanner (direct, if not using local API)
  - [ ] `EXPO_PUBLIC_GROK_API_KEY` or `XAI_API_KEY` in `api/.env` — Chat
  - [ ] `EXPO_PUBLIC_OPENWEATHER_API_KEY` — Weather
  - [ ] `EXPO_PUBLIC_GEMINI_API_KEY` — Legacy scanner (optional; quota exhausted)
- [ ] Demo build flags (optional):
  - [ ] `EXPO_PUBLIC_DEMO_MODE=1`
  - [ ] `EXPO_PUBLIC_FEEDBACK_EMAIL=your-team@example.com`
- [ ] Run secrets check: `npm run verify` (no `.env` tracked in git)

---

## 2. Automated verification

From repo root:

```bash
npm run verify
```

Expected: TypeScript passes; no `.env` files in git index.

---

## 3. Demo accounts (recommended)

Follow [`supabase/DEMO_SETUP.md`](../supabase/DEMO_SETUP.md):

- [ ] Register `demo.farmer@verdora.test` / `VerdoraDemo1!`
- [ ] Register `demo.admin@verdora.test` / `VerdoraAdmin1!`
- [ ] Run `supabase/seed_demo.sql` in Supabase SQL Editor
- [ ] Login shortcuts appear when `EXPO_PUBLIC_DEMO_MODE=1`

Walkthrough: [`docs/DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)

---

## 4. Phase 1 — Stability (device smoke test)

| # | Flow | Pass? | Notes |
|---|------|-------|-------|
| 1 | Cold start after kill app — valid session restores | ☐ | |
| 2 | Cold start with expired/revoked session — returns to login | ☐ | |
| 3 | Home → **Crop Library** → crop detail → back | ☐ | |
| 4 | Uncaught render error shows ErrorBoundary, not white screen | ☐ | Force optional |
| 5 | Chat/scan/weather with API keys missing — shows notice, no crash | ☐ | |
| 6 | Chat/scan/weather with airplane mode — fallback message visible | ☐ | |

---

## 5. Phase 2 — AI quality

| # | Flow | Pass? | Notes |
|---|------|-------|-------|
| 1 | Chat quick prompts reflect crops / season (dry season in June) | ☐ | |
| 2 | Chat answer mentions registered crops or location | ☐ | |
| 3 | Scanner: non-crop or blurry photo → low confidence / retry message (not a calendar crop guess) | ☐ | |
| 4 | Scanner: crop name aligns with library (e.g. Mahango, Tomato) via Z.ai GLM-4.6V-Flash | ☐ | |
| 5 | Weather for Oshakati / Windhoek resolves (not wrong country) | ☐ | |
| 6 | Weather planting cards reference season, not generic humidity only | ☐ | |

---

## 6. Phase 3 — UI consistency

| # | Flow | Pass? | Notes |
|---|------|-------|-------|
| 1 | Loading states look consistent (no random spinners mid-screen) | ☐ | |
| 2 | Empty calendar / library / scan history use same card style | ☐ | |
| 3 | Repeat app open — splash shorter than first launch | ☐ | |
| 4 | Chat loading uses full-screen loader with header | ☐ | |

---

## 7. Phase 4 — Demo hardening

| # | Flow | Pass? | Notes |
|---|------|-------|-------|
| 1 | Profile → **Send feedback** opens email app | ☐ | |
| 2 | Demo login chips fill credentials (demo mode on) | ☐ | |
| 3 | Seeded farmer shows crops, scans, chat in app + admin dashboard | ☐ | |
| 4 | Admin dashboard tabs show empty states (not blank) when no data | ☐ | |

---

## 8. Admin verification

- [ ] Promote test admin: `supabase/seed_admin.sql` or `update users set role = 'admin'`
- [ ] Admin sees **Data Intelligence** dashboard
- [ ] User list → tap farmer → activity history loads
- [ ] Export PDF/JSON completes (platform-dependent share sheet)

---

## 9. Platform matrix

| Platform | Tested | Tester name | Date |
|----------|--------|-------------|------|
| iOS Expo Go | ☐ | | |
| Android Expo Go | ☐ | | |
| Web (smoke) | ☐ | | |

---

## 10. Handoff to testers

- [ ] Share `testing` branch name or tag `v1.0.0-test1`
- [ ] Share Supabase project URL (test environment only)
- [ ] Share demo credentials or ask testers to self-register
- [ ] Point to **Profile → Send feedback** for bug reports
- [ ] Capture out-of-scope ideas in [`POST_TEST_IDEAS.md`](./POST_TEST_IDEAS.md) — do not build during test round

---

## 11. Tag the build

When all critical items pass:

```bash
git checkout testing
git pull origin testing
git tag -a v1.0.0-test1 -m "First tester round: June 2026 (phases 1–5)"
git push origin v1.0.0-test1
```

---

## Quick reference

| Doc | Purpose |
|-----|---------|
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | 90-second stakeholder demo |
| [DEMO_SETUP.md](../supabase/DEMO_SETUP.md) | Demo accounts + seed SQL |
| [VERDORA_APP.md](./VERDORA_APP.md) | Full app architecture |
| [VERDORA_GIT_SETUP.md](./VERDORA_GIT_SETUP.md) | Branch & tag workflow |
| [POST_TEST_IDEAS.md](./POST_TEST_IDEAS.md) | Backlog after feedback |
