# Tracking Automation Layer — Full System Design

## The Problem

The user currently has to manually log: workouts, meals, water, sleep, weight, supplements, finances, habits. That's 8+ daily logging actions. Each one adds friction. Friction kills consistency. The app becomes a chore instead of a tool.

## The Solution

A **Tracking Automation Layer** that ingests data from external sources, normalizes it, and feeds it into every Apex OS system — so the user opens the app and their life is already tracked.

---

## 1. Architecture

```
EXTERNAL SOURCES                    TRACKING AUTOMATION LAYER                    APEX OS MODULES
─────────────────                   ─────────────────────────                    ────────────────

Apple Health ──────┐
  steps            │
  sleep            │                ┌─────────────────────┐
  workouts         ├───────────────>│   INGESTION ENGINE   │
  weight           │                │                     │
  heart rate       │                │  • source adapters  │
  HRV              │                │  • dedup logic      │         ┌── Sleep Tracker
                   │                │  • timestamp norm   │         ├── Body Stats
MyFitnessPal ──────┤                │  • conflict resolve │────────>├── Workouts
  calories         │                │  • unit conversion  │         ├── Meals / Macros
  macros           │                │                     │         ├── Water
  meals            │                └─────────┬───────────┘         ├── Habits (auto-check)
                   │                          │                     ├── Finances
Hevy ──────────────┤                ┌─────────▼───────────┐         ├── Calendar
  exercises        │                │   NORMALIZATION DB    │         ├── Orchestrator
  sets/reps        │                │                     │         └── Dashboard
  weight           │                │  tracking_imports   │
                   │                │  (source, domain,   │
Plaid / Banks ─────┤                │   date, data_json,  │
  transactions     │                │   status, merged)   │
  categories       │                └─────────┬───────────┘
  balances         │                          │
                   │                ┌─────────▼───────────┐
Apple Calendar ────┤                │   MERGE ENGINE       │
Google Calendar ───┘                │                     │
                                    │  • source-of-truth  │
                                    │  • priority rules   │
                                    │  • auto-confirm     │
                                    │  • user override    │
                                    └─────────────────────┘
```

### Three Modes of Tracking

| Mode | Friction | When to Use |
|------|----------|-------------|
| **Auto** | Zero | Data flows in, gets merged, user sees it. No action needed. |
| **Confirm** | One tap | Data flows in, shown as pending. User taps to accept. |
| **Manual** | Full input | No external source. User enters data. Fallback only. |

---

## 2. Source of Truth for Each Life Domain

Every domain needs exactly ONE authoritative source. When data conflicts, the source of truth wins.

| Domain | Source of Truth | Auto/Confirm/Manual | Rationale |
|--------|----------------|--------------------:|-----------|
| **Sleep** | Apple Health | Auto | Most accurate (Watch data), always-on |
| **Steps / Activity** | Apple Health | Auto | Passive sensor, no user action |
| **Heart Rate / HRV** | Apple Health | Auto | Watch biometric, continuous |
| **Body Weight** | Apple Health | Auto | Smart scale → Health → Apex OS |
| **Workouts (lifting)** | Hevy (CSV) → Apex OS | Confirm | User tracks in Hevy during gym, imports after |
| **Workouts (cardio)** | Apple Health | Auto | Watch auto-detects runs, walks, cycling |
| **Calories / Macros** | MyFitnessPal | Auto | User already logs food there, don't duplicate |
| **Water Intake** | Apex OS (manual) | Manual | No reliable auto-source, keep simple counter |
| **Supplements** | Apex OS (manual) | One-tap confirm | Checklist format, fast |
| **Meals (what I ate)** | MyFitnessPal | Auto | MFP has the food database |
| **Transactions** | Bank (via Plaid) | Auto + Confirm | Auto-categorize, user confirms edge cases |
| **Budget** | Apex OS | Manual | User sets budgets, transactions fill actuals |
| **Calendar Events** | Apple Calendar / Google | Auto | Read-only sync for scheduling context |
| **Mood / Energy** | Apex OS (journal tab) | Manual | Subjective, must be self-reported |
| **Habits** | Apex OS + Auto-check | Hybrid | Some auto-checked from data, rest manual |
| **Journal** | Apex OS | Manual | Personal reflection, can't automate |
| **Goals** | Apex OS | Manual | User-defined, progress auto-tracked |

