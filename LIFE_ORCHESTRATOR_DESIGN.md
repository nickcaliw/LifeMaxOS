# Life Orchestrator Engine — Full System Design

## The Core Idea

The Life Orchestrator is not a new page. It is an **invisible intelligence layer** that reads from every system in Apex OS and writes a single output: **"Here is your day. Follow it."**

It replaces the user's need to plan, prioritize, schedule, and connect their life areas. The user opens the app and the answer is already there.

---

## Architecture

```
                         LIFE ORCHESTRATOR ENGINE
                                  |
                    +--------------+--------------+
                    |                             |
              INPUT LAYER                   OUTPUT LAYER
          (reads everything)            (writes the plan)
                    |                             |
    +-------+-------+-------+          +----------+----------+
    |       |       |       |          |          |          |
  Sleep   Habits  Workouts Calendar  Today's   Weekly    Coaching
  Mood    Goals   Finance  Social    Plan      Plan     Messages
  Energy  Body    Projects Spiritual
  Stress  Meals   Skills   Journal
```

### Three Execution Cycles

| Cycle | When | What It Does |
|-------|------|-------------|
| **Nightly Plan** | 12:00 AM (or on first app open) | Builds tomorrow's full daily plan |
| **Live Adjustment** | Every time the app is opened / data changes | Adapts the plan based on what actually happened |
| **Weekly Reset** | Sunday night / Monday morning | Evaluates the week, builds next week's structure |

---

## 1. DAILY AUTO-PLANNING ENGINE

### How the Day Gets Built

Every day at midnight (or on first open), the orchestrator runs this pipeline:

```
STEP 1: GATHER CONTEXT
  ├── Last night's sleep (hours, quality)
  ├── Yesterday's mood & energy
  ├── Yesterday's habit completion rate
  ├── Yesterday's missed tasks (carry forward?)
  ├── Today's calendar commitments (from planner agenda)
  ├── Today's scheduled workout (from workout_schedule)
  ├── Active goals and their deadlines
  ├── Active project tasks
  ├── Recovery signals (sleep trend, stress trend, soreness)
  ├── Financial alerts (overspending, bills due)
  ├── Social signals (days since last contact with key people)
  ├── Spiritual practice streak
  └── Current phase in workout program

STEP 2: CALCULATE READINESS SCORE (0-100)
  ├── Sleep component (30%): hours vs baseline, quality
  ├── Recovery component (25%): stress, soreness, mood trend
  ├── Energy component (20%): yesterday's energy, activity level
  ├── Momentum component (15%): habit streak, consistency
  └── Load component (10%): calendar density, pending tasks

STEP 3: DETERMINE DAY TYPE
  Based on readiness score:
  ├── 80-100: "Peak Day" — full load, hard workout, deep work blocks
  ├── 60-79:  "Standard Day" — normal load, regular workout
  ├── 40-59:  "Light Day" — reduced load, lighter workout or swap
  ├── 20-39:  "Recovery Day" — minimal load, deload or rest, focus on basics
  └── 0-19:   "Reset Day" — bare minimum, sleep/hydrate/eat, no guilt

STEP 4: BUILD THE SCHEDULE
  Using the day type + user's preferred time blocks:

  MORNING BLOCK (wake → 9am):
    1. Wake routine (from Routines page)
    2. Critical morning habits (filtered by day type)
    3. Spiritual practice (if streak active)
    4. Breakfast window

  FOCUS BLOCK (9am → 12pm):
    1. #1 Priority task (from goals/projects)
    2. Deep work session (Focus Timer auto-suggested)
    3. #2 Priority task

  MIDDAY BLOCK (12pm → 2pm):
    1. Lunch + meal prep reminder (from Meals)
    2. Light habits (water, supplements, walk)
    3. Social check-in (if flagged)

  AFTERNOON BLOCK (2pm → 6pm):
    1. Workout (if afternoon preference) OR remaining tasks
    2. #3 Priority task
    3. Admin/errands

  EVENING BLOCK (6pm → 10pm):
    1. Workout (if evening preference)
    2. Dinner window
    3. Evening habits
    4. Journal/reflection
    5. Wind-down routine (from Routines)

  Each block shows:
  - What to do
  - Why it matters (connected to which goal)
  - Estimated duration
  - Priority level (must-do vs nice-to-do)

STEP 5: ASSIGN PRIORITIES
  Top 3 priorities are auto-selected:
  1. Highest-urgency goal task (deadline proximity × importance)
  2. Most impactful habit (based on current streaks + day type)
  3. Relationship/growth action (rotated weekly)
```

