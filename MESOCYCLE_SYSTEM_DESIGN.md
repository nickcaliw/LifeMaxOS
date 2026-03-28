# Apex OS Mesocycle-Based Hypertrophy System -- Full Design Spec

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Training Philosophy](#2-training-philosophy)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Mesocycle Builder](#4-mesocycle-builder)
5. [Exercise System](#5-exercise-system)
6. [Initial Load Estimation](#6-initial-load-estimation)
7. [Live Workout UX](#7-live-workout-ux)
8. [Post-Workout Feedback](#8-post-workout-feedback)
9. [Autoregulation & Adaptation Engine](#9-autoregulation--adaptation-engine)
10. [Progressive Overload Model](#10-progressive-overload-model)
11. [Volume Landmarks](#11-volume-landmarks)
12. [Deload Protocol](#12-deload-protocol)
13. [End-of-Mesocycle Flow](#13-end-of-mesocycle-flow)
14. [Calendar Integration](#14-calendar-integration)
15. [Data Model](#15-data-model)
16. [Screen-by-Screen UX](#16-screen-by-screen-ux)
17. [Implementation Phases](#17-implementation-phases)

---

## 1. SYSTEM OVERVIEW

The Mesocycle Coaching System replaces the existing linear phase model (`accumulation -> progression -> peak -> deload`) with a true mesocycle-based periodization engine. Instead of generating a flat weekly program that repeats with vague phase labels, the system plans a discrete training block (4-8 weeks) with week-specific volume, intensity, and exercise prescriptions that adapt based on the user's real performance data and subjective feedback.

The system operates as an autonomous hypertrophy coach:

```
ONBOARDING  -->  MESO GENERATION  -->  WEEK 1 (baseline)  -->  WEEK 2 (adapt)  -->  ...  -->  DELOAD  -->  NEXT MESO
                      |                      |                      |
                Template / Custom       Live logging          Adaptation engine
                Split selection         Set-by-set            reads feedback,
                Exercise selection      Weight/reps/RIR       adjusts volume,
                Volume allocation       Post-exercise         load, exercises
                                        feedback              for next week
```

Key difference from the existing `programBuilder.js`: the current system generates a single program with static phase multipliers (`volumeMult: 1.0, 1.1, 1.15, 0.6`). The mesocycle system generates a new weekly plan each week, informed by actual performance and feedback from the previous week. Volume, load, and exercise selection are living variables, not static prescriptions.

### Integration with Existing Code

- **exerciseLibrary.js**: Reused directly. The existing `EXERCISES` array and `MUSCLE_GROUPS` constant are the foundation. We extend each exercise entry with `fatigueRating`, `stimulusRating`, and `technicalComplexity` fields.
- **programBuilder.js**: The `VOLUME_MAP`, `SPLIT_CANDIDATES`, and `PHASE_PARAMS` constants are replaced by the mesocycle builder's own volume landmark system and weekly adaptation logic. The existing `generateProgram` and `generateSchedule` functions remain available for users who prefer the simple mode.
- **ActiveWorkout.jsx**: Extended to support per-exercise feedback prompts and RIR-guided target display. The existing set logging (weight/reps/RIR/setType) maps cleanly to the new `meso_sets` table.
- **WorkoutsPage.jsx**: Gains a new "Mesocycle" mode alongside the existing "Quick Workout" mode. The page detects whether an active mesocycle exists and routes accordingly.

---

## 2. TRAINING PHILOSOPHY

### Evidence-Based Hypertrophy Principles

The system is built on the scientific consensus from researchers including Schoenfeld, Israetel, Helms, and Krieger:

1. **Mechanical tension is the primary driver of hypertrophy.** The system prioritizes progressive overload in load and volume over metabolic stress or muscle damage.

2. **Volume is the primary modifiable variable.** Within a productive range, more hard sets generally produce more growth -- up to a recovery ceiling. The system tracks volume per muscle group per week in hard sets (sets within ~0-4 RIR).

3. **RIR-based autoregulation outperforms percentage-based programming.** Instead of prescribing "75% of 1RM," the system prescribes "3 RIR" and lets the user self-select load. This accounts for daily readiness fluctuations automatically.

4. **Stimulus-to-fatigue ratio determines exercise selection.** A machine fly produces nearly as much chest stimulus as a barbell bench press with far less systemic fatigue. The system scores exercises on this ratio and prioritizes high-SFR movements, reserving high-fatigue compounds for muscles that truly need them.

5. **Individual volume landmarks vary enormously.** One person's MRV for quads might be 12 sets/week; another's might be 22. The system discovers each user's landmarks through feedback and performance tracking over multiple mesocycles.

### Mesocycle Structure

A mesocycle is a planned training block of 4-8 weeks (user-configurable, default 5+1 deload):

```
WEEK 1 ---- WEEK 2 ---- WEEK 3 ---- WEEK 4 ---- WEEK 5 ---- WEEK 6 (DELOAD)
  |            |            |            |            |            |
Baseline    +volume      +volume      +volume      Peak push   Recovery
RIR 3-4     RIR 3        RIR 2-3      RIR 2        RIR 1-2     RIR 5+
MEV         MEV+         MAV zone     MAV/MRV      Near MRV    50% volume
```

**Week-to-week progression operates on three axes simultaneously:**

| Axis | Direction | Mechanism |
|------|-----------|-----------|
| Volume | Increases | +0-2 sets per muscle group per week, guided by feedback |
| Intensity (RIR) | Decreases (harder) | RIR target drops by ~0.5-1 per week |
| Load | Increases | When rep range top is hit at target RIR, weight goes up |

**Why this works:** Early weeks accumulate volume at moderate effort, building work capacity. Later weeks push closer to failure with higher loads. The deload dissipates accumulated fatigue, allowing supercompensation. The next mesocycle starts at a slightly higher baseline.

### Fatigue Management Model

The system tracks two types of fatigue:

- **Local fatigue** (per muscle group): tracked via soreness and pump feedback. High local fatigue on quads does not affect chest training.
- **Systemic fatigue** (whole body): tracked via session RPE, overall difficulty trends, and performance regression across multiple exercises. High systemic fatigue triggers a deload.

---

## 3. ONBOARDING FLOW

Eight screens, each single-purpose. Progress bar at top shows 1/8 through 8/8. Back button on every screen. All selections stored in a `mesoProfile` object.

### Screen 1: Profile

**Headline:** "Let's build your training profile"

**Fields:**
- Age: number stepper (16-80, default 28)
- Sex: segmented control [Male / Female / Prefer not to say]
- Height: number input with unit toggle (cm / ft-in)
- Weight: number input with unit toggle (kg / lbs)
- Training age: segmented control [< 6 months / 6-18 months / 1.5-3 years / 3-5 years / 5+ years]

**Mapping:**
```
training_age < 6 months       => experience: "beginner"
training_age 6-18 months      => experience: "beginner"  (late beginner)
training_age 1.5-3 years      => experience: "intermediate"
training_age 3-5 years        => experience: "intermediate" (advanced-intermediate)
training_age 5+ years         => experience: "advanced"
```

**Data stored:**
```js
{
  age: 28,
  sex: "male",
  height_cm: 180,
  weight_kg: 82,
  training_age_category: "1.5-3 years",
  experience: "intermediate"
}
```

---

### Screen 2: Goal

**Headline:** "What's your primary goal this block?"

**Options (card-style, single select):**

| Card | Label | Subtitle | Internal Key |
|------|-------|----------|--------------|
| 1 | Build Muscle | Maximize hypertrophy across all muscle groups | `hypertrophy` |
| 2 | Specialize | Bring up lagging muscle groups while maintaining others | `specialization` |
| 3 | Strength-Hypertrophy | Build muscle with an emphasis on compound strength | `strength_hypertrophy` |
| 4 | Recomposition | Build muscle and lose fat simultaneously | `recomp` |

**Behavior:**
- Selecting "Specialize" auto-advances to Screen 3.
- Selecting any other option skips Screen 3 and goes to Screen 4.

**Data stored:** `goal: "hypertrophy" | "specialization" | "strength_hypertrophy" | "recomp"`

---

### Screen 3: Specialization Target

**Headline:** "Which muscles need extra attention?"

**Shown only when:** `goal === "specialization"`

**Multi-select grid of muscle groups, organized by region:**

```
Upper Body:
  [ ] Chest       [ ] Back / Lats   [ ] Front Delts
  [ ] Side Delts  [ ] Rear Delts    [ ] Traps

Arms:
  [ ] Biceps      [ ] Triceps       [ ] Forearms

Lower Body:
  [ ] Quads       [ ] Hamstrings    [ ] Glutes    [ ] Calves

Core:
  [ ] Abs
```

**Rules:**
- Minimum 1 selection, maximum 4 selections (more than 4 is not specialization, it's everything)
- If user tries to select 5th, tooltip: "Specializing in too many muscles dilutes the effect. Pick your top priorities."

**Effect on programming:**
- Specialized muscles get +30% weekly volume vs. baseline
- Non-specialized muscles get maintenance volume (MEV)
- Split selection prioritizes templates that hit specialized muscles with higher frequency

**Data stored:** `specialization_targets: ["chest", "lateral_delts", "biceps"]`

---

### Screen 4: Schedule

**Headline:** "When can you train?"

**Section A -- Days per week:**
Segmented control: [3] [4] [5] [6]

**Section B -- Preferred days:**
7-column day selector (Mon-Sun). User taps to toggle. Number of active days must match Section A. If user selects more days than Section A allows, the earliest excess day deselects.

**Section C -- Session duration:**
Segmented control: [45 min] [60 min] [75 min] [90 min] [90+ min]

**Effect on programming:**
- `45 min`: max 5 exercises per session, shorter rest periods (60-90s)
- `60 min`: max 6 exercises, standard rest (90-120s)
- `75 min`: max 7 exercises, standard rest (90-150s)
- `90 min`: max 8 exercises, full rest (120-180s)
- `90+ min`: max 10 exercises, full rest (120-180s)

**Data stored:**
```js
{
  days_per_week: 5,
  preferred_days: [1, 2, 3, 5, 6],   // 1=Mon, 7=Sun
  session_duration: 75,
  max_exercises_per_session: 7
}
```

---

### Screen 5: Equipment & Limitations

**Headline:** "What do you have access to?"

**Section A -- Gym type (single select):**
- Full commercial gym (all equipment)
- Home gym -- barbell + rack + dumbbells + bench
- Home gym -- dumbbells + bench only
- Minimal -- bodyweight + bands + light dumbbells
- Custom (opens equipment checklist)

**Equipment checklist (shown for "Custom" or editable from any selection):**
```
[x] Barbell         [x] Dumbbells       [x] Cable machine
[x] Smith machine   [x] Pull-up bar     [x] Leg press
[x] Hack squat      [x] Chest fly machine   [x] Lat pulldown
[x] Leg curl machine  [x] Leg extension    [x] Pec deck
[x] EZ bar          [x] Kettlebells     [x] Bands
[x] Dip bars        [x] GHD             [x] Cables (dual)
```

**Section B -- Injuries / Limitations (multi-select, optional):**
- Lower back issues (avoids: deadlifts, barbell rows, good mornings)
- Shoulder issues (avoids: overhead press, upright rows, behind-neck movements)
- Knee issues (avoids: deep squats, leg extensions, lunges)
- Wrist issues (avoids: barbell curls, front squats, push-ups)
- Elbow issues (avoids: skull crushers, heavy triceps extensions)
- Hip issues (avoids: deep squats, sumo stance, hip thrusts with heavy load)
- None

**Section C -- Exercises to avoid (optional free-text or search-and-exclude):**
- Search box filtering `EXERCISES` by name
- User can add exercises to an exclusion list

**Data stored:**
```js
{
  gym_type: "full_commercial",
  available_equipment: ["barbell", "dumbbell", "cable", "machine", ...],
  injuries: ["shoulder"],
  excluded_exercises: ["behind_neck_press", "upright_row"]
}
```

---

### Screen 6: Recovery Profile

**Headline:** "How well do you recover?"

**Section A -- Sleep (segmented):**
- < 6 hours / 6-7 hours / 7-8 hours / 8+ hours

**Section B -- Stress level (segmented):**
- Low / Moderate / High / Very High

**Section C -- Daily activity level (segmented):**
- Sedentary (desk job) / Lightly active / Moderately active / Very active (physical job)

**Section D -- Recovery ability self-assessment (segmented):**
- "I recover slowly -- often sore for 3+ days"
- "Average recovery -- sore for 1-2 days"
- "I recover fast -- rarely sore past 24 hours"

**Recovery score calculation (internal, 1-10 scale):**
```js
function calculateRecoveryScore(profile) {
  let score = 5; // baseline

  // Sleep
  if (profile.sleep === "8+")       score += 2;
  else if (profile.sleep === "7-8") score += 1;
  else if (profile.sleep === "<6")  score -= 2;

  // Stress
  if (profile.stress === "low")        score += 1;
  else if (profile.stress === "high")  score -= 1;
  else if (profile.stress === "very_high") score -= 2;

  // Activity
  if (profile.activity === "sedentary")     score += 0; // neutral, good recovery but poor work capacity
  else if (profile.activity === "very_active") score -= 1; // competes with training recovery

  // Self-assessment (weighted heavily -- the user knows their body)
  if (profile.recovery_ability === "fast")  score += 2;
  else if (profile.recovery_ability === "slow") score -= 2;

  return Math.max(1, Math.min(10, score));
}
```

**Effect on programming:**
- Recovery score 1-3: volume starts 20% below normal MEV, conservative RIR targets (+1 RIR), shorter mesos recommended (4 weeks)
- Recovery score 4-6: normal volume and RIR targets
- Recovery score 7-10: volume starts 10% above normal MEV, can tolerate longer mesos (6-8 weeks)

**Data stored:**
```js
{
  sleep: "7-8",
  stress: "moderate",
  activity: "sedentary",
  recovery_ability: "average",
  recovery_score: 6
}
```

---

### Screen 7: Mesocycle Config

**Headline:** "Configure your training block"

**Section A -- Mesocycle length:**
Slider or stepper: 4 to 8 weeks (not counting deload). Default based on experience:
- Beginner: 4 weeks (+ 1 deload = 5 total)
- Intermediate: 5 weeks (+ 1 deload = 6 total)
- Advanced: 6 weeks (+ 1 deload = 7 total)

Tooltip: "Longer mesocycles allow more progression but require better fatigue management. The system will trigger an early deload if needed."

**Section B -- Start date:**
Date picker, defaults to next Monday.

**Section C -- Include deload week:**
Toggle, default ON. Tooltip: "Experienced lifters may skip deloads between mesocycles. Not recommended for most."

**Data stored:**
```js
{
  meso_length: 5,           // training weeks (not counting deload)
  include_deload: true,
  total_weeks: 6,           // meso_length + (include_deload ? 1 : 0)
  start_date: "2026-03-30"  // always a Monday
}
```

---

### Screen 8: Template Chooser / Custom Builder

**Headline:** "Choose your training split"

**Section A -- Recommended template:**
System shows the top-scored template with a "Recommended for you" badge. Scoring algorithm (see Section 4B) runs against user inputs.

**Section B -- All templates:**
Grid of template cards (2 columns). Each card shows:
- Template name
- Days/week
- Muscle frequency badge ("2x frequency" etc.)
- Experience level tag
- Preview: list of day labels

**Section C -- Custom option:**
"Build your own split" card at bottom. Opens the custom builder (see Section 4C).

**Behavior:**
- Tapping a template card opens a detail sheet showing the full weekly layout with muscle assignments per day.
- "Select" button confirms the template.
- "Customize" button on any template opens it in the custom builder for modification.

**Data stored:** `template_id: "upper_lower"` or `custom_split: { ... }`

---

## 4. MESOCYCLE BUILDER

### A. Template Library

All templates define: days per week, session labels, muscle assignments per session, weekly volume targets per muscle (in hard sets), recommended experience level, and recovery demand.

Volume targets shown are for the **hypertrophy** goal at **intermediate** experience. Adjustments for other goals and experience levels are applied multiplicatively (see the goal and experience multiplier tables after the templates).

---

#### Template 1: Full Body 3x (Beginner)

| | Day 1: Full Body A | Day 2: Full Body B | Day 3: Full Body C |
|---|---|---|---|
| Primary | Chest, Quads | Back, Glutes | Chest, Hamstrings |
| Secondary | Back, Triceps | Shoulders, Hamstrings | Back, Biceps |
| Tertiary | Biceps, Abs | Biceps, Calves | Shoulders, Abs |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 8 | 2x |
| Back | 8 | 3x |
| Quads | 6 | 1-2x |
| Hamstrings | 6 | 1-2x |
| Glutes | 4 | 1x |
| Side Delts | 6 | 2x |
| Biceps | 6 | 2x |
| Triceps | 4 | 1-2x |
| Abs | 4 | 2x |
| Calves | 4 | 1x |

**Experience:** Beginner | **Recovery demand:** Low | **Best for:** New lifters, fat loss phases, time-constrained

---

#### Template 2: Upper/Lower 4x

| | Day 1: Upper A | Day 2: Lower A | Day 3: Upper B | Day 4: Lower B |
|---|---|---|---|---|
| Focus | Horizontal push/pull | Quad dominant | Vertical push/pull | Hip dominant |
| Muscles | Chest, Back, Side Delts, Biceps, Triceps | Quads, Hamstrings, Glutes, Calves, Abs | Chest, Back, Side Delts, Biceps, Triceps | Hamstrings, Glutes, Quads, Calves, Abs |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 12 | 2x |
| Back | 12 | 2x |
| Quads | 10 | 2x |
| Hamstrings | 8 | 2x |
| Glutes | 6 | 2x |
| Side Delts | 12 | 2x |
| Biceps | 10 | 2x |
| Triceps | 10 | 2x |
| Abs | 6 | 2x |
| Calves | 6 | 2x |

**Experience:** Beginner-Intermediate | **Recovery demand:** Moderate | **Best for:** Most lifters, balanced development

---

#### Template 3: Push/Pull/Legs 6x

| | Push A | Pull A | Legs A | Push B | Pull B | Legs B |
|---|---|---|---|---|---|---|
| Focus | Chest emphasis | Back width | Quad emphasis | Shoulder emphasis | Back thickness | Hip emphasis |
| Muscles | Chest, Front Delts, Side Delts, Triceps | Back, Lats, Rear Delts, Biceps, Abs | Quads, Hamstrings, Glutes, Calves | Chest, Side Delts, Front Delts, Triceps | Back, Rear Delts, Biceps, Traps, Abs | Hamstrings, Glutes, Quads, Calves |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 16 | 2x |
| Back | 16 | 2x |
| Quads | 12 | 2x |
| Hamstrings | 10 | 2x |
| Glutes | 8 | 2x |
| Side Delts | 14 | 2x |
| Rear Delts | 8 | 2x |
| Biceps | 12 | 2x |
| Triceps | 12 | 2x |
| Abs | 6 | 2x |
| Calves | 8 | 2x |

**Experience:** Intermediate-Advanced | **Recovery demand:** High | **Best for:** Maximizing volume, serious hypertrophy

---

#### Template 4: Push/Pull/Legs 5x (with rest)

| | Push | Pull | Legs | Upper | Lower |
|---|---|---|---|---|---|
| Focus | Chest & pressing | Back & pulling | Full lower | Delts, arms, weak points | Glutes, hams, calves |
| Muscles | Chest, Side Delts, Triceps | Back, Biceps, Rear Delts, Abs | Quads, Hamstrings, Glutes, Calves | Chest, Back, Side Delts, Biceps, Triceps | Quads, Hamstrings, Glutes, Calves, Abs |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 14 | 2x |
| Back | 14 | 2x |
| Quads | 10 | 2x |
| Hamstrings | 10 | 2x |
| Glutes | 8 | 2x |
| Side Delts | 14 | 2x |
| Biceps | 10 | 2x |
| Triceps | 10 | 2x |
| Abs | 6 | 2x |
| Calves | 6 | 2x |

**Experience:** Intermediate | **Recovery demand:** Moderate-High | **Best for:** PPL lifters who want a rest day mid-week

---

#### Template 5: Upper/Lower/PPL 5x Hybrid

| | Upper | Lower | Push | Pull | Legs |
|---|---|---|---|---|---|
| Focus | Full upper body | Full lower body | Chest & pressing | Back & pulling | Quad & glute focus |
| Muscles | Chest, Back, Side Delts, Biceps, Triceps | Quads, Hamstrings, Glutes, Calves, Abs | Chest, Side Delts, Triceps | Back, Rear Delts, Biceps, Abs | Quads, Hamstrings, Glutes, Calves |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 14 | 2x |
| Back | 14 | 2x |
| Quads | 10 | 2x |
| Hamstrings | 10 | 2x |
| Glutes | 8 | 2x |
| Side Delts | 12 | 2x |
| Biceps | 10 | 2x |
| Triceps | 10 | 2x |
| Abs | 6 | 2x |
| Calves | 6 | 2x |

**Experience:** Intermediate | **Recovery demand:** Moderate | **Best for:** Balanced frequency with PPL variety

---

#### Template 6: Chest & Arms Specialization 5x

| | Push (Chest Focus) | Pull | Legs | Chest & Biceps | Shoulders & Triceps |
|---|---|---|---|---|---|
| Focus | Heavy chest compounds | Back & biceps | Full lower | Chest isolation + biceps | Delts + triceps |
| Muscles | Chest, Triceps, Front Delts | Back, Biceps, Rear Delts, Abs | Quads, Hamstrings, Glutes, Calves | Chest, Biceps | Side Delts, Rear Delts, Triceps |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 20 | 3x (SPECIALIZED) |
| Back | 10 | 1x (maintenance) |
| Quads | 8 | 1x (maintenance) |
| Hamstrings | 6 | 1x (maintenance) |
| Glutes | 4 | 1x (maintenance) |
| Side Delts | 10 | 2x |
| Biceps | 16 | 2x (SPECIALIZED) |
| Triceps | 14 | 2x (SPECIALIZED) |
| Abs | 4 | 1x |
| Calves | 4 | 1x |

**Experience:** Intermediate-Advanced | **Recovery demand:** Moderate-High | **Best for:** Lagging chest and arms

---

#### Template 7: Back & Shoulders Specialization 5x

| | Pull (Back Heavy) | Push | Legs | Back & Rear Delts | Shoulders & Arms |
|---|---|---|---|---|---|
| Focus | Heavy back compounds | Chest & pressing | Full lower | Back width + rear delts | All delt heads + arms |
| Muscles | Back, Rear Delts, Biceps | Chest, Side Delts, Triceps | Quads, Hamstrings, Glutes, Calves | Back, Rear Delts, Traps | Side Delts, Front Delts, Biceps, Triceps |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 8 | 1x (maintenance) |
| Back | 20 | 3x (SPECIALIZED) |
| Quads | 8 | 1x (maintenance) |
| Hamstrings | 6 | 1x (maintenance) |
| Glutes | 4 | 1x (maintenance) |
| Side Delts | 16 | 2x (SPECIALIZED) |
| Rear Delts | 12 | 2x (SPECIALIZED) |
| Biceps | 10 | 2x |
| Triceps | 8 | 1x |
| Abs | 4 | 1x |
| Calves | 4 | 1x |

**Experience:** Intermediate-Advanced | **Recovery demand:** Moderate-High | **Best for:** V-taper development, lagging back/delts

---

#### Template 8: Glutes & Legs Specialization 5x

| | Legs (Quad Focus) | Upper A | Legs (Glute/Ham) | Upper B | Legs (Accessory) |
|---|---|---|---|---|---|
| Focus | Heavy squats + quad | Maintenance upper | Hip hinge + glutes | Maintenance upper | Isolation + calves |
| Muscles | Quads, Glutes, Calves | Chest, Back, Side Delts, Biceps, Triceps | Hamstrings, Glutes, Quads | Chest, Back, Side Delts, Biceps, Triceps | Quads, Hamstrings, Glutes, Calves, Abs |

**Weekly Volume Targets (sets/week):**

| Muscle | Sets | Frequency |
|--------|------|-----------|
| Chest | 8 | 2x (maintenance) |
| Back | 8 | 2x (maintenance) |
| Quads | 18 | 3x (SPECIALIZED) |
| Hamstrings | 14 | 2x (SPECIALIZED) |
| Glutes | 16 | 3x (SPECIALIZED) |
| Side Delts | 6 | 2x (maintenance) |
| Biceps | 6 | 2x (maintenance) |
| Triceps | 6 | 2x (maintenance) |
| Abs | 4 | 1x |
| Calves | 10 | 2x (SPECIALIZED) |

**Experience:** Intermediate-Advanced | **Recovery demand:** High | **Best for:** Lagging lower body, glute development

---

#### Volume Adjustment Multipliers

**By goal (applied to template baseline volumes):**

| Goal | Multiplier | Notes |
|------|-----------|-------|
| Hypertrophy | 1.0x | Baseline -- templates are designed for this |
| Specialization | Varies | Specialized muscles 1.3x, others 0.65x (maintenance) |
| Strength-Hypertrophy | 0.85x | Slightly less total volume, but heavier loads |
| Recomp | 0.9x | Slightly reduced to account for caloric deficit recovery |

**By experience level:**

| Experience | Multiplier | Rationale |
|-----------|-----------|-----------|
| Beginner | 0.70x | Lower MRV, faster recovery, less volume needed |
| Intermediate | 1.0x | Baseline |
| Advanced | 1.15x | Higher volume tolerance, harder to stimulate growth |

**By recovery score (from Screen 6):**

| Recovery Score | Multiplier |
|---------------|-----------|
| 1-3 | 0.80x |
| 4-6 | 1.0x |
| 7-10 | 1.10x |

**Final volume formula:**
```
weekly_sets[muscle] = template_base[muscle] * goal_mult * experience_mult * recovery_mult
```

Rounded to nearest integer, clamped to `[MEV, MRV]` for the muscle group.

---

### B. Split Recommendation Engine

The scoring algorithm evaluates each template against user inputs and returns a ranked list.

```js
function scoreTemplate(template, profile) {
  let score = 0;

  // 1. Days match (critical -- 0 or 40 points)
  if (template.daysPerWeek === profile.days_per_week) {
    score += 40;
  } else if (Math.abs(template.daysPerWeek - profile.days_per_week) === 1) {
    score += 15; // close enough, can be adapted
  } else {
    return 0; // hard disqualify: 3-day user cannot do 6-day program
  }

  // 2. Experience match (0-20 points)
  const EXP_ORDER = ["beginner", "intermediate", "advanced"];
  const userExp = EXP_ORDER.indexOf(profile.experience);
  const templateMinExp = EXP_ORDER.indexOf(template.minExperience);

  if (userExp >= templateMinExp) {
    score += 20; // user meets or exceeds minimum
  } else {
    score -= 20; // user is under-experienced for this template
  }

  // 3. Goal alignment (0-20 points)
  if (template.bestGoals.includes(profile.goal)) {
    score += 20;
  } else {
    score += 5; // any template can work, just not optimal
  }

  // 4. Recovery match (0-15 points)
  const RECOVERY_MAP = { low: 3, moderate: 2, high: 1 };
  const demandScore = RECOVERY_MAP[template.recoveryDemand];
  if (profile.recovery_score >= 7) {
    score += 15; // high recovery can handle anything
  } else if (profile.recovery_score >= 4) {
    score += demandScore <= 2 ? 15 : 5; // moderate recovery, penalize high demand
  } else {
    score += demandScore === 3 ? 15 : 0; // low recovery, only low demand templates
  }

  // 5. Specialization match (0-15 points, only for specialization goal)
  if (profile.goal === "specialization" && profile.specialization_targets) {
    const specTargets = profile.specialization_targets;
    const templateSpecVolumes = computeSpecializationCoverage(template, specTargets);
    // Higher score if the template naturally hits specialized muscles more often
    const coverageRatio = templateSpecVolumes.covered / specTargets.length;
    score += Math.round(coverageRatio * 15);
  }

  // 6. Session duration feasibility (0 or -10 penalty)
  const estimatedExercises = template.sessions.reduce(
    (max, s) => Math.max(max, s.muscles.length), 0
  );
  if (estimatedExercises > profile.max_exercises_per_session + 2) {
    score -= 10; // sessions would be too long
  }

  return score;
}

function computeSpecializationCoverage(template, targets) {
  // Count how many sessions hit each specialized muscle
  let covered = 0;
  for (const target of targets) {
    const freq = template.sessions.filter(s => s.muscles.includes(target)).length;
    if (freq >= 2) covered++;
  }
  return { covered };
}
```

**Template recommendation output:** sorted by score descending. Top template gets "Recommended" badge. Templates scoring < 20 are grayed out with "Not ideal for your profile" label.

---

### C. Custom Builder

The custom builder presents a drag-and-drop interface for assigning muscle groups to training days.

**Layout:**

```
+-------------------------------------------------------------------+
|  CUSTOM SPLIT BUILDER                              [Days: 5]  [-][+]  |
+-------------------------------------------------------------------+
|                                                                   |
|  AVAILABLE MUSCLES           YOUR WEEK                            |
|  ┌──────────────┐           ┌──────────────────────────────────┐  |
|  │ Chest        │           │ Day 1: _______________           │  |
|  │ Back / Lats  │           │   [ ] [ ] [ ] [ ] [ ]            │  |
|  │ Front Delts  │           │                                  │  |
|  │ Side Delts   │           │ Day 2: _______________           │  |
|  │ Rear Delts   │           │   [ ] [ ] [ ] [ ] [ ]            │  |
|  │ Biceps       │           │                                  │  |
|  │ Triceps      │           │ Day 3: _______________           │  |
|  │ Quads        │           │   [ ] [ ] [ ] [ ] [ ]            │  |
|  │ Hamstrings   │           │                                  │  |
|  │ Glutes       │           │ Day 4: _______________           │  |
|  │ Calves       │           │   [ ] [ ] [ ] [ ] [ ]            │  |
|  │ Abs          │           │                                  │  |
|  │ Traps        │           │ Day 5: _______________           │  |
|  │ Forearms     │           │   [ ] [ ] [ ] [ ] [ ]            │  |
|  └──────────────┘           └──────────────────────────────────┘  |
|                                                                   |
|  VOLUME SUMMARY                                                   |
|  Chest: 12 sets/wk (2x freq) [====████████====] in range          |
|  Back:  14 sets/wk (2x freq) [====██████████==] in range          |
|  Quads: 4 sets/wk  (1x freq) [██══════════════] BELOW MEV !!      |
|  ...                                                              |
+-------------------------------------------------------------------+
```

**Interactions:**
- Drag a muscle chip from "Available" onto a day slot, or click a day's empty slot to open a muscle picker
- Each muscle can appear on multiple days (for 2x/3x frequency)
- Day labels are editable text fields ("Push A", "Leg Day", etc.)
- Volume summary bar updates live as muscles are assigned
- Warning indicators when a muscle is below MEV or above MRV
- "Auto-fill" button: system distributes remaining volume optimally

**Validation rules:**
- Every major muscle group must appear at least once (warning, not blocking)
- No day can have more than 6 muscle groups (session would be too long)
- If a muscle appears 0 times, a yellow warning: "Quads have no training day assigned"

**Output:** Same data format as a template, stored as a custom split object.

---

### D. Output -- Generated Weekly Plan

Once a template (or custom split) is selected, the system generates the full mesocycle. For each training day in each week:

```js
// Generated day object
{
  day_number: 1,
  label: "Push A",
  target_muscles: ["chest", "lateral_delts", "triceps"],
  exercises: [
    {
      exercise_id: "barbell_bench_press",
      exercise_name: "Barbell Bench Press",
      muscle_group: "chest",
      sets: 3,                    // week 1 baseline
      rep_range: [8, 12],
      rir_target: 3,              // week 1 RIR
      rest_seconds: 150,
      order: 1,
      notes: "Compound -- do first while fresh"
    },
    {
      exercise_id: "incline_dumbbell_bench_press",
      exercise_name: "Incline Dumbbell Bench Press",
      muscle_group: "chest",
      sets: 3,
      rep_range: [8, 12],
      rir_target: 3,
      rest_seconds: 120,
      order: 2,
      notes: null
    },
    {
      exercise_id: "cable_lateral_raise",
      exercise_name: "Cable Lateral Raise",
      muscle_group: "lateral_delts",
      sets: 3,
      rep_range: [12, 15],
      rir_target: 3,
      rest_seconds: 75,
      order: 3,
      notes: "Slow eccentric, 2 second pause at top"
    },
    // ... more exercises
  ]
}
```

**Exercise ordering rules within a session:**
1. Compound movements for primary muscles first (highest neural demand)
2. Compound movements for secondary muscles
3. Isolation movements for primary muscles
4. Isolation movements for secondary muscles
5. Core/abs last

**Set distribution rules:**
```js
function distributeSets(muscle, totalWeeklySets, frequencyThisWeek, weekNumber, mesoLength) {
  // Split weekly volume evenly across sessions that hit this muscle
  const setsPerSession = Math.round(totalWeeklySets / frequencyThisWeek);

  // Within a session, distribute across exercises:
  // First exercise (compound): 60% of session sets (min 2, max 4)
  // Second exercise: 30% of session sets (min 1, max 3)
  // Third exercise (if any): 10% of session sets (min 1, max 2)

  // Example: 6 sets for chest in one session
  // Exercise 1 (BB Bench): 3 sets
  // Exercise 2 (Incline DB): 2 sets
  // Exercise 3 (Cable Fly): 1 set

  return distributedSets;
}
```

---

## 5. EXERCISE SYSTEM

### Extended Exercise Data Model

The existing `exerciseLibrary.js` exercises are extended with additional fields for the mesocycle system:

```js
{
  // Existing fields (from exerciseLibrary.js)
  id: "barbell_bench_press",
  name: "Barbell Bench Press",
  primaryMuscle: "chest",
  secondaryMuscles: ["front_delts", "triceps"],
  equipment: "barbell",
  category: "compound",          // "compound" | "isolation"
  movement: "horizontal_push",   // movement pattern
  instructions: "...",
  defaultRest: 150,

  // NEW fields for mesocycle system
  fatigueRating: 4,              // 1-5, how much systemic fatigue it generates
                                 // 5 = deadlift, squat; 1 = cable curl
  stimulusRating: 4,             // 1-5, how much growth stimulus for the primary muscle
                                 // 5 = great stretch + tension; 1 = poor muscle targeting
  technicalComplexity: 3,        // 1-3
                                 // 3 = Olympic lifts, heavy compounds with injury risk
                                 // 2 = standard compounds (bench, row)
                                 // 1 = machines, cables, simple isolations
  recommendedRepRange: [6, 10],  // optimal rep range for this movement
  demoUrl: null,                 // optional video/gif URL
  cues: [                        // coaching cues shown during workout
    "Retract your scapulae before unracking",
    "Touch mid-chest, press in a slight arc back to over shoulders",
    "Drive your feet into the floor"
  ]
}
```

**Fatigue and Stimulus ratings for key exercises:**

| Exercise | Stimulus | Fatigue | SFR Ratio | Notes |
|----------|----------|---------|-----------|-------|
| Barbell Bench Press | 4 | 4 | 1.0 | High stimulus but high fatigue |
| Machine Chest Press | 4 | 2 | 2.0 | Similar stimulus, much less fatigue |
| Cable Fly | 3 | 1 | 3.0 | Great isolation, minimal fatigue |
| Barbell Squat | 5 | 5 | 1.0 | King of quad exercises, very fatiguing |
| Leg Press | 4 | 3 | 1.33 | Nearly as good with less systemic cost |
| Hack Squat | 4 | 3 | 1.33 | Excellent quad stimulus |
| Leg Extension | 3 | 1 | 3.0 | Pure quad isolation |
| Barbell Row | 4 | 4 | 1.0 | Heavy compound |
| Cable Row | 4 | 2 | 2.0 | Great back stimulus, low fatigue |
| Lat Pulldown | 4 | 2 | 2.0 | Excellent lat isolation-compound |
| Cable Lateral Raise | 4 | 1 | 4.0 | Best SFR for side delts |
| Dumbbell Lateral Raise | 3 | 1 | 3.0 | Good but less constant tension |
| Barbell Curl | 3 | 2 | 1.5 | Moderate |
| Incline Dumbbell Curl | 4 | 1 | 4.0 | Excellent stretch, low fatigue |
| Cable Curl | 3 | 1 | 3.0 | Good constant tension |
| Romanian Deadlift | 4 | 4 | 1.0 | Great hamstring stretch, very fatiguing |
| Lying Leg Curl | 4 | 1 | 4.0 | High stimulus, minimal fatigue |

### Exercise Selection Algorithm

```js
function selectExercises(day, profile, previousWeekExercises) {
  const selectedExercises = [];

  for (const muscle of day.target_muscles) {
    // Step 1: Get all exercises for this muscle
    let candidates = getExercisesForMuscle(muscle);

    // Step 2: Filter by equipment availability
    candidates = candidates.filter(ex =>
      profile.available_equipment.includes(ex.equipment)
    );

    // Step 3: Filter out excluded exercises and injury-restricted movements
    candidates = candidates.filter(ex =>
      !profile.excluded_exercises.includes(ex.id) &&
      !isRestrictedByInjury(ex, profile.injuries)
    );

    // Step 4: Filter by technical complexity for beginners
    if (profile.experience === "beginner") {
      candidates = candidates.filter(ex => ex.technicalComplexity <= 2);
    }

    // Step 5: Determine how many exercises for this muscle today
    const setsForMuscleToday = day.volume_allocation[muscle];
    let numExercises;
    if (setsForMuscleToday <= 3) numExercises = 1;
    else if (setsForMuscleToday <= 6) numExercises = 2;
    else numExercises = 3; // max 3 exercises per muscle per session

    // Step 6: Score and rank candidates
    const scored = candidates.map(ex => ({
      ...ex,
      score: scoreExercise(ex, muscle, day, profile, previousWeekExercises)
    }));
    scored.sort((a, b) => b.score - a.score);

    // Step 7: Pick top exercises, ensuring variety
    //   - First exercise: highest score (usually a compound)
    //   - Second exercise: highest score from a DIFFERENT movement pattern
    //   - Third exercise: highest score, different again
    const picked = pickWithVariety(scored, numExercises);

    selectedExercises.push(...picked.map((ex, i) => ({
      ...ex,
      muscle_group: muscle,
      sets: distributeMuscleSets(setsForMuscleToday, numExercises, i),
      rep_range: ex.recommendedRepRange || [8, 12],
      rest_seconds: ex.defaultRest || 120
    })));
  }

  // Step 8: Enforce max exercises per session
  if (selectedExercises.length > profile.max_exercises_per_session) {
    // Remove lowest-priority exercises (isolations for secondary muscles first)
    return trimToLimit(selectedExercises, profile.max_exercises_per_session);
  }

  // Step 9: Order exercises (compounds first, then isolations, abs last)
  return orderExercises(selectedExercises);
}

function scoreExercise(exercise, muscle, day, profile, previousWeekExercises) {
  let score = 0;

  // Stimulus-to-fatigue ratio is the primary ranking factor (0-40 points)
  const sfr = exercise.stimulusRating / Math.max(exercise.fatigueRating, 1);
  score += sfr * 10; // range: ~2-40

  // Compound bonus for first exercise slot (0-15 points)
  if (exercise.category === "compound") {
    score += 15;
  }

  // Variety bonus: prefer exercises not used on other days this week (0-10 points)
  const usedThisWeek = previousWeekExercises?.filter(e => e.id === exercise.id).length || 0;
  score += (usedThisWeek === 0) ? 10 : 0;

  // Movement pattern coverage (0-10 points)
  // Prefer different movement patterns within the same muscle
  // e.g., for chest: horizontal push + incline push + fly
  score += 10; // base, reduced if pattern already covered

  // Strength-hypertrophy goal bonus for heavy compounds (0-10 points)
  if (profile.goal === "strength_hypertrophy" && exercise.category === "compound") {
    score += 10;
  }

  // Beginner preference for machines (0-5 points)
  if (profile.experience === "beginner" && exercise.technicalComplexity === 1) {
    score += 5;
  }

  return score;
}

function distributeMuscleSets(totalSets, numExercises, exerciseIndex) {
  // Distribute sets across exercises with front-loading
  if (numExercises === 1) return totalSets;
  if (numExercises === 2) {
    return exerciseIndex === 0
      ? Math.ceil(totalSets * 0.6)    // first exercise gets more
      : Math.floor(totalSets * 0.4);
  }
  if (numExercises === 3) {
    const distribution = [0.45, 0.30, 0.25];
    return Math.max(1, Math.round(totalSets * distribution[exerciseIndex]));
  }
}
```

---

## 6. INITIAL LOAD ESTIMATION

### Week 1 Load Setup

Week 1 is the "calibration week." The system needs starting weights for every exercise. Three approaches, in order of preference:

**Approach A: Import from existing workout history**

If the user has logged workouts in the existing Apex OS system (via `workoutApi`), the system pulls the most recent working set data for each exercise:

```js
function estimateFromHistory(exerciseId, recentSets) {
  // Find the heaviest set in the last 4 weeks where reps >= 6
  const relevantSets = recentSets
    .filter(s => s.exercise_id === exerciseId && s.reps >= 6 && s.completed)
    .sort((a, b) => b.weight - a.weight);

  if (relevantSets.length === 0) return null;

  const bestSet = relevantSets[0];
  // Estimate what they could do at RIR 3 (conservative)
  // If they did 185 lbs x 8 reps (probably 1-2 RIR),
  // RIR 3 would be about 5% lighter
  const conservativeWeight = Math.round(bestSet.weight * 0.95 / 2.5) * 2.5;

  return { weight: conservativeWeight, source: "history" };
}
```

**Approach B: Import from Hevy CSV**

The existing `hevyCsv.js` parser already supports this. After import, run the same logic as Approach A on the imported data.

**Approach C: Manual entry with guidance**

For each exercise in Week 1, show a guided input:

```
┌─────────────────────────────────────────────────────────┐
│  Barbell Bench Press                                     │
│                                                          │
│  What weight could you do for ~10 reps with             │
│  moderate effort (about 3 reps left in the tank)?       │
│                                                          │
│  Weight: [___] lbs                                       │
│                                                          │
│  ○ I'm not sure -- I'll figure it out during the workout │
│                                                          │
│  If unsure, the system will ask you after your first     │
│  set to rate difficulty and adjust from there.           │
└─────────────────────────────────────────────────────────┘
```

If the user selects "not sure," the system starts with no weight target and after their first set asks:

```
"You did [X] lbs for [Y] reps. How did that feel?"
  - Way too easy (could do 5+ more reps) → suggest +10-15%
  - Moderate (could do 3-4 more reps) → keep this weight (RIR 3-4, perfect)
  - Hard (could do 1-2 more reps) → suggest -5-10%
  - Struggled (barely finished) → suggest -15-20%
```

### RIR Starting Point

All exercises in Week 1 target **RIR 3-4** regardless of goal. This is deliberately conservative. Rationale:
- Allows the system to calibrate loads before pushing hard
- Gives the user time to learn movement patterns if new
- Provides a clear runway for RIR to decrease across the mesocycle
- Minimizes excessive soreness in the first week (which could skew feedback)

---

## 7. LIVE WORKOUT UX

### Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                    Push A                    ⏱ 47:23   │
│              Week 3 of 6  •  Day 1  •  Chest, Delts, Triceps   │
│  ████████████████████████░░░░░░░░  4/7 exercises                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BARBELL BENCH PRESS                          [↔ Swap Exercise]  │
│  Chest (compound)                                                │
│  Target: 3 sets × 8-12 reps @ RIR 3                             │
│  Last week: 175 lbs × 10, 10, 9                                 │
│  Recommended: 180 lbs (hit top of range last week)              │
│                                                                  │
│  ┌──────┬──────────┬──────────┬──────────┬──────────┐           │
│  │ Set  │ Weight   │ Reps     │ RIR      │ Status   │           │
│  ├──────┼──────────┼──────────┼──────────┼──────────┤           │
│  │  1   │ [180   ] │ [10    ] │ [3     ] │ [ ✓ ]    │           │
│  │  2   │ [180   ] │ [  _   ] │ [  _   ] │ [    ]   │ ← active │
│  │  3   │ [180   ] │ [  _   ] │ [  _   ] │ [    ]   │           │
│  └──────┴──────────┴──────────┴──────────┴──────────┘           │
│                                                                  │
│  [+ Add Set]                                                     │
│                                                                  │
│  ┌───────────────────────────────────────────────┐              │
│  │  REST TIMER          1:32 / 2:00              │              │
│  │  ████████████████████████░░░░░░░              │              │
│  │              [Skip]  [+30s]                   │              │
│  └───────────────────────────────────────────────┘              │
│                                                                  │
│  Cue: "Retract scapulae. Touch mid-chest. Drive feet."         │
│                                                                  │
│  [← Previous]                              [Next Exercise →]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Header

- **Back button**: prompts "Discard workout?" confirmation (or "Save and exit" to save partial progress)
- **Workout title**: from the day's label (e.g., "Push A")
- **Timer**: elapsed time since workout start, ticking
- **Meso context line**: "Week 3 of 6 - Day 1 - Chest, Delts, Triceps" gives the user full context
- **Progress bar**: fills as exercises are completed (4/7 = ~57%)

### Exercise Card

- **Exercise name**: large, bold
- **Swap button**: opens exercise swap sheet (same muscle, different movement pattern)
- **Muscle group + category**: small subtitle
- **Target prescription**: "3 sets x 8-12 reps @ RIR 3" -- the system's prescription for this week
- **Last week data**: if exercise was done last week, show weight and reps per set
- **Recommended weight**: calculated from last week's performance (see Section 9 load decision logic). Shown as a suggestion, not a requirement.

### Set Logging Table

Each row represents one set:
- **Weight input**: numeric, pre-filled with recommended weight. Tapping opens a number pad. Supports lbs/kg based on user preference.
- **Reps input**: numeric, blank until logged
- **RIR input**: numeric (0-5), optional. If not entered, system estimates from reps vs. target. Tooltip: "How many more reps could you have done?"
- **Complete button**: checkmark. Tapping it:
  1. Marks the set as completed
  2. Records the timestamp
  3. Starts the rest timer
  4. Auto-focuses the weight field on the next set (pre-filled with same weight)

**"+ Add Set" button**: Adds one more set to this exercise (beyond the prescribed target). Useful when the user feels strong and wants extra volume.

### Rest Timer

- Auto-starts when a set is completed
- Default duration pulled from the exercise's `rest_seconds` value
- Visual countdown: circular or bar progress
- **Skip button**: ends rest immediately, focuses next set
- **+30s button**: extends rest by 30 seconds
- Audio/haptic notification when rest period ends
- Timer is visible but not intrusive -- it should not dominate the screen

### Exercise Navigation

- **Previous/Next buttons**: navigate between exercises
- Swipe left/right gesture also navigates
- Completing all sets on the last exercise triggers the post-workout flow
- Exercises with all sets completed show a checkmark in the progress indicator

### Quick-Swap Exercise

Tapping "Swap Exercise" opens a bottom sheet:

```
┌────────────────────────────────────────┐
│  SWAP EXERCISE                          │
│  Current: Barbell Bench Press (Chest)   │
│                                         │
│  Same muscle, different movement:       │
│  ┌─────────────────────────────────┐   │
│  │ Machine Chest Press       ★★★★  │   │
│  │ Low fatigue, high stimulus       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Dumbbell Bench Press      ★★★★  │   │
│  │ Free weight alternative          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Incline Smith Press       ★★★   │   │
│  │ Guided movement                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Search all exercises...]              │
│  [Cancel]                               │
└────────────────────────────────────────┘
```

Stars represent the stimulus-to-fatigue ratio. The system pre-selects alternatives for the same primary muscle, sorted by SFR. The swap is recorded for the adaptation engine (persistent -- next week uses the swapped exercise).

---

## 8. POST-WORKOUT FEEDBACK

### Per-Exercise Feedback (shown after completing all sets of an exercise)

A compact feedback card slides up between exercises:

```
┌─────────────────────────────────────────────────────┐
│  How was Barbell Bench Press?                        │
│                                                      │
│  Pump:      ○ None  ○ Low  ● Moderate  ○ Great  ○ Extreme  │
│  Soreness:  ○ None  ● Mild ○ Moderate  ○ High   ○ Excessive│
│  Difficulty:○ Easy  ○ Manageable ● Challenging ○ Hard ○ Too Much│
│                                                      │
│  [ ] Joint discomfort                                │
│  Mind-muscle: ○ ○ ○ ● ○  (4/5)                     │
│                                                      │
│             [Skip]  [Save & Continue →]              │
└─────────────────────────────────────────────────────┘
```

**Feedback fields (all optional but encouraged):**

| Field | Scale | Internal Value | Purpose |
|-------|-------|---------------|---------|
| Pump | None / Low / Moderate / Great / Extreme | 1-5 | Proxy for metabolic stress and muscle activation |
| Soreness expectation | None / Mild / Moderate / High / Excessive | 1-5 | Predicts next-day recovery impact |
| Difficulty | Too Easy / Manageable / Challenging / Hard / Too Much | 1-5 | Indicates proximity to overreaching |
| Joint discomfort | Toggle (off/on) | 0 or 1 | Safety signal for exercise swaps |
| Mind-muscle connection | 5-point scale | 1-5 | Quality of muscle engagement |

**"Skip" behavior:** If skipped, the system uses performance data alone (reps vs. target, RIR logged) to infer feedback. This is less accurate but acceptable -- we never want feedback to feel like a chore.

**Batch mode option:** In Settings, user can choose to give feedback at the end of the workout grouped by muscle instead of after each exercise. The data collected is identical.

### Post-Workout Summary

After the final exercise and its feedback, the summary screen appears:

```
┌─────────────────────────────────────────────────────────────┐
│                      WORKOUT COMPLETE                        │
│                         Push A                                │
│                    Week 3 of 6 — Day 1                       │
│                                                              │
│  Duration: 52 min          Total volume: 12,480 lbs          │
│  Exercises: 7              Total sets: 21                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PERFORMANCE                                          │   │
│  │  ✓ Bench Press: 180 × 10, 9, 8  (↑ from 175 last wk)│   │
│  │  ✓ Incline DB Press: 65 × 11, 10, 9                  │   │
│  │  ✓ Cable Lateral Raise: 25 × 14, 13, 12              │   │
│  │  ...                                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SESSION RPE                                          │   │
│  │  How hard was this overall?                           │   │
│  │                                                        │   │
│  │  1  2  3  4  5  6  [7]  8  9  10                      │   │
│  │  Easy      Moderate      Hard      Maximal            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Session notes: [________________________________]           │
│                                                              │
│  Estimated 1RM changes:                                      │
│  Bench Press: 225 → 228 lbs (+1.3%)                         │
│  Incline DB:  estimated 82 lbs 1RM                          │
│                                                              │
│                    [Save Workout]                             │
└─────────────────────────────────────────────────────────────┘
```

**Session RPE (1-10):** Required. This is the single most important feedback metric. Anchors:
- 1-3: Easy, could have done much more
- 4-5: Moderate, a decent session
- 6-7: Hard, felt well-pushed
- 8: Very hard, close to limit
- 9-10: Maximal/near-maximal effort

**Session notes:** Optional free-text. Useful for logging context ("slept poorly," "felt great," "shoulder tweaked on set 3").

**All data saved:** workout log, per-set data, per-exercise feedback, session RPE, session notes, duration, total volume.

---

## 9. AUTOREGULATION & ADAPTATION ENGINE

This is the core intelligence. It runs once per completed training week (or on-demand when generating the next week's plan). It processes per-exercise feedback, per-set performance data, and session RPE to produce the next week's prescriptions.

### Weekly Adaptation Per Muscle Group

```python
def adapt_muscle_group(muscle, week_data, current_week, meso_length):
    """
    Runs for each muscle group after a training week is completed.
    Returns: volume_change, load_change, exercise_swap_flag, reason
    """

    # Aggregate feedback across all exercises for this muscle this week
    exercises = week_data.get_exercises_for_muscle(muscle)

    avg_pump = mean([ex.pump_rating for ex in exercises if ex.pump_rating])
    avg_soreness = mean([ex.soreness_rating for ex in exercises if ex.soreness_rating])
    avg_difficulty = mean([ex.difficulty_rating for ex in exercises if ex.difficulty_rating])
    any_joint_pain = any([ex.joint_discomfort for ex in exercises])
    avg_mmc = mean([ex.mmc_rating for ex in exercises if ex.mmc_rating])

    # Default: no change
    volume_change = 0        # sets to add or remove
    load_action = "maintain"  # "increase", "maintain", "decrease"
    swap_exercise = None      # exercise_id to swap, if any
    reason = ""

    # ─── VOLUME DECISION ───

    # Signal: UNDERSTIMULATED (needs more volume)
    if avg_pump >= 4 and avg_soreness <= 2 and avg_difficulty <= 2:
        volume_change = +1
        reason = f"Great pump ({avg_pump:.1f}/5) with low soreness and difficulty. Adding 1 set."

    # Signal: PRODUCTIVE RANGE (maintain)
    elif avg_pump >= 3 and avg_soreness <= 3 and avg_difficulty == 3:
        volume_change = 0
        reason = f"Good stimulus with manageable difficulty. Maintaining volume."

    # Signal: OVERSTIMULATED (too much fatigue)
    elif avg_soreness >= 4 or avg_difficulty >= 4:
        volume_change = -1
        reason = f"High {'soreness' if avg_soreness >= 4 else 'difficulty'} detected ({avg_soreness:.1f} / {avg_difficulty:.1f}). Removing 1 set to manage fatigue."

    # Signal: POOR STIMULUS (exercise might be wrong, not volume)
    elif avg_pump <= 1 and avg_difficulty <= 2:
        volume_change = 0
        swap_exercise = find_lowest_pump_exercise(exercises)
        reason = f"Low pump ({avg_pump:.1f}/5) despite easy difficulty. Suggesting exercise swap for better muscle activation."

    # Signal: HIGH EFFORT BUT LOW PUMP (fatiguing but not stimulating)
    elif avg_pump <= 2 and avg_difficulty >= 3:
        volume_change = 0
        swap_exercise = find_lowest_sfr_exercise(exercises)
        reason = f"High effort but poor pump. Exercise may have poor stimulus-to-fatigue ratio for you."

    # Signal: WEEK-DEPENDENT DEFAULTS
    else:
        # In early weeks, default to adding if not contraindicated
        if current_week <= meso_length * 0.4:
            volume_change = +1 if avg_soreness <= 2 else 0
            reason = "Early meso: building volume. " + ("Adding 1 set." if volume_change > 0 else "Holding steady.")
        # In later weeks, default to maintaining
        else:
            volume_change = 0
            reason = "Late meso: maintaining volume to manage accumulated fatigue."

    # ─── VOLUME BOUNDS CHECK ───
    current_volume = week_data.total_sets_for_muscle(muscle)
    new_volume = current_volume + volume_change

    mev = VOLUME_LANDMARKS[muscle]["mev"]
    mrv = VOLUME_LANDMARKS[muscle]["mrv"]

    if new_volume < mev:
        new_volume = mev
        reason += f" Clamped to MEV ({mev} sets)."
    elif new_volume > mrv:
        new_volume = mrv
        volume_change = mrv - current_volume
        reason += f" Capped at MRV ({mrv} sets)."

    # ─── LOAD DECISION ───
    for ex in exercises:
        sets = week_data.get_sets_for_exercise(ex.id)
        working_sets = [s for s in sets if s.set_type == "working" and s.completed]

        if not working_sets:
            continue

        all_hit_top = all(s.actual_reps >= ex.target_rep_high for s in working_sets)
        all_met_rir = all(
            s.actual_rir is not None and s.actual_rir <= ex.target_rir + 1
            for s in working_sets
        )
        sets_below_bottom = sum(
            1 for s in working_sets if s.actual_reps < ex.target_rep_low
        )

        if all_hit_top and all_met_rir:
            # Progressed! Increase weight by minimum increment
            ex.load_action = "increase"
            ex.load_change = get_min_increment(ex.equipment)
            # After weight increase, reps will naturally drop to bottom of range
            ex.note = f"All sets hit {ex.target_rep_high} reps at target RIR. Increasing weight by {ex.load_change} lbs."

        elif sets_below_bottom >= 2:
            # Struggling with current weight
            ex.load_action = "maintain"
            ex.note = f"{sets_below_bottom} sets below rep range. Keep weight, focus on hitting range."

        else:
            # Normal: keep weight, aim for +1 rep per set
            ex.load_action = "maintain"
            ex.note = "Keep current weight. Aim for +1 rep per set vs. last week."

    # ─── RIR PROGRESSION (week-over-week) ───
    rir_schedule = calculate_rir_for_week(current_week + 1, meso_length)

    return {
        "muscle": muscle,
        "volume_change": volume_change,
        "new_total_sets": new_volume,
        "exercise_adaptations": exercises,
        "swap_suggestion": swap_exercise,
        "rir_target": rir_schedule,
        "reason": reason
    }


def calculate_rir_for_week(week, meso_length):
    """
    Returns the RIR target for a given week in the mesocycle.
    Linear-ish decrease from 3-4 in week 1 to 1 in the final training week.
    """
    if week > meso_length:  # deload week
        return 5

    # Map week 1..meso_length to RIR 3.5..1.0
    progress = (week - 1) / max(meso_length - 1, 1)  # 0.0 to 1.0
    rir = 3.5 - (progress * 2.5)  # 3.5 down to 1.0
    return round(rir * 2) / 2  # round to nearest 0.5


def get_min_increment(equipment):
    """Smallest meaningful weight increase by equipment type."""
    increments = {
        "barbell": 5,       # 5 lbs (2.5 per side)
        "dumbbell": 5,      # 5 lbs per hand
        "cable": 5,         # one pin
        "machine": 5,       # one pin or plate
        "smith_machine": 5,
        "ez_bar": 5,
        "kettlebell": 5,
        "bodyweight": 0,    # add reps instead
        "bands": 0          # add reps or use next band
    }
    return increments.get(equipment, 5)
```

### Deload Trigger Logic

```python
def check_deload_triggers(meso_id, current_week, meso_length, week_data, history):
    """
    Returns True if a deload should be triggered for next week.
    Checked after each completed training week.
    """
    triggers = []

    # Trigger 1: Planned meso length reached
    if current_week >= meso_length:
        triggers.append({
            "type": "planned",
            "message": "Mesocycle training weeks complete. Time for a deload."
        })

    # Trigger 2: Performance regression on 3+ exercises for 2 consecutive weeks
    if current_week >= 3:
        regressed_exercises_this_week = 0
        regressed_exercises_last_week = 0

        for ex in week_data.exercises:
            # Compare to week before: did avg reps per set decrease at same or higher weight?
            this_week_avg_reps = mean_reps(week_data, ex.id)
            last_week_avg_reps = mean_reps(history[current_week - 1], ex.id)
            two_weeks_ago_avg_reps = mean_reps(history[current_week - 2], ex.id)

            this_week_weight = max_weight(week_data, ex.id)
            last_week_weight = max_weight(history[current_week - 1], ex.id)

            if this_week_avg_reps < last_week_avg_reps and this_week_weight >= last_week_weight:
                regressed_exercises_this_week += 1
            if last_week_avg_reps < two_weeks_ago_avg_reps and last_week_weight >= max_weight(history[current_week - 2], ex.id):
                regressed_exercises_last_week += 1

        if regressed_exercises_this_week >= 3 and regressed_exercises_last_week >= 3:
            triggers.append({
                "type": "performance_regression",
                "message": f"Performance declined on {regressed_exercises_this_week} exercises for 2 consecutive weeks. Fatigue is accumulating."
            })

    # Trigger 3: Average difficulty feedback >= 4.5 for the week
    all_difficulty = [ex.difficulty_rating for ex in week_data.all_exercises() if ex.difficulty_rating]
    if all_difficulty and mean(all_difficulty) >= 4.5:
        triggers.append({
            "type": "excessive_difficulty",
            "message": f"Average difficulty rating this week: {mean(all_difficulty):.1f}/5. Training is becoming unsustainable."
        })

    # Trigger 4: Excessive soreness on 3+ muscle groups
    muscle_soreness = {}
    for ex in week_data.all_exercises():
        if ex.soreness_rating and ex.soreness_rating >= 4:
            muscle_soreness[ex.muscle_group] = max(
                muscle_soreness.get(ex.muscle_group, 0),
                ex.soreness_rating
            )
    if len(muscle_soreness) >= 3:
        triggers.append({
            "type": "excessive_soreness",
            "message": f"High soreness reported on {len(muscle_soreness)} muscle groups: {', '.join(muscle_soreness.keys())}."
        })

    # Trigger 5: User manually requests deload (handled separately in UI)

    return {
        "should_deload": len(triggers) > 0,
        "triggers": triggers,
        "is_planned": any(t["type"] == "planned" for t in triggers)
    }
```

### Exercise Swap Logic

```python
def check_exercise_swaps(exercise_id, muscle, feedback_history):
    """
    Check if an exercise should be swapped based on accumulated feedback.
    feedback_history is a list of weekly feedback entries for this exercise.
    """
    reasons = []

    # Must have at least 2 weeks of data
    if len(feedback_history) < 2:
        return {"should_swap": False}

    recent = feedback_history[-2:]  # last 2 weeks

    # Reason 1: Consistently low pump (poor muscle activation)
    if all(fb.pump_rating is not None and fb.pump_rating <= 1 for fb in recent):
        reasons.append(f"Low pump rating ({recent[-1].pump_rating}/5) for 2+ weeks. This exercise may not effectively target your {muscle}.")

    # Reason 2: Joint discomfort reported 2+ times
    joint_pain_count = sum(1 for fb in feedback_history if fb.joint_discomfort)
    if joint_pain_count >= 2:
        reasons.append(f"Joint discomfort reported {joint_pain_count} times. Switching to a joint-friendlier alternative.")

    # Reason 3: Performance plateaued for 3+ weeks
    if len(feedback_history) >= 3:
        recent_3 = feedback_history[-3:]
        weights = [fb.best_weight for fb in recent_3 if fb.best_weight]
        reps = [fb.best_reps for fb in recent_3 if fb.best_reps]

        if len(weights) == 3 and len(reps) == 3:
            weight_stalled = max(weights) - min(weights) < get_min_increment(feedback_history[-1].equipment)
            reps_stalled = max(reps) - min(reps) <= 1

            if weight_stalled and reps_stalled:
                reasons.append(f"No meaningful progress for 3 weeks ({weights[-1]} lbs x {reps[-1]} reps). A different movement may stimulate new growth.")

    if not reasons:
        return {"should_swap": False}

    # Find replacement
    replacement = find_replacement(exercise_id, muscle, feedback_history)

    return {
        "should_swap": True,
        "reasons": reasons,
        "current_exercise_id": exercise_id,
        "suggested_replacement": replacement
    }


def find_replacement(exercise_id, muscle, feedback_history):
    """
    Find a replacement exercise for the same muscle group.
    Criteria: different movement pattern, similar or better SFR, not recently used.
    """
    current = get_exercise(exercise_id)
    candidates = get_exercises_for_muscle(muscle)

    # Filter out: same exercise, same movement pattern, excluded exercises
    candidates = [c for c in candidates
                  if c.id != exercise_id
                  and c.movement != current.movement  # different movement pattern
                  and c.equipment in user_available_equipment]

    # Sort by stimulus-to-fatigue ratio (descending)
    candidates.sort(key=lambda c: c.stimulusRating / max(c.fatigueRating, 1), reverse=True)

    # Prefer exercises not used in the current mesocycle
    used_this_meso = get_used_exercises_this_meso()
    unused = [c for c in candidates if c.id not in used_this_meso]

    if unused:
        return unused[0]
    return candidates[0] if candidates else None
```

---

## 10. PROGRESSIVE OVERLOAD MODEL

### Week-by-Week Structure (5-week + Deload Example)

| Week | Sets vs Baseline | RIR Target | Load Trend | Session RPE Target | Focus |
|------|-----------------|------------|------------|-------------------|-------|
| 1 | Baseline (MEV+) | 3-4 | Starting loads | 5-6 | Establish baseline. Learn movements. Calibrate weights. |
| 2 | +0-1 set on responding muscles | 3 | Same or +smallest increment | 6-7 | Build volume. If all reps hit at target RIR, increase weight. |
| 3 | +1 set where tolerated | 2-3 | Progressive increase | 7 | Push harder. Volume is climbing. Load is climbing. |
| 4 | +0-1 set (approaching MRV) | 2 | Continue progression | 7-8 | Peak volume phase. Most sets in the productive zone. |
| 5 | Maintain or +1 final push | 1-2 | Heaviest loads of the meso | 8-9 | Functional overreach. Hardest week. Performance may plateau. |
| 6 (Deload) | 50% of Week 5 | 5+ | ~80% of Week 5 loads | 3-4 | Recovery. Dissipate fatigue. Supercompensation occurs. |

### Concrete Example: Chest Across a 5+1 Mesocycle

Intermediate lifter, Upper/Lower split, Barbell Bench Press + Incline DB Press:

| Week | BB Bench | Incline DB | Total Chest Sets | RIR |
|------|----------|------------|-----------------|-----|
| 1 | 175 lbs × 3 sets of 8-12 | 60 lbs × 3 sets of 8-12 | 12 sets/wk | 3-4 |
| 2 | 175 lbs × 3 sets of 10-12 | 60 lbs × 3 sets of 10-12 | 13 sets/wk (+1) | 3 |
| 3 | 180 lbs × 3 sets of 8-11 | 65 lbs × 3 sets of 8-11 | 14 sets/wk (+1) | 2-3 |
| 4 | 180 lbs × 4 sets of 9-11 | 65 lbs × 3 sets of 9-11 | 14 sets/wk (maintain) | 2 |
| 5 | 185 lbs × 4 sets of 8-10 | 65 lbs × 3 sets of 8-10 | 14 sets/wk (maintain) | 1-2 |
| 6 | 150 lbs × 2 sets of 10 | 50 lbs × 2 sets of 10 | 8 sets/wk (deload) | 5+ |

**What happened here:**
- Week 1: Baseline. Conservative loads. Gets 8-10 reps at RIR 3-4.
- Week 2: Reps climbed to 10-12. Feedback: good pump, manageable soreness. +1 set.
- Week 3: Hit top of rep range (12) on bench last week. Weight goes up 5 lbs. DB goes up 5 lbs. +1 set. RIR drops.
- Week 4: Holding the weight increase, adding reps. RIR drops to 2. Volume held (approaching tolerance ceiling).
- Week 5: Another weight bump on bench (reps hit top again). Push to RIR 1-2. Hardest week.
- Week 6: Deload. Half the sets, 80% load. Easy.

---

## 11. VOLUME LANDMARKS

### Per-Muscle-Group Reference Table

These are population-level starting estimates. The adaptation engine personalizes them over time based on individual feedback.

| Muscle Group | MEV (sets/wk) | MAV (sets/wk) | MRV (sets/wk) | Notes |
|-------------|---------------|---------------|---------------|-------|
| Chest | 8 | 14-18 | 22 | Compounds contribute to front delts and triceps too |
| Back (Lats + Upper Back) | 8 | 14-20 | 25 | High recovery capacity; tolerates high volume |
| Quads | 6 | 12-16 | 20 | Very fatiguing; MRV hit sooner than expected |
| Hamstrings | 4 | 10-14 | 18 | Lower MEV due to deadlift/squat carryover |
| Glutes | 4 | 8-12 | 16 | Squat/deadlift variations contribute significant volume |
| Side Delts | 8 | 16-20 | 25 | Small muscle, recovers fast, tolerates very high volume |
| Rear Delts | 6 | 12-16 | 22 | Similar to side delts; often undertrained |
| Front Delts | 0 | 0-6 | 12 | Usually gets enough from pressing; direct work optional |
| Biceps | 6 | 10-16 | 22 | Pulling compounds contribute; isolation adds on top |
| Triceps | 6 | 10-14 | 18 | Pressing contributes heavily |
| Forearms | 0 | 4-8 | 14 | Grip work from pulling often sufficient |
| Abs | 0 | 6-10 | 16 | Compound lifts provide baseline stimulus |
| Calves | 6 | 10-14 | 20 | Responds to high frequency; recovers fast |
| Traps | 0 | 6-10 | 16 | Deadlifts/rows contribute; direct work optional |

### How the System Uses Volume Landmarks

```
Week 1 starting volume = max(MEV, template_base * goal_mult * exp_mult * recovery_mult)

Each subsequent week:
  new_volume = previous_volume + adaptation_engine_decision
  new_volume = clamp(new_volume, MEV, MRV)

  if new_volume approaches MRV (within 2 sets):
    system logs: "Approaching MRV ceiling for {muscle}. Volume will not increase further."

  if user feedback consistently indicates good tolerance at MRV:
    system adjusts personal MRV upward by 1-2 sets for future mesocycles

  if user feedback indicates poor recovery well below population MRV:
    system adjusts personal MRV downward for future mesocycles
```

### Individual Volume Landmark Discovery

After each mesocycle, the system recalculates personal landmarks:

```python
def update_personal_landmarks(muscle, meso_feedback):
    """
    Analyze a completed mesocycle's data to refine personal volume landmarks.
    """
    weeks = meso_feedback.get_weekly_data_for_muscle(muscle)

    # Find the week with peak performance (best combination of reps hit and pump rating)
    best_week = max(weeks, key=lambda w: w.avg_pump * 2 + w.avg_performance_score)

    # That week's volume is close to MAV for this individual
    personal_mav = best_week.total_sets

    # Find the week where performance started declining or soreness spiked
    decline_week = None
    for i in range(1, len(weeks)):
        if (weeks[i].avg_performance_score < weeks[i-1].avg_performance_score
            and weeks[i].total_sets > weeks[i-1].total_sets):
            decline_week = weeks[i]
            break

    if decline_week:
        personal_mrv = decline_week.total_sets  # they exceeded MRV here
    else:
        personal_mrv = weeks[-1].total_sets + 2  # never hit ceiling, estimate higher

    # MEV: the lowest volume that still produced a pump >= 3
    mev_candidates = [w for w in weeks if w.avg_pump >= 3]
    personal_mev = min(w.total_sets for w in mev_candidates) if mev_candidates else VOLUME_LANDMARKS[muscle]["mev"]

    return {
        "muscle": muscle,
        "personal_mev": personal_mev,
        "personal_mav": personal_mav,
        "personal_mrv": personal_mrv,
        "confidence": min(meso_feedback.meso_count, 3) / 3  # higher with more data
    }
```

---

## 12. DELOAD PROTOCOL

### Prescription

| Parameter | Deload Value | Rationale |
|-----------|-------------|-----------|
| Volume | 50% of peak week sets (round up) | Enough to maintain neural patterns; not enough to generate significant fatigue |
| Load | ~80% of peak week working weights | Preserves motor patterns at meaningful loads without mechanical strain |
| RIR | 5+ (nothing close to failure) | No sets should feel challenging |
| Exercises | Same as peak week | Maintain movement patterns and neural efficiency |
| Frequency | Same days as normal training | Maintain the training habit; avoid feeling like "time off" |
| Duration | 1 week (7 days) | Standard; shorter deloads risk incomplete recovery |

### Deload Week Exercise Prescription

For each exercise in the deload week:

```js
function generateDeloadPrescription(peakWeekExercise) {
  return {
    exercise_id: peakWeekExercise.exercise_id,
    exercise_name: peakWeekExercise.exercise_name,
    sets: Math.ceil(peakWeekExercise.actual_sets * 0.5),  // 50% of sets
    rep_range: peakWeekExercise.rep_range,                 // same rep range
    target_weight: Math.round(peakWeekExercise.avg_working_weight * 0.8 / 2.5) * 2.5,  // 80% load
    rir_target: 5,
    rest_seconds: 60,  // shorter rest (not needed, sets are easy)
    notes: "Recovery week. Light and controlled. Focus on mind-muscle connection."
  };
}
```

### Deload Messaging

The system presents the deload week with positive framing:

```
┌─────────────────────────────────────────────────────────┐
│  🧘  RECOVERY WEEK                                      │
│                                                          │
│  Week 6 of 6 — Deload                                  │
│                                                          │
│  Your body is absorbing 5 weeks of hard training.       │
│  This week is WHERE THE GAINS HAPPEN.                    │
│                                                          │
│  What to expect:                                         │
│  • Lighter weights, fewer sets                           │
│  • You'll feel fresh and strong by the end              │
│  • Resist the urge to go heavy — trust the process      │
│                                                          │
│  Same exercises, same schedule.                          │
│  Just dialed back to let you recover.                   │
│                                                          │
│  [View This Week's Plan]                                │
└─────────────────────────────────────────────────────────┘
```

---

## 13. END-OF-MESOCYCLE FLOW

### Mesocycle Review Screen

Shown after completing the deload week (or the final training week if deload was skipped):

```
┌──────────────────────────────────────────────────────────────────┐
│                    MESOCYCLE COMPLETE                              │
│              5-Week Hypertrophy Block + Deload                    │
│              Mar 30 — May 10, 2026                                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  STRENGTH PROGRESS                                        │    │
│  │                                                            │    │
│  │  Barbell Bench Press   185 → 195 lbs e1RM   (+5.4%)      │    │
│  │  Squat                 245 → 260 lbs e1RM   (+6.1%)      │    │
│  │  Incline DB Press       70 →  75 lbs e1RM   (+7.1%)      │    │
│  │  Cable Lateral Raise    25 →  30 lbs        (+20%)       │    │
│  │  Barbell Row           155 → 165 lbs e1RM   (+6.5%)      │    │
│  │  ...                                                      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  VOLUME TREND (sets/week by muscle)                       │    │
│  │                                                            │    │
│  │  Chest:    12 → 14 → 14 → 14 → 14 → 7 (deload)          │    │
│  │  Back:     12 → 14 → 16 → 16 → 16 → 8                    │    │
│  │  Quads:    10 → 10 → 12 → 12 → 12 → 6                    │    │
│  │  Shoulders:12 → 14 → 16 → 16 → 16 → 8                    │    │
│  │  ...                                                      │    │
│  │  (mini sparkline charts per row)                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  PERFORMANCE SUMMARY                                      │    │
│  │                                                            │    │
│  │  Adherence:         23/25 sessions (92%)                  │    │
│  │  Avg session RPE:   6.8 / 10                              │    │
│  │  Top exercises:     Cable Lateral Raise (SFR: 4.2)        │    │
│  │                     Incline DB Curl (SFR: 4.0)            │    │
│  │  Struggling:        Barbell Row (plateau weeks 3-5)       │    │
│  │                     Skull Crusher (joint discomfort x2)   │    │
│  │  Fatigue score:     7.2 / 10 (well managed)              │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  [Start Next Mesocycle →]                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Metrics Calculated

**Estimated 1RM (e1RM):** Calculated using the Epley formula on the best set each week:
```
e1RM = weight * (1 + reps / 30)
```
Trend shown as start-of-meso e1RM vs end-of-meso e1RM.

**Adherence rate:** `completed_sessions / planned_sessions * 100`

**Top performing exercises:** Ranked by personal SFR score:
```
personal_SFR = avg_pump_rating / avg_difficulty_rating
```
Higher = more stimulus per unit of effort. These are the user's best exercises.

**Struggling exercises:** Exercises where:
- e1RM did not increase across the meso, OR
- Joint discomfort was reported 2+ times, OR
- Pump rating was consistently <= 2

**Fatigue management score (1-10):** Composite:
```
fatigue_score = 10 - (overreach_weeks * 1.5) - (missed_sessions * 0.5) - (excessive_soreness_instances * 0.5)
```
Where `overreach_weeks` = weeks where session RPE >= 9. Higher is better.

### Next Mesocycle Setup

Three options presented after the review:

**Option A: "Continue with auto-adjustments" (recommended)**
- Same template/split
- Starting volumes = Week 1 volumes of the just-completed meso (not Week 1 of the original meso -- the new baseline is higher)
- Exercises that performed well are kept
- Struggling exercises are auto-swapped (with user confirmation)
- Personal volume landmarks are updated
- 1-click to start

**Option B: "New specialization"**
- Returns to Screen 3 (specialization target picker)
- Rebuilds the split to emphasize new targets
- Keeps the same schedule and equipment profile
- Re-generates exercise selection

**Option C: "Different template"**
- Returns to Screen 8 (template chooser)
- Full rebuild with new split
- Can change days/week and session duration
- Previous performance data is preserved and informs exercise selection

### Starting Volume for Next Mesocycle

```python
def calculate_next_meso_starting_volume(muscle, completed_meso):
    """
    The next meso starts at the WEEK 1 volume of the completed meso,
    NOT the peak volume. This gives room to progress again.

    However, if the previous meso's week 1 was too easy (pump <= 2, difficulty <= 2),
    start slightly higher.
    """
    prev_week1_volume = completed_meso.weeks[0].total_sets_for_muscle(muscle)
    prev_week1_feedback = completed_meso.weeks[0].avg_feedback_for_muscle(muscle)

    if prev_week1_feedback.pump <= 2 and prev_week1_feedback.difficulty <= 2:
        # Previous week 1 was too easy; start higher
        return prev_week1_volume + 1
    elif prev_week1_feedback.soreness >= 4:
        # Previous week 1 was too hard; start lower
        return max(prev_week1_volume - 1, VOLUME_LANDMARKS[muscle]["mev"])
    else:
        return prev_week1_volume
```

---

## 14. CALENDAR INTEGRATION

### Auto-Placement

Workouts are placed on the user's preferred days (from Screen 4). The system generates dates for the entire mesocycle at creation time.

```js
function generateMesoCalendar(mesoConfig, profile) {
  const calendar = [];
  const startDate = new Date(mesoConfig.start_date);

  for (let week = 0; week < mesoConfig.total_weeks; week++) {
    const weekStartDate = addDays(startDate, week * 7);
    const isDeload = week === mesoConfig.total_weeks - 1 && mesoConfig.include_deload;

    profile.preferred_days.forEach((dayOfWeek, sessionIndex) => {
      // dayOfWeek: 1=Mon, 7=Sun
      const sessionDate = addDays(weekStartDate, dayOfWeek - 1);

      calendar.push({
        meso_id: mesoConfig.id,
        week_number: week + 1,
        week_type: isDeload ? "deload" : "training",
        day_number: sessionIndex + 1,
        date: ymd(sessionDate),
        label: mesoConfig.sessions[sessionIndex % mesoConfig.sessions.length].label,
        target_muscles: mesoConfig.sessions[sessionIndex % mesoConfig.sessions.length].muscles
      });
    });
  }

  return calendar;
}
```

### Calendar Display

Each day on the calendar shows:
- Workout label (e.g., "Push A")
- Meso week indicator: "W3/6" (Week 3 of 6)
- Status icon: scheduled (gray), completed (green check), skipped (red X), today (accent blue)
- Target muscles as small chips below the label

### Missed Workout Logic

Inherits from the existing `WORKOUT_SYSTEM_DESIGN.md` missed workout rescheduling system. Additional mesocycle-specific rules:

```js
function handleMissedWorkout(missedDay, mesoContext) {
  const remainingDaysThisWeek = getRemainingTrainingDays(missedDay.date);
  const missedMuscles = missedDay.target_muscles;

  // Option 1: Shift to next available day (if within 2 days)
  const nextAvailable = findNextOpenDay(missedDay.date, 2);
  if (nextAvailable) {
    return {
      action: "reschedule",
      new_date: nextAvailable,
      message: `Moved ${missedDay.label} to ${formatDate(nextAvailable)}.`
    };
  }

  // Option 2: Merge with an upcoming session (add missed muscles to another day)
  if (remainingDaysThisWeek.length > 0) {
    const mergeTarget = findBestMergeTarget(remainingDaysThisWeek, missedMuscles);
    if (mergeTarget && mergeTarget.total_exercises + 2 <= mesoContext.max_exercises_per_session) {
      return {
        action: "merge",
        target_day: mergeTarget,
        added_muscles: missedMuscles.slice(0, 2), // add top 2 priority muscles
        message: `Added ${missedMuscles.slice(0, 2).join(" & ")} work to ${mergeTarget.label}.`
      };
    }
  }

  // Option 3: Skip and adjust volume next week
  return {
    action: "skip",
    message: `${missedDay.label} skipped. Volume will be adjusted next week to compensate.`,
    volume_adjustment: {
      // Next week: add 1-2 sets for each missed muscle group
      muscles: missedMuscles.map(m => ({ muscle: m, extra_sets: 1 }))
    }
  };
}
```

### Weekly Training View

The weekly view (already exists as the 7-column horizontal layout the user likes) is extended:

```
Mon         Tue         Wed         Thu         Fri         Sat         Sun
┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐
│ Push A   ││ Pull A  ││  REST   ││ Legs A  ││ Push B  ││ Pull B  ││  REST   │
│ W3/6     ││ W3/6   ││         ││ W3/6    ││ W3/6    ││ W3/6    ││         │
│ Chest    ││ Back   ││         ││ Quads   ││ Chest   ││ Back    ││         │
│ Delts    ││ Biceps ││         ││ Hams    ││ Delts   ││ Biceps  ││         │
│ Triceps  ││ Abs    ││         ││ Glutes  ││ Triceps ││ Traps   ││         │
│ ✅ Done  ││ ✅ Done ││         ││ 📋 Today ││ ⏳ Sched ││ ⏳ Sched ││         │
└─────────┘└─────────┘└─────────┘└─────────┘└─────────┘└─────────┘└─────────┘
```

---

## 15. DATA MODEL

### SQLite Schema

```sql
-- ═══════════════════════════════════════════════════════════════
-- MESOCYCLE TABLES
-- ═══════════════════════════════════════════════════════════════

-- Mesocycle definition (one per training block)
CREATE TABLE IF NOT EXISTS mesocycles (
  id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,          -- snapshot of user profile at meso creation
  config_json TEXT NOT NULL,           -- meso config: length, split, goals, schedule
  template_id TEXT,                    -- which template was used (null if custom)
  custom_split_json TEXT,              -- custom split definition (null if template)
  start_date TEXT NOT NULL,            -- ISO date: first day of meso
  end_date TEXT,                       -- ISO date: last day of meso (calculated)
  status TEXT NOT NULL DEFAULT 'active',  -- active | completed | abandoned
  completion_summary_json TEXT,        -- end-of-meso stats (populated on completion)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Weekly plan within a mesocycle
CREATE TABLE IF NOT EXISTS meso_weeks (
  id TEXT PRIMARY KEY,
  meso_id TEXT NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,        -- 1-indexed
  type TEXT NOT NULL DEFAULT 'training',  -- training | deload
  volume_targets_json TEXT,            -- planned volume per muscle for this week
  adjustments_json TEXT,               -- what changed vs previous week and why
  session_rpe_avg REAL,                -- average session RPE for this week (computed)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(meso_id, week_number)
);

-- Day template within a week
CREATE TABLE IF NOT EXISTS meso_days (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES meso_weeks(id) ON DELETE CASCADE,
  meso_id TEXT NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,         -- position in the training week (1-7)
  date TEXT,                           -- actual calendar date (ISO)
  label TEXT NOT NULL,                 -- "Push A", "Upper 1", etc.
  target_muscles_json TEXT NOT NULL,   -- ["chest", "triceps", "lateral_delts"]
  status TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | in_progress | completed | skipped
  started_at TEXT,                     -- when user began the workout
  completed_at TEXT,                   -- when user finished the workout
  duration_minutes INTEGER,            -- actual workout duration
  session_rpe INTEGER,                 -- post-session RPE 1-10
  total_volume_lbs REAL,              -- sum of weight * reps across all sets
  notes TEXT,                          -- user's session notes
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(meso_id, week_id, day_number)
);

-- Exercise assignment within a day
CREATE TABLE IF NOT EXISTS meso_exercises (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL REFERENCES meso_days(id) ON DELETE CASCADE,
  meso_id TEXT NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,           -- references exerciseLibrary EXERCISES[].id
  exercise_name TEXT NOT NULL,         -- denormalized for display
  muscle_group TEXT NOT NULL,          -- primary muscle this exercise targets here
  order_index INTEGER NOT NULL,        -- display order (1-indexed)
  target_sets INTEGER NOT NULL,        -- prescribed number of working sets
  target_rep_low INTEGER NOT NULL,     -- bottom of rep range
  target_rep_high INTEGER NOT NULL,    -- top of rep range
  target_rir INTEGER NOT NULL,         -- target RIR for this week
  target_weight REAL,                  -- suggested weight (null if unknown)
  rest_seconds INTEGER NOT NULL DEFAULT 120,
  notes TEXT,                          -- coaching notes or cues
  -- Per-exercise feedback (filled after completing the exercise)
  pump_rating INTEGER,                 -- 1 (none) to 5 (extreme)
  soreness_rating INTEGER,             -- 1 (none) to 5 (excessive)
  difficulty_rating INTEGER,           -- 1 (too easy) to 5 (too much)
  joint_discomfort INTEGER NOT NULL DEFAULT 0,  -- 0 or 1
  mmc_rating INTEGER,                  -- mind-muscle connection 1-5
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Individual set log
CREATE TABLE IF NOT EXISTS meso_sets (
  id TEXT PRIMARY KEY,
  exercise_assignment_id TEXT NOT NULL REFERENCES meso_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,         -- 1-indexed within the exercise
  set_type TEXT NOT NULL DEFAULT 'working',  -- warmup | working | backoff | drop | amrap
  target_weight REAL,                  -- prescribed weight for this set
  target_reps INTEGER,                 -- prescribed rep target
  actual_weight REAL,                  -- what the user actually lifted
  actual_reps INTEGER,                 -- how many reps completed
  actual_rir INTEGER,                  -- user-reported RIR (0-5, nullable)
  completed INTEGER NOT NULL DEFAULT 0,  -- 0 or 1
  completed_at TEXT,                   -- timestamp of set completion
  notes TEXT,                          -- per-set notes (rare)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Adaptation log (records every decision the engine makes)
CREATE TABLE IF NOT EXISTS meso_adaptations (
  id TEXT PRIMARY KEY,
  meso_id TEXT NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,        -- which week this adaptation was generated for
  muscle_group TEXT NOT NULL,
  action TEXT NOT NULL,                -- add_set | remove_set | maintain_volume | increase_load | decrease_load | swap_exercise | trigger_deload
  previous_value TEXT,                 -- what it was before (e.g., "12 sets" or "barbell_row")
  new_value TEXT,                      -- what it changed to (e.g., "13 sets" or "cable_row")
  reason TEXT NOT NULL,                -- human-readable explanation
  data_json TEXT,                      -- supporting data (feedback scores, performance numbers)
  accepted INTEGER NOT NULL DEFAULT 1, -- 1 if auto-applied, 0 if user rejected the suggestion
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Personal volume landmarks (refined over multiple mesocycles)
CREATE TABLE IF NOT EXISTS volume_landmarks (
  id TEXT PRIMARY KEY,
  muscle_group TEXT NOT NULL UNIQUE,
  personal_mev INTEGER,                -- discovered MEV
  personal_mav INTEGER,                -- discovered MAV
  personal_mrv INTEGER,                -- discovered MRV
  confidence REAL NOT NULL DEFAULT 0,  -- 0.0 to 1.0, increases with more data
  last_updated TEXT,
  data_points INTEGER DEFAULT 0,       -- how many mesos contributed to this estimate
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_meso_weeks_meso ON meso_weeks(meso_id);
CREATE INDEX IF NOT EXISTS idx_meso_days_week ON meso_days(week_id);
CREATE INDEX IF NOT EXISTS idx_meso_days_meso ON meso_days(meso_id);
CREATE INDEX IF NOT EXISTS idx_meso_days_date ON meso_days(date);
CREATE INDEX IF NOT EXISTS idx_meso_exercises_day ON meso_exercises(day_id);
CREATE INDEX IF NOT EXISTS idx_meso_exercises_meso ON meso_exercises(meso_id);
CREATE INDEX IF NOT EXISTS idx_meso_sets_exercise ON meso_sets(exercise_assignment_id);
CREATE INDEX IF NOT EXISTS idx_meso_adaptations_meso_week ON meso_adaptations(meso_id, week_number);
```

### Relationship Diagram

```
mesocycles (1)
  └── meso_weeks (many)
        └── meso_days (many)
              └── meso_exercises (many)
                    └── meso_sets (many)
  └── meso_adaptations (many)

volume_landmarks (standalone, refined across mesocycles)
```

### IPC API Surface

New Electron IPC handlers (added to `electron/preload.cjs`):

```js
window.mesoApi = {
  // Mesocycle CRUD
  createMeso: (profileJson, configJson) => ipcRenderer.invoke('meso:create', profileJson, configJson),
  getMeso: (id) => ipcRenderer.invoke('meso:get', id),
  getActiveMeso: () => ipcRenderer.invoke('meso:getActive'),
  updateMesoStatus: (id, status) => ipcRenderer.invoke('meso:updateStatus', id, status),
  completeMeso: (id, summaryJson) => ipcRenderer.invoke('meso:complete', id, summaryJson),

  // Week operations
  createWeek: (mesoId, weekNumber, type, volumeTargetsJson) => ipcRenderer.invoke('meso:createWeek', ...args),
  getWeek: (mesoId, weekNumber) => ipcRenderer.invoke('meso:getWeek', mesoId, weekNumber),
  updateWeekAdjustments: (weekId, adjustmentsJson) => ipcRenderer.invoke('meso:updateWeekAdjustments', weekId, adjustmentsJson),

  // Day operations
  getDaysForWeek: (weekId) => ipcRenderer.invoke('meso:getDaysForWeek', weekId),
  getDayByDate: (date) => ipcRenderer.invoke('meso:getDayByDate', date),
  updateDayStatus: (dayId, status, data) => ipcRenderer.invoke('meso:updateDayStatus', dayId, status, data),
  saveDayFeedback: (dayId, sessionRpe, notes) => ipcRenderer.invoke('meso:saveDayFeedback', dayId, sessionRpe, notes),

  // Exercise operations
  getExercisesForDay: (dayId) => ipcRenderer.invoke('meso:getExercisesForDay', dayId),
  saveExerciseFeedback: (exerciseId, feedback) => ipcRenderer.invoke('meso:saveExerciseFeedback', exerciseId, feedback),
  swapExercise: (exerciseId, newExerciseId) => ipcRenderer.invoke('meso:swapExercise', exerciseId, newExerciseId),

  // Set operations
  getSetsForExercise: (exerciseAssignmentId) => ipcRenderer.invoke('meso:getSetsForExercise', exerciseAssignmentId),
  logSet: (setId, weight, reps, rir) => ipcRenderer.invoke('meso:logSet', setId, weight, reps, rir),
  addExtraSet: (exerciseAssignmentId) => ipcRenderer.invoke('meso:addExtraSet', exerciseAssignmentId),

  // Adaptation engine
  generateNextWeek: (mesoId) => ipcRenderer.invoke('meso:generateNextWeek', mesoId),
  getAdaptationLog: (mesoId, weekNumber) => ipcRenderer.invoke('meso:getAdaptationLog', mesoId, weekNumber),

  // Volume landmarks
  getVolumeLandmarks: () => ipcRenderer.invoke('meso:getVolumeLandmarks'),

  // History
  getExerciseHistory: (exerciseId, limit) => ipcRenderer.invoke('meso:getExerciseHistory', exerciseId, limit),
  getMesoHistory: () => ipcRenderer.invoke('meso:getMesoHistory')
};
```

---

## 16. SCREEN-BY-SCREEN UX

### Screen 1-8: Meso Onboarding

See Section 3 for full details on all 8 onboarding screens.

**System behavior across all onboarding screens:**
- Progress bar at top: "Step X of 8"
- Back button always available (returns to previous screen, preserving input)
- Data is saved to local state (not persisted until final confirmation)
- Animations: slide-right transition between screens
- Final screen ("Review & Build") shows a summary of all inputs and a "Build My Mesocycle" button
- Building takes 1-3 seconds with a progress animation ("Selecting exercises... Optimizing volume... Scheduling workouts...")

---

### Screen 9: Template Chooser

**What the user sees:**
- 2-column grid of template cards
- Top card has "Recommended for you" badge (blue accent border)
- Each card shows: name, days/week, frequency badges, experience tag
- "Build Custom Split" card at the bottom

**Actions:**
- Tap card to expand detail view (full weekly layout, muscle assignments, volume table)
- "Select" button on expanded card
- "Customize" button opens the template in the custom builder

**System does automatically:**
- Runs scoring algorithm against user profile
- Sorts templates by score
- Disqualifies templates that don't match days_per_week (grayed out, "Not compatible with your schedule")

**Friction minimized:**
- Recommended template is pre-selected; user can one-tap "Continue with recommendation"
- Template preview shows enough detail to make an informed choice without overwhelming

---

### Screen 10: Custom Builder

**What the user sees:**
- Left column: draggable muscle group chips
- Right column: numbered day slots with drop zones
- Bottom: live volume summary bar chart per muscle
- Each bar is color-coded: green (in MAV range), yellow (below MAV), red (below MEV or above MRV)

**Actions:**
- Drag muscle chips onto day slots
- Click to add/remove muscles from days
- Edit day labels (text input)
- "Auto-fill" button to let the system distribute remaining muscles
- Adjust day count with +/- buttons

**System does automatically:**
- Calculates weekly volume per muscle as muscles are assigned
- Shows warnings for under/over-volume
- Auto-suggests day labels based on muscle assignments ("Push", "Pull", "Legs", "Upper", "Lower")

**Friction minimized:**
- Smart defaults: if user came from a template, it's pre-populated
- Volume bars give instant visual feedback
- Auto-fill handles the tedious parts

---

### Screen 11: Exercise Selection (Per Day)

**What the user sees:**
- Day header: "Push A -- Chest, Side Delts, Triceps"
- For each muscle group, a collapsible section showing the auto-selected exercises
- Each exercise card: name, equipment icon, sets x reps, SFR stars, swap button

**Actions:**
- Tap "Swap" on any exercise to see alternatives (same muscle, filtered by equipment)
- Reorder exercises with drag handles
- "Add exercise" button at bottom of each muscle section
- "Auto-select all" button restores system picks

**System does automatically:**
- Pre-selects exercises using the selection algorithm (Section 5)
- Distributes sets across exercises (front-loaded: compound gets more sets)
- Orders exercises correctly (compounds first)

**Friction minimized:**
- System picks are usually good; most users will just review and confirm
- Swap UI shows only compatible exercises with SFR ratings for easy comparison

---

### Screen 12: Meso Overview

**What the user sees:**
- Top: mesocycle timeline bar (horizontal, weeks 1-6, current week highlighted)
- Below: current week's training days in the 7-column layout
- Each day card: label, muscles, status (scheduled/completed/skipped)
- Phase indicator: "Week 3 of 6 -- Building Volume"
- Quick stats: sessions completed this week, total volume trend

**Actions:**
- Tap any day to see its full exercise list (opens workout preview)
- Tap "Start Workout" on today's scheduled session
- Tap timeline to navigate to other weeks
- Pull down to refresh adaptation status

**System does automatically:**
- Highlights today's session
- Shows coaching message based on the week ("Week 3: Volume is climbing. Push for +1 rep per set.")
- After each completed week, shows a mini "What changed for next week" notification badge

**Friction minimized:**
- Today's workout is always front and center
- One tap to start training
- History is browsable but not in the way

---

### Screen 13: Workout Preview (Today's Session)

**What the user sees:**
- Workout title + meso week + muscle targets
- Estimated duration based on exercises, sets, and rest periods
- Full exercise list with: name, target sets x reps @ RIR, suggested weight, last week's performance
- Coaching tip for the week's focus ("This week: RIR 2-3. Push a little harder than last week.")

**Actions:**
- "Start Workout" button (large, prominent)
- Tap any exercise to see details/cues
- "Swap exercise" before starting
- "I can't train today" → triggers missed workout logic

**System does automatically:**
- Calculates recommended weights from previous week data
- Estimates session duration: `(sum of sets * avg_set_duration + sum of rest_periods + transition_time)`
  - avg_set_duration = 40 seconds
  - transition_time between exercises = 90 seconds

**Friction minimized:**
- Everything is decided. User just reviews and starts.
- Weights are suggested. Reps and RIR targets are clear.

---

### Screen 14: Live Workout

See Section 7 for full details.

**Additional system behaviors:**
- Auto-save progress every 30 seconds (in case app crashes)
- If user backgrounds the app, workout timer keeps running
- Exercise transition: after completing all sets on an exercise, the feedback card appears, then auto-advances to next exercise
- Final exercise completion triggers the post-workout flow

---

### Screen 15: Post-Exercise Feedback

See Section 8 for full details.

**System does automatically:**
- Pre-selects "Moderate" pump if the user tends to skip (learned behavior)
- Stores feedback immediately (no batch save needed)
- If user consistently skips feedback, system reduces prompt frequency to every other exercise

**Friction minimized:**
- All fields are tappable segmented controls (no typing)
- "Skip" is always available
- Total time: 3-5 seconds per exercise if engaged, 0 seconds if skipped

---

### Screen 16: Post-Workout Summary

See Section 8 for full details.

**System does automatically:**
- Calculates total volume (weight * reps across all working sets)
- Computes e1RM for each compound exercise
- Compares to previous week's data
- Generates progress indicators (up/down arrows)

**Friction minimized:**
- Only one required input: session RPE (one tap on a 1-10 scale)
- Notes are optional
- "Save Workout" finalizes everything

---

### Screen 17: Weekly Adaptation Report

**What the user sees:**
Shown once per week, after the last session of the week is completed (or on Sunday if sessions remain incomplete):

```
┌──────────────────────────────────────────────────────────────┐
│  WEEK 3 REPORT — Here's what changed for Week 4              │
│                                                               │
│  VOLUME CHANGES:                                              │
│  ▲ Chest: +1 set (13 → 14 sets/wk)                          │
│    "Good pump and manageable difficulty. Adding volume."      │
│  ═ Back: maintained (14 sets/wk)                              │
│    "Productive range. No changes needed."                    │
│  ▲ Side Delts: +1 set (14 → 15 sets/wk)                     │
│    "Excellent pump with low soreness. Room to grow."          │
│  ▼ Quads: -1 set (12 → 11 sets/wk)                          │
│    "High soreness reported. Reducing to improve recovery."   │
│                                                               │
│  LOAD CHANGES:                                                │
│  ▲ Bench Press: 180 → 185 lbs (hit top of rep range)        │
│  ═ Incline DB: keep 65 lbs (add reps)                        │
│  ▲ Cable Lateral Raise: 25 → 27.5 lbs                       │
│                                                               │
│  EXERCISE SWAPS:                                              │
│  🔄 Skull Crushers → Cable Overhead Extension                │
│    "Joint discomfort reported twice. Switching to a          │
│     cable movement for constant tension without elbow stress."│
│    [Accept] [Keep Original]                                   │
│                                                               │
│  RIR TARGET: Dropping from 2-3 to 2                          │
│  "Week 4: time to push harder. You've built the base."       │
│                                                               │
│             [Got it — Show me Week 4]                         │
└──────────────────────────────────────────────────────────────┘
```

**Actions:**
- Accept or reject each exercise swap suggestion
- "Got it" dismisses the report and opens the Meso Overview for the new week

**System does automatically:**
- Runs the full adaptation engine (Section 9) after the last session
- Generates the next week's plan with adjusted volumes, loads, and exercises
- Logs every decision in `meso_adaptations` for transparency

---

### Screen 18: Deload Week Intro

See Section 12 for messaging.

**What the user sees:**
- Calming visual (green/blue palette shift from the usual accent)
- Explanation of why deloads matter
- This week's plan preview (same exercises, reduced volume/load)
- Coaching tips for the deload week

**Actions:**
- "View This Week's Plan" → opens Meso Overview for the deload week
- "Skip Deload" (only if user explicitly enabled this option) → starts next meso immediately

---

### Screen 19: End-of-Meso Review

See Section 13 for full details.

**Actions:**
- Scroll through performance summary
- Tap any exercise to see its weekly progression chart
- Choose next meso option (A/B/C)
- "Export Data" (future feature) → CSV of the entire mesocycle

---

### Screen 20: Next Meso Setup

**What the user sees:**
- Pre-filled configuration based on the just-completed meso
- Highlighted changes: "Starting chest volume: 13 sets (was 12)"
- Exercise swaps applied from the end-of-meso review
- Adjusted personal volume landmarks shown

**Actions:**
- Review and edit any configuration
- "Build Next Mesocycle" → generates the new block
- Option to change template, schedule, or goals

**System does automatically:**
- Carries forward personal volume landmarks
- Adjusts starting volumes based on previous meso's Week 1 data
- Preserves exercise preferences (exercises that scored well are kept)
- Swaps exercises that were flagged as struggling

---

## 17. IMPLEMENTATION PHASES

### Phase 1: Core (Estimated: 2-3 weeks)

**Goal:** A user can create a mesocycle, log workouts within it, and see their plan.

**Deliverables:**
1. Database tables (`mesocycles`, `meso_weeks`, `meso_days`, `meso_exercises`, `meso_sets`) -- create in `electron/db.cjs`
2. IPC handlers for all CRUD operations -- add to `electron/main.cjs` and `electron/preload.cjs`
3. Mesocycle builder logic (`src/lib/mesoBuilder.js`):
   - Template library (all 8 templates)
   - Exercise selection algorithm
   - Volume allocation per muscle per day
   - Calendar date generation
4. Onboarding flow (Screens 1-8) as a multi-step component
5. Meso overview screen (timeline + weekly view)
6. Basic workout logging (extend `ActiveWorkout.jsx` to work with `meso_exercises` and `meso_sets`)
7. Workout preview screen (today's session)

**What's NOT in Phase 1:**
- Adaptation engine (volume and exercises are static across weeks)
- Feedback collection
- Deload auto-trigger
- End-of-meso flow

---

### Phase 2: Intelligence (Estimated: 2-3 weeks)

**Goal:** The system adapts week-to-week based on real performance and feedback.

**Deliverables:**
1. Per-exercise feedback collection UI (post-exercise card)
2. Post-workout summary screen with session RPE
3. Adaptation engine (`src/lib/mesoAdaptation.js`):
   - Weekly volume adjustment logic
   - Load progression logic
   - RIR progression schedule
   - Deload trigger detection
4. `meso_adaptations` table and logging
5. Weekly adaptation report screen
6. Next-week generation: after adaptation engine runs, populate next week's `meso_days`, `meso_exercises`, `meso_sets`
7. Deload week generation (auto-generates when triggered)
8. Deload intro screen

---

### Phase 3: Polish (Estimated: 1-2 weeks)

**Goal:** Complete flows, better UX, full lifecycle.

**Deliverables:**
1. Template chooser screen with scoring algorithm
2. Custom builder screen (drag-and-drop muscle assignment)
3. End-of-mesocycle review screen with full statistics
4. Next mesocycle setup flow (Options A/B/C)
5. Calendar integration (place workouts on calendar, show meso week indicators)
6. Missed workout handling (reschedule/merge/skip logic)
7. Exercise swap UI in live workout
8. Coaching messages throughout (phase-specific tips, encouragement)

---

### Phase 4: Advanced (Estimated: 2-3 weeks)

**Goal:** Long-term intelligence and data-driven personalization.

**Deliverables:**
1. `volume_landmarks` table and personal landmark discovery
2. Multi-meso history view (compare mesocycle performance across blocks)
3. Exercise swap suggestions powered by feedback history
4. Volume landmark visualization (show user their personal MEV/MAV/MRV)
5. e1RM tracking and strength progression charts
6. Cross-system integration:
   - Pull sleep data from Sleep tracker to adjust readiness
   - Pull nutrition data from Meals/Macros to contextualize recovery
   - Show workout data on Dashboard
7. Export mesocycle data (CSV/JSON)
8. "Quick Workout" mode preserved alongside mesocycle mode (for users who want ad-hoc sessions)