### Key Principle: Don't Make Users Log Twice

If a user tracks food in MyFitnessPal, Apex OS should NEVER ask them to also log food in-app. Import it. Show it. Use it. Same for workouts in Hevy, sleep on Apple Watch.

---

## 3. Sync Behavior for Each Integration

### Apple Health (Highest Priority)

**What to sync:**
```
HealthKit Data Type              → Apex OS Module         Frequency
────────────────────────────────────────────────────────────────────
HKCategoryTypeIdentifierSleep    → Sleep Tracker          Daily (morning)
HKQuantityTypeIdentifierStepCount → Dashboard / Habits    Continuous
HKQuantityTypeIdentifierActiveEnergy → Dashboard          Continuous
HKQuantityTypeIdentifierHeartRate → Body Stats            Daily avg
HKQuantityTypeIdentifierRestingHeartRate → Body Stats     Daily
HKQuantityTypeIdentifierHeartRateVariability → Readiness  Daily
HKQuantityTypeIdentifierBodyMass → Body Stats             On change
HKQuantityTypeIdentifierBodyFatPercentage → Body Stats    On change
HKWorkoutType                    → Workouts (cardio)      After workout
HKQuantityTypeIdentifierDietaryWater → Water Tracker      Continuous
HKQuantityTypeIdentifierDietaryEnergyConsumed → Macros    Daily
HKQuantityTypeIdentifierDietaryProtein → Macros           Daily
```

**Sync strategy:**
```
BACKGROUND SYNC (every app open):
  1. Query HealthKit for data since last sync timestamp
  2. Deduplicate by (date + type + source)
  3. Merge into Apex OS tables
  4. Update last_sync timestamp in app_settings

CONFLICT RESOLUTION:
  - Apple Health data OVERWRITES Apex OS manual entries for:
    sleep, steps, heart rate, weight
  - Apple Health data SUPPLEMENTS (doesn't overwrite) for:
    workouts (Hevy is primary for lifting)
    nutrition (MFP is primary)

DEDUPLICATION:
  - Steps: Take max single-source total per day (Apple's own dedup logic)
  - Sleep: Merge overlapping sleep periods, take longest
  - Weight: Latest reading per day wins
  - Workouts: Match by start_time ± 5min to avoid duplicates with Hevy
```

**Current state:** You already have Apple Health import via ZIP/XML. The next step is to make it **automatic on every app open** instead of a manual import action.

**Implementation approach for Electron (macOS):**
```
Option A: Native module
  - Use a native Node addon (node-healthkit or swift bridge)
  - Requires entitlements and user permission
  - Real-time access to HealthKit

Option B: Shortcuts automation (simpler MVP)
  - Create an Apple Shortcut that exports today's health data to JSON
  - Shortcut runs daily via automation
  - Apex OS watches a folder for new JSON files
  - Lower friction than manual ZIP import

Option C: Health Auto Export app
  - Use a companion iOS shortcut or app that pushes data to a local file
  - Apex OS reads on launch

Recommendation: Start with Option B for MVP, build Option A later.
```

### MyFitnessPal / Nutrition Apps

**What to sync:**
```
Data                    → Apex OS Module
──────────────────────────────────────────
Daily calories          → Macros page, Dashboard
Daily protein           → Macros page
Daily carbs             → Macros page
Daily fat               → Macros page
Meal breakdown          → Meals page
Water (if tracked)      → Water Tracker
```