### Priority Scoring Formula

```js
function scorePriority(item) {
  let score = 0;

  // Deadline urgency (exponential as deadline approaches)
  if (item.deadline) {
    const daysLeft = daysBetween(today, item.deadline);
    if (daysLeft <= 0) score += 100;      // overdue
    else if (daysLeft <= 1) score += 80;
    else if (daysLeft <= 3) score += 60;
    else if (daysLeft <= 7) score += 40;
    else if (daysLeft <= 14) score += 20;
    else score += 10;
  }

  // Goal alignment (items connected to active goals score higher)
  if (item.goalId) score += 25;

  // Streak protection (if completing this preserves a streak)
  if (item.streakAtRisk) score += 30;

  // Carry-forward (missed yesterday = higher priority today)
  if (item.missedYesterday) score += 20;

  // Day type adjustment
  if (dayType === 'recovery' || dayType === 'reset') {
    // Only keep truly critical items on low days
    if (!item.critical) score *= 0.3;
  }

  return score;
}
```

### Missed Task Handling

```
When a task is missed:
  1. Was it time-sensitive?
     YES → Flag as overdue, auto-reschedule to tomorrow's #1 slot
     NO  → Move to tomorrow's task pool with +20 priority boost

  2. Was it a habit?
     YES → Don't carry forward (habits reset daily)
           But: flag the streak break for coaching message
     NO  → Carry forward with boost

  3. Was it a workout?
     YES → Trigger workout rescheduling engine (existing system)
     NO  → Standard carry-forward

  4. Has it been missed 3+ days?
     YES → Escalate: "This keeps getting pushed. Should we reschedule
            or remove it?" (user prompt)
     NO  → Silent carry-forward

  NEVER guilt. Always frame as: "Here's the adjusted plan."
```

---

## 2. WORKOUT AUTO-SCHEDULING (Integration)

The workout system already generates schedules. The orchestrator integrates it:

### Automatic Placement Rules

```
1. READ user's preferred workout days + times (from onboarding)
2. READ today's readiness score
3. READ workout_schedule for today's planned session

PLACEMENT LOGIC:
  - If user prefers morning workouts → place in 6-8am slot
  - If user prefers evening → place in 5-7pm slot
  - If no preference → place after the longest focus block (mental break)

ADJUSTMENT LOGIC:
  - Readiness 80+: train as planned
  - Readiness 60-79: train as planned, note "listen to your body"
  - Readiness 40-59: suggest volume reduction (flag in workout view)
  - Readiness 20-39: swap to deload session or suggest rest
  - Readiness <20: auto-convert to rest day, reschedule via existing engine

CALENDAR CONFLICT:
  - If workout slot overlaps with a calendar event:
    → Find next available slot that day
    → If no slot: move to next available day (trigger reschedule engine)
    → Show: "Workout moved to [time] due to schedule conflict"
```

### Weekly Structure (Auto-Generated)

```
Every Sunday night / Monday morning:

1. Pull next week's workout_schedule entries
2. Check user's calendar for the week (planner agenda entries)
3. Identify conflicts
4. Auto-resolve:
   - Swap workout days if a conflict exists
   - Maintain recovery spacing rules
   - Prefer user's original preferred days
5. Write adjusted schedule
6. Show in weekly plan: "Your training week is set"
```

---

## 3. HABIT PRIORITY ENGINE

### The Problem
15 habits daily is overwhelming. Some days the user can do 12. Some days they can do 5. The system should know which ones matter most TODAY.

### Habit Tiering

