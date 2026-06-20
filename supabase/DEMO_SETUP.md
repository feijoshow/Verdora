# Demo setup for testers

Use this flow before a live demo or tester session. Pair with [`docs/DEMO_SCRIPT.md`](../docs/DEMO_SCRIPT.md) for a 90-second walkthrough.

## 1. Enable demo mode in the app

In `frontend/.env`:

```env
EXPO_PUBLIC_DEMO_MODE=1
EXPO_PUBLIC_FEEDBACK_EMAIL=your-team@example.com
```

Restart Expo after changing `.env`.

## 2. Create demo accounts

Register **both** accounts in the app (or via Supabase **Authentication → Users**):

| Role | Email | Password |
|------|-------|----------|
| Farmer | `demo.farmer@verdora.test` | `VerdoraDemo1!` |
| Admin | `demo.admin@verdora.test` | `VerdoraAdmin1!` |

Tips:

- Accept **data collection** on farmer registration (required for analytics).
- Use location **`Oshakati, Oshana, Namibia`** if registering manually.
- Disable **Confirm email** in Supabase Auth settings for instant login during demos.

## 3. Seed sample farm data

1. Open Supabase **SQL Editor**.
2. Paste and run [`seed_demo.sql`](seed_demo.sql).

This sets up:

- Farmer profile (Maria Shikongo, Oshakati)
- Two fields, three calendar crops (Mahango, Tomato, Cabbage)
- Four scan records (tomato blight cluster + healthy mahango)
- Weather and chat history for the admin dashboard

Safe to re-run — it replaces rows with `demo_` IDs for the demo farmer.

## 4. Promote admin (if needed)

If the admin account still shows the farmer UI:

```sql
update public.users set role = 'admin' where email = 'demo.admin@verdora.test';
```

Log out and back in as admin.

## 5. Optional API keys

For the full demo experience, set in `frontend/.env`:

- `EXPO_PUBLIC_CLAUDE_API_KEY` — Chat assistant
- `EXPO_PUBLIC_GEMINI_API_KEY` — Crop scanner
- `EXPO_PUBLIC_OPENWEATHER_API_KEY` — Live weather for Oshakati

Without keys, the app falls back to offline guidance (still demo-able).

## 6. Login shortcuts

With `EXPO_PUBLIC_DEMO_MODE=1`, the login screen shows **Demo accounts** chips that fill email and password — tap **Sign In** after selecting one.

## 7. Tester feedback

Farmers can tap **Send feedback** on the Profile screen (mailto link). Set `EXPO_PUBLIC_FEEDBACK_EMAIL` to your team inbox.