**Sync strategy:**
```
PRIMARY METHOD: PDF import (already built)
  - User exports MFP data periodically
  - Parser extracts daily totals
  - Merged into body_stats / entries nutrition fields

ENHANCED METHOD: Daily screenshot OCR or CSV
  - MFP has a diary export feature
  - Parse and import

IDEAL METHOD: API integration
  - MFP API is restricted, but alternatives exist:
    - Cronometer has an API
    - FatSecret has a free API
    - Manual CSV export from MFP

AUTO-FILL BEHAVIOR:
  When nutrition data arrives:
  1. Write to entries.nutrition for that date
  2. Auto-check "Macro Tracking" habit
  3. Feed to orchestrator for training day adjustments
  4. Update body stats calorie/macro trends
```

### Hevy (Workout Tracking)

**Already built.** CSV import works. Enhancements:

```
CURRENT: Manual CSV import button
ENHANCED:
  1. Watch ~/Downloads for hevy_*.csv files → auto-import on detect
  2. Or: Hevy API integration (Hevy has an API)
  3. After import: auto-check "Strength Training" habit
  4. Feed workout data to orchestrator readiness engine
  5. Update progressive overload calculations
```

### Financial Data (Plaid)

**What to sync:**
```
Data                    → Apex OS Module
──────────────────────────────────────────
Transactions            → Finances page
Categories              → Budget page (auto-fill actuals)
Recurring charges       → Subscriptions page
Account balances        → Net Worth page
```

**Sync strategy:**
```
METHOD: Plaid Link (industry standard)
  - User connects bank accounts via Plaid Link widget
  - Plaid provides transactions, balances, categories
  - Apex OS stores locally (never on a server)

PRIVACY MODEL:
  - All financial data stored in local SQLite only
  - Plaid tokens stored in macOS Keychain
  - No server-side storage
  - User can disconnect at any time

AUTO-CATEGORIZATION:
  1. Plaid provides category (Food, Transportation, etc.)
  2. Map Plaid categories to Apex OS budget categories
  3. Auto-fill monthly budget "actual" column
  4. Flag transactions that don't match a category → user confirms

ALERTS:
  - "You've spent 85% of your Food budget with 12 days remaining"
  - "New subscription detected: $14.99/mo to [service]"
  - "Unusual charge: $247 at [merchant]"

MVP NOTE: Plaid requires a paid account and server component for token exchange.
Simpler MVP: Manual CSV import from bank (most banks offer this).
Build a CSV parser that maps columns to transaction fields.
```

### Calendar (Apple Calendar / Google Calendar)

**What to sync:**
```
Data                    → Apex OS Module
──────────────────────────────────────────
Events today            → Orchestrator (schedule conflicts)
Busy/free blocks        → Orchestrator (workout placement)
All-day events          → Dashboard (context)
Event times             → Planner (pre-fill agenda)
```

**Sync strategy:**
```
APPLE CALENDAR (macOS native):
  - Use EventKit framework via native Node addon
  - Or: Read ~/Library/Calendars/ directory (CalDAV format)
  - Or: Use `icalBuddy` CLI tool (open source, reads macOS calendars)
  - Read-only — Apex OS never writes to external calendars

GOOGLE CALENDAR:
  - OAuth2 flow → Google Calendar API
  - Read-only scope: calendar.events.readonly
  - Fetch today + next 7 days of events
  - Cache locally, refresh every app open

USE IN ORCHESTRATOR:
  1. Read today's events
  2. Identify busy blocks
  3. Place workouts, deep work, meals in free blocks
  4. Warn if workout conflicts with meeting
  5. Show calendar events in dashboard schedule view

MVP: Start with Apple Calendar via icalBuddy CLI.
```

---

## 4. Data Normalization Model

### Database Addition