```
TIER 1 — NON-NEGOTIABLE (always shown, always prioritized)
  These are the habits that, if done, make everything else easier.
  Determined by: highest correlation with the user's daily score.

  Default Tier 1:
  - Sleep Hygiene
  - Hydration
  - Strength Training (on training days)

TIER 2 — IMPORTANT (shown on standard+ days)
  Strong impact but can flex.

  Default Tier 2:
  - Meditation / Breath Work
  - Deep Work block
  - Macro / Nutrition tracking
  - Reading

TIER 3 — NICE-TO-HAVE (shown on peak days, hidden on recovery days)
  Good habits but not critical when energy is low.

  Default Tier 3:
  - Cold exposure
  - Sunlight exposure
  - Dopamine control
  - Daily weigh-in
```

### Dynamic Filtering by Day Type

```
DAY TYPE        HABITS SHOWN
─────────────────────────────
Peak Day        All tiers (Tier 1 + 2 + 3)
Standard Day    Tier 1 + Tier 2
Light Day       Tier 1 + select Tier 2
Recovery Day    Tier 1 only
Reset Day       Top 3 habits only (sleep, water, eat)
```

### Adaptive Prioritization

```
IF sleep < 6 hours:
  → Promote "Sleep Hygiene" to top of list
  → Add coaching: "Recovery is the priority today"
  → Demote exercise-related habits

IF habit streak > 14 days:
  → That habit is locked in, reduce its visual prominence
  → Promote struggling habits (streak < 3) to top

IF user consistently skips a Tier 3 habit:
  → After 14 days of <30% completion:
    → Suggest removing or replacing it
    → "You've completed Cold Exposure 2 times in 14 days. Remove or keep?"

IF it's a training day:
  → Promote: Creatine, Supplements, Macro Tracking, Protein
  → Add: "Training day — fuel up"

IF it's a rest day:
  → Promote: Meditation, Reading, Stretching
  → Add: "Recovery day — restore"
```

---

## 4. CROSS-SYSTEM INTELLIGENCE

This is the brain. Every system feeds signals, and the orchestrator reads them to make decisions.

### Signal Map

| Source System | Signal | Orchestrator Action |
|--------------|--------|-------------------|
| **Sleep** | < 6 hours | Reduce workout intensity, reduce habit load, promote recovery |
| **Sleep** | > 8 hours | Flag as Peak Day potential |
| **Mood** | "Low" or "Tough" | Lighten the day, suggest journaling, add coaching message |
| **Mood** | "Great" | Full load, suggest tackling hard tasks |
| **Energy** | 1-2 | Recovery Day mode |
| **Energy** | 4-5 | Peak Day mode |
| **Workout** | Missed 2+ this week | Auto-reschedule, reduce volume next week |
| **Workout** | All sessions completed | Celebrate, consider volume progression |
| **Habits** | < 50% completion yesterday | Reduce today's habit count, show only Tier 1 |
| **Habits** | > 90% completion 7-day avg | Add stretch habit, increase challenge |
| **Body Stats** | Weight trending up + fat loss goal | Flag nutrition, suggest calorie review |
| **Body Stats** | Weight trending down + muscle gain goal | Flag undereating, suggest surplus |
| **Budget** | Overspending this month | Dashboard alert: "Budget is X% over in [category]" |
| **Budget** | Under budget | Positive reinforcement |
| **Social** | No contact with key person > 14 days | Add "Reach out to [name]" to today's plan |
| **Social** | Birthday within 7 days | Add "Get gift for [name]" to tasks |
| **Goals** | Deadline within 7 days | Escalate related tasks to #1 priority |
| **Goals** | No progress in 14 days | Coaching: "Your [goal] hasn't moved. Want to break it down?" |
| **Projects** | Task overdue | Carry forward with urgency flag |
| **Journal** | No entry in 3+ days | Gentle nudge: "Take 2 minutes to reflect" |
| **Spiritual** | Streak active | Maintain slot in morning block |
| **Spiritual** | Streak broken | Prompt to restart, reduce to 5-min version |
| **Fasting** | Active fast | Suppress meal-related reminders |
| **Water** | Below target at 3pm | Mid-day reminder |
| **Supplements** | Not logged by noon | Reminder in midday block |

### Cross-System Rules Engine

