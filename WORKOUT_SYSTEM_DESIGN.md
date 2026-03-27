# Apex OS Workout System — Full Design Spec

## Table of Contents

1. [Feature Breakdown](#1-feature-breakdown)
2. [Onboarding Flow](#2-onboarding-flow)
3. [Split Selection & Week Structure Logic](#3-split-selection--week-structure-logic)
4. [Auto-Calendar Scheduling](#4-auto-calendar-scheduling)
5. [Missed Workout Rescheduling](#5-missed-workout-rescheduling)
6. [Daily "Today's Workout" Screen](#6-daily-todays-workout-screen)
7. [Progression, Fatigue & Deload Logic](#7-progression-fatigue--deload-logic)
8. [Goal Timeline & Phase Logic](#8-goal-timeline--phase-logic)
9. [Goal Switching Flow](#9-goal-switching-flow)
10. [World-Class UX Decisions](#10-world-class-ux-decisions)

---

## 1. Feature Breakdown

### Core System: The Training Operator

The workout section is not a tracker — it is an **autonomous training operator**. The system has five layers:

```
Layer 5: Coaching Layer        → feedback, cues, motivation, goal connection
Layer 4: Adaptation Layer      → fatigue, recovery, readiness adjustments
Layer 3: Progression Layer     → load/rep/volume auto-progression
Layer 2: Scheduling Layer      → calendar placement, rescheduling, drag/drop
Layer 1: Program Engine        → split selection, exercise selection, periodization
Layer 0: Profile & Onboarding  → goal, timeline, availability, constraints
```

### Feature Map

| Feature | Description |
|---------|-------------|
| **Smart Onboarding** | Coaching-style intake → auto-generates full plan |
| **Program Engine** | Chooses split, exercises, volume, intensity, periodization |
| **Auto-Calendar** | Places workouts on specific days, respects recovery spacing |
| **Today's Workout** | Zero-decision daily view: exercises, sets, reps, targets |
| **Active Workout** | Live tracking with rest timer, RIR logging, 1RM calc |
| **Auto-Progression** | Next-session targets calculated from performance history |
| **Readiness Engine** | Adjusts sessions based on sleep, stress, soreness, performance |
| **Phase Timeline** | Visual progress through accumulation → deload → peak cycles |
| **Goal Tracker** | Connects every workout to the user's stated goal |
| **Coaching Feedback** | Contextual messages: "volume reduced due to low sleep" |
| **Missed Workout Logic** | Auto-reschedules or rebalances the week |
| **Goal Switching** | Smooth transitions between goals with plan rebuild |
| **Cross-System Integration** | Pulls from sleep, nutrition, body stats, calendar, habits |

---

## 2. Onboarding Flow

The onboarding is a **7-screen guided intake**. Each screen is a single focused question with large tap targets, no scrolling, and a progress bar at the top. The tone is conversational — like a coach asking questions on day one.

### Screen 1: Goal Selection

**Headline:** "What are you training for?"

**Options** (card-style selection, one per card, icon + label):
- Build Muscle (icon: flexed arm)
- Lose Fat (icon: flame)
- Recomp (icon: scale with arrows)
- Build Strength (icon: barbell)
- Athletic Performance (icon: lightning bolt)
- General Fitness (icon: heart)

**Behavior:**
- Single select
- Selection highlights with accent color border + checkmark
- "Next" button activates on selection

**Data stored:** `goal: "hypertrophy" | "fat_loss" | "recomp" | "strength" | "athletic" | "general"`

---

### Screen 2: Target Outcome

**Headline:** "What does success look like?"

**Dynamic based on goal:**

If **Build Muscle**:
- "Gain lean muscle overall"
- "Focus on upper body"
- "Focus on shoulders & arms"
- "Focus on chest & back"
- "Focus on legs & glutes"
- Custom: free text input

If **Lose Fat**:
- "Lose 5-10 lbs"
- "Lose 10-20 lbs"
- "Lose 20+ lbs"
- "Get leaner / more defined"
- Custom

If **Strength**:
- "Improve squat"
- "Improve bench"
- "Improve deadlift"
- "Improve all compound lifts"
- Custom

If **General Fitness / Athletic**:
- "Look better"
- "Feel stronger"
- "Improve endurance"
- "Sport-specific" → text input for sport
- Custom

**Data stored:** `target: { type: string, focus_areas: string[], custom_note: string }`

---

### Screen 3: Timeline

**Headline:** "How long do you want this plan to run?"

**Options** (horizontal pill buttons):
- 4 weeks — "Quick block"
- 8 weeks — "Standard cycle"
- 12 weeks — "Full transformation" (recommended badge)
- 16 weeks — "Deep build"
- Ongoing — "No end date, auto-renewing phases"

**Subtext below selection:** Shows phase preview
- 12 weeks → "3 training phases + 1 deload week"
- 8 weeks → "2 training phases + 1 deload week"

**Data stored:** `timeline_weeks: number | "ongoing"`

---

### Screen 4: Experience & History

**Headline:** "How long have you been training?"

**Options:**
- **Beginner** — "Less than 1 year of consistent lifting"
- **Intermediate** — "1-3 years, comfortable with compound lifts"
- **Advanced** — "3+ years, tracking progression, understands periodization"

**Follow-up (inline, appears after selection):**
"What program have you been running recently?"
- Free text, optional
- Placeholder: "e.g., PPL, Starting Strength, random workouts, none"

**Data stored:** `experience: "beginner" | "intermediate" | "advanced"`, `previous_program: string`

---

### Screen 5: Schedule & Availability

**Headline:** "When can you train?"

**Part A — Days per week** (number stepper, 2-7):
Large number in center with +/- buttons. Default: 4.

**Part B — Preferred days** (7-day row, Mon-Sun toggles):
Tap to select. Pre-fill based on count:
- 3 days → Mon, Wed, Fri
- 4 days → Mon, Tue, Thu, Fri
- 5 days → Mon, Tue, Wed, Fri, Sat
- 6 days → Mon-Sat

User can override any pre-fill.

**Part C — Session duration** (horizontal pills):
- 30 min
- 45 min
- 60 min (default)
- 75 min
- 90 min

**Part D — Preferred time** (optional, horizontal pills):
- Morning
- Afternoon
- Evening
- No preference

**Data stored:**
```js
schedule: {
  days_per_week: number,
  preferred_days: ["mon", "tue", ...],
  session_duration_min: number,
  preferred_time: string | null
}
```

---

### Screen 6: Equipment & Limitations

**Headline:** "What do you have access to?"

**Part A — Equipment** (multi-select cards):
- Full commercial gym (barbells, dumbbells, cables, machines)
- Home gym (rack, barbell, dumbbells, bench)
- Dumbbells only
- Machines only
- Bodyweight only
- Resistance bands
- Kettlebells

**Part B — Limitations** (optional, expandable section):
"Anything we should work around?"

- Injury/pain selector: body part diagram OR dropdown
  - Shoulder, Lower back, Knee, Wrist, Elbow, Hip, Neck, Ankle
  - Severity: "Mild — can train around it" / "Moderate — need alternatives" / "Severe — avoid entirely"

- Exercises to avoid: tag input (autocomplete from exercise database)
  - e.g., "Barbell back squat", "Behind-the-neck press"

- Movement preferences (optional): tag input
  - e.g., "Love cable work", "Prefer dumbbells over barbell"

**Data stored:**
```js
equipment: string[],
limitations: {
  injuries: [{ area: string, severity: string }],
  avoid_exercises: string[],
  preferences: string[]
}
```

---

### Screen 7: Recovery Baseline

**Headline:** "Help us calibrate your recovery."

**Part A — Average sleep** (stepper, hours):
- Range: 4-10 hours, step 0.5
- Default: 7

**Part B — Stress level** (1-5 scale with labels):
1: Very low → 5: Very high

**Part C — Daily activity level:**
- Sedentary (desk job)
- Lightly active (some walking)
- Moderately active (on feet, active job)
- Very active (physical labor, athlete)

**Part D — Wearable connection** (optional):
"Connect Apple Health for automatic recovery data"
- Toggle: pulls sleep, HRV, resting HR if available

**Data stored:**
```js
recovery_baseline: {
  avg_sleep_hours: number,
  stress_level: 1-5,
  activity_level: string,
  apple_health_connected: boolean
}
```

---

### Screen 8: Plan Generation (Transition Screen)

**Headline:** "Building your plan..."

Animated progress with steps:
1. "Selecting your training split..." (0.5s)
2. "Choosing exercises..." (0.8s)
3. "Setting volume targets..." (0.5s)
4. "Building your weekly schedule..." (0.7s)
5. "Mapping your 12-week timeline..." (0.6s)

Then transitions to:

### Screen 9: Plan Summary (Review)

**Headline:** "Your Training Plan"

**Card 1 — Overview:**
- Goal: Build Muscle
- Timeline: 12 weeks (3 phases)
- Split: Push / Pull / Legs (2x/week)
- Days: Mon, Tue, Thu, Fri, Sat, Sun off

**Card 2 — This Week Preview:**
Visual weekly strip showing:
```
Mon: Push 1      Tue: Pull 1      Wed: Rest
Thu: Legs 1      Fri: Push 2      Sat: Pull 2      Sun: Rest
```

**Card 3 — Phase Timeline:**
Visual bar:
```
[■■■ Accumulation (W1-3)] [□ Deload (W4)] [■■■ Progression (W5-7)] [□ Deload (W8)] [■■■■ Peak (W9-12)]
```

**Card 4 — Weekly Volume Summary:**
Mini bar chart of weekly sets per muscle group.

**Two buttons at bottom:**
- **"Start Training"** (primary) → activates plan, schedules calendar
- **"Customize"** (secondary) → opens edit mode for any parameter

---

## 3. Split Selection & Week Structure Logic

### Decision Tree

The program engine selects a split based on a weighted scoring system, not a simple if/else.

```
INPUT: goal, days_per_week, experience, equipment, session_duration, recovery_baseline
OUTPUT: split_type, day_assignments, volume_targets, exercise_selections
```

### Split Candidates

| Split | Days | Best For |
|-------|------|----------|
| Full Body (A/B/C) | 3 | Beginners, limited time, general fitness |
| Upper / Lower | 4 | Balanced, strength focus, intermediates |
| Upper / Lower + Arms | 5 | Hypertrophy with arm emphasis |
| Push / Pull / Legs | 5-6 | Hypertrophy, advanced, high recovery |
| PPL + Weak Point | 6 | Advanced hypertrophy with focus areas |
| Arnold Split | 6 | Bodybuilding-style, high volume tolerance |
| Hybrid (U/L + PPL) | 5 | Balanced hypertrophy + strength |
| Body Part | 5-6 | Advanced, high recovery, isolate weak points |

### Scoring Rules

Each split gets a score (0-100) based on:

```
score = (
  days_match_weight     * 30 +   // how well the split fits available days
  goal_alignment_weight * 25 +   // how well the split serves the stated goal
  experience_fit_weight * 20 +   // appropriate complexity for level
  recovery_fit_weight   * 15 +   // sustainable given recovery inputs
  duration_fit_weight   * 10     // can sessions fit in stated time
)
```

**Days Match (30%):**
- Split requires exactly the user's available days → 1.0
- Off by 1 day (can adapt) → 0.7
- Off by 2+ → 0.2

**Goal Alignment (25%):**
- Hypertrophy + 6 days → PPL scores 1.0, Full Body scores 0.3
- Strength + 4 days → Upper/Lower scores 1.0, PPL scores 0.5
- Fat Loss + 3 days → Full Body scores 1.0 (frequency > volume per session)
- General Fitness + 3 days → Full Body scores 1.0

**Experience Fit (20%):**
- Beginner → Full Body 1.0, Upper/Lower 0.8, PPL 0.4 (too much to learn)
- Intermediate → Upper/Lower 1.0, PPL 0.9, Full Body 0.6
- Advanced → PPL 1.0, Body Part 0.9, Upper/Lower 0.7

**Recovery Fit (15%):**
```
recovery_score = normalize(sleep_hours * 0.4 + (6 - stress) * 0.3 + activity_bonus * 0.3)
```
- High recovery → more split options viable, PPL and Body Part score well
- Low recovery → Full Body and Upper/Lower score higher (fewer sessions, more rest)

**Duration Fit (10%):**
- 30 min sessions → Full Body struggles (too many exercises), Upper/Lower is tight
- 45 min → Full Body works, Upper/Lower ideal
- 60 min → All splits work
- 75-90 min → Body Part and PPL+ variants shine

### The Selection

1. Score all candidate splits
2. Select the highest scorer
3. If top two are within 5 points, prefer the one that better matches the user's `target.focus_areas`

### Day Assignment Logic

Once the split is chosen, assign training days:

**Rule 1: Respect user preferences.** Start with their selected days.

**Rule 2: Recovery spacing.** Same muscle group needs 48-72 hours between sessions.
- PPL: Push1 → at least 1 day before Push2
- Upper/Lower: Upper1 → at least 1 day before Upper2

**Rule 3: Hardest sessions mid-week.** Place the most demanding sessions (legs, heavy compounds) when the user is least likely to skip (Tue-Thu typically have highest adherence).

**Rule 4: Don't stack similar sessions.** Never put Push1 and Push2 back to back.

**Algorithm:**

```
1. Take user's preferred_days as slots
2. Assign session types to slots using constraint solver:
   - maximize recovery spacing between same-muscle sessions
   - place compound-heavy sessions on days with highest historical adherence
   - place rest days between highest-volume sessions
3. If constraints can't be satisfied, suggest alternate day selection to user
```

**Example outputs:**

4 days (Upper/Lower):
```
Mon: Upper A    Tue: Lower A    Wed: —    Thu: Upper B    Fri: Lower B    Sat: —    Sun: —
```

6 days (PPL):
```
Mon: Push 1    Tue: Pull 1    Wed: Legs 1    Thu: Push 2    Fri: Pull 2    Sat: Legs 2    Sun: —
```

5 days (Hybrid):
```
Mon: Upper    Tue: Lower    Wed: —    Thu: Push    Fri: Pull    Sat: Legs    Sun: —
```

### Volume Targets

Weekly sets per muscle group, adjusted by goal and experience:

```js
const VOLUME_TARGETS = {
  hypertrophy: {
    beginner:     { chest: 10, back: 12, quads: 10, hams: 8,  shoulders: 10, biceps: 8,  triceps: 8,  abs: 6  },
    intermediate: { chest: 14, back: 16, quads: 14, hams: 10, shoulders: 14, biceps: 10, triceps: 10, abs: 8  },
    advanced:     { chest: 18, back: 20, quads: 18, hams: 14, shoulders: 18, biceps: 14, triceps: 14, abs: 10 },
  },
  strength: {
    beginner:     { chest: 8,  back: 10, quads: 10, hams: 8,  shoulders: 6,  biceps: 4,  triceps: 4,  abs: 4  },
    intermediate: { chest: 10, back: 12, quads: 12, hams: 10, shoulders: 8,  biceps: 6,  triceps: 6,  abs: 6  },
    advanced:     { chest: 12, back: 14, quads: 14, hams: 12, shoulders: 10, biceps: 8,  triceps: 8,  abs: 8  },
  },
  fat_loss: {
    // ~70% of hypertrophy volume to preserve muscle, manageable with caloric deficit
    beginner:     { chest: 8,  back: 10, quads: 8,  hams: 6,  shoulders: 8,  biceps: 6,  triceps: 6,  abs: 8  },
    intermediate: { chest: 10, back: 12, quads: 10, hams: 8,  shoulders: 10, biceps: 8,  triceps: 8,  abs: 10 },
    advanced:     { chest: 14, back: 16, quads: 14, hams: 10, shoulders: 14, biceps: 10, triceps: 10, abs: 10 },
  }
}
```

Volume is distributed across the split's sessions. If the user specified focus areas (e.g., "shoulders & arms"), add 2-4 extra sets to those groups and slightly reduce others to stay within session duration.

### Exercise Selection

Exercises are selected from the database with this priority:

```
1. Compound movements first (squat, bench, row, deadlift, OHP)
2. Free weight accessories (dumbbell variations)
3. Cable/machine isolation
4. Bodyweight finishers
```

**Filters applied:**
- Equipment available
- Injuries (e.g., shoulder injury → no behind-neck press, no upright rows)
- Avoid list (user-specified)
- Experience level (beginners get simpler movement patterns)
- Preference list (user-specified favorites get priority)

**Exercise rotation:**
- Primary compounds stay consistent across phases (for progressive overload tracking)
- Accessories rotate every 4-6 weeks to prevent staleness
- Each session has 5-8 exercises depending on duration:
  - 30 min: 4-5 exercises
  - 45 min: 5-6 exercises
  - 60 min: 6-7 exercises
  - 75-90 min: 7-9 exercises

### Set/Rep Schemes by Phase

| Phase | Working Sets | Rep Range | RIR Target | Rest |
|-------|-------------|-----------|------------|------|
| Accumulation | 3-4 per exercise | 8-12 | 3-4 RIR | 90-120s |
| Progression | 3-4 per exercise | 6-10 | 2-3 RIR | 120-150s |
| Peak / Overreach | 4-5 per exercise | 6-8 | 1-2 RIR | 150-180s |
| Deload | 2-3 per exercise | 8-12 | 5+ RIR | 60-90s |

---

## 4. Auto-Calendar Scheduling

### How It Works

When the user completes onboarding and taps "Start Training," the system:

1. **Generates the full program** (all weeks, all sessions, all exercises)
2. **Creates calendar entries** for every workout in the plan
3. **Stores them in a new `workout_schedule` table**
4. **Displays them on the Calendar page and the Workouts page weekly view**

### Database Schema Addition

```sql
CREATE TABLE workout_plans (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  target_json TEXT,
  timeline_weeks INTEGER,
  split_type TEXT,
  program_json TEXT NOT NULL,       -- full program definition
  schedule_json TEXT NOT NULL,       -- day assignments
  phase_json TEXT NOT NULL,          -- phase structure
  onboarding_json TEXT NOT NULL,     -- all onboarding answers (for rebuild)
  started_at TEXT NOT NULL,
  ends_at TEXT,
  status TEXT DEFAULT 'active',      -- active | paused | completed | switched
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE workout_schedule (
  id TEXT PRIMARY KEY,               -- UUID
  plan_id TEXT NOT NULL,
  date TEXT NOT NULL,                -- YYYY-MM-DD
  session_type TEXT NOT NULL,        -- "push_1", "pull_2", "upper_a", "rest", etc.
  session_label TEXT NOT NULL,       -- "Push 1 — Chest Focus"
  phase TEXT NOT NULL,               -- "accumulation", "progression", "peak", "deload"
  week_number INTEGER NOT NULL,
  exercises_json TEXT NOT NULL,      -- full exercise list with sets/reps/targets
  estimated_duration_min INTEGER,
  status TEXT DEFAULT 'scheduled',   -- scheduled | completed | skipped | rescheduled
  completed_at TEXT,
  rescheduled_from TEXT,             -- original date if moved
  notes TEXT,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id)
);

CREATE INDEX idx_schedule_date ON workout_schedule(date);
CREATE INDEX idx_schedule_plan ON workout_schedule(plan_id);
CREATE INDEX idx_schedule_status ON workout_schedule(plan_id, status);
```

### Calendar Display

**Weekly View (on Workouts page):**

A horizontal 7-day strip at the top of the workouts page. Each day shows:

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ MON     │  │ TUE     │  │ WED     │  │ THU     │  │ FRI     │  │ SAT     │  │ SUN     │
│ Mar 24  │  │ Mar 25  │  │ Mar 26  │  │ Mar 27  │  │ Mar 28  │  │ Mar 29  │  │ Mar 30  │
│         │  │         │  │         │  │         │  │         │  │         │  │         │
│ Push 1  │  │ Pull 1  │  │  REST   │  │ Legs 1  │  │ Push 2  │  │ Pull 2  │  │  REST   │
│ ~60 min │  │ ~55 min │  │         │  │ ~65 min │  │ ~55 min │  │ ~60 min │  │         │
│         │  │         │  │         │  │         │  │         │  │         │  │         │
│ ✓ Done  │  │ ● Today │  │   —     │  │ ○       │  │ ○       │  │ ○       │  │   —     │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

**States:**
- Past + completed: green checkmark, filled card
- Past + missed: amber warning, "Missed" label
- Today: accent border, pulsing dot
- Future: outlined, dimmer
- Rest: no card, just "Rest" label

**Monthly View (on Calendar page):**

Calendar cells show a small workout badge:
- Colored dot + session name abbreviation
- "P1" for Push 1, "L2" for Legs 2, etc.
- Completed days get a checkmark overlay

### Scheduling Rules

**Rule 1: User's preferred days are law.**
The schedule never overrides selected days unless the user explicitly allows it.

**Rule 2: Recovery spacing.**
Minimum gaps between same-muscle sessions:
- Same primary muscle: 48h minimum (2 calendar days)
- High-CNS sessions (heavy squats, deadlifts): 72h minimum

**Rule 3: Front-load the week.**
If the user trains 4 days and picks Mon/Tue/Thu/Fri, compound-heavy sessions go on Mon and Thu (after rest days) when energy is highest.

**Rule 4: Phase-aware scheduling.**
During deload weeks, sessions are shorter. The calendar reflects reduced duration.

**Rule 5: External calendar awareness.**
If the user has busy days flagged in their planner calendar (via the existing `entries` table agenda), the system can surface a warning: "Thursday looks packed — want to move Legs to Friday?"

### Drag/Drop Override

Users can drag a workout card from one day to another in the weekly view.

**Behavior on drag:**
1. Move the session to the new date
2. Check for recovery conflicts (e.g., moving Push 2 next to Push 1)
3. If conflict: show warning toast — "Push sessions will be back-to-back. Continue?"
4. If accepted: update `workout_schedule` entry
5. Do NOT cascade changes to other days (user moved it manually, respect that)

---

## 5. Missed Workout Rescheduling

### Detection

A workout is "missed" when:
- The scheduled date has passed (it's now past midnight)
- Status is still `scheduled` (not completed)
- No active workout session was logged for that date

The system checks this each time the app opens and at the start of each new day.

### Decision Engine

When a workout is missed, the system evaluates:

```js
function handleMissedWorkout(missed, remainingWeekSessions, userSchedule) {
  const daysLeftInWeek = getRemainingDays();      // how many scheduled days left this week
  const restDaysLeft = getAvailableRestDays();     // unscheduled days remaining
  const missedMuscles = getMuscleGroups(missed);   // what was supposed to be trained
  const upcomingSessions = getUpcoming(7);         // next 7 days of sessions

  // Strategy 1: SHIFT — move to next available rest day this week
  if (restDaysLeft.length > 0 && noRecoveryConflict(missed, restDaysLeft[0])) {
    return { action: 'reschedule', newDate: restDaysLeft[0], reason: 'Moved to next available day' };
  }

  // Strategy 2: MERGE — fold key exercises into an upcoming session
  if (daysLeftInWeek >= 2 && canMergeWithin(missed, upcomingSessions, sessionDurationLimit)) {
    return { action: 'merge', targetSession: bestMergeTarget, exercises: priorityExercises(missed) };
  }

  // Strategy 3: SKIP — drop it and rebalance next week's volume
  if (daysLeftInWeek <= 1 || isMissedOnLastDay) {
    return { action: 'skip', rebalance: true, reason: 'Added volume to next week for missed muscles' };
  }
}
```

### Strategy Details

**Strategy 1: Shift (preferred)**
- Move the missed session to the next available rest day
- Update `workout_schedule`: set original to `status: 'rescheduled'`, create new entry with `rescheduled_from` reference
- Show toast: "Monday's Push session moved to Wednesday"

**Strategy 2: Merge**
- Take the 2-3 most important exercises from the missed session (compounds first)
- Append them to the next compatible session
- Example: missed Pull day → add 3 sets of rows and 2 sets of curls to the next upper session
- Show toast: "Key exercises from Pull 1 added to Thursday's session"
- Flag the merged session as slightly longer: "+15 min"

**Strategy 3: Skip**
- Mark as skipped
- Increase volume for the missed muscle groups in the following week by 10-20%
- Show toast: "Legs 1 was skipped — extra quad and hamstring volume added to next week"

### Multiple Misses

If 2+ workouts are missed in a week:

```
if (missedCount >= 2 && missedCount <= daysPerWeek / 2) {
  // Rebalance remaining sessions this week with priority exercises
  // Show: "Adjusted this week's plan to cover missed sessions"
}

if (missedCount > daysPerWeek / 2) {
  // Treat as a rest week — convert remaining sessions to light/deload
  // Show: "Looks like a tough week. We've lightened the remaining sessions."
  // Do NOT guilt the user. Frame positively.
}
```

### User Notification UX

When the app detects a missed workout, it shows a **non-intrusive banner** at the top of the Workouts page:

```
┌──────────────────────────────────────────────────────────────┐
│  ↻  Monday's Pull session was rescheduled to Wednesday.      │
│     [View Updated Schedule]                     [Dismiss]    │
└──────────────────────────────────────────────────────────────┘
```

**Tone rules:**
- Never say "You missed a workout"
- Always frame as what the system did to help
- "Your plan has been adjusted" > "You didn't complete your workout"

---

## 6. Daily "Today's Workout" Screen

### Layout

This is the **hero experience**. When the user navigates to the Workouts page on a training day, they see:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Weekly Strip - 7 days with today highlighted]                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TODAY'S WORKOUT                                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Push 1 — Chest & Shoulder Focus                         │  │
│  │                                                           │  │
│  │  Phase: Accumulation (Week 2 of 3)                        │  │
│  │  Est. Duration: ~58 min  •  7 exercises  •  24 sets       │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  "This session builds your pressing foundation.     │  │  │
│  │  │   Focus on controlled eccentrics today."            │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────┐                         │  │
│  │  │     ▶  START WORKOUT         │                         │  │
│  │  └──────────────────────────────┘                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  EXERCISES                                                      │
│                                                                 │
│  1. Barbell Bench Press                                         │
│     4 × 8-10  •  Target: 185 lbs  •  RIR 3  •  Rest 120s      │
│     Last session: 180 lbs × 10, 10, 9, 8                       │
│                                                                 │
│  2. Incline Dumbbell Press                                      │
│     3 × 10-12  •  Target: 65 lbs  •  RIR 3  •  Rest 90s       │
│     Last session: 60 lbs × 12, 11, 10                          │
│                                                                 │
│  3. Cable Flye                                                  │
│     3 × 12-15  •  Target: 30 lbs  •  RIR 2  •  Rest 60s       │
│     Last session: 25 lbs × 15, 14, 13                          │
│                                                                 │
│  4. Overhead Press                                              │
│     3 × 8-10  •  Target: 115 lbs  •  RIR 3  •  Rest 120s      │
│     Last session: 110 lbs × 10, 9, 8                           │
│                                                                 │
│  5. Lateral Raise                                               │
│     4 × 12-15  •  Target: 20 lbs  •  RIR 2  •  Rest 60s       │
│     Last session: 20 lbs × 15, 14, 13, 12                      │
│                                                                 │
│  6. Tricep Pushdown                                             │
│     3 × 10-12  •  Target: 50 lbs  •  RIR 2  •  Rest 60s       │
│     Last session: 45 lbs × 12, 12, 11                          │
│                                                                 │
│  7. Overhead Tricep Extension                                   │
│     3 × 12-15  •  Target: 40 lbs  •  RIR 2  •  Rest 60s       │
│     Last session: 35 lbs × 15, 14, 13                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  READINESS CHECK                                                │
│  Sleep: 7.2h ✓   Stress: Low ✓   Recovery: Good                │
│  → Session plan unchanged. You're good to go.                   │
├─────────────────────────────────────────────────────────────────┤
│  UP NEXT                                                        │
│  Tomorrow: Pull 1 — Back Width Focus (~55 min)                  │
│  Friday: Legs 1 — Quad Dominant (~65 min)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Rest Day View

On rest days, the screen shows:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Weekly Strip]                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  REST DAY                                                        │
│                                                                  │
│  Recovery is part of the plan.                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Phase: Accumulation  •  Week 2 of 12                       │ │
│  │  Sessions completed this week: 3 of 5                       │ │
│  │  Streak: 14 consecutive planned sessions ✓                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  UP NEXT                                                         │
│  Thursday: Push 2 — Shoulder Dominant (~55 min)                  │
│                                                                  │
│  RECOVERY TIPS                                                   │
│  • Sleep target: 7.5h+ tonight                                   │
│  • Protein target: 180g today                                    │
│  • Light movement: 20 min walk recommended                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Exercise Card Detail (when tapped/expanded)

```
┌─────────────────────────────────────────────────────────────────┐
│  Barbell Bench Press                                             │
│  Primary: Chest  •  Secondary: Triceps, Front Delts              │
│                                                                  │
│  TODAY'S TARGET                                                  │
│  4 sets × 8-10 reps @ 185 lbs  •  RIR 3  •  Rest 120s          │
│                                                                  │
│  WHY THIS TARGET                                                 │
│  "Last session you hit 180 × 10. Adding 5 lbs while staying     │
│   in the 8-10 range. If you get 8+ on all sets, we'll progress  │
│   again next session."                                           │
│                                                                  │
│  COACHING CUES                                                   │
│  • Retract scapula, arch slightly, feet planted                  │
│  • Control the eccentric (2-3 seconds down)                      │
│  • Full range of motion — bar to chest                           │
│                                                                  │
│  RECENT HISTORY                                                  │
│  Mar 20: 180 × 10, 10, 9, 8                                     │
│  Mar 13: 175 × 10, 10, 10, 9                                    │
│  Mar 6:  170 × 12, 11, 10, 10                                   │
│                                                                  │
│  TREND: ↑ Progressing well — +10 lbs over 3 weeks               │
└─────────────────────────────────────────────────────────────────┘
```

### Readiness-Adjusted View

If the readiness engine determines the session should be modified, the Today view shows:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ ADJUSTED SESSION                                             │
│                                                                  │
│  Sleep was low (5.2h) and stress is elevated.                    │
│  Volume reduced by 20% — same exercises, fewer sets.             │
│  Focus on quality reps today.                                    │
│                                                                  │
│  [View original plan]              [Accept adjusted plan]        │
└─────────────────────────────────────────────────────────────────┘
```

The user can always override and run the original plan.

---

## 7. Progression, Fatigue & Deload Logic

### Auto-Progression Model

The system uses a **double progression** model as its primary strategy, with load progression as the secondary escalation.

#### Double Progression (Primary)

```
Given: target rep range [low, high], e.g., [8, 12]

After each session:
1. If all sets hit the TOP of the rep range (e.g., 4×12) at the current weight:
   → INCREASE WEIGHT by smallest increment (5 lbs barbell, 2.5 lbs dumbbell)
   → Reset rep target to bottom of range (8 reps)

2. If all sets hit the BOTTOM of the rep range or above (e.g., 4×8+):
   → KEEP WEIGHT, aim for +1 rep per set next session

3. If any set falls BELOW the bottom of the range:
   → KEEP WEIGHT AND REPS, try again next session

4. If failing the bottom of the range for 2+ consecutive sessions:
   → Flag for review (possible deload trigger or exercise swap)
```

#### Load Progression (Compounds)

For primary compound lifts (squat, bench, deadlift, OHP), also track:

```
Estimated 1RM = weight × (1 + reps / 30)    // Epley formula

If e1RM is trending up week over week → progression is on track
If e1RM is flat for 2+ weeks → consider:
  - Changing rep scheme
  - Adding a set
  - Adjusting exercise variation
If e1RM is declining → fatigue signal → consider deload
```

#### Next-Session Target Calculation

```js
function calculateNextTarget(exercise, history) {
  const lastSession = history[0];
  const { weight, sets } = lastSession;
  const [repLow, repHigh] = exercise.repRange;

  const allSetsHitTop = sets.every(s => s.reps >= repHigh);
  const allSetsHitBottom = sets.every(s => s.reps >= repLow);
  const anySetsBelow = sets.some(s => s.reps < repLow);

  if (allSetsHitTop) {
    return {
      weight: weight + exercise.progressionIncrement,
      targetReps: repLow,
      note: `All sets hit ${repHigh} reps — weight increased`
    };
  }

  if (allSetsHitBottom && !allSetsHitTop) {
    const avgReps = average(sets.map(s => s.reps));
    return {
      weight: weight,
      targetReps: Math.min(Math.ceil(avgReps + 1), repHigh),
      note: `Push for +1 rep per set`
    };
  }

  if (anySetsBelow) {
    return {
      weight: weight,
      targetReps: repLow,
      note: `Repeat — focus on hitting ${repLow} reps on all sets`
    };
  }
}
```

### Fatigue & Readiness Engine

#### Input Sources

| Source | Data | Weight | Update Frequency |
|--------|------|--------|-----------------|
| Sleep | Hours from sleep tracker or Apple Health | 30% | Daily |
| Stress | Self-reported (1-5) from daily check-in | 20% | Daily |
| Performance | Rep/weight trends over last 3 sessions | 25% | Per workout |
| Soreness | Self-reported (1-5) pre-workout | 15% | Per workout |
| Missed workouts | Count in trailing 7 days | 10% | Daily |

#### Readiness Score Calculation

```js
function calculateReadiness(inputs) {
  const sleepScore = clamp(inputs.sleepHours / inputs.baselineSleep, 0, 1.2);
  const stressScore = (6 - inputs.stressLevel) / 5;  // invert: low stress = high score
  const performanceScore = calculatePerformanceTrend(inputs.recentSessions);
  const sorenessScore = (6 - inputs.soreness) / 5;    // invert
  const consistencyScore = inputs.completedLast7 / inputs.scheduledLast7;

  const readiness = (
    sleepScore       * 0.30 +
    stressScore      * 0.20 +
    performanceScore * 0.25 +
    sorenessScore    * 0.15 +
    consistencyScore * 0.10
  );

  return {
    score: readiness,        // 0.0 - 1.0+
    level: categorize(readiness),
    adjustments: getAdjustments(readiness)
  };
}

function categorize(score) {
  if (score >= 0.85) return 'peak';       // train as planned or push slightly
  if (score >= 0.65) return 'good';       // train as planned
  if (score >= 0.45) return 'moderate';   // reduce volume ~20%
  if (score >= 0.25) return 'low';        // reduce volume ~40%, lower intensity
  return 'very_low';                       // suggest rest or very light session
}
```

#### Session Adjustments by Readiness

| Readiness | Volume | Intensity | Exercise Changes | Message |
|-----------|--------|-----------|-----------------|---------|
| Peak (0.85+) | As planned | As planned | None | "You're primed. Give it everything." |
| Good (0.65-0.84) | As planned | As planned | None | "Good to go. Follow the plan." |
| Moderate (0.45-0.64) | -20% (drop last set of each exercise) | Same weight, +1 RIR | None | "Slightly reduced volume today." |
| Low (0.25-0.44) | -40% (2 sets per exercise) | -10% weight, +2 RIR | Swap barbell → dumbbell, compound → machine | "Light session today. Quality over quantity." |
| Very Low (<0.25) | Suggest rest | — | — | "Your body needs rest. Consider taking today off." |

### Deload Logic

#### Automatic Deload Triggers

A deload week is triggered when ANY of these conditions are met:

```
1. SCHEDULED: Every 4th week (for intermediates) or every 3rd week (for beginners)
   or every 5th-6th week (for advanced) — built into the phase structure

2. PERFORMANCE: Estimated 1RM on 2+ compound lifts has declined for 2 consecutive sessions

3. FATIGUE ACCUMULATION: Readiness score averages below 0.50 for 5+ consecutive days

4. ADHERENCE: 3+ workouts missed in a 2-week period (body is sending a signal)

5. USER-TRIGGERED: User can always request a deload manually
```

#### Deload Protocol

During a deload week:
- Same exercises (maintain movement patterns)
- Same frequency (keep the habit)
- **Volume: 50-60% of normal** (2 sets instead of 4)
- **Intensity: 50-60% of recent working weight**
- **RIR: 5+** (nothing should feel hard)
- **Session duration: ~30-40 min**

The calendar shows deload sessions with a distinct visual treatment (lighter color, "Deload" badge).

#### Post-Deload

After a deload week:
- Resume at the pre-deload weight
- Start the next phase (if transitioning) or continue current phase
- Performance typically jumps — track this to validate the deload worked

---

## 8. Goal Timeline & Phase Logic

### Phase Structure

Every plan is divided into mesocycles (phases). The system builds these automatically based on timeline length.

#### Phase Templates by Timeline

**4 Weeks:**
```
Week 1-3: Accumulation (build volume, moderate intensity)
Week 4:   Deload
```

**8 Weeks:**
```
Week 1-3: Accumulation
Week 4:   Deload
Week 5-7: Progression (higher intensity, moderate volume)
Week 8:   Deload
```

**12 Weeks:**
```
Week 1-3:  Accumulation
Week 4:    Deload
Week 5-7:  Progression
Week 8:    Deload
Week 9-11: Peak (highest intensity, strategic volume)
Week 12:   Deload / Assessment
```

**16 Weeks:**
```
Week 1-3:  Accumulation I
Week 4:    Deload
Week 5-8:  Accumulation II (higher baseline)
Week 9:    Deload
Week 10-12: Progression
Week 13:   Deload
Week 14-15: Peak
Week 16:   Deload / Assessment
```

**Ongoing (no end date):**
```
Repeating 4-week blocks:
  3 weeks training → 1 week deload
  Each new block starts with slightly higher baseline volume/intensity
  Every 12 weeks: full assessment and optional program refresh
```

#### Phase Characteristics

| Phase | Volume Trend | Intensity Trend | RIR | Purpose |
|-------|-------------|-----------------|-----|---------|
| Accumulation | Medium → High | Moderate | 3-4 | Build work capacity, practice movements |
| Progression | Medium | Medium → High | 2-3 | Drive strength gains, progressive overload |
| Peak | Medium-Low | High | 1-2 | Express strength, push limits safely |
| Deload | Very Low | Low | 5+ | Recover, dissipate fatigue, supercompensate |

### Timeline Visualization

Displayed as a horizontal bar on the Workouts page and in the plan summary:

```
YOUR 12-WEEK PLAN
┌──────────────────────────────────────────────────────────────────────┐
│ ■■■ Accumulation │ □ DL │ ■■■ Progression │ □ DL │ ■■■■ Peak │ □ │
│   W1  W2  W3       W4      W5  W6  W7       W8     W9 W10 W11  W12│
│              ▲                                                       │
│          YOU ARE HERE                                                │
│          Week 2 • Day 4                                              │
└──────────────────────────────────────────────────────────────────────┘
```

**Phase card (below the bar):**
```
┌─────────────────────────────────────────────────────┐
│  ACCUMULATION PHASE                                  │
│  Week 2 of 3  •  8 sessions remaining               │
│                                                      │
│  Focus: Build volume gradually. Stay at RIR 3-4.     │
│  Don't chase maxes yet — that comes in Week 5.       │
│                                                      │
│  Next milestone: Deload in 2 weeks                   │
│  Goal progress: On track ✓                           │
└─────────────────────────────────────────────────────┘
```

### Goal Progress Tracking

The system tracks progress toward the user's stated goal using available data:

**Build Muscle:**
- Primary metric: Strength progression (e1RM trends)
- Secondary: Body weight trend, body measurements (if tracked in Body Stats)
- Display: "Estimated lean mass change" (if body fat % and weight are tracked)
- Weekly milestone: "Compound lift averages up X% since start"

**Lose Fat:**
- Primary: Body weight trend (7-day rolling average)
- Secondary: Waist measurement, body fat % (if tracked)
- Display: Progress toward target weight
- Weekly milestone: "X lbs lost, Y lbs remaining"

**Strength:**
- Primary: e1RM on target lifts
- Display: Progress bar toward target numbers
- Weekly milestone: "Squat e1RM: 285 → 310 (+25 lbs, 62% to goal)"

**General/Athletic/Recomp:**
- Primary: Consistency (sessions completed / sessions planned)
- Secondary: Strength trends, body comp changes
- Display: Adherence rate + trend lines

### Coaching Messages by Phase Position

```js
const PHASE_MESSAGES = {
  accumulation: {
    start: "Time to build your foundation. Focus on perfecting form and building volume tolerance.",
    mid: "You're settling into the groove. Consistency is the priority right now.",
    end: "Great block. Your body has adapted — deload is coming to let you absorb these gains."
  },
  deload: {
    start: "Recovery week. Go light, stay active, sleep well. This is where gains are cemented.",
    end: "You should be feeling fresh. Next phase ramps up — you're ready."
  },
  progression: {
    start: "Time to push. Weights go up, reps may come down. Trust the process.",
    mid: "You're in the growth zone. Every session matters. Keep showing up.",
    end: "Strong block. You've built real progress here."
  },
  peak: {
    start: "Final push. You're the strongest and most conditioned you've been in this cycle.",
    mid: "This is where it all comes together. Push hard, recover harder.",
    end: "Incredible work. Time to assess, recover, and plan what's next."
  }
};
```

---

## 9. Goal Switching Flow

### Trigger

User goes to Settings or a "Change Goal" option in the workout section.

### Screen 1: New Goal Selection

Same as onboarding Screen 1, but with current goal highlighted:

```
Current goal: Build Muscle (Week 6 of 12)

What would you like to switch to?
[Build Muscle ✓] [Lose Fat] [Recomp] [Strength] [Athletic] [General]
```

### Screen 2: Transition Options

```
HOW SHOULD WE TRANSITION?

┌─────────────────────────────────────────────────────┐
│  ○  Finish current phase, then switch               │
│     Complete your Progression phase (2 weeks left),  │
│     deload, then start the new program.              │
│     Recommended for best results.                    │
├─────────────────────────────────────────────────────┤
│  ○  Transition now with bridge week                  │
│     This week becomes a transition/deload week.      │
│     New program starts next Monday.                  │
├─────────────────────────────────────────────────────┤
│  ○  Start fresh immediately                          │
│     End current plan, begin new plan today.          │
│     Previous progress is saved in history.           │
└─────────────────────────────────────────────────────┘
```

### Screen 3: Quick Re-calibration

Only show questions that might have changed:
- "Any schedule changes?" (show current schedule, allow edits)
- "New target outcome?" (if goal type changed)
- "New timeline?" (default: same length as previous)

Skip questions that haven't changed (equipment, limitations, experience).

### Screen 4: New Plan Summary

Same as onboarding Screen 9, but with a transition note:

```
TRANSITION SUMMARY

Previous: Build Muscle (PPL, 6 days/week)
New: Lose Fat (Upper/Lower, 4 days/week)

Changes:
• Split adjusted from PPL to Upper/Lower (better for deficit recovery)
• Volume reduced 25% (preservation focus during fat loss)
• Cardio suggestions added to rest days
• 2 extra ab/core exercises per week

[Start New Plan]    [Go Back]
```

### Backend Behavior

```js
function switchGoal(currentPlan, newGoal, transitionType) {
  // 1. Archive current plan
  updatePlan(currentPlan.id, { status: 'switched', ended_at: now() });

  // 2. Preserve history
  // All workout_logs remain — they're linked by date, not plan
  // Exercise history carries forward for progression continuity

  // 3. Handle transition
  if (transitionType === 'finish_phase') {
    // Schedule deload for end of current phase
    // Queue new plan to start after deload
  } else if (transitionType === 'bridge_week') {
    // Convert remaining sessions this week to deload
    // Generate new plan starting next Monday
  } else if (transitionType === 'immediate') {
    // Generate new plan starting today
    // Clear remaining scheduled sessions
  }

  // 4. Generate new plan
  const newPlan = generateProgram(newGoal, updatedOnboarding);

  // 5. Carry forward exercise data
  // New plan's starting weights are based on most recent performance data
  // Not onboarding estimates — real logged data

  // 6. Update calendar
  clearFutureSchedule(currentPlan.id);
  scheduleWorkouts(newPlan);
}
```

### Preserving Continuity

Key design principle: **switching goals should never feel like starting from scratch.**

- Exercise history and PRs are permanent — they belong to the user, not the plan
- Starting weights for the new plan are seeded from recent workout logs
- Strength trends are continuous across plans
- The dashboard shows a unified timeline: "Plan 1: Build Muscle (12 weeks) → Plan 2: Cut (8 weeks)"

---

## 10. World-Class UX Decisions

### 1. The "Zero-Tap" Principle

The most common action — seeing today's workout — should require **zero decisions**. Open the app, navigate to Workouts, and the answer is already on screen. No menus, no selections, no configurations.

### 2. Progressive Disclosure

- **Surface:** Today's workout, weekly calendar, phase position
- **One tap deeper:** Exercise details, coaching cues, history
- **Two taps deeper:** Full program view, customization, exercise swaps
- **Settings:** Re-run onboarding, change goal, manual overrides

The casual user never needs to go past level one. The power user can go as deep as they want.

### 3. Coaching Tone, Not Robot Tone

Every system message should sound like a knowledgeable coach, not a database:

```
Bad:  "Session volume: 24 sets. Estimated duration: 58 minutes."
Good: "Today's push session is 7 exercises, ~58 minutes. Focus on controlling the eccentric."

Bad:  "Deload week scheduled for Week 4."
Good: "Next week is a recovery week. Go light — your body absorbs gains during rest."

Bad:  "Workout missed. Rescheduled."
Good: "Monday's session moved to Wednesday. Your week is still on track."
```

### 4. No Guilt, No Shame

- Never say "You missed a workout"
- Never show red warning indicators for missed sessions
- Use amber/neutral tones for adjustments
- Frame everything as what the system did to help, not what the user failed to do
- Missed sessions are just data points for the adaptation engine

### 5. Celebrate Quietly but Consistently

- **PR hit:** Subtle gold badge on the exercise → "New PR: 225 × 8"
- **Week completed:** Small confetti or checkmark animation on the weekly strip
- **Phase completed:** Card with summary stats → "Accumulation complete. Average volume up 12%."
- **Goal milestone:** "Halfway to your 12-week goal. Strength up 8% across all lifts."
- Never over-celebrate. The user is serious. Treat them like an athlete.

### 6. Smart Defaults, Full Overrides

Everything the system auto-generates can be manually overridden:
- Don't like an exercise? Tap → "Swap" → see alternatives for the same muscle group
- Want to skip a session? Long-press → "Skip" → system auto-rebalances
- Want to add an exercise? "Add Exercise" at the bottom of any session
- Want to change the split? Settings → "Change Program" → re-runs split logic
- But: **the defaults should be so good that 80% of users never customize anything**

### 7. The Weekly Rhythm

The app should create a sense of rhythm:
- Monday: "New week. Here's your plan." (weekly overview card)
- Training days: "Here's today's session." (zero-decision workout)
- Rest days: "Recovery day. Here's what's coming tomorrow."
- End of week: "Week complete. 5/5 sessions. Progression on 4 exercises."
- Phase transitions: "Phase complete. New phase starts Monday."

This rhythm makes the user feel carried through their training life.

### 8. Data Density Without Clutter

The Today view shows everything the user needs without scrolling on a laptop screen:
- Weekly strip (compact)
- Today's session card (name, phase, duration, exercise count)
- Exercise list (collapsed: name + sets + target weight + last session)
- Readiness status (one line)
- Up next (one line)

Expand for more. But the default view is a complete briefing.

### 9. The "Trust the System" Effect

After 2-3 weeks of using the workout section, the user should feel:
- "I don't need to think about what to do"
- "I just open the app and follow the plan"
- "It adjusts when I need it to"
- "I can see progress happening"
- "This feels like having a coach"

This is the ultimate product goal. Every decision in this design serves this feeling.

### 10. Integration Signals

Subtle cross-system signals that make Apex OS feel unified:

- Sleep log shows "7.2h — above your training baseline" on training days
- Nutrition page shows "Training day: +300 cal target, prioritize protein"
- Habits page auto-checks "Strength Training" when a workout is completed
- Dashboard shows "Push 1 at 6pm" in today's agenda
- Calendar page shows workout badges on training days
- Body Stats correlates weight trends with training phases

None of these require user setup. They happen automatically because the systems share data.

---

## Implementation Priority

### Phase 1: Core Engine (Build First)
1. New database tables (`workout_plans`, `workout_schedule`)
2. Onboarding flow (7 screens)
3. Enhanced program builder (split scoring, exercise selection, phase structure)
4. Auto-calendar scheduling
5. Today's Workout view (redesigned)

### Phase 2: Intelligence Layer
6. Auto-progression engine
7. Readiness score calculation
8. Session adjustment logic
9. Missed workout rescheduling
10. Deload triggering

### Phase 3: Coaching & Polish
11. Phase timeline visualization
12. Coaching messages and cues
13. Goal progress tracking
14. Goal switching flow
15. Cross-system integrations

### Phase 4: Power Features
16. Exercise swap suggestions
17. Drag/drop calendar editing
18. Workout history analytics
19. External calendar sync
20. Wearable deep integration