```sql
-- Central import tracking table
CREATE TABLE IF NOT EXISTS tracking_imports (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,        -- 'apple_health', 'hevy', 'mfp', 'plaid', 'calendar'
  domain TEXT NOT NULL,        -- 'sleep', 'steps', 'workout', 'nutrition', 'transaction', 'event'
  date TEXT NOT NULL,          -- YYYY-MM-DD
  data_json TEXT NOT NULL,     -- normalized data payload
  status TEXT DEFAULT 'auto',  -- 'auto' | 'pending' | 'confirmed' | 'rejected' | 'merged'
  merged_to TEXT,              -- which Apex OS table this was merged into
  source_id TEXT,              -- external ID for dedup (e.g., HealthKit sample UUID)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ti_source_date ON tracking_imports(source, date);
CREATE INDEX IF NOT EXISTS idx_ti_domain ON tracking_imports(domain);
CREATE INDEX IF NOT EXISTS idx_ti_status ON tracking_imports(status);

-- Sync state tracking
CREATE TABLE IF NOT EXISTS sync_state (
  source TEXT PRIMARY KEY,     -- 'apple_health', 'hevy', etc.
  last_sync_at TEXT,
  last_sync_date TEXT,         -- latest date of data synced
  status TEXT DEFAULT 'idle',  -- 'idle' | 'syncing' | 'error'
  error_message TEXT,
  config_json TEXT             -- source-specific config (tokens, paths, etc.)
);
```

### Normalized Data Payloads

```js
// Sleep
{
  domain: "sleep",
  source: "apple_health",
  date: "2026-03-26",
  data: {
    hours: 7.2,
    bedtime: "22:45",
    waketime: "06:12",
    quality: "good",         // derived from HRV if available
    deep_hours: 1.8,         // if available
    rem_hours: 2.1,          // if available
  }
}

// Steps
{
  domain: "steps",
  source: "apple_health",
  date: "2026-03-26",
  data: {
    count: 8432,
    distance_km: 6.2,
    flights_climbed: 4,
  }
}

// Weight
{
  domain: "weight",
  source: "apple_health",
  date: "2026-03-26",
  data: {
    weight_lbs: 172.4,
    body_fat_pct: 14.2,      // if available
    measured_at: "07:15",
  }
}

// Nutrition
{
  domain: "nutrition",
  source: "myfitnesspal",
  date: "2026-03-26",
  data: {
    calories: 2340,
    protein: 185,
    carbs: 240,
    fat: 72,
    water_oz: 96,
    meals: [
      { name: "Breakfast", time: "07:30", calories: 520 },
      { name: "Lunch", time: "12:00", calories: 680 },
      // ...
    ]
  }
}

// Transaction
{
  domain: "transaction",
  source: "plaid",
  date: "2026-03-26",
  data: {
    amount: -42.50,
    merchant: "Whole Foods",
    category: "Food & Dining",
    apex_category: "food",    // mapped to budget category
    account_name: "Chase Checking",
    pending: false,
  }
}

// Calendar Event
{
  domain: "event",
  source: "apple_calendar",
  date: "2026-03-26",
  data: {
    title: "Team standup",
    start: "09:00",
    end: "09:30",
    all_day: false,
    calendar_name: "Work",
    busy: true,
  }
}
```

### Merge Rules

```js
const MERGE_RULES = {
  sleep: {
    target_table: "sleep_logs",
    merge_mode: "overwrite",     // external is more accurate
    confirm_mode: "auto",
    transform: (imported) => ({
      hours: imported.hours,
      bedtime: imported.bedtime,
      waketime: imported.waketime,
    }),
  },
  steps: {
    target_table: "app_settings", // stored as settings key
    merge_mode: "overwrite",
    confirm_mode: "auto",
    key_pattern: "steps_{date}",
  },
  weight: {
    target_table: "body_stats",
    merge_mode: "supplement",     // add to existing, don't overwrite other fields
    confirm_mode: "auto",
    transform: (imported, existing) => ({
      ...existing,
      weightAm: imported.weight_lbs,
      bodyFat: imported.body_fat_pct || existing?.bodyFat,
    }),
  },
  nutrition: {
    target_table: "entries",      // nutrition field in daily entry
    merge_mode: "overwrite",
    confirm_mode: "auto",
    transform: (imported, existing) => ({
      ...existing,
      nutrition: {
        calories: imported.calories,
        protein: imported.protein,
        carbs: imported.carbs,
        fat: imported.fat,
      },
    }),
  },
  workout: {
    target_table: "workout_logs",
    merge_mode: "supplement",     // don't overwrite Hevy data
    confirm_mode: "confirm",      // user confirms before merge
  },
  transaction: {
    target_table: "budgets",      // update budget actuals
    merge_mode: "append",
    confirm_mode: "auto",         // auto-categorize, flag unknowns
  },
  event: {
    target_table: null,           // not persisted, used in-memory by orchestrator
    merge_mode: "read_only",
    confirm_mode: "auto",
  },
};
```