```js
function evaluateCrossSignals(context) {
  const rules = [];

  // SLEEP → WORKOUT
  if (context.sleep.hours < 6) {
    rules.push({
      action: 'reduce_workout_intensity',
      reason: 'Sleep was low',
      message: 'Volume reduced — recovery is the priority today.',
    });
  }

  // SLEEP → HABITS
  if (context.sleep.hours < 5.5) {
    rules.push({
      action: 'set_day_type',
      value: 'recovery',
      reason: 'Very low sleep',
      message: 'Light day. Focus on the basics.',
    });
  }

  // MOOD → DAY STRUCTURE
  if (context.mood === 'tough' || context.mood === 'low') {
    rules.push({
      action: 'lighten_day',
      reason: 'Low mood',
      message: 'Be kind to yourself today. Small wins count.',
    });
    rules.push({
      action: 'suggest_journal',
      reason: 'Low mood',
      message: 'Writing helps. Take 5 minutes to process.',
    });
  }

  // BUDGET → ALERT
  if (context.budget.percentUsed > 90 && context.budget.daysRemaining > 5) {
    rules.push({
      action: 'flag_budget',
      reason: 'Overspending',
      message: `You've used ${context.budget.percentUsed}% of your ${context.budget.topCategory} budget with ${context.budget.daysRemaining} days left.`,
    });
  }

  // SOCIAL → OUTREACH
  if (context.social.overdueContacts.length > 0) {
    const person = context.social.overdueContacts[0];
    rules.push({
      action: 'add_task',
      task: `Reach out to ${person.name}`,
      reason: `Last contact: ${person.daysSince} days ago`,
      priority: 'medium',
    });
  }

  // WEIGHT → NUTRITION
  if (context.bodyStats.weightTrend === 'up' && context.goal === 'fat_loss') {
    rules.push({
      action: 'flag_nutrition',
      reason: 'Weight trending up during cut',
      message: 'Weight is up this week. Review your calorie intake.',
    });
  }

  // GOAL DEADLINE → URGENCY
  for (const goal of context.goals.approaching) {
    if (goal.daysLeft <= 7) {
      rules.push({
        action: 'escalate_goal',
        goalId: goal.id,
        reason: `${goal.name} due in ${goal.daysLeft} days`,
        message: `${goal.name} is due ${goal.daysLeft === 0 ? 'today' : `in ${goal.daysLeft} days`}. Prioritized.`,
      });
    }
  }

  // CONSISTENCY → CHALLENGE
  if (context.habits.sevenDayAvg > 0.9) {
    rules.push({
      action: 'suggest_challenge',
      reason: 'High consistency',
      message: 'You're crushing it. Ready for a new challenge?',
    });
  }

  return rules;
}
```

---

## 5. WEEKLY RESET SYSTEM

### When It Runs
Sunday night or Monday morning (first app open of the week).

### What It Does

```
STEP 1: EVALUATE LAST WEEK
  ├── Habit completion rate (overall + per habit)
  ├── Workout adherence (completed / scheduled)
  ├── Goal progress (tasks completed, milestones hit)
  ├── Sleep average
  ├── Mood trend (improving / declining / stable)
  ├── Budget status
  ├── Social engagement (contacts made)
  ├── Spiritual practice adherence
  ├── Focus hours logged
  └── Life Areas balance (from scoreboard)

STEP 2: GENERATE WEEKLY INSIGHTS
  - "Last week: 78% habit completion (↑ from 72%)"
  - "Workouts: 4/5 completed. Missed Pull 2 on Friday."
  - "Sleep averaged 6.8h (below your 7.5h target)"
  - "Mood trend: improving (3.2 → 3.8 avg)"
  - "Budget: 15% under target. Nice."
  - "You haven't talked to [person] in 18 days."

STEP 3: BUILD NEXT WEEK'S PLAN

  TRAINING WEEK:
    - Pull from workout_schedule (already generated)
    - Adjust if last week had missed sessions (reschedule engine)
    - Apply volume adjustments if readiness was low

  HABIT FOCUS:
    - If a habit fell below 50% last week → promote it to Tier 1 this week
    - If a habit was 100% last week → mark as "locked in", reduce prominence
    - Suggest one new micro-habit if overall completion > 85%

  GOAL PRIORITIES:
    - Rank goals by deadline proximity × importance
    - Break top goal into 3-5 daily tasks for the week
    - Distribute tasks across the week (heavier on Peak Day predictions)

  SOCIAL:
    - Identify top 3 people to contact this week
    - Place reminders on specific days

  RECOVERY:
    - If last week's avg readiness was < 50, auto-schedule a light week
    - If last week was strong (avg readiness > 75), maintain or push

