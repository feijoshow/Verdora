# Verdora — Complete Application Reference

> **Version:** 1.0.0 · **Platform:** Expo SDK 54 (React Native) · **Last updated:** June 2026  
> This document describes every major part of Verdora — from product vision down to storage keys, API routes, and UI components.

---

## Table of contents

1. [What Verdora is](#1-what-verdora-is)
2. [Technology stack](#2-technology-stack)
3. [Repository layout](#3-repository-layout)
4. [High-level architecture](#4-high-level-architecture)
5. [User roles and access](#5-user-roles-and-access)
6. [App bootstrap and provider tree](#6-app-bootstrap-and-provider-tree)
7. [Navigation map](#7-navigation-map)
8. [Screens — complete reference](#8-screens--complete-reference)
9. [User journeys (step-by-step)](#9-user-journeys-step-by-step)
10. [React context and global state](#10-react-context-and-global-state)
11. [UI components catalog](#11-ui-components-catalog)
12. [Services layer](#12-services-layer)
13. [External APIs and AI providers](#13-external-apis-and-ai-providers)
14. [Data model (TypeScript + Supabase)](#14-data-model-typescript--supabase)
15. [Local storage (AsyncStorage)](#15-local-storage-asyncstorage)
16. [Privacy, consent, and analytics](#16-privacy-consent-and-analytics)
17. [Regional intelligence platform](#17-regional-intelligence-platform)
18. [Admin dashboard and exports](#18-admin-dashboard-and-exports)
19. [Crop knowledge and reference data](#19-crop-knowledge-and-reference-data)
20. [Design system (theme)](#20-design-system-theme)
21. [Environment variables](#21-environment-variables)
22. [Supabase database](#22-supabase-database)
23. [Edge functions and nightly jobs](#23-edge-functions-and-nightly-jobs)
24. [Fallback and offline behavior](#24-fallback-and-offline-behavior)
25. [Permissions (camera, photos)](#25-permissions-camera-photos)
26. [Known gaps and orphan code](#26-known-gaps-and-orphan-code)
27. [Setup checklist](#27-setup-checklist)
28. [File index](#28-file-index)

---

## 1. What Verdora is

**Verdora** is a mobile agricultural intelligence platform for **farmers** and **admins** (NGOs, extension services, platform operators). It helps small-scale and commercial farmers manage daily farm work while collecting structured, consent-governed data for regional insights.

### Core value for farmers

| Capability | What it does |
|------------|--------------|
| **Crop scanner** | Photograph a plant; AI identifies crop type, disease, confidence, and treatment advice |
| **Plantation calendar** | Plan and track planting/harvest dates per crop and per field plot |
| **Weather** | Live conditions + per-crop planting recommendations for the farmer’s location |
| **AI chat assistant** | Farming Q&A personalized to the farmer’s crops, location, and scan history |
| **Multi-plot fields** | Tag scans, weather, and calendar events to named farm plots (up to 5) |
| **Outbreak alerts** | Privacy-safe banner when regional disease clusters are detected near the farm |
| **Profile & privacy** | Farm details, consent controls, cloud sync status |

### Core value for admins

| Capability | What it does |
|------------|--------------|
| **Dashboard** | Aggregated stats: farmers, scans, calendar records, chat, weather logs |
| **Regional intelligence** | Disease clusters, knowledge gaps from chat, planting window insights |
| **User drill-down** | Full activity profile per farmer (with consent status) |
| **Export** | Full platform or per-farmer reports as **JSON** or **PDF** |

### Design principles

- **Real farm data first** — advice and analytics use the farmer’s registered crops, calendar, and scans; not generic demo data.
- **Consent-gated collection** — analytics only when the farmer opts in at signup (required to register) and can opt out in Profile.
- **Offline resilience** — local AsyncStorage mirrors cloud data; app works without API keys (with reduced AI/weather quality).
- **Dual backend** — Supabase (primary) or optional custom REST API; external AI/weather keys optional.

---

## 2. Technology stack

| Layer | Technology |
|-------|------------|
| Mobile app | Expo ~54, React Native 0.81, React 19 |
| Language | TypeScript 5.9 |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| HTTP | Axios |
| Local persistence | `@react-native-async-storage/async-storage` |
| Cloud backend | Supabase (PostgreSQL + Auth + PostGIS + RLS) |
| Camera / media | `expo-camera`, `expo-image-picker`, `expo-file-system` |
| PDF export | `expo-print`, `expo-sharing` |
| Icons | `@expo/vector-icons` (Ionicons) |

### External services (optional keys)

| Service | Used for |
|---------|----------|
| **Anthropic Claude** | Chat assistant |
| **Google Gemini 2.0 Flash** | Crop scan vision analysis |
| **OpenWeather** | Live weather forecasts |

---

## 3. Repository layout

```
Verdora/
├── frontend/                 # Expo React Native app (main product)
│   ├── App.tsx               # Root: providers + bootstrap
│   ├── app.json              # Expo config, permissions, splash
│   ├── app.config.ts         # Env injection for Expo
│   ├── .env.example          # Environment template
│   └── src/
│       ├── screens/          # auth, farmer, admin screens
│       ├── navigation/       # Navigators and route types
│       ├── components/       # UI by feature area
│       ├── context/          # Auth, Privacy, Diagnosis
│       ├── services/         # API, Supabase, analytics, intelligence, export
│       ├── types/            # TypeScript domain types
│       ├── data/             # Bundled crop knowledge & guides
│       ├── constants/        # Theme, privacy copy, limits
│       ├── config/           # env.ts
│       └── utils/            # Helpers (IDs, image base64, formatting)
├── supabase/                 # SQL schema, migrations, Edge Functions
│   ├── schema.sql            # All-in-one DB install
│   ├── migrations/           # 001 → 002 → 003 modular install
│   ├── fix_permissions.sql   # RLS repair script
│   └── functions/            # nightly-aggregation
├── backend/                  # Data architecture docs only
│   └── docs/DATA_ARCHITECTURE.md
├── docs/
│   └── VERDORA_APP.md        # ← this file
├── README.md
└── package.json              # Workspace root (delegates to frontend/)
```

---

## 4. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Verdora Mobile App (Expo)                    │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│   Screens    │  Context     │  Services    │  AsyncStorage      │
│   (UI)       │  (Auth,      │  (api/,      │  (offline cache,   │
│              │   Privacy,   │   supabase/, │   chat history,    │
│              │   Diagnosis) │   analytics) │   calendar, etc.)  │
└──────┬───────┴──────┬───────┴──────┬───────┴─────────┬──────────┘
       │              │              │                 │
       ▼              ▼              ▼                 ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────────┐
│ Claude API   │ │ Gemini   │ │ OpenWeather │ │ Supabase         │
│ (chat)       │ │ (scans)  │ │ (weather)   │ │ Auth + Postgres  │
└──────────────┘ └──────────┘ └─────────────┘ │ + PostGIS + RLS  │
                                               └────────┬─────────┘
                                                        │
                                               ┌────────▼─────────┐
                                               │ Edge Function:   │
                                               │ nightly-         │
                                               │ aggregation      │
                                               └──────────────────┘
```

### Service resolution order (typical)

Most features try providers in this order:

1. **Direct external API** (if env key set) — Claude, Gemini, OpenWeather  
2. **Custom REST API** (if `EXPO_PUBLIC_API_URL` set)  
3. **Supabase** repositories (auth, scans, crops, weather logs, chat logs)  
4. **Local fallback** — bundled crop knowledge, data-driven chat replies, cached weather logs  

---

## 5. User roles and access

| Role | How assigned | App experience |
|------|--------------|----------------|
| `farmer` | Default on registration | 6-tab farmer app (Hub, Scan, Calendar, Weather, Chat, Profile) |
| `admin` | Manual SQL: `UPDATE users SET role = 'admin'` | Admin stack: Dashboard + User Detail |

- Role is checked in `RootNavigator` — there is **no in-app role switch**.
- Admins are **never** included in analytics collection (`canCollectForUser` returns false for admins).
- Farmers only see **their own** cloud rows (RLS); admins can read all farmer tables.

---

## 6. App bootstrap and provider tree

**Entry:** `frontend/index.ts` → `frontend/App.tsx`

```
SafeAreaProvider
└── AuthProvider
    └── PrivacyProvider
        └── DiagnosisProvider
            └── AppBootstrap
                ├── AppSplash (min 3.5s animated logo)
                └── RootNavigator (when splash done + auth loaded)
```

| Component | File | Behavior |
|-----------|------|----------|
| `AppBootstrap` | `components/branding/AppBootstrap.tsx` | Waits for splash animation **and** `AuthContext.isLoading === false` |
| `AppSplash` | `components/branding/AppSplash.tsx` | Branded splash; fade-out transition |
| `RootNavigator` | `navigation/RootNavigator.tsx` | Routes to Auth / FarmerApp / AdminApp |

On launch, `AuthContext` restores the user from AsyncStorage key `@verdora_auth_user` (does not validate token expiry on cold start — user appears logged in until explicit logout or failed API call).

---

## 7. Navigation map

### Root stack (`RootNavigator`)

```
[Not authenticated]  →  AuthNavigator
[role === admin]     →  AdminNavigator
[else]               →  FarmerNavigator
```

### Auth stack

| Screen | Route | Params |
|--------|-------|--------|
| Login | `Login` | — |
| Register | `Register` | — |

### Farmer stack

| Screen | Route | Params |
|--------|-------|--------|
| Tab navigator | `FarmerTabs` | — |
| Diagnosis results | `DiagnosisResults` | `{ result: DiagnosisResult }` |

### Farmer bottom tabs (`FarmerTabNavigator`)

| Tab label | Route | Icon | Screen |
|-----------|-------|------|--------|
| Hub | `Home` | home | `HomeScreen` |
| Scan | `Scanner` | camera | `CropScannerScreen` |
| Calendar | `Calendar` | calendar | `PlantationCalendarScreen` |
| Weather | `Weather` | partly-sunny | `WeatherScreen` |
| Chat | `Chat` | chatbubbles | `ChatScreen` |
| Profile | `Profile` | person | `ProfileScreen` |

### Admin stack

| Screen | Route | Params |
|--------|-------|--------|
| Dashboard | `Dashboard` | — |
| User detail | `UserDetail` | `{ userId: string }` |

### Admin in-screen tabs (`AdminTabBar` — not React Navigation)

`overview` · `intelligence` · `users` · `farming` · `scans` · `environment` · `chat`

---

## 8. Screens — complete reference

### 8.1 Authentication

#### Login (`screens/auth/LoginScreen.tsx`)

- Email + password form
- Calls `AuthContext.login()` → Supabase `signInWithPassword` or REST `/api/v1/auth/login`
- Link to Register screen
- On success, navigation is automatic via `RootNavigator` (no manual `navigate`)

#### Register (`screens/auth/RegisterScreen.tsx`)

| Field | Required | Notes |
|-------|----------|-------|
| Name | No | Defaults to "Farmer" |
| Email | Yes | |
| Password | Yes | Min 6 characters (Supabase) |
| Location | Yes | Region/province level |
| Farm size | No | Free text |
| Farmer type | No | `small-scale` or `commercial` |
| Data consent | **Yes** | Checkbox via `ConsentNotice`; registration blocked without it |

Creates `role: 'farmer'`, upserts profile to Supabase, tracks profile, persists to AsyncStorage.

---

### 8.2 Farmer — Hub (`HomeScreen.tsx`)

- Greeting with farmer name + location subtitle
- Link to Profile for editing
- **`OutbreakNearYouBanner`** — nearby disease alerts (aggregated, no individual farm IDs)
- Farm summary: crops from calendar, recent scan teaser
- **`NavCard`** shortcuts → Scanner, Calendar, Weather, Chat
- Tap latest scan → navigates to `DiagnosisResults` on parent stack

---

### 8.3 Farmer — Crop Scanner (`CropScannerScreen.tsx`)

| Feature | Detail |
|---------|--------|
| Field tagging | `FieldPicker` — optional plot before scan |
| Capture | `expo-camera` on native; **gallery only on web** |
| Permissions | Camera permission with gallery fallback |
| Diagnosis | `diagnoseCropImage()` — Gemini Vision → REST → local crop knowledge |
| Persistence | `DiagnosisContext.addDiagnosis()` + analytics `trackCropScan` |
| Navigation | Push `DiagnosisResults` with result |
| History | `DiagnosisHistoryList` from context on same screen |

---

### 8.4 Farmer — Diagnosis Results (`DiagnosisResultsScreen.tsx`)

- Stack screen (not a tab); param: `result: DiagnosisResult`
- Shows: image, healthy/disease badge, crop name, field, condition, `ConfidenceBar`, treatment, timestamp
- "Scan another crop" → `goBack()`

---

### 8.5 Farmer — Plantation Calendar (`PlantationCalendarScreen.tsx`)

| Feature | Detail |
|---------|--------|
| Planner | `CropPlantingPlanner` — search 18 crops from planting guide, set plant date & field |
| List | `PlantingEventCard` rows with pull-to-refresh |
| Edit | Tap event → `EventFormModal` |
| Delete | Confirmation dialog |
| Storage | `plantationCalendarService` → Supabase `crops` → AsyncStorage fallback |
| Analytics | `trackFarmingRecord` / `trackCropDeleted` when consented |

---

### 8.6 Farmer — Weather (`WeatherScreen.tsx`)

| Feature | Detail |
|---------|--------|
| Location | User profile city **or** field coordinates via `FieldPicker` ("Whole farm" option) |
| Data source | OpenWeather API → REST → last cached environment log → empty state |
| Display | Temperature, condition, humidity, location label, farming tip |
| Recommendations | `PlantingRecommendationCard` per registered crop (`ideal` / `caution` / `avoid`) |
| Analytics | `trackEnvironment()` on successful fetch (consent-gated) |

---

### 8.7 Farmer — Chat (`ChatScreen.tsx`)

| Feature | Detail |
|---------|--------|
| Layout | Custom `SafeAreaView` (not `ScreenWrapper`) |
| History | Loaded/saved per user: `@verdora_chat_{userId}` |
| Welcome | Personalized with farmer’s crops |
| Quick prompts | Chips before first user message |
| AI | `sendChatMessage()` — **Claude** → REST → local data-driven reply |
| Context | Last 10 messages sent to Claude |
| Analytics | `trackChatQuestion()` (consent-gated) |

---

### 8.8 Farmer — Profile (`ProfileScreen.tsx`)

| Section | Fields / actions |
|---------|------------------|
| Personal | Name (editable), email (read-only) |
| Location | Region/province + village/town → feeds weather, chat, intelligence |
| Fields | `FieldsManager` — up to **5** named plots, optional lat/lng |
| Farm details | Size, farmer type, soil type, farming methods |
| Privacy | `PrivacySettingsCard` — consent toggle, cloud sync indicator |
| Actions | Save → `updateProfile()`; Logout |

Only renders full editor for `user.role === 'farmer'`.

---

### 8.9 Farmer — orphan screens (not in navigator)

These files exist but are **unreachable** in the current navigation tree:

| Screen | File | Intended behavior |
|--------|------|-------------------|
| Crop Library | `CropLibraryScreen.tsx` | Searchable crop list from `cropLibraryService` |
| Crop Detail | `CropDetailScreen.tsx` | Crop info, `SmartPlantingCalendar`, add to calendar |

`CropLibraryScreen` navigates to `'CropDetail'` which is **not registered** in any navigator.

---

### 8.10 Admin — Dashboard (`AdminDashboardScreen.tsx`)

Single scrollable screen with horizontal **`AdminTabBar`** switching panels:

| Tab | Content |
|-----|---------|
| **Overview** | Total farmers, scans, records, chat; intelligence explainer; signal cards |
| **Intelligence** | `DiseaseAlertCard`, `KnowledgeGapCard`, `PlantingInsightCard` |
| **Users** | Segmentation by farmer type & location; tappable list → User Detail |
| **Farming** | All farming records across users |
| **Scans** | Disease outbreak summary + recent scans |
| **Environment** | Avg temp/humidity, condition frequency, recent logs |
| **Chat** | Topic insights from farmer questions |

- Pull-to-refresh
- Header logout
- Export all data: PDF/JSON via `exportUserReport()`
- Data source indicator: Supabase cloud vs local-only mode

---

### 8.11 Admin — User Detail (`AdminUserDetailScreen.tsx`)

- Param: `{ userId: string }`
- Consent status banner
- Stat pills: scans, calendar events, chat questions, weather logs
- Per-farmer PDF/JSON export
- Sections: profile, crop scans (with images), plantation calendar, weather logs, chat Q&A
- Data: `getUserActivityProfile()` — merges local + cloud

---

## 9. User journeys (step-by-step)

### 9.1 First-time registration

```
Open app → Splash (3.5s+) → Login screen
  → "Create Account" → Register
  → Fill email, password, location, accept consent
  → Supabase signUp + users row upsert
  → AsyncStorage: auth user + consent key
  → RootNavigator → FarmerTabs → Home
```

### 9.2 Crop scan flow

```
Scanner tab → (optional) pick field
  → Take photo OR choose from gallery
  → Gemini analyzes image (JSON: crop, disease, confidence, treatment)
  → trackCropScan (if consented) → Supabase scans + local analytics
  → DiagnosisContext refreshes history
  → Navigate to DiagnosisResults
  → Return to Scanner; history visible below
```

### 9.3 Chat conversation

```
Chat tab → load history from AsyncStorage
  → User types or taps quick prompt
  → Claude receives system prompt (location, crops, soil, farm type)
  → Reply displayed in ChatBubble
  → History saved; question logged to analytics (if consented)
```

### 9.4 Weather check

```
Weather tab → select field or whole farm
  → OpenWeather by city name or field lat/lng
  → Display conditions + per-crop planting cards
  → Environment logged (if consented)
```

### 9.5 Admin review

```
Login as admin → Dashboard
  → Browse tabs (Overview, Intelligence, Users, …)
  → Tap farmer → UserDetail
  → Export PDF/JSON for one farmer or entire platform
```

---

## 10. React context and global state

### AuthContext (`context/AuthContext.tsx`)

| Export | Type | Description |
|--------|------|-------------|
| `user` | `User \| null` | Current profile |
| `isLoading` | `boolean` | Restoring from AsyncStorage |
| `isAuthenticated` | `boolean` | `!!user` |
| `login` | `(email, password) => Promise<{success, error?}>` | |
| `register` | `(profile) => Promise<{success, error?}>` | Requires consent |
| `updateProfile` | `(Partial<User>) => Promise<void>` | Syncs analytics + storage |
| `logout` | `() => Promise<void>` | Clears tokens + storage |

**Storage:** `@verdora_auth_user`

### PrivacyContext (`context/PrivacyContext.tsx`)

| Export | Description |
|--------|-------------|
| `hasConsent` | Per-user analytics consent |
| `canCollectData` | `hasConsent && role === 'farmer'` |
| `isCloudSyncEnabled` | Supabase configured |
| `setConsent` | Updates AsyncStorage, profile, Supabase `users.data_consent` |

**Storage:** `@verdora_data_consent_{userId}`

### DiagnosisContext (`context/DiagnosisContext.tsx`)

| Export | Description |
|--------|-------------|
| `history` | `DiagnosisResult[]` for current user |
| `refreshHistory` | Fetches from Supabase scans → local analytics |
| `addDiagnosis` | Tracks scan + refreshes history |
| `clearHistory` | Clears in-memory only (cloud retains data) |

Most other screen state (calendar list, weather, admin tabs) is **local `useState`**, not global context.

---

## 11. UI components catalog

### Design system (`components/ui/`)

| Component | Variants / props | Purpose |
|-----------|------------------|---------|
| `Button` | `primary`, `secondary`, `outline`, `ghost`; loading | Actions |
| `Input` | label, error | Form fields |
| `Card` | `default`, `elevated`, `highlight` | Content containers |
| `ScreenWrapper` | scroll, refresh, keyboard avoid | Standard screen shell |

### By feature area

| Folder | Components |
|--------|------------|
| `branding/` | `AppBootstrap`, `AppSplash` |
| `navigation/` | `ScreenHeader`, `NavCard` |
| `admin/` | `AdminTabBar` |
| `calendar/` | `CropPlantingPlanner`, `EventFormModal`, `PlantingEventCard`, `SmartPlantingCalendar` |
| `fields/` | `FieldPicker`, `FieldsManager` |
| `scanner/` | `DiagnosisHistoryList`, `ConfidenceBar` |
| `weather/` | `PlantingRecommendationCard` |
| `intelligence/` | `DiseaseAlertCard`, `KnowledgeGapCard`, `PlantingInsightCard`, `OutbreakNearYouBanner` |
| `privacy/` | `ConsentNotice`, `PrivacySettingsCard` |
| `farmer/` | `FarmProfileCard` |
| `chat/` | `ChatBubble` |

---

## 12. Services layer

### API services (`services/api/`)

| Service file | Main exports | Backend priority |
|--------------|--------------|------------------|
| `authService.ts` | login, register, logout, getCurrentUser | REST or Supabase Auth |
| `chatService.ts` | sendChatMessage, load/saveChatHistory | Claude → REST → local |
| `cropDiagnosisService.ts` | diagnoseCropImage, fetchDiagnosisHistory | Gemini → REST → local knowledge |
| `weatherService.ts` | getWeather, getPlantingRecommendations | OpenWeather → REST → cache |
| `plantationCalendarService.ts` | CRUD planting events | REST → Supabase crops → AsyncStorage |
| `adminService.ts` | getAdminDashboard, exports | REST → local analytics |
| `cropLibraryService.ts` | Crop library from JSON + override | Local only |

### Supabase (`services/supabase/`)

| Module | Tables / RPC |
|--------|--------------|
| `client.ts` | Singleton client, `isSupabaseConfigured()` |
| `repositories/usersRepository.ts` | `users` |
| `repositories/fieldsRepository.ts` | `fields` |
| `repositories/cropsRepository.ts` | `crops` |
| `repositories/scansRepository.ts` | `scans` |
| `repositories/weatherRepository.ts` | `weather_logs` |
| `repositories/chatRepository.ts` | `chat_logs` |
| `analyticsRepository.ts` | Builds full admin dashboard from cloud |
| `intelligenceRepository.ts` | `disease_alerts_near` RPC, regional intel fetch |

### Analytics (`services/analytics/dataCollectionService.ts`)

Consent-gated trackers:

| Function | Trigger | Cloud table |
|----------|---------|-------------|
| `trackUserProfile` | Login, register, profile save | `users` |
| `trackCropScan` | After diagnosis | `scans` |
| `trackFarmingRecord` | Calendar add/edit | `crops` |
| `trackCropDeleted` | Calendar delete | `crops` |
| `trackEnvironment` | Weather refresh | `weather_logs` |
| `trackChatQuestion` | Chat send | `chat_logs` |
| `getAdminDashboardInsights` | Admin dashboard | Reads local `@verdora_analytics_db` |

### Intelligence (`services/intelligence/`)

| File | Role |
|------|------|
| `aggregationEngine.ts` | Client-side disease clustering, knowledge gaps, planting insights |
| `topicExtraction.ts` | Keyword-based chat topic classification |
| `geospatial.ts` | Haversine distance, region extraction, coordinates |
| `intelligenceService.ts` | Cloud-first orchestration for farmer + admin |

### Export (`services/export/`)

| File | Output |
|------|--------|
| `analyticsExportService.ts` | Full platform JSON/PDF |
| `userExportService.ts` | Single-farmer JSON/PDF |
| `pdfReportBuilder.ts` | HTML templates |
| `pdfReport.ts` | `expo-print` generation |
| `downloadReport.ts` | Share sheet / web download |

### Other

| File | Role |
|------|------|
| `fields/fieldService.ts` | Local + cloud field CRUD (max 5 plots) |
| `data/farmerDataService.ts` | Farmer summary for Home/Chat |
| `admin/userActivityService.ts` | Per-user activity merge for admin detail |
| `calendar/plantingGuideService.ts` | Harvest date calc from guide |

---

## 13. External APIs and AI providers

### Claude — chat assistant

| Setting | Value |
|---------|-------|
| Env | `EXPO_PUBLIC_CLAUDE_API_KEY` |
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Model | `claude-sonnet-4-20250514` |
| File | `services/api/chatService.ts` |

System prompt includes: location, crops, farm type, soil. Sends last N messages as conversation history.

### Gemini — crop scan analysis

| Setting | Value |
|---------|-------|
| Env | `EXPO_PUBLIC_GEMINI_API_KEY` |
| Endpoint | `gemini-2.0-flash:generateContent` (vision) |
| File | `services/api/cropDiagnosisService.ts` |

Image sent as base64 inline data. Model returns JSON: `cropName`, `disease`, `confidence`, `treatment`. Parsed with regex JSON extraction fallback.

### OpenWeather — weather

| Setting | Value |
|---------|-------|
| Env | `EXPO_PUBLIC_OPENWEATHER_API_KEY` |
| Endpoint | `https://api.openweathermap.org/data/2.5/weather` |
| File | `services/api/weatherService.ts` |

Query by city name (`q`) or coordinates (`lat`/`lon`). Units: metric.

### Optional REST API

When `EXPO_PUBLIC_API_URL` is set, all `/api/v1/*` routes are available (see `services/api/endpoints.ts`). Useful for a custom backend that proxies AI keys server-side.

---

## 14. Data model (TypeScript + Supabase)

### Core app types (`types/`)

| Type | Key fields |
|------|------------|
| `User` | id, email, name, role, location, region, village, lat/lng, crops, farmSize, farmerType, soilType, farmingMethods, dataConsent |
| `FarmField` | id, userId, name, latitude?, longitude?, sortOrder |
| `DiagnosisResult` | id, cropName, disease?, confidence, treatment, imageUri?, scannedAt, fieldId?, fieldName? |
| `PlantingEvent` | id, cropName, plantDate, harvestDate?, notes?, fieldId?, fieldName? |
| `WeatherData` | location, temperature, humidity, condition, icon, recommendation? |
| `ChatMessage` | id, role, content, timestamp |

### Supabase tables (`types/database.ts` mirrors)

| Table | Purpose | Owner column |
|-------|---------|--------------|
| `users` | Profiles linked to `auth.users` | `id` = auth UUID |
| `fields` | Named farm plots | `user_id` |
| `crops` | Planting / harvest records | `user_id` |
| `scans` | Diagnosis events | `user_id` |
| `weather_logs` | Weather snapshots | `user_id` |
| `chat_logs` | Chat questions (+ optional AI response) | `user_id` |
| `disease_alerts` | Regional outbreak clusters (PostGIS) | — (public read) |
| `knowledge_gap_reports` | Chat topic × region | — |
| `planting_insights` | Planting window analytics | — |
| `aggregation_runs` | Nightly job audit | — |

---

## 15. Local storage (AsyncStorage)

| Key pattern | Contents |
|-------------|----------|
| `@verdora_auth_user` | Serialized `User` (session persistence) |
| `@verdora_access_token` / `@verdora_refresh_token` | Auth tokens |
| `@verdora_analytics_db` | Local analytics: users, cropScans, farmingRecords, environmentLogs, chatQuestions |
| `@verdora_data_consent_{userId}` | `'true'` / `'false'` |
| `@verdora_chat_{userId}` | Full chat message array |
| `@verdora_calendar_{userId}` | Planting events (offline fallback) |
| `@verdora_fields_{userId}` | Farm field plots |
| `@verdora_last_field_{userId}` | Last selected field in picker |
| `@verdora_crop_library_v1` | Optional crop library override |

**Caps:** environment logs capped at ~200 entries; chat questions at ~500 in local analytics DB.

---

## 16. Privacy, consent, and analytics

### Consent copy (`constants/privacy.ts`)

- **Notice:** "This app collects farming and usage data to improve services and generate agricultural insights."
- **Details:** what's collected, no sale of data, opt-out anytime, regional trends are anonymized.

### Rules

1. Registration **requires** consent checkbox — cannot create account without it.
2. `PrivacyContext.setConsent(false)` stops new analytics writes; existing cloud data remains.
3. Admin exports label **"Consented farmer data only"** in PDF footer.
4. Outbreak banners show **aggregated regional data** — no individual farm identification in farmer UI.
5. Admins never tracked as farmers.

### Consent check (`canCollectForUser`)

```
admin → false
dataConsent === false → false
AsyncStorage consent === 'false' → false
dataConsent === true OR stored 'true' → true
```

---

## 17. Regional intelligence platform

### Client-side aggregation rules (`aggregationEngine.ts`)

| Insight | Rule | Severity / priority |
|---------|------|---------------------|
| **Disease alerts** | ≥3 disease scans within **50 km**, **30-day** lookback | low → critical by scan count |
| **Knowledge gaps** | ≥2 chat questions per topic × region | priority by question count |
| **Planting insights** | Calendar plant dates + weather vs `plantationDataset.json` optimal months | recommendation text |

### Cloud pre-computation

- Edge Function `nightly-aggregation` (cron `0 2 * * *`)
- Uses **service role** (bypasses RLS)
- Writes to `disease_alerts`, `knowledge_gap_reports`, `planting_insights`
- PostGIS RPC: `disease_alerts_near(lat, lng, max_km)`

### Surfaces

| Audience | Component / screen | Data source |
|----------|-------------------|-------------|
| Farmer | `OutbreakNearYouBanner` on Home | RPC → client geospatial fallback |
| Admin | Intelligence tab | Cloud + client aggregation |

---

## 18. Admin dashboard and exports

### Dashboard metrics (`AdminDashboardInsights`)

- Summary: total users, farmers, scans, farming records, chat questions, environment logs
- Segments: by farmer type, by location
- Lists: users, farming data, crop scans, disease outbreaks, environment logs, chat insights
- `regionalIntelligence`: alerts, gaps, planting insights

### Export formats

| Export | Formats | Filename |
|--------|---------|----------|
| Full platform | JSON, PDF | `verdora_analytics_{date}.*` |
| Single farmer | JSON, PDF | `verdora_farmer_{slug}_{date}.*` |

Export merges cloud + local when local has **more** records. Chat always includes local `aiResponse` field.

---

## 19. Crop knowledge and reference data

### Disease fallback (`data/cropKnowledge.ts`)

Used when Gemini/REST unavailable. **6 crops:** Rice, Tomato, Corn, Eggplant, Cassava, Onion — each with one common disease + healthy treatment.

### Planting guide (`data/cropPlantingGuide.ts`)

From **Namibia Vegetable Production Guide 2024**. **18 crops** with months, maturity days, soil, pH, irrigation.

### Compact library (`data/plantationDataset.json`)

**6 crops** with planting windows, maturity, spacing, water, temperature range, yield estimate. Used by `SmartPlantingCalendar` and planting insight aggregation.

---

## 20. Design system (theme)

File: `constants/theme.ts`

| Token | Values |
|-------|--------|
| **Primary green** | `#2D6A4F` (agricultural brand) |
| **Spacing** | xs 4 → xxl 48 |
| **Typography** | h1, h2, h3, body, bodySmall, caption |
| **Semantic colors** | error, warning, success |
| **Confidence bar** | green ≥85%, yellow ≥70%, else amber |

Portrait-only app; light UI style.

---

## 21. Environment variables

Copy `frontend/.env.example` → `frontend/.env`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anon key |
| `EXPO_PUBLIC_CLAUDE_API_KEY` | Recommended | Chat assistant |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Recommended | Crop scanner |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY` | Recommended | Live weather |
| `EXPO_PUBLIC_API_URL` | Optional | Custom REST backend |
| `EXPO_OFFLINE` | Optional | Expo offline start mode |

**Current Supabase project:** `https://wfkciaoxqqwleybyvisp.supabase.co`

---

## 22. Supabase database

### Install (pick one)

**Option A — one file:** run `supabase/schema.sql` in SQL Editor  

**Option B — step by step:**

1. `supabase/migrations/001_core_tables.sql`
2. `supabase/migrations/002_intelligence_platform.sql`
3. `supabase/migrations/003_rls_and_auth.sql`

### Utilities

| File | Purpose |
|------|---------|
| `supabase/fix_permissions.sql` | Re-apply grants + RLS |
| `supabase/seed_admin.sql` | Promote user to admin by email |
| `supabase/SETUP.md` | Full setup guide |

### RLS summary

- Farmers: CRUD own rows (`user_id = auth.uid()`)
- Admins: read all farmer tables via `is_admin()`
- Intelligence tables: authenticated read; writes via service role only

---

## 23. Edge functions and nightly jobs

**Function:** `supabase/functions/nightly-aggregation/index.ts`

| Setting | Value |
|---------|-------|
| Schedule | `0 2 * * *` (2 AM daily) |
| Auth | `SUPABASE_SERVICE_ROLE_KEY` |
| Reads | scans, chat_logs, crops, weather_logs |
| Writes | disease_alerts, knowledge_gap_reports, planting_insights, aggregation_runs |

Deploy instructions: `supabase/functions/README.md`

---

## 24. Fallback and offline behavior

| Feature | No Supabase | No AI keys | No OpenWeather |
|---------|-------------|------------|----------------|
| Auth | **Fails** — must configure Supabase or REST | — | — |
| Scan | Local crop knowledge by registered crop | Same | — |
| Chat | Local data-driven replies from profile/calendar/scans | Same | — |
| Weather | Cached env logs or empty placeholder | — | Cached / empty |
| Calendar | AsyncStorage only | — | — |
| Admin | Local analytics DB only | — | — |
| Intelligence | Client-side aggregation from local data | — | — |

Expo default start uses `--offline` mode to avoid Metro fetch failures; use `npm run start:online` when network is stable.

---

## 25. Permissions (camera, photos)

From `app.json`:

| Platform | Permission | Reason string |
|----------|------------|---------------|
| iOS | Camera | Scan crops and detect diseases |
| iOS | Photo library | Upload crop images for diagnosis |
| Android | CAMERA, READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE | Same |

Web: no live camera — gallery picker only.

---

## 26. Known gaps and orphan code

| Item | Status | Notes |
|------|--------|-------|
| `CropLibraryScreen` | Not in navigator | Unreachable |
| `CropDetailScreen` | Not in navigator | Route `CropDetail` undefined |
| REST backend | Optional / not in repo | Routes defined in `endpoints.ts` only |
| Email confirmation | Supabase setting | Disable for instant dev signup |
| Token refresh on cold start | Not implemented | User stays "logged in" from AsyncStorage |

---

## 27. Setup checklist

### Developer

- [ ] Node.js 20+
- [ ] `cd frontend && npm install`
- [ ] Copy `.env.example` → `.env` with Supabase + API keys
- [ ] Run Supabase schema (see §22)
- [ ] Enable Email auth in Supabase dashboard
- [ ] `npm start` → scan QR with Expo Go (SDK 54)

### First farmer account

- [ ] Register in app with consent
- [ ] Set location in Profile
- [ ] Add fields (optional)
- [ ] Add crops in Calendar
- [ ] Test scan, weather, chat

### Admin access

- [ ] Register account
- [ ] Run `supabase/seed_admin.sql` with your email
- [ ] Log out and back in → Admin dashboard

---

## 28. File index

### Screens (13 files)

```
frontend/src/screens/
├── auth/LoginScreen.tsx
├── auth/RegisterScreen.tsx
├── farmer/HomeScreen.tsx
├── farmer/CropScannerScreen.tsx
├── farmer/DiagnosisResultsScreen.tsx
├── farmer/PlantationCalendarScreen.tsx
├── farmer/WeatherScreen.tsx
├── farmer/ChatScreen.tsx
├── farmer/ProfileScreen.tsx
├── farmer/CropLibraryScreen.tsx      # orphan
├── farmer/CropDetailScreen.tsx       # orphan
├── admin/AdminDashboardScreen.tsx
└── admin/AdminUserDetailScreen.tsx
```

### Navigation (5 files)

```
frontend/src/navigation/
├── RootNavigator.tsx
├── AuthNavigator.tsx
├── FarmerNavigator.tsx
├── FarmerTabNavigator.tsx
├── AdminNavigator.tsx
└── types.ts
```

### Context (3 files)

```
frontend/src/context/
├── AuthContext.tsx
├── PrivacyContext.tsx
└── DiagnosisContext.tsx
```

### Key services

```
frontend/src/services/
├── api/                    # auth, chat, weather, diagnosis, calendar, admin
├── supabase/               # client + repositories + analytics + intelligence
├── analytics/              # dataCollectionService
├── intelligence/           # aggregationEngine, geospatial, topics
├── export/                 # PDF/JSON reports
├── fields/fieldService.ts
├── data/farmerDataService.ts
└── admin/userActivityService.ts
```

---

## Related documentation

| Document | Path |
|----------|------|
| Quick start | `README.md` |
| Frontend README | `frontend/README.md` |
| Supabase setup | `supabase/SETUP.md` |
| SQL file index | `supabase/README.md` |
| Data architecture | `backend/docs/DATA_ARCHITECTURE.md` |
| Agent / Expo notes | `AGENTS.md` |

---

*This reference reflects the codebase as of Verdora 1.0.0. For implementation changes, update this document alongside the code.*