---

## 5. UX Rules

### The Tracking Status Bar

At the top of settings or dashboard, show sync status:

```
TRACKING SOURCES
┌──────────────────────────────────────────────────────────┐
│  Apple Health    ✓ Synced 2 min ago     [Connected]      │
│  Hevy            ✓ Last import today    [Import CSV]     │
│  MyFitnessPal    ✓ Synced today         [Connected]      │
│  Bank accounts   ✓ 3 accounts linked    [Manage]         │
│  Apple Calendar  ✓ Reading 2 calendars  [Configure]      │
│  Google Calendar ○ Not connected        [Connect]        │
└──────────────────────────────────────────────────────────┘
```

### Auto-Tracked Items (Zero Friction)

These just appear in the app. No user action.

- Sleep data (from Health)
- Steps count (from Health)
- Heart rate (from Health)
- Weight (from Health / smart scale)
- Calories & macros (from MFP)
- Calendar events (from Calendar)
- Bank transactions (from Plaid)

**UX indicator:** Small "auto" badge or source icon next to auto-tracked data:
```
Sleep: 7.2h  ⌚  ← Apple Watch icon means "auto-tracked"
Weight: 172.4 lbs  ⌚
Calories: 2,340  📱  ← MFP icon
```

### Confirm-Required Items (One Tap)

These show as pending and need a quick tap:

- Workout imports (Hevy → "Accept 3 new workouts?")
- Unusual transactions ("$247 at [merchant] — categorize?")
- Goal milestone ("You hit 170 lbs — mark goal complete?")

**UX:** Pending items appear as a notification badge on the relevant page or as an alert in the orchestrator.

### Manual Items (User Enters)

- Mood / energy (subjective)
- Journal entries (personal)
- Gratitude (personal)
- Water intake (until auto-tracked)
- Supplements (checklist)
- Habit completion (for non-auto habits)
- Goal setting (user-defined)
- Budget targets (user-defined)

**UX:** These should be as fast as possible:
- Mood: 5 emoji buttons, one tap
- Water: tap to add a glass
- Supplements: checkboxes
- Habits: tap to toggle

### Auto-Checked Habits

Some habits can be auto-completed based on imported data:

```
HABIT                    AUTO-CHECK CONDITION
─────────────────────────────────────────────
Sleep Hygiene [7-8h]     sleep.hours >= 7
Hydration                water.glasses >= 8 (if tracked externally)
Strength Training        workout_logs has entry for today
Fasted Aerobic Exercise  Apple Health workout type = walking/running before 10am
Macro Tracking           nutrition data imported for today
Daily Weigh In           body_stats has weight for today
Creatine / Supplements   supplement_logs completed for today
```

When auto-checked:
- Show a small "auto ✓" indicator
- User can override (uncheck if incorrect)
- Habit streak still counts

---

## 6. Privacy & Permissions

### Principles