STEP 4: PRESENT WEEKLY PLAN
  Show on Dashboard (Monday):
  ┌─────────────────────────────────────────────────┐
  │  YOUR WEEK AT A GLANCE                          │
  │                                                 │
  │  Training: Push/Pull/Legs/Push/Pull (5 sessions)│
  │  Focus: Deep work Mon-Thu, light Friday         │
  │  Priority: Finish [Goal X] proposal by Thursday │
  │  Habit focus: Meditation (38% last week → aim 70%)│
  │  Social: Call Mom, lunch with [friend]           │
  │  Recovery: Light day Wednesday                   │
  │                                                 │
  │  Weekly Score Target: 82 (last week: 76)         │
  └─────────────────────────────────────────────────┘
```

---

## 6. LIFE SCORE AUTOMATION

### Current State
The app already has a daily score on the dashboard. The orchestrator enhances it.

### Enhanced Scoring

```
DAILY LIFE SCORE (0-100)

Components:
  ├── Habits (30 pts)
  │   └── (completed / total) × 30
  │
  ├── Productivity (20 pts)
  │   ├── Focus time logged (0-10 pts, target: 2 hours)
  │   └── Top 3 priorities completed (0-10 pts, 3.33 each)
  │
  ├── Health (20 pts)
  │   ├── Workout completed (0-8 pts, 8 if training day + completed)
  │   ├── Sleep quality (0-6 pts, based on hours vs target)
  │   └── Nutrition logged (0-6 pts)
  │
  ├── Growth (15 pts)
  │   ├── Journal entry (0-5 pts)
  │   ├── Reading / learning (0-5 pts)
  │   └── Spiritual practice (0-5 pts)
  │
  └── Connection (15 pts)
      ├── Social interaction (0-8 pts)
      └── Gratitude / reflection (0-7 pts)
```

### Score Explanation

Every evening (or when user checks score), show:

```
TODAY'S SCORE: 74 / 100

What lifted your score:
  + Habits: 12/15 completed (+24 pts)
  + Workout completed (+8 pts)
  + Deep work: 2.5 hours (+10 pts)
  + Journal entry (+5 pts)

What held it back:
  - Sleep: 5.8h (below 7h target) (+2/6 pts)
  - No social interaction today (+0/8 pts)
  - Missed 3 habits (-6 pts from max)

Tomorrow's focus:
  → Get to bed by 10:30pm (sleep was low)
  → Reach out to someone (0 social pts today)
  → Complete all Tier 1 habits
```

### Trend Intelligence

```
WEEKLY TREND:
  Mon: 82  Tue: 71  Wed: 68  Thu: 75  Fri: 64  Sat: 79  Sun: 73
  Average: 73 (last week: 69, ↑ +4)

PATTERN DETECTED:
  "Your scores dip mid-week (Wed-Thu). Consider a lighter
   schedule on those days or moving your hardest tasks to Mon-Tue."

MONTHLY:
  Week 1: 69 avg  →  Week 2: 73 avg  →  Week 3: 76 avg  →  Week 4: 74 avg
  "Consistent improvement over the month. Week 4 dip is normal —
   end-of-month fatigue. Expect a strong start next week."
