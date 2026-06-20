# Verdora 90-second demo script

**Audience:** stakeholders, testers, or field officers  
**Account:** `demo.farmer@verdora.test` / `VerdoraDemo1!` (after running `supabase/seed_demo.sql`)  
**Location context:** Oshakati, Oshana, Namibia — dry season (June)

---

## Before you start (30 seconds setup)

1. Confirm `EXPO_PUBLIC_DEMO_MODE=1` in `frontend/.env` (optional login shortcuts).
2. Log in as the demo farmer.
3. Have one crop photo ready in your gallery (tomato or mahango leaf) for the scanner.

---

## Script (~90 seconds)

| Time | Screen | Say / do |
|------|--------|----------|
| **0:00** | **Home** | “This is Verdora — a farming assistant built for Namibian smallholders. Maria grows mahango, tomato, and cabbage near Oshakati.” |
| **0:15** | **Home → stats card** | “The home screen pulls from her real calendar and scans — not generic advice.” |
| **0:20** | **Weather** | Open Weather. “Live forecasts for Oshakati, with dry-season tips and planting windows tied to her crops.” Pull to refresh if needed. |
| **0:35** | **Calendar** | “She plans planting and harvest dates here — mahango, tomato, cabbage are already scheduled from the demo seed.” |
| **0:45** | **Scanner** | Upload or capture a crop photo. “Gemini vision identifies the crop and suggests locally actionable treatment — neem, rotation, extension services.” |
| **1:05** | **Chat** | Tap a quick prompt, e.g. *Dry-season tips for Mahango*. “Claude knows her crops, recent scans, and season — answers stay specific to her farm.” |
| **1:20** | **Profile → Send feedback** | “Testers can email feedback directly from Profile.” |
| **1:25** | **Admin (optional)** | Log out → `demo.admin@verdora.test`. “Admins see aggregated scans, chat topics, and regional disease clusters — no individual farm sold as data.” |

---

## One-liner pitch

> Verdora connects **scan → calendar → weather → chat** with Namibia-aware AI, so farmers get advice from their own farm data — and admins see regional patterns, not personal surveillance.

---

## If something fails live

| Issue | Fallback line |
|-------|----------------|
| No API keys | “Offline mode still uses Maria’s saved crops and calendar.” |
| Weather empty | “Set location to Oshakati in Profile — we try `Town, Namibia` for OpenWeather.” |
| Scan low confidence | “Ask for a closer leaf photo in better light — same as a real farmer would.” |
| Chat busy / offline | “Falls back to guidance built from her scan and calendar history.” |

---

## After the demo

Ask testers to use **Profile → Send feedback** or your configured `EXPO_PUBLIC_FEEDBACK_EMAIL` inbox.

See also: [`supabase/DEMO_SETUP.md`](../supabase/DEMO_SETUP.md)