```
1. ALL DATA STAYS LOCAL
   - Every import goes into the local SQLite database
   - No server, no cloud, no telemetry
   - The app is a desktop app — data lives on the user's machine

2. EXPLICIT OPT-IN
   - Each integration requires explicit user activation
   - Clear explanation of what data will be accessed
   - Easy disconnect at any time

3. MINIMAL SCOPE
   - Request only the data categories needed
   - Apple Health: read-only, specific types only
   - Calendar: read-only
   - Financial: read-only transactions and balances

4. TRANSPARENT DISPLAY
   - Show exactly what was imported, when, from where
   - Import history viewable in Settings
   - User can delete imported data per-source

5. NO SHARING
   - Imported data is never sent anywhere
   - No analytics, no crash reports with user data
   - Fully offline-capable
```

### Permission Flows

```
APPLE HEALTH:
  1. User taps "Connect Apple Health" in Settings
  2. System shows: "Apex OS wants to read: Sleep, Steps, Weight, Heart Rate, Workouts"
  3. macOS HealthKit permission dialog appears
  4. User approves specific categories
  5. Initial sync runs (may take 30-60s for history)
  6. Background sync on every app open thereafter

FINANCIAL (Plaid):
  1. User taps "Connect Bank" in Settings
  2. Plaid Link widget opens (embedded browser)
  3. User selects their bank and logs in
  4. Plaid returns access token (stored in macOS Keychain)
  5. Initial transaction pull (90 days)
  6. Daily refresh on app open

CALENDAR:
  1. User taps "Connect Calendar" in Settings
  2. macOS calendar permission dialog appears
  3. User selects which calendars to include
  4. Read-only access, no write
```

---

## 7. MVP Recommendation

### Phase 1: Apple Health Auto-Sync (Highest Impact)

**Why first:** Sleep, steps, weight, and heart rate cover the most daily tracking friction. The user already wears an Apple Watch. This data is free and accurate.

**Build:**
1. Background HealthKit sync on every app open
2. Auto-fill sleep tracker from Health data
3. Auto-fill body stats weight from Health data
4. Show steps + active calories on dashboard
5. Feed sleep data into orchestrator readiness
6. Auto-check "Sleep Hygiene" and "Daily Weigh In" habits

**Impact:** Eliminates 3 manual daily actions (sleep, weight, steps). Improves orchestrator accuracy.

### Phase 2: Enhanced Hevy Integration

**Why second:** The user already imports from Hevy. Make it smoother.

**Build:**
1. Watch ~/Downloads for hevy_workout_data*.csv files
2. Auto-detect and prompt: "3 new Hevy workouts found. Import?"
3. One-tap import
4. Auto-check "Strength Training" habit on import

**Impact:** Reduces workout logging to zero friction (track in Hevy during gym, auto-imports at home).

### Phase 3: Nutrition Import

**Why third:** Nutrition data feeds into body stats, training adjustments, and the orchestrator.

**Build:**
1. Enhanced MFP PDF parser (already built)
2. Add daily nutrition import from Health (if MFP writes to HealthKit)
3. Auto-fill daily macros
4. Auto-check "Macro Tracking" habit

**Impact:** Eliminates manual macro logging for MFP users.

### Phase 4: Calendar Integration

**Why fourth:** Calendar context makes the orchestrator dramatically smarter.

**Build:**
1. Read Apple Calendar events via native bridge or icalBuddy
2. Show today's events in orchestrator schedule
3. Detect conflicts with planned workouts/deep work
4. Auto-adjust schedule around meetings

**Impact:** The orchestrator becomes genuinely useful for busy people.

### Phase 5: Financial Integration

**Why last:** Highest complexity, requires Plaid account, and finance tracking is less daily than health.

**Build:**
1. Plaid Link integration
2. Transaction import and auto-categorization
3. Budget actual vs. target auto-fill
4. Subscription detection
5. Spending alerts in orchestrator

**Impact:** Turns the finance section from manual entry to automatic tracking.

---

## 8. How Imported Data Powers the Orchestrator

The tracking automation layer feeds directly into the Life Orchestrator:

```
MORNING (on app open):
  1. Sync Apple Health → get last night's sleep
  2. Sleep hours feed into readiness calculation
  3. Readiness determines day type (peak/standard/light/recovery)
  4. Day type filters habits, adjusts workout, sets schedule

  5. Sync Calendar → get today's events
  6. Events create busy blocks in the schedule
  7. Orchestrator places workout, deep work, meals around events

  8. Check nutrition → was yesterday's intake logged?
  9. If training day: "Training day — aim for [target] calories, [target]g protein"
  10. If cut: "You're in a deficit. Prioritize protein."

  11. Check finances → any budget alerts?
  12. If overspending: alert on dashboard

RESULT: The user opens Apex OS and sees a fully informed, data-driven daily plan
without having manually entered anything except subjective items (mood, journal).
```

### The Dream State

```
USER WAKES UP
  → Apple Watch tracked 7.2h sleep
  → Smart scale logged 171.8 lbs
  → Yesterday's MFP shows 2,340 cal, 185g protein

USER OPENS APEX OS
  → Dashboard shows:
    "Good morning, Nick. Standard Day (readiness: 72)."

    Sleep: 7.2h ⌚ ✓
    Weight: 171.8 lbs ⌚ (↓0.4 from last week)
    Yesterday's macros: 2,340 cal / 185g protein 📱 ✓

    Today's Schedule:
    8:00  Team standup (from Calendar)
    8:30  Deep work: finish proposal
    10:00 Break
    12:00 Lunch — training day, aim for 40g+ protein
    3:00  Push 1 — Chest & Shoulders (55 min)
    5:00  Free time
    7:00  Dinner
    9:00  Journal
    10:00 Lights out

    Habits (8 of 15 — Standard Day):
    ✓ Sleep Hygiene (auto)
    ✓ Daily Weigh In (auto)
    ○ Hydration
    ○ Meditation
    ○ Strength Training (auto after Hevy import)
    ○ Macro Tracking (auto from MFP)
    ○ Deep Work
    ○ Reading

    Budget: 62% used, 12 days remaining ✓

    Alert: Call Mom (last contact 14 days ago)

USER'S ONLY MANUAL ACTIONS:
  1. Log mood (one tap)
  2. Check off water glasses (tap tap tap)
  3. Take supplements (checkboxes)
  4. Write journal (evening)

EVERYTHING ELSE IS AUTOMATIC.
```

---

## 9. Implementation Hooks

### Settings Page Addition

Add a "Tracking Sources" section to Settings:

```
TRACKING SOURCES

  Apple Health         [Connect]  /  [Connected ✓] [Disconnect]
    Last sync: 2 minutes ago
    Syncing: Sleep, Steps, Weight, Heart Rate, Workouts

  Hevy                 [Auto-detect: ON]
    Last import: Today, 3 workouts
    Watch folder: ~/Downloads

  MyFitnessPal         [Import PDF]  /  [Auto-sync via Health]
    Last import: Yesterday

  Apple Calendar       [Connect]
    Calendars: Work, Personal

  Google Calendar      [Connect]
    Not connected

  Bank Accounts        [Connect via Plaid]
    Not connected

IMPORT HISTORY
  [View all imports]  →  shows tracking_imports table
```

### Auto-Habit Checking

Add to the orchestrator's daily plan generation:

```js
function autoCheckHabits(habits, importedData) {
  const autoChecked = {};

  if (importedData.sleep?.hours >= 7) {
    autoChecked["Sleep Hygiene"] = { checked: true, source: "apple_health" };
  }
  if (importedData.weight) {
    autoChecked["Daily Weigh In"] = { checked: true, source: "apple_health" };
  }
  if (importedData.workout) {
    autoChecked["Strength Training"] = { checked: true, source: "hevy" };
  }
  if (importedData.nutrition?.calories > 0) {
    autoChecked["Macro Tracking"] = { checked: true, source: "myfitnesspal" };
  }
  if (importedData.supplements?.allTaken) {
    autoChecked["Creatine / Supplements"] = { checked: true, source: "apex_os" };
  }

  return autoChecked;
}
```

This makes the system feel alive — habits check themselves off as data flows in.