```

---

## 7. USER EXPERIENCE — "TODAY" VIEW

### The Hero Screen

When the user opens the app, the Dashboard transforms into a **command center**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, Nick.                         Thu, Mar 27        │
│  Today is a Standard Day.                    Readiness: 72      │
│                                                                 │
│  "Your sleep was solid. Full schedule today."                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TOP 3 PRIORITIES                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. ○ Finish project proposal (Goal: Career Growth)      │    │
│  │ 2. ○ Push 1 — Chest & Shoulders (~58 min)               │    │
│  │ 3. ○ Call Mom (last contact: 12 days ago)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TODAY'S SCHEDULE                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 6:30  Wake + Morning Routine                            │    │
│  │ 7:00  Meditation (10 min) · Devotion                    │    │
│  │ 7:30  Breakfast · Supplements · Creatine                │    │
│  │ 8:00  ■ Deep Work: Project proposal (2h block)          │    │
│  │ 10:00 Break · Water · Stretch                           │    │
│  │ 10:15 ■ Focus: Email + admin (45 min)                   │    │
│  │ 11:00 ■ Secondary task: Review budget                   │    │
│  │ 12:00 Lunch · Log macros                                │    │
│  │ 1:00  Light work / errands                              │    │
│  │ 3:00  Pre-workout meal                                  │    │
│  │ 4:00  ■ Push 1 — Chest & Shoulders                      │    │
│  │ 5:15  Post-workout meal · Protein                       │    │
│  │ 6:00  Free time                                         │    │
│  │ 7:00  Dinner · Log macros                               │    │
│  │ 8:00  Reading (30 min)                                  │    │
│  │ 8:30  Journal · Reflection                              │    │
│  │ 9:00  Evening routine · Wind down                       │    │
│  │ 10:00 Lights out                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TODAY'S HABITS (8 of 15 — Standard Day)                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ○ Sleep Hygiene [7-8h]           ○ Deep Work [2h]       │    │
│  │ ○ Hydration                      ○ Macro Tracking       │    │
│  │ ○ Meditation                     ○ Reading [30m]        │    │
│  │ ○ Strength Training              ○ Supplements          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ALERTS                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ⚡ Weight trending up — review calorie intake            │    │
│  │ 👤 Haven't talked to Mom in 12 days                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  YESTERDAY'S SCORE: 74                                          │
│  "Sleep was low. Strong workout. Missed journaling."            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  "Do what you can, with what you have, where you are."          │
│  — Theodore Roosevelt                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Principles

1. **One glance = full picture.** The user should understand their entire day in 5 seconds.
2. **Color-coded blocks.** Deep work = blue, workout = green, meals = orange, recovery = purple.
3. **Completion tracking.** Tasks/habits get checked off inline. Score updates live.
4. **No planning UI.** The schedule is pre-built. The user just follows it.
5. **Alerts are actionable.** Each alert links to the relevant page.
6. **Coaching tone.** Messages are warm, direct, and never guilt-inducing.

---

## 8. AUTOMATION RULES — DECISION TREE

### Master Decision Tree

```
ON APP OPEN:
  │
  ├── Is today's plan already generated?
  │   ├── YES → Check for live adjustments (data changed since plan was built)
  │   │         ├── Sleep logged since plan? → Recalculate readiness, adjust day type
  │   │         ├── Task completed? → Update progress, recalculate score
  │   │         ├── Workout completed? → Mark done, update training status
  │   │         └── No changes → Show existing plan
  │   │
  │   └── NO → Run daily planning pipeline
  │            ├── Gather context (all systems)
  │            ├── Calculate readiness
  │            ├── Determine day type
  │            ├── Build schedule
  │            ├── Assign priorities
  │            ├── Filter habits
  │            ├── Generate coaching messages
  │            └── Save plan to database

ON TASK COMPLETION:
  │
  ├── Update daily score
  ├── Check if priority list needs reordering
  ├── If workout completed → update workout_schedule status
  ├── If habit completed → update streak
  └── If all top 3 done → celebration + suggest bonus task

ON MISSED TASK (end of day):
  │
  ├── Is it a habit? → Don't carry forward, flag streak
  ├── Is it a workout? → Trigger reschedule engine
  ├── Is it a goal task? → Carry forward with +20 priority
  ├── Has it been missed 3+ times? → Prompt user
  └── Update daily score explanation

ON WEEKLY RESET:
  │
  ├── Calculate weekly averages (score, sleep, habits, workouts)
  ├── Identify top 3 wins and top 3 struggles
  ├── Adjust next week's structure
  │   ├── Low readiness avg → lighter week
  │   ├── Missed workouts → reschedule
  │   ├── Struggling habit → promote
  │   └── Strong week → maintain or push
  ├── Generate weekly plan
  └── Set weekly score target

ON DATA CHANGE (any system):
  │
  ├── Sleep logged → recalculate readiness
  ├── Weight logged → check trend vs goal
  ├── Budget entry → check spending vs target
  ├── Mood logged → adjust day type if needed
  ├── Goal updated → reprioritize tasks
  └── Person contacted → update social signals
```

### Scheduling Rules

```
RULE 1: Sleep target comes first.
  → Never schedule anything within 30 min of target bedtime
  → If sleep was < 6h, suggest earlier bedtime tonight

RULE 2: Workouts are anchored.
  → Workout time is set during onboarding and rarely moves
  → Only moves for calendar conflicts or very low readiness

RULE 3: Deep work gets the best slot.
  → Place #1 priority in the user's highest-energy time
  → Default: first 2 hours after morning routine
  → Never place deep work after a workout

RULE 4: Habits distribute naturally.
  → Morning habits: with wake routine
  → Midday habits: water, supplements, food logging
  → Evening habits: reading, journal, wind-down
  → Don't cluster — spread across the day

RULE 5: Recovery is scheduled, not leftover.
  → Rest days have their own structure (not just "nothing")
  → Include: stretching, walking, reading, social, reflection

RULE 6: Social is intentional.
  → One social action per day on standard+ days
  → Rotate through overdue contacts
  → Birthday alerts 7 days in advance

RULE 7: Adapt, don't force.
  → If the user ignores the plan, don't keep showing it
  → After 3 consecutive days of < 30% plan adherence:
     "Your plan doesn't match your reality. Want to adjust your schedule?"
```

---

## 9. IMPLEMENTATION

### Data Model

```sql
-- Stores the daily orchestrated plan
CREATE TABLE IF NOT EXISTS daily_plans (
  date TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,    -- full plan: schedule, priorities, habits, alerts, coaching
  readiness_score INTEGER,
  day_type TEXT,              -- peak, standard, light, recovery, reset
  score INTEGER,              -- final daily score
  score_breakdown_json TEXT,  -- component scores
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Stores weekly plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  week_start TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,    -- weekly structure, priorities, training plan, social
  last_week_score INTEGER,
  target_score INTEGER,
  insights_json TEXT,         -- weekly insights
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Core Module: `src/lib/orchestrator.js`

```
Exports:
  - generateDailyPlan(context)     → full day plan object
  - evaluateReadiness(context)     → readiness score + day type
  - filterHabits(habits, dayType)  → filtered habit list
  - scorePriority(items)           → sorted priority list
  - evaluateCrossSignals(context)  → alerts and adjustments
  - calculateDailyScore(dayData)   → score + breakdown
  - generateWeeklyPlan(weekData)   → weekly plan object
  - generateWeeklyInsights(data)   → insight strings
```

### Integration Points

```
Dashboard:
  → On mount: load or generate today's plan
  → Show orchestrated view instead of manual planning
  → Live score updates

Planner:
  → Pre-fill agenda from orchestrator's schedule
  → Habits pre-filtered by day type
  → Top 3 priorities auto-populated

Workouts:
  → Readiness score shown on Today's Workout
  → Volume adjustments from orchestrator signals

Habits:
  → Tier badges shown
  → Filtered view matches orchestrator's recommendation

Settings:
  → Toggle: "Auto-plan my day" (on/off)
  → Configure: wake time, bedtime, preferred workout time
  → Configure: deep work preference (morning/afternoon)
```

### Implementation Priority

```
PHASE 1: Foundation
  1. daily_plans + weekly_plans tables
  2. orchestrator.js — readiness calculator + day type
  3. Dashboard "Today" view with readiness + day type
  4. Auto-filter habits by day type

PHASE 2: Auto-Planning
  5. Schedule builder (time blocks)
  6. Priority scoring engine
  7. Dashboard schedule view
  8. Missed task carry-forward

PHASE 3: Cross-System Intelligence
  9. Signal evaluation engine
  10. Alerts on dashboard
  11. Coaching messages
  12. Budget/social/goal signals

PHASE 4: Weekly System
  13. Weekly evaluation pipeline
  14. Weekly plan generation
  15. Weekly insights
  16. Weekly score target

PHASE 5: Polish
  17. Score explanation UI
  18. Pattern detection ("your scores dip mid-week")
  19. Adaptation prompts ("your plan doesn't match reality")
  20. Celebration system integration
```
