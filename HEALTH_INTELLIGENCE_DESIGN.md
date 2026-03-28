# HEALTH INTELLIGENCE LAYER — Complete Design Specification

> Apex OS — Health Intelligence Layer v1.0
> Last updated: 2026-03-26

---

## 1. HEALTH INTELLIGENCE LAYER OVERVIEW

The Health Intelligence Layer is a set of 6 engines that sit **on top of** the existing tracking modules (Workouts, Meals, Sleep, Water, Supplements, Body Stats, Mood/Energy). These engines **read** data from existing tables and **output** decisions, scores, recommendations, and alerts. No existing features are modified — only new logic is added.

### The 6 Engines

| # | Engine | Runs | Input Sources | Output |
|---|--------|------|---------------|--------|
| 1 | **Workout Autoregulation** | After each completed training week | pump/soreness/difficulty ratings, set performance, RIR data | Volume changes, load changes, exercise swaps, deload triggers |
| 2 | **Recovery / Readiness Score** | Daily (on app open) | Sleep, mood, energy, soreness, training volume, consistency | Single 0-100 score with category and explanation |
| 3 | **Nutrition Autoregulation** | Weekly (Sunday or configurable) | Calorie/macro averages, weight trend, goal, readiness, energy | Calorie/macro adjustment recommendations |
| 4 | **Daily Health Decision** | Daily (on app open) | All systems | Prioritized list of 3-5 actionable recommendations |
| 5 | **Smart Alerts** | Daily (on app open) | Rolling averages across all systems | Trend-based alerts with cooldowns |
| 6 | **Autopilot Mode** | Daily (on app open) | All engine outputs | Single combined daily briefing card |

### Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    EXISTING TRACKING                      │
│  Workouts │ Meals │ Sleep │ Water │ Supplements │ Stats  │
│  Mood/Energy │ Habits │ Body Weight                       │
└────────────────────────┬─────────────────────────────────┘
                         │ reads (no writes to existing)
                         ▼
┌──────────────────────────────────────────────────────────┐
│               HEALTH INTELLIGENCE LAYER                   │
│                                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │
│  │  Workout     │ │  Readiness  │ │    Nutrition      │   │
│  │  Autoregul.  │ │  Score      │ │    Autoregul.     │   │
│  └──────┬───────┘ └──────┬──────┘ └────────┬─────────┘   │
│         │                │                  │             │
│  ┌──────▼────────────────▼──────────────────▼──────────┐ │
│  │           Daily Health Decision Engine               │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │            Smart Alerts Engine                       │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │            Autopilot Mode (combines all)             │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
            WRITES TO NEW TABLES ONLY:
     health_readiness, health_recommendations,
     health_alerts, nutrition_adjustments
```

### Integration with Existing Orchestrator

The existing `evaluateReadiness()` in `orchestrator.js` uses a simplified formula (sleep 30%, recovery 25%, energy 20%, momentum 15%, load 10%). The new Readiness Score Engine **replaces** this with a more granular formula that includes workout-specific data (soreness, training volume, sleep consistency). The existing function signature and return shape are preserved for backward compatibility — the new engine simply provides richer inputs and a more accurate score.

---

## 2. WEAK POINTS BEING SOLVED

### Problem 1: Workouts Progress Linearly Without Subjective Feedback
**Current state:** The mesocycle builder generates a fixed volume ramp (e.g., +1 set/week) regardless of how the user actually responds to the training stimulus. A user who is under-recovering gets the same volume increase as one who is flourishing.

**Solution:** The Workout Autoregulation Engine uses per-exercise pump/soreness/difficulty ratings to make per-muscle-group volume and load decisions every week. Volume only increases when the user demonstrates they can handle it.

### Problem 2: No Unified Recovery/Readiness Score
**Current state:** The orchestrator has a basic readiness score but it does not incorporate workout-specific fatigue (trailing volume, muscle soreness), sleep consistency, or training load history.

**Solution:** The Readiness Score Engine produces a 0-100 score from 7 weighted components with an explanation generator that tells the user *why* their readiness is what it is.

### Problem 3: Nutrition Is Static
**Current state:** The user sets calorie and macro targets once. These targets never change regardless of weight trends, energy levels, or training adaptations.

**Solution:** The Nutrition Autoregulation Engine runs weekly checks against weight trends, adherence, energy, and readiness to suggest calorie/macro adjustments with clear reasoning.

### Problem 4: No Cross-System Health Recommendations
**Current state:** Each module operates in isolation. Poor sleep does not inform workout intensity. Low protein does not trigger a nutrition alert. High soreness does not suggest a lighter day.

**Solution:** The Daily Health Decision Engine reads ALL systems on app open and produces a prioritized list of 3-5 cross-system recommendations.

### Problem 5: No Meaningful Alerts
**Current state:** No trend-based alerting. The user must manually notice that protein has been low for a week or that sleep quality has been declining.

**Solution:** The Smart Alerts Engine fires only when trends are detected (rolling averages over 3-7 days), with cooldowns to prevent alert fatigue.

### Problem 6: No Autopilot Mode
**Current state:** The user must check multiple pages (workout, meals, sleep, etc.) to assemble a picture of their day. There is no single "here's your day" briefing.

**Solution:** Autopilot Mode combines all engine outputs into a single daily briefing card on the dashboard.

---

## 3. WORKOUT AUTOREGULATION ENGINE

### Overview

This engine runs **once per completed training week** (triggered when the user completes their last scheduled session for the week, or manually via "Generate Next Week"). It processes per-exercise feedback and per-set performance data to produce next week's prescriptions.

### Inputs (Per Exercise, Per Session)

```
INPUTS:
  pump_rating      INTEGER 1-5    // How strong was the pump in the target muscle?
  soreness_rating  INTEGER 1-5    // How sore is the muscle 24-48h after? (collected next day)
  difficulty_rating INTEGER 1-5   // How hard did the exercise feel relative to effort?
  reps_achieved    INTEGER[]      // Actual reps per working set [12, 11, 10]
  rir_actual       INTEGER[]      // Actual RIR per working set [2, 1, 1]
  load_used        REAL           // Weight used in lbs
  joint_discomfort BOOLEAN        // Any joint pain during exercise?
  mmc_rating       INTEGER 1-5   // Mind-muscle connection quality (optional)
```

### Rating Scale Definitions

| Rating | Pump | Soreness (next day) | Difficulty |
|--------|------|---------------------|------------|
| 1 | No pump at all | No soreness | Very easy, could do 3x more sets |
| 2 | Slight pump, faded fast | Barely noticeable | Easy, plenty left in the tank |
| 3 | Moderate pump, lasted a bit | Noticeable but not limiting | Moderate, challenging but manageable |
| 4 | Strong pump, felt great | Sore, slightly limits movement | Hard, near my limit |
| 5 | Extreme pump, skin-splitting | Very sore, impacts daily activity | Maximum effort, could not do more |

### Volume Decision Logic (Per Muscle Group Per Week)

```javascript
function decideVolume(muscleGroup, weekData, currentWeek, mesoLength) {
  const exercises = weekData.getExercisesForMuscle(muscleGroup);

  const avgPump = mean(exercises.map(e => e.pump_rating).filter(Boolean));
  const avgSoreness = mean(exercises.map(e => e.soreness_rating).filter(Boolean));
  const avgDifficulty = mean(exercises.map(e => e.difficulty_rating).filter(Boolean));
  const anyJointPain = exercises.some(e => e.joint_discomfort);

  const currentVolume = weekData.totalSetsForMuscle(muscleGroup);
  let volumeChange = 0;
  let reason = "";

  // RULE 1: Joint pain — always reduce, highest priority
  if (anyJointPain) {
    volumeChange = -2;
    reason = "Joint discomfort detected. Reducing volume by 2 sets and flagging exercise for review.";
  }
  // RULE 2: Understimulated — great pump, low fatigue
  else if (avgPump >= 4 && avgSoreness <= 2 && avgDifficulty <= 2) {
    volumeChange = +1;
    reason = `Excellent pump (${avgPump.toFixed(1)}/5) with minimal fatigue. Adding 1 set.`;
  }
  // RULE 3: Productive range — good stimulus, manageable difficulty
  else if (avgPump >= 3 && avgSoreness <= 3 && avgDifficulty >= 2.5 && avgDifficulty <= 3.5) {
    volumeChange = 0;
    reason = `Good stimulus-to-fatigue ratio. Maintaining volume.`;
  }
  // RULE 4: Overstimulated — too much fatigue relative to stimulus
  else if (avgSoreness >= 4 || avgDifficulty >= 4) {
    volumeChange = -1;
    const culprit = avgSoreness >= 4 ? `soreness (${avgSoreness.toFixed(1)}/5)` : `difficulty (${avgDifficulty.toFixed(1)}/5)`;
    reason = `High ${culprit}. Removing 1 set to manage fatigue.`;
  }
  // RULE 5: Poor stimulus — exercise might be wrong
  else if (avgPump <= 1.5 && avgDifficulty <= 2) {
    volumeChange = 0;
    // Flag for exercise swap (see swap logic below)
    reason = `Low pump (${avgPump.toFixed(1)}/5) despite easy effort. Exercise swap recommended.`;
  }
  // RULE 6: High effort, low pump — bad stimulus-to-fatigue ratio
  else if (avgPump <= 2 && avgDifficulty >= 3) {
    volumeChange = 0;
    reason = `High effort but poor pump. Exercise may have poor SFR for this user.`;
  }
  // RULE 7: Week-dependent defaults
  else {
    const earlyMeso = currentWeek <= mesoLength * 0.4;
    if (earlyMeso && avgSoreness <= 2.5) {
      volumeChange = +1;
      reason = "Early mesocycle, building volume. Adding 1 set.";
    } else {
      volumeChange = 0;
      reason = "Maintaining volume to manage accumulated fatigue.";
    }
  }

  // BOUNDS CHECK against VOLUME_LANDMARKS
  const { mev, mrv } = VOLUME_LANDMARKS[muscleGroup];
  let newVolume = currentVolume + volumeChange;

  if (newVolume < mev) {
    newVolume = mev;
    volumeChange = mev - currentVolume;
    reason += ` Clamped to MEV (${mev} sets).`;
  } else if (newVolume > mrv) {
    newVolume = mrv;
    volumeChange = mrv - currentVolume;
    reason += ` Capped at MRV (${mrv} sets).`;
  }

  return { volumeChange, newVolume, reason };
}
```

### Exercise Swap Logic

```javascript
function checkExerciseSwap(exercises, muscleGroup, history) {
  const swapCandidates = [];

  for (const ex of exercises) {
    // Condition A: Low pump for 2+ consecutive weeks
    const lastTwoWeeks = history.getPumpRatings(ex.id, 2);
    if (lastTwoWeeks.length >= 2 && lastTwoWeeks.every(p => p <= 1.5)) {
      swapCandidates.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        reason: `Pump has been ≤1.5 for ${lastTwoWeeks.length} consecutive weeks. Poor muscle activation.`,
        priority: "high"
      });
    }

    // Condition B: Joint discomfort 2+ sessions
    const jointHistory = history.getJointFlags(ex.id, 3);
    if (jointHistory.filter(Boolean).length >= 2) {
      swapCandidates.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        reason: `Joint discomfort in ${jointHistory.filter(Boolean).length} of last 3 sessions. Exercise may be biomechanically unsuitable.`,
        priority: "urgent"
      });
    }

    // Condition C: High effort, consistently low pump (bad SFR)
    const recentDifficulty = history.getDifficultyRatings(ex.id, 3);
    const recentPump = history.getPumpRatings(ex.id, 3);
    if (
      recentDifficulty.length >= 3 &&
      mean(recentDifficulty) >= 3.5 &&
      mean(recentPump) <= 2
    ) {
      swapCandidates.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        reason: `Consistently high effort (${mean(recentDifficulty).toFixed(1)}/5) but low pump (${mean(recentPump).toFixed(1)}/5). Poor stimulus-to-fatigue ratio.`,
        priority: "medium"
      });
    }
  }

  return swapCandidates;
}
```

### Load Decision Logic (Per Exercise)

```javascript
function decideLoad(exercise, weekSets) {
  const workingSets = weekSets.filter(s => s.type === "working" && s.completed);
  if (workingSets.length === 0) return { action: "maintain", change: 0, note: "No completed sets." };

  const targetRepHigh = exercise.target_rep_high;  // e.g., 12
  const targetRepLow = exercise.target_rep_low;    // e.g., 8
  const targetRir = exercise.target_rir;           // e.g., 2

  const allHitTop = workingSets.every(s => s.actual_reps >= targetRepHigh);
  const allMetRir = workingSets.every(s => s.actual_rir !== null && s.actual_rir <= targetRir + 1);
  const setsBelowBottom = workingSets.filter(s => s.actual_reps < targetRepLow).length;
  const allHitBottom = workingSets.every(s => s.actual_reps >= targetRepLow && s.actual_reps < targetRepHigh);

  // PROGRESSION: All sets at top of range at target RIR
  if (allHitTop && allMetRir) {
    const increment = getMinIncrement(exercise.equipment);
    return {
      action: "increase",
      change: increment,
      note: `All sets hit ${targetRepHigh} reps at RIR ${targetRir}. Increasing weight by ${increment} lbs.`
    };
  }

  // REGRESSION: Too many sets below range
  if (setsBelowBottom >= 2) {
    return {
      action: "maintain",
      change: 0,
      note: `${setsBelowBottom} sets below ${targetRepLow} reps. Keep weight, focus on hitting range.`
    };
  }

  // DEFAULT: Making progress within range
  return {
    action: "maintain",
    change: 0,
    note: `Keep current weight. Aim for +1 rep per set vs. last week.`
  };
}

function getMinIncrement(equipment) {
  const MAP = {
    barbell: 5,        // 2.5 per side
    dumbbell: 5,       // 5 per hand (or 2.5 if microplates available)
    cable: 5,
    machine: 5,
    smith_machine: 5,
    ez_bar: 5,
    kettlebell: 5,
    bodyweight: 0,     // progress via reps
    bands: 0           // progress via reps or next band
  };
  return MAP[equipment] || 5;
}
```

### RIR Progression Across Mesocycle

```javascript
function calculateRirForWeek(week, mesoLength) {
  // Deload week
  if (week > mesoLength) return 5;

  // Explicit schedule for common meso lengths:
  const RIR_SCHEDULES = {
    4: [3, 2, 1, 0],           // 4-week: aggressive
    5: [3, 3, 2, 1, 0],       // 5-week: standard
    6: [4, 3, 2, 2, 1, 0],    // 6-week: extended
  };

  if (RIR_SCHEDULES[mesoLength]) {
    return RIR_SCHEDULES[mesoLength][week - 1] ?? 2;
  }

  // Fallback: linear interpolation from 3.5 → 1.0
  const progress = (week - 1) / Math.max(mesoLength - 1, 1);
  const rir = 3.5 - (progress * 2.5);
  return Math.round(rir * 2) / 2; // nearest 0.5
}

// Week-by-week for a standard 5-week meso:
// Week 1: RIR 3   (acclimation)
// Week 2: RIR 3   (building)
// Week 3: RIR 2   (pushing)
// Week 4: RIR 1   (overreaching)
// Week 5: RIR 0   (peak effort)
// Deload:  RIR 5   (recovery)
```

### Deload Trigger Logic

```javascript
function checkDeloadTriggers(mesoId, currentWeek, mesoLength, weekData, history) {
  const triggers = [];

  // TRIGGER 1: Planned meso length reached
  if (currentWeek >= mesoLength) {
    triggers.push({
      type: "planned",
      priority: "mandatory",
      message: "Mesocycle training weeks complete. Time for a deload."
    });
  }

  // TRIGGER 2: Performance regression on 3+ exercises for 2 consecutive weeks
  if (currentWeek >= 3) {
    const thisWeek = history.getPerformanceSummary(currentWeek);
    const lastWeek = history.getPerformanceSummary(currentWeek - 1);
    const twoWeeksAgo = history.getPerformanceSummary(currentWeek - 2);

    const regressedExercises = thisWeek.filter(ex => {
      const prev = lastWeek.find(p => p.exerciseId === ex.exerciseId);
      const prevPrev = twoWeeksAgo.find(p => p.exerciseId === ex.exerciseId);
      if (!prev || !prevPrev) return false;
      return ex.estimatedOneRM < prev.estimatedOneRM && prev.estimatedOneRM < prevPrev.estimatedOneRM;
    });

    if (regressedExercises.length >= 3) {
      triggers.push({
        type: "performance_regression",
        priority: "strong",
        message: `Performance regressed on ${regressedExercises.length} exercises for 2 consecutive weeks. Functional overreaching likely.`,
        exercises: regressedExercises.map(e => e.name)
      });
    }
  }

  // TRIGGER 3: Average difficulty >= 4.5 for the week
  const weekDifficulty = weekData.getAllDifficultyRatings();
  if (weekDifficulty.length > 0 && mean(weekDifficulty) >= 4.5) {
    triggers.push({
      type: "excessive_difficulty",
      priority: "strong",
      message: `Average session difficulty was ${mean(weekDifficulty).toFixed(1)}/5. Systemic fatigue is very high.`
    });
  }

  // TRIGGER 4: Excessive soreness on 3+ muscle groups
  const sorenessMap = weekData.getSorenessPerMuscle();
  const highSorenessMuscles = Object.entries(sorenessMap)
    .filter(([_, avg]) => avg >= 4)
    .map(([muscle]) => muscle);

  if (highSorenessMuscles.length >= 3) {
    triggers.push({
      type: "excessive_soreness",
      priority: "strong",
      message: `High soreness (≥4/5) in ${highSorenessMuscles.length} muscle groups: ${highSorenessMuscles.join(", ")}.`
    });
  }

  // TRIGGER 5: Readiness score consistently low
  const readinessHistory = history.getReadinessScores(7); // last 7 days
  if (readinessHistory.length >= 5 && mean(readinessHistory) < 40) {
    triggers.push({
      type: "low_readiness",
      priority: "moderate",
      message: `Average readiness has been ${mean(readinessHistory).toFixed(0)}/100 over the past week. Extended recovery recommended.`
    });
  }

  // Decision: deload if any mandatory trigger, or 2+ strong triggers
  const shouldDeload =
    triggers.some(t => t.priority === "mandatory") ||
    triggers.filter(t => t.priority === "strong").length >= 2 ||
    (triggers.filter(t => t.priority === "strong").length >= 1 && triggers.filter(t => t.priority === "moderate").length >= 1);

  return { shouldDeload, triggers };
}
```

---

## 4. RECOVERY / READINESS SCORE ENGINE

### Overview

Produces a single 0-100 score from 7 weighted components. Replaces the existing `evaluateReadiness()` in `orchestrator.js` with a more granular formula that incorporates workout-specific data.

### Existing System Compatibility

The current `evaluateReadiness()` returns `{ score, level, dayType }`. The new engine returns the same shape plus additional fields (`components`, `explanation`, `recommendations`). All existing consumers continue to work.

### Formula

```javascript
export function calculateReadiness(context) {
  const {
    sleep = {},               // { hours, quality, bedtime, wakeTime }
    sleepBaseline = 8,        // user's target hours (from settings)
    wakeTimeBaseline = "7:00", // user's target wake time
    mood = null,              // "great" | "good" | "okay" | "low" | "tough"
    energy = null,            // 1-5
    sorenessRatings = {},     // { chest: 3, quads: 4, ... } from yesterday's feedback
    trailing3DayVolume = 0,   // total sets completed in last 3 days
    maxRecoverableVolume = 60, // user's estimated weekly MRV (sum of all muscle MRVs / 7 * 3)
    completedLast7 = 0,       // sessions completed in last 7 days
    scheduledLast7 = 0,       // sessions scheduled in last 7 days
    stressLevel = null,       // 1-5 (from daily check-in, optional)
  } = context;

  // ─── COMPONENT 1: SLEEP DURATION (30 points max) ───
  const hours = sleep.hours ?? null;
  let sleepDurationScore;
  if (hours !== null) {
    sleepDurationScore = clamp(hours / sleepBaseline, 0, 1.2) * 30;
  } else {
    sleepDurationScore = 0.6 * 30; // 18 — neutral default when no data
  }

  // ─── COMPONENT 2: SLEEP CONSISTENCY (10 points max) ───
  let sleepConsistencyScore;
  if (sleep.wakeTime && wakeTimeBaseline) {
    const actualMinutes = parseTime(sleep.wakeTime);
    const baselineMinutes = parseTime(wakeTimeBaseline);
    const varianceMinutes = Math.abs(actualMinutes - baselineMinutes);
    sleepConsistencyScore = clamp(1 - varianceMinutes / 60, 0, 1) * 10;
  } else {
    sleepConsistencyScore = 0.5 * 10; // 5 — neutral default
  }

  // ─── COMPONENT 3: MOOD (15 points max) ───
  const MOOD_VALUES = { great: 1.0, good: 0.8, okay: 0.6, low: 0.4, tough: 0.2 };
  const moodValue = mood ? (MOOD_VALUES[mood.toLowerCase()] ?? 0.6) : 0.6;
  const moodScore = moodValue * 15;

  // ─── COMPONENT 4: ENERGY (15 points max) ───
  const energyValue = energy ?? 3;
  const energyScore = (energyValue / 5) * 15;

  // ─── COMPONENT 5: WORKLOAD / TRAINING STRESS (15 points max) ───
  // Lower score when recent training volume is high relative to recovery capacity
  let workloadScore;
  if (trailing3DayVolume > 0 && maxRecoverableVolume > 0) {
    const loadRatio = clamp(trailing3DayVolume / maxRecoverableVolume, 0, 1);
    workloadScore = (1 - loadRatio) * 15;
  } else {
    workloadScore = 0.7 * 15; // 10.5 — slight benefit of doubt
  }

  // ─── COMPONENT 6: SORENESS (10 points max) ───
  const sorenessValues = Object.values(sorenessRatings);
  let sorenessScore;
  if (sorenessValues.length > 0) {
    const avgSoreness = mean(sorenessValues);
    sorenessScore = (1 - avgSoreness / 5) * 10;
  } else {
    sorenessScore = 0.7 * 10; // 7 — assume mild
  }

  // ─── COMPONENT 7: CONSISTENCY (5 points max) ───
  let consistencyScore;
  if (scheduledLast7 > 0) {
    consistencyScore = clamp(completedLast7 / scheduledLast7, 0, 1) * 5;
  } else {
    consistencyScore = 0.5 * 5; // 2.5
  }

  // ─── TOTAL ───
  const raw = sleepDurationScore + sleepConsistencyScore + moodScore + energyScore + workloadScore + sorenessScore + consistencyScore;
  const score = clamp(Math.round(raw), 0, 100);

  // ─── CATEGORY ───
  let category, dayType;
  if (score >= 80) { category = "Peak"; dayType = "peak"; }
  else if (score >= 65) { category = "Good"; dayType = "standard"; }
  else if (score >= 50) { category = "Moderate"; dayType = "light"; }
  else if (score >= 35) { category = "Low"; dayType = "recovery"; }
  else { category = "Very Low"; dayType = "reset"; }

  // ─── COMPONENTS OBJECT (for storage and UI) ───
  const components = {
    sleepDuration:    { value: sleepDurationScore,    max: 30, pct: sleepDurationScore / 30 },
    sleepConsistency: { value: sleepConsistencyScore, max: 10, pct: sleepConsistencyScore / 10 },
    mood:             { value: moodScore,             max: 15, pct: moodScore / 15 },
    energy:           { value: energyScore,           max: 15, pct: energyScore / 15 },
    workload:         { value: workloadScore,         max: 15, pct: workloadScore / 15 },
    soreness:         { value: sorenessScore,         max: 10, pct: sorenessScore / 10 },
    consistency:      { value: consistencyScore,      max: 5,  pct: consistencyScore / 5 },
  };

  const explanation = generateExplanation(components, category);

  return {
    score,
    level: category,          // backward compat with existing orchestrator
    dayType,                  // backward compat
    category,
    components,
    explanation,
  };
}
```

### Readiness Categories and Training Implications

| Score | Category | Training Adjustment |
|-------|----------|-------------------|
| 80-100 | **Peak** | Full intensity. Consider extra volume (+1 set on compounds). Push for PRs. |
| 65-79 | **Good** | Train as planned. No modifications needed. |
| 50-64 | **Moderate** | Reduce volume by 10-20% (drop 1 set per exercise). Maintain intensity. Skip isolation work if needed. |
| 35-49 | **Low** | Reduce volume by 30% (drop 1-2 sets per exercise). Lower intensity (add 1-2 RIR). Avoid failure. |
| 0-34 | **Very Low** | Rest day or very light session (50% volume, 50% load). Prioritize sleep and nutrition. |

### Explanation Generator

```javascript
function generateExplanation(components, category) {
  const FRIENDLY_NAMES = {
    sleepDuration: "sleep duration",
    sleepConsistency: "sleep schedule consistency",
    mood: "mood",
    energy: "energy level",
    workload: "recent training load",
    soreness: "muscle soreness",
    consistency: "training consistency",
  };

  // Find components below 60% of their max (negatives)
  const negatives = Object.entries(components)
    .filter(([_, c]) => c.pct < 0.6)
    .sort((a, b) => a[1].pct - b[1].pct)
    .map(([key]) => FRIENDLY_NAMES[key]);

  // Find components above 80% of their max (positives)
  const positives = Object.entries(components)
    .filter(([_, c]) => c.pct >= 0.8)
    .sort((a, b) => b[1].pct - a[1].pct)
    .map(([key]) => FRIENDLY_NAMES[key]);

  let explanation = `Readiness is ${category.toLowerCase()}`;

  if (negatives.length > 0) {
    explanation += ` — ${negatives.slice(0, 2).join(" and ")} ${negatives.length === 1 ? "is" : "are"} pulling it down`;
  }

  if (positives.length > 0 && negatives.length > 0) {
    explanation += `, but ${positives[0]} is solid`;
  } else if (positives.length > 0) {
    explanation += ` — ${positives.slice(0, 2).join(" and ")} ${positives.length === 1 ? "is" : "are"} strong today`;
  }

  explanation += ".";
  return explanation;
}
```

### Examples

| Scenario | Sleep | Mood | Energy | Soreness | Score | Category | Explanation |
|----------|-------|------|--------|----------|-------|----------|-------------|
| Great day | 8h, on time | great | 5 | low (1.5) | 92 | Peak | "Readiness is peak — sleep duration and energy level are strong today." |
| Average day | 7h, 20min late | good | 3 | moderate (2.5) | 67 | Good | "Readiness is good — energy level is pulling it down, but sleep duration is solid." |
| Poor sleep | 5h, 45min late | okay | 2 | moderate (3) | 42 | Low | "Readiness is low — sleep duration and sleep schedule consistency are pulling it down." |
| Wrecked | 4h, 1h late | tough | 1 | high (4) | 22 | Very Low | "Readiness is very low — sleep duration and energy level are pulling it down." |

---

## 5. NUTRITION AUTOREGULATION ENGINE

### Overview

Runs a weekly check (default: Sunday evening or Monday morning) comparing actual intake and body composition trends against goals. Outputs specific calorie and macro adjustment recommendations with reasoning.

### Inputs

```javascript
const nutritionContext = {
  // Averages
  avgCalories7d: 2200,           // 7-day rolling average of daily calories
  targetCalories: 2400,          // current calorie target
  avgProtein7d: 155,             // 7-day rolling average protein (g)
  targetProtein: 180,            // current protein target (g)
  avgCarbs7d: 220,               // 7-day rolling average carbs (g)
  avgFat7d: 70,                  // 7-day rolling average fat (g)

  // Weight trend
  weightTrend14d: -0.8,          // slope in lbs/week over 14 days (negative = losing)
  currentWeight: 185,            // today's weight

  // Goal
  goal: "fat_loss",              // "fat_loss" | "maintain" | "muscle_gain"

  // Cross-system
  energyLevel: 3,                // 1-5 from today
  readinessScore: 65,            // from Readiness Engine
  trainingVolumeTrend: "increasing", // "increasing" | "stable" | "decreasing"

  // Adherence
  daysTracked7d: 6,              // how many of last 7 days have meal data
  adherenceRate: 0.86,           // daysTracked7d / 7
};
```

### Calorie Adjustment Rules

```javascript
function evaluateCalories(ctx) {
  const adjustments = [];
  const { goal, weightTrend14d, adherenceRate, energyLevel, readinessScore, avgCalories7d, targetCalories } = ctx;

  // Only make suggestions if adherence is reasonable
  if (adherenceRate < 0.6) {
    return [{
      type: "info",
      message: "Not enough tracking data to make calorie recommendations. Log meals for at least 5 of 7 days.",
      adjustment: 0
    }];
  }

  if (goal === "fat_loss") {
    // Stalled: not losing fast enough despite good adherence
    if (weightTrend14d > -0.3 && adherenceRate >= 0.8) {
      adjustments.push({
        type: "reduce",
        adjustment: -125,  // midpoint of 100-150
        reason: `Weight loss has stalled (${weightTrend14d > 0 ? "+" : ""}${weightTrend14d.toFixed(1)} lbs/week). With ${(adherenceRate * 100).toFixed(0)}% adherence, a small calorie reduction should restart progress.`,
        newTarget: targetCalories - 125,
        urgency: "medium"
      });
    }

    // Losing too fast: muscle loss risk
    if (weightTrend14d < -2.0) {
      adjustments.push({
        type: "increase",
        adjustment: +100,
        reason: `Losing ${Math.abs(weightTrend14d).toFixed(1)} lbs/week — faster than 2 lbs/week increases muscle loss risk. Slight increase recommended.`,
        newTarget: targetCalories + 100,
        urgency: "high"
      });
    }

    // Energy/readiness tank: possible diet fatigue
    if (energyLevel <= 2 && readinessScore < 40) {
      adjustments.push({
        type: "refeed",
        adjustment: +500,
        reason: `Energy (${energyLevel}/5) and readiness (${readinessScore}/100) are very low. A refeed day (+500 cal, primarily carbs) can restore glycogen and training quality.`,
        duration: "1 day",
        urgency: "medium"
      });
    }
  }

  if (goal === "muscle_gain") {
    // Not gaining fast enough
    if (weightTrend14d < 0.3 && adherenceRate >= 0.8) {
      adjustments.push({
        type: "increase",
        adjustment: +150,  // midpoint of 100-200
        reason: `Weight gain is too slow (${weightTrend14d.toFixed(1)} lbs/week). Increase calories to support muscle growth.`,
        newTarget: targetCalories + 150,
        urgency: "medium"
      });
    }

    // Gaining too fast: excessive fat gain risk
    if (weightTrend14d > 1.5) {
      adjustments.push({
        type: "reduce",
        adjustment: -100,
        reason: `Gaining ${weightTrend14d.toFixed(1)} lbs/week — faster than 1.5 lbs/week likely means excess fat. Slight reduction recommended.`,
        newTarget: targetCalories - 100,
        urgency: "medium"
      });
    }
  }

  if (goal === "maintain") {
    if (Math.abs(weightTrend14d) > 1.0) {
      const direction = weightTrend14d > 0 ? "gaining" : "losing";
      const adj = weightTrend14d > 0 ? -100 : +100;
      adjustments.push({
        type: weightTrend14d > 0 ? "reduce" : "increase",
        adjustment: adj,
        reason: `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${Math.abs(weightTrend14d).toFixed(1)} lbs/week while trying to maintain. Small adjustment to stabilize.`,
        newTarget: targetCalories + adj,
        urgency: "low"
      });
    }
  }

  return adjustments;
}
```

### Protein Rules

```javascript
function evaluateProtein(ctx) {
  const { avgProtein7d, targetProtein } = ctx;
  const ratio = avgProtein7d / targetProtein;
  const alerts = [];

  // Moderately low: 5+ days below 85% of target
  if (ratio < 0.85) {
    alerts.push({
      priority: "medium",
      message: `Protein has averaged ${Math.round(avgProtein7d)}g — ${Math.round((1 - ratio) * 100)}% below your ${targetProtein}g target. Aim for ${targetProtein}g today.`,
      category: "nutrition"
    });
  }

  // Critically low: consistently below 70% of target
  if (ratio < 0.70) {
    alerts.push({
      priority: "high",
      message: `Protein critically low at ${Math.round(avgProtein7d)}g/day (${Math.round(ratio * 100)}% of target). This will directly impair recovery and muscle retention. Prioritize protein at every meal.`,
      category: "nutrition"
    });
  }

  return alerts;
}
```

### Carbohydrate Rules (Training-Day Aware)

```javascript
function evaluateCarbs(ctx, isTrainingDay) {
  const { avgCarbs7d } = ctx;
  const suggestions = [];

  if (isTrainingDay && avgCarbs7d < 150) {
    suggestions.push({
      priority: "low",
      message: `Training day — carb intake has been low (avg ${Math.round(avgCarbs7d)}g). Prioritize carbs pre-workout (60-90 min before) and post-workout for performance and recovery.`,
      category: "nutrition"
    });
  }

  return suggestions;
}
```

### Training Volume-Aware Adjustments

```javascript
function adjustForTrainingVolume(ctx, calorieAdjustments) {
  const { trainingVolumeTrend, goal } = ctx;

  // If volume is increasing, the user needs more fuel regardless of goal
  if (trainingVolumeTrend === "increasing" && goal !== "fat_loss") {
    for (const adj of calorieAdjustments) {
      if (adj.type === "reduce") {
        adj.reason += " However, training volume is increasing — monitor energy closely.";
        adj.urgency = "low"; // downgrade urgency of reductions
      }
    }
  }

  // If volume is decreasing, calorie needs drop
  if (trainingVolumeTrend === "decreasing" && goal === "muscle_gain") {
    calorieAdjustments.push({
      type: "info",
      adjustment: 0,
      reason: "Training volume is decreasing. If this continues, calorie needs will drop. Monitor weight trend.",
      urgency: "low"
    });
  }

  return calorieAdjustments;
}
```

---

## 6. DAILY HEALTH DECISION ENGINE

### Overview

Runs every morning on app open. Reads ALL tracking systems. Outputs a prioritized list of 3-5 actionable recommendations, each tagged with a category and priority.

### Priority Levels

| Priority | Meaning | Max per day |
|----------|---------|-------------|
| `high` | Requires attention today. Will impact health or training if ignored. | 2 |
| `medium` | Worth addressing. Not urgent but trending wrong. | 2 |
| `low` | Nice to know. Positive reinforcement or minor suggestion. | 1 |

### Recommendation Generator

```javascript
function generateHealthRecommendations(context) {
  const {
    sleep,                    // { hours, quality }
    readinessScore,           // 0-100
    readinessCategory,        // "Peak" | "Good" | "Moderate" | "Low" | "Very Low"
    hasWorkoutToday,          // boolean
    workoutType,              // "Push" | "Pull" | "Legs" | etc.
    proteinAvg3d,             // average protein over 3 days (g)
    proteinTarget,            // target protein (g)
    caloriesAvg3d,            // average calories over 3 days
    caloriesTarget,           // target calories
    yesterdayWater,           // glasses of water yesterday
    waterGoal,               // target glasses
    weightTrend14d,          // lbs/week
    goal,                    // "fat_loss" | "maintain" | "muscle_gain"
    avgSoreness3d,           // average soreness over 3 days (1-5)
    consecutiveHardSessions, // sessions in a row with avg difficulty >= 3.5
    mood,                    // "great" | "good" | "okay" | "low" | "tough"
    supplementAdherence7d,   // 0-1
    consecutiveMissedWorkouts, // int
  } = context;

  const recs = [];

  // ─── SLEEP ───
  if (sleep?.hours !== null && sleep.hours < 6) {
    recs.push({
      priority: "high",
      message: `Only ${sleep.hours.toFixed(1)} hours of sleep. Consider a lighter day or rest. Recovery is compromised.`,
      category: "recovery",
      icon: "moon",
      action: null
    });
  } else if (sleep?.hours !== null && sleep.hours < 7) {
    recs.push({
      priority: "medium",
      message: `${sleep.hours.toFixed(1)} hours of sleep — below target. Prioritize getting to bed earlier tonight.`,
      category: "recovery",
      icon: "moon",
      action: null
    });
  }

  // ─── READINESS → WORKOUT ───
  if (readinessScore < 50 && hasWorkoutToday) {
    recs.push({
      priority: "high",
      message: `Readiness is ${readinessScore}/100 (${readinessCategory}). Reduce workout volume today — drop 1-2 sets per exercise and add 1 RIR.`,
      category: "training",
      icon: "dumbbell",
      action: { type: "modify_workout", adjustment: "reduce_volume" }
    });
  } else if (readinessScore >= 80 && hasWorkoutToday) {
    recs.push({
      priority: "low",
      message: `Readiness is ${readinessScore}/100. You're primed — push for PRs today.`,
      category: "training",
      icon: "flame",
      action: null
    });
  }

  // ─── NUTRITION: PROTEIN ───
  if (proteinAvg3d !== null && proteinTarget > 0 && proteinAvg3d < proteinTarget * 0.8) {
    recs.push({
      priority: "high",
      message: `Protein has averaged ${Math.round(proteinAvg3d)}g over 3 days (target: ${proteinTarget}g). Hit ${proteinTarget}g today — add a protein shake or extra serving of meat.`,
      category: "nutrition",
      icon: "utensils",
      action: null
    });
  }

  // ─── NUTRITION: CALORIES ───
  if (caloriesAvg3d !== null && caloriesTarget > 0 && caloriesAvg3d < caloriesTarget * 0.7) {
    recs.push({
      priority: "medium",
      message: `Calories have been very low (avg ${Math.round(caloriesAvg3d)} vs. ${caloriesTarget} target). Under-eating will hurt recovery and performance.`,
      category: "nutrition",
      icon: "utensils",
      action: null
    });
  }

  // ─── HYDRATION ───
  if (yesterdayWater !== null && waterGoal > 0 && yesterdayWater < waterGoal * 0.6) {
    recs.push({
      priority: "medium",
      message: `Only ${yesterdayWater} glasses of water yesterday (goal: ${waterGoal}). Dehydration impairs strength by 2-5%. Drink more today.`,
      category: "hydration",
      icon: "droplet",
      action: null
    });
  }

  // ─── WEIGHT STALL ───
  if (goal === "fat_loss" && weightTrend14d !== null && Math.abs(weightTrend14d) < 0.3) {
    recs.push({
      priority: "medium",
      message: "Weight loss has stalled for 2+ weeks. Review your calorie target — you may need a small reduction.",
      category: "nutrition",
      icon: "scale",
      action: { type: "open_nutrition_adjustment" }
    });
  }

  // ─── FATIGUE: SORENESS ───
  if (avgSoreness3d > 3.5) {
    recs.push({
      priority: "high",
      message: `Accumulated soreness is high (${avgSoreness3d.toFixed(1)}/5 over 3 days). Consider a lighter session or extra rest day.`,
      category: "recovery",
      icon: "heart-pulse",
      action: null
    });
  }

  // ─── FATIGUE: CONSECUTIVE HARD SESSIONS ───
  if (consecutiveHardSessions >= 5) {
    recs.push({
      priority: "medium",
      message: `${consecutiveHardSessions} hard sessions in a row. Hold volume steady or take an extra rest day to prevent overreaching.`,
      category: "training",
      icon: "alert-triangle",
      action: null
    });
  }

  // ─── MOOD ───
  if (mood === "tough" || mood === "low") {
    recs.push({
      priority: "medium",
      message: "Mood is low today. Prioritize sleep, light movement, and social connection. Training is optional.",
      category: "wellbeing",
      icon: "heart",
      action: null
    });
  }

  // ─── SUPPLEMENTS ───
  if (supplementAdherence7d !== null && supplementAdherence7d < 0.5) {
    recs.push({
      priority: "low",
      message: `Supplement adherence is ${Math.round(supplementAdherence7d * 100)}% this week. Set a daily reminder or pair supplements with a meal.`,
      category: "supplements",
      icon: "pill",
      action: null
    });
  }

  // ─── MISSED WORKOUTS ───
  if (consecutiveMissedWorkouts >= 3) {
    recs.push({
      priority: "medium",
      message: `Haven't trained in ${consecutiveMissedWorkouts} days. Start with a lighter session to rebuild momentum.`,
      category: "training",
      icon: "dumbbell",
      action: null
    });
  }

  // ─── SORT AND LIMIT ───
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  // Enforce max per priority level
  const result = [];
  const counts = { high: 0, medium: 0, low: 0 };
  const MAX = { high: 2, medium: 2, low: 1 };

  for (const rec of recs) {
    if (counts[rec.priority] < MAX[rec.priority]) {
      result.push(rec);
      counts[rec.priority]++;
    }
    if (result.length >= 5) break;
  }

  return result;
}
```

---

## 7. SMART ALERTS ENGINE

### Overview

Alerts fire only when a **trend** is detected over multiple days, not on single-day events. Each alert type has a cooldown period to prevent alert fatigue. Alerts persist until dismissed or the underlying condition resolves.

### Alert Definitions

```javascript
const ALERT_RULES = [
  {
    id: "sleep_debt",
    name: "Sleep Debt Building",
    condition: (ctx) => ctx.sleepAvg5d < 6.5,
    priority: "high",
    message: (ctx) => `Sleep has averaged ${ctx.sleepAvg5d.toFixed(1)} hours over 5 days. Recovery and training quality will suffer. Aim for ${ctx.sleepBaseline}+ hours tonight.`,
    action: "Review sleep habits",
    cooldownDays: 5,
    resolveCondition: (ctx) => ctx.sleepAvg5d >= 7.0,
  },
  {
    id: "protein_low",
    name: "Protein Consistently Low",
    condition: (ctx) => ctx.proteinAvg5d < ctx.proteinTarget * 0.8,
    priority: "high",
    message: (ctx) => `Protein has averaged ${Math.round(ctx.proteinAvg5d)}g over 5 days (target: ${ctx.proteinTarget}g). This directly impairs recovery.`,
    action: "View meal plan",
    cooldownDays: 4,
    resolveCondition: (ctx) => ctx.proteinAvg5d >= ctx.proteinTarget * 0.85,
  },
  {
    id: "hydration_low",
    name: "Hydration Consistently Poor",
    condition: (ctx) => ctx.waterAvg5d < ctx.waterGoal * 0.6,
    priority: "medium",
    message: (ctx) => `Water intake has averaged ${ctx.waterAvg5d.toFixed(1)} glasses over 5 days (goal: ${ctx.waterGoal}). Chronic dehydration impairs performance and recovery.`,
    action: "Set water reminders",
    cooldownDays: 5,
    resolveCondition: (ctx) => ctx.waterAvg5d >= ctx.waterGoal * 0.7,
  },
  {
    id: "weight_stall",
    name: "Weight Loss Stalled",
    condition: (ctx) => ctx.goal === "fat_loss" && ctx.weightTrend14d !== null && Math.abs(ctx.weightTrend14d) < 0.3,
    priority: "medium",
    message: (ctx) => `Weight has been flat for 2+ weeks (${ctx.weightTrend14d > 0 ? "+" : ""}${ctx.weightTrend14d.toFixed(1)} lbs/week). Consider a calorie adjustment.`,
    action: "Review nutrition targets",
    cooldownDays: 14,
    resolveCondition: (ctx) => ctx.weightTrend14d < -0.5,
  },
  {
    id: "fatigue_high",
    name: "High Fatigue Accumulation",
    condition: (ctx) => ctx.sorenessAvg3d > 4.0,
    priority: "high",
    message: (ctx) => `Average soreness is ${ctx.sorenessAvg3d.toFixed(1)}/5 over 3 days. High accumulated fatigue — consider reducing volume or taking an extra rest day.`,
    action: "Adjust workout",
    cooldownDays: 3,
    resolveCondition: (ctx) => ctx.sorenessAvg3d <= 3.0,
  },
  {
    id: "training_inconsistent",
    name: "Training Consistency Dropping",
    condition: (ctx) => ctx.workoutAdherence14d < 0.6,
    priority: "medium",
    message: (ctx) => `Only ${Math.round(ctx.workoutAdherence14d * 100)}% of scheduled workouts completed in the last 2 weeks. Consistency matters more than perfection — even a shorter session counts.`,
    action: "View schedule",
    cooldownDays: 7,
    resolveCondition: (ctx) => ctx.workoutAdherence14d >= 0.7,
  },
  {
    id: "mood_declining",
    name: "Mood Trending Down",
    condition: (ctx) => ctx.moodAvg7d < 2.5, // scale: tough=1, low=2, okay=3, good=4, great=5
    priority: "medium",
    message: (ctx) => `Mood has been low for the past week (avg ${ctx.moodAvg7d.toFixed(1)}/5). Consider prioritizing recovery, sleep, social connection, and reducing training stress.`,
    action: "Review wellbeing",
    cooldownDays: 5,
    resolveCondition: (ctx) => ctx.moodAvg7d >= 3.0,
  },
  {
    id: "missed_workouts",
    name: "Extended Training Gap",
    condition: (ctx) => ctx.consecutiveMissedWorkouts >= 3,
    priority: "low",
    message: (ctx) => `${ctx.consecutiveMissedWorkouts} days without training. When you're ready, start with a lighter session at 70% of normal volume.`,
    action: "Start easy workout",
    cooldownDays: 3,
    resolveCondition: (ctx) => ctx.consecutiveMissedWorkouts === 0,
  },
];
```

### Alert Evaluation Cycle

```javascript
function evaluateAlerts(context, existingAlerts) {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const newAlerts = [];

  for (const rule of ALERT_RULES) {
    // Check if alert is on cooldown
    const existing = existingAlerts.find(a => a.type === rule.id);
    if (existing && existing.cooldown_until > today) {
      continue; // still on cooldown
    }

    // Check if previously fired alert has resolved
    if (existing && !existing.dismissed && rule.resolveCondition(context)) {
      existing.status = "resolved";
      continue;
    }

    // Check if condition is met
    if (rule.condition(context)) {
      newAlerts.push({
        id: uuid(),
        type: rule.id,
        date: today,
        priority: rule.priority,
        message: rule.message(context),
        action: rule.action,
        dismissed: 0,
        cooldown_until: addDays(today, rule.cooldownDays),
        created_at: now,
      });
    }
  }

  return newAlerts;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
```

### Alert Display Rules

1. Maximum 3 active alerts shown at once (prioritized by: high > medium > low, then by date descending).
2. Each alert has a dismiss button. Dismissed alerts are hidden but stored for history.
3. Alerts auto-resolve when `resolveCondition` returns true.
4. Alert banner color: high = red, medium = amber, low = blue.

---

## 8. AUTOPILOT MODE DESIGN

### Overview

A dashboard section that combines all engine outputs into a single daily briefing. This is the "single screen to rule them all" — the user opens the app and immediately sees what matters today.

### Autopilot Card Structure

```
┌─────────────────────────────────────────────────────────┐
│ TODAY'S HEALTH BRIEF                      March 26, 2026│
│                                                         │
│     ╭───────╮                                           │
│     │  68   │  Readiness: Good                          │
│     │ /100  │  "Solid recovery — train as planned."     │
│     ╰───────╯                                           │
│                                                         │
│ ─── TODAY'S PLAN ───────────────────────────────────── │
│                                                         │
│  🏋 Training: Push Day — maintain volume, RIR 2        │
│  🍽 Nutrition: Hit 180g protein, 2400 cal              │
│  💧 Hydration: 8 glasses minimum                       │
│  😴 Recovery: Sleep by 10:30pm (7.5h target)           │
│                                                         │
│ ─── ALERTS ─────────────────────────────────────────── │
│                                                         │
│  ⚠ Protein has been low for 3 days (avg 145g)         │
│  ℹ Supplement adherence is low this week               │
│                                                         │
│ ─── TOP RECOMMENDATIONS ────────────────────────────── │
│                                                         │
│  1. Protein is 20% below target. Add a shake today.    │
│  2. Readiness is Good — push for PRs on bench press.   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Autopilot Data Assembly

```javascript
function generateAutopilot(date) {
  // 1. Calculate readiness
  const readinessCtx = gatherReadinessInputs(date);
  const readiness = calculateReadiness(readinessCtx);

  // 2. Get today's scheduled workout (if any)
  const workout = getScheduledWorkout(date);
  let trainingBrief = "Rest day";
  if (workout) {
    const volumeAdj = getVolumeAdjustment(readiness.dayType);
    const rirTarget = getCurrentRirTarget();
    trainingBrief = `${workout.name} — ${volumeAdj}, RIR ${rirTarget}`;
  }

  // 3. Get nutrition targets (potentially adjusted)
  const nutritionCtx = gatherNutritionInputs(date);
  const nutritionAdj = evaluateCalories(nutritionCtx);
  const effectiveCalories = nutritionAdj.length > 0 && nutritionAdj[0].newTarget
    ? nutritionAdj[0].newTarget
    : nutritionCtx.targetCalories;
  const nutritionBrief = `Hit ${nutritionCtx.targetProtein}g protein, ${effectiveCalories} cal`;

  // 4. Get hydration target
  const hydrationBrief = `${nutritionCtx.waterGoal || 8} glasses minimum`;

  // 5. Calculate recommended bedtime
  const sleepBaseline = readinessCtx.sleepBaseline || 8;
  const wakeTarget = readinessCtx.wakeTimeBaseline || "7:00";
  const wakeMinutes = parseTime(wakeTarget);
  const bedtimeMinutes = wakeMinutes - (sleepBaseline * 60) - 30; // 30 min to fall asleep
  const bedtime = minutesToTime(bedtimeMinutes < 0 ? bedtimeMinutes + 1440 : bedtimeMinutes);
  const recoveryBrief = `Sleep by ${bedtime} (${sleepBaseline}h target)`;

  // 6. Get active alerts
  const alertCtx = gatherAlertInputs(date);
  const alerts = evaluateAlerts(alertCtx, getExistingAlerts());

  // 7. Get recommendations
  const recCtx = gatherRecommendationInputs(date);
  const recommendations = generateHealthRecommendations(recCtx);

  // 8. Generate coaching message based on readiness
  const coachingMessages = {
    peak: "You're primed. Full intensity today — make it count.",
    standard: "Solid recovery — train as planned.",
    light: "Lighter day. Focus on what matters most and don't push it.",
    recovery: "Recovery mode. Basics only — sleep, eat, hydrate.",
    reset: "Full rest today. Your body needs it.",
  };

  return {
    date,
    readiness: {
      score: readiness.score,
      category: readiness.category,
      explanation: readiness.explanation,
      coaching: coachingMessages[readiness.dayType],
    },
    plan: {
      training: trainingBrief,
      nutrition: nutritionBrief,
      hydration: hydrationBrief,
      recovery: recoveryBrief,
    },
    alerts: alerts.slice(0, 3), // max 3
    recommendations: recommendations.slice(0, 3), // top 3 for autopilot
  };
}

function getVolumeAdjustment(dayType) {
  const MAP = {
    peak: "full volume + optional extra set",
    standard: "maintain volume",
    light: "reduce volume 10-20%",
    recovery: "reduce volume 30%, add RIR",
    reset: "skip or 50% volume",
  };
  return MAP[dayType] || "maintain volume";
}
```

---

## 9. UX SCREENS AND FLOWS

### Component 1: Post-Workout Feedback Modal

**Trigger:** After user marks a workout session as complete, or after completing each exercise (configurable in settings).

**Layout:**
```
┌─────────────────────────────────────────┐
│ Exercise Feedback: Bench Press          │
│                                         │
│ Pump          ○ ○ ○ ● ○               │
│               1 2 3 4 5                │
│               "Strong pump"             │
│                                         │
│ Difficulty    ○ ○ ● ○ ○               │
│               1 2 3 4 5                │
│               "Moderate"                │
│                                         │
│ Joint Pain?   [ No ]  [ Yes → Which? ] │
│                                         │
│ Mind-Muscle    ○ ○ ○ ● ○  (optional)  │
│               1 2 3 4 5                │
│                                         │
│         [ Skip ]     [ Save & Next ]    │
└─────────────────────────────────────────┘
```

**Next-Day Soreness Collection:**
```
┌─────────────────────────────────────────┐
│ Yesterday's Workout: How sore today?    │
│                                         │
│ Chest         ○ ○ ● ○ ○               │
│ Front Delts   ○ ● ○ ○ ○               │
│ Triceps       ○ ○ ● ○ ○               │
│                                         │
│              [ Save ]                   │
└─────────────────────────────────────────┘
```

**Soreness is collected per muscle group** (not per exercise) since soreness reflects cumulative load on the muscle, not individual exercise stress.

**Interaction:** Tapping a number selects it. Label below updates dynamically (1="None", 2="Mild", 3="Moderate", 4="High", 5="Extreme"). Entire modal takes under 15 seconds per exercise.

### Component 2: Readiness Score Card

**Location:** Top of Dashboard, top of Planner page.

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│       ╭─────────╮                       │
│       │         │                       │
│       │   72    │   Good                │
│       │  /100   │   "Solid recovery —   │
│       │         │    energy is pulling   │
│       ╰─────────╯    it down a bit."    │
│                                         │
│  Sleep ████████░░ 24/30                 │
│  Mood  ███████████ 12/15                │
│  Energy ██████░░░░ 9/15                 │
│  Load  ████████░░ 11/15                 │
│  Sore  █████████░ 8/10                  │
│  Sched ████████░░ 6/10                  │
│  Consist ████░░░░ 3/5                   │
│                                         │
└─────────────────────────────────────────┘
```

**Interaction:** Score circle uses a circular progress indicator. Color: green (80+), blue (65-79), amber (50-64), orange (35-49), red (0-34). Component bars are mini horizontal bar charts. Tapping the card expands to show the full component breakdown.

### Component 3: Daily Health Recommendations List

**Location:** Dashboard, below the readiness card.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Today's Recommendations                 │
│                                         │
│ 🔴 Protein is 20% below target.       │
│    Hit 180g today — add a shake.        │
│                                         │
│ 🟡 5 hard sessions in a row.           │
│    Hold volume steady today.            │
│                                         │
│ 🟢 Readiness is Good.                  │
│    Push for PRs on compounds.           │
│                                         │
│ 🔵 Supplement adherence is 40%.        │
│    Set a daily reminder.                │
│                                         │
└─────────────────────────────────────────┘
```

**Priority indicators:** Red dot = high, Yellow = medium, Green = positive/low, Blue = info. Each recommendation can optionally have an action button (e.g., "Adjust Workout" or "View Meals").

### Component 4: Nutrition Adjustment Card

**Location:** Meals/Macros page, or surfaced in Dashboard when a recommendation is active.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Nutrition Adjustment Suggested          │
│                                         │
│ Current Target    →  Recommended        │
│ 2400 cal/day      →  2275 cal/day       │
│                                         │
│ Reason: Weight loss has stalled         │
│ (-0.1 lbs/week over 14 days) despite    │
│ 86% adherence. A small reduction        │
│ should restart progress.                │
│                                         │
│   [ Dismiss ]        [ Accept ]         │
│                                         │
└─────────────────────────────────────────┘
```

**Interaction:** "Accept" updates the user's calorie target in settings. "Dismiss" hides the card but logs the rejection (for learning — if the user consistently rejects, reduce suggestion frequency in future iterations). The card shows both current and recommended values with a clear arrow.

### Component 5: Health Alert Card

**Location:** Top of Dashboard (above recommendations), or as a banner at the top of any page.

**Layout:**
```
┌─────────────────────────────────────────┐
│ ⚠ Sleep Debt Building              [×] │
│                                         │
│ Sleep has averaged 5.8 hours over 5     │
│ days. Recovery and training quality     │
│ will suffer.                            │
│                                         │
│            [ Review Sleep Habits ]      │
└─────────────────────────────────────────┘
```

**Interaction:** `[×]` dismisses the alert (with cooldown). Action button navigates to the relevant page/module. Alert card border color matches priority: red (high), amber (medium), blue (low).

### Component 6: Autopilot Dashboard Section

**Location:** Top of Dashboard page, replacing or sitting above the existing day overview.

See Section 8 for the full card layout. The autopilot section is a single, non-scrollable card that fits in the viewport. It is the first thing the user sees when they open the app.

**Interaction:** Each section of the card (training, nutrition, hydration, recovery) is tappable and navigates to the relevant detail page. Alerts within the card are tappable to expand. The readiness score circle is tappable to see the full component breakdown.

### Component 7: Weekly Health Review

**Location:** Accessible from Weekly Review page, or as a section within Autopilot on Sundays.

**Layout:**
```
┌─────────────────────────────────────────┐
│ WEEKLY HEALTH REVIEW — Mar 20-26        │
│                                         │
│ Readiness Trend                         │
│ M   T   W   T   F   S   S              │
│ 72  68  75  81  64  70  --              │
│ ▃▃  ▂▂  ▄▄  ▆▆  ▂▂  ▃▃                │
│ Average: 71.7  (Good)                   │
│                                         │
│ Training: 5/5 sessions (100%)           │
│ Avg Difficulty: 3.2/5                   │
│ Volume Trend: +2 sets vs. last week     │
│                                         │
│ Nutrition: 2250 avg cal (target 2400)   │
│ Protein: 162g avg (target 180g) ⚠      │
│ Adherence: 86% (6/7 days logged)       │
│                                         │
│ Sleep: 7.1h avg (target 8h) ⚠          │
│ Consistency: ±25 min wake variance      │
│                                         │
│ Hydration: 6.5 glasses avg (goal 8) ⚠  │
│                                         │
│ Body Weight: 184.8 → 184.2 (-0.6 lbs)  │
│ Trend: -0.9 lbs/week (on track)        │
│                                         │
│ KEY INSIGHT:                            │
│ Protein and sleep were your biggest     │
│ gaps this week. Fixing these would      │
│ likely improve readiness by 8-12 pts.   │
│                                         │
└─────────────────────────────────────────┘
```

**Insight Generator:**
```javascript
function generateWeeklyInsight(weekData) {
  const gaps = [];

  // Find the readiness component with the lowest average percentage
  const componentAvgs = {};
  for (const day of weekData.readinessHistory) {
    for (const [key, comp] of Object.entries(day.components)) {
      if (!componentAvgs[key]) componentAvgs[key] = [];
      componentAvgs[key].push(comp.pct);
    }
  }

  const sorted = Object.entries(componentAvgs)
    .map(([key, vals]) => ({ key, avgPct: mean(vals) }))
    .sort((a, b) => a.avgPct - b.avgPct);

  const FRIENDLY = {
    sleepDuration: "sleep duration", sleepConsistency: "sleep consistency",
    mood: "mood", energy: "energy", workload: "training load",
    soreness: "soreness management", consistency: "training consistency"
  };

  // Top 2 gaps
  const topGaps = sorted.slice(0, 2).filter(g => g.avgPct < 0.7);

  if (topGaps.length > 0) {
    const gapNames = topGaps.map(g => FRIENDLY[g.key]).join(" and ");
    const potentialImprovement = topGaps.reduce((sum, g) => {
      const maxPoints = weekData.readinessHistory[0]?.components[g.key]?.max || 10;
      const currentAvg = g.avgPct * maxPoints;
      const idealAvg = 0.8 * maxPoints;
      return sum + (idealAvg - currentAvg);
    }, 0);

    return `${gapNames.charAt(0).toUpperCase() + gapNames.slice(1)} ${topGaps.length === 1 ? "was your" : "were your"} biggest gap${topGaps.length === 1 ? "" : "s"} this week. Fixing ${topGaps.length === 1 ? "this" : "these"} would likely improve readiness by ${Math.round(potentialImprovement)}-${Math.round(potentialImprovement * 1.5)} points.`;
  }

  return "Strong week across the board. Keep it up.";
}
```

---

## 10. DATA MODEL

### New Tables

```sql
-- Stores daily readiness score and component breakdown
CREATE TABLE IF NOT EXISTS health_readiness (
  date TEXT PRIMARY KEY,                    -- "2026-03-26"
  score INTEGER NOT NULL,                   -- 0-100
  category TEXT NOT NULL,                   -- "Peak" | "Good" | "Moderate" | "Low" | "Very Low"
  day_type TEXT NOT NULL,                   -- "peak" | "standard" | "light" | "recovery" | "reset"
  explanation TEXT,                         -- Human-readable explanation
  components_json TEXT,                     -- JSON: { sleepDuration: { value, max, pct }, ... }
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stores daily health recommendations
CREATE TABLE IF NOT EXISTS health_recommendations (
  id TEXT PRIMARY KEY,                      -- UUID
  date TEXT NOT NULL,                       -- "2026-03-26"
  category TEXT NOT NULL,                   -- "recovery" | "training" | "nutrition" | "hydration" | "wellbeing" | "supplements"
  priority TEXT NOT NULL,                   -- "high" | "medium" | "low"
  message TEXT NOT NULL,
  icon TEXT,                                -- icon name for UI
  action_json TEXT,                         -- JSON: { type: "modify_workout", ... } or null
  status TEXT NOT NULL DEFAULT 'active',    -- "active" | "acted" | "dismissed"
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_health_rec_date ON health_recommendations(date);

-- Stores trend-based health alerts with cooldowns
CREATE TABLE IF NOT EXISTS health_alerts (
  id TEXT PRIMARY KEY,                      -- UUID
  type TEXT NOT NULL,                       -- alert rule ID: "sleep_debt", "protein_low", etc.
  date TEXT NOT NULL,                       -- date alert was triggered
  priority TEXT NOT NULL,                   -- "high" | "medium" | "low"
  message TEXT NOT NULL,
  action TEXT,                              -- action button label
  dismissed INTEGER NOT NULL DEFAULT 0,     -- 0 or 1
  cooldown_until TEXT,                      -- date until which this alert type won't re-fire
  resolved INTEGER NOT NULL DEFAULT 0,      -- 0 or 1 (auto-resolved when condition clears)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_health_alert_type ON health_alerts(type);
CREATE INDEX IF NOT EXISTS idx_health_alert_date ON health_alerts(date);

-- Stores nutrition adjustment suggestions
CREATE TABLE IF NOT EXISTS nutrition_adjustments (
  id TEXT PRIMARY KEY,                      -- UUID
  date TEXT NOT NULL,                       -- date suggestion was generated
  adjustment_type TEXT NOT NULL,            -- "reduce" | "increase" | "refeed" | "info"
  nutrient TEXT NOT NULL DEFAULT 'calories', -- "calories" | "protein" | "carbs" | "fat"
  current_value REAL,                       -- current target value
  recommended_value REAL,                   -- suggested new value
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',   -- "high" | "medium" | "low"
  accepted INTEGER NOT NULL DEFAULT 0,      -- 0 = pending, 1 = accepted, -1 = dismissed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nutrition_adj_date ON nutrition_adjustments(date);

-- Stores autopilot daily briefings (cached)
CREATE TABLE IF NOT EXISTS health_autopilot (
  date TEXT PRIMARY KEY,                    -- "2026-03-26"
  readiness_json TEXT NOT NULL,             -- JSON: { score, category, explanation, coaching }
  plan_json TEXT NOT NULL,                  -- JSON: { training, nutrition, hydration, recovery }
  alerts_json TEXT,                         -- JSON array of alert objects
  recommendations_json TEXT,                -- JSON array of recommendation objects
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stores weekly health review summaries
CREATE TABLE IF NOT EXISTS health_weekly_review (
  id TEXT PRIMARY KEY,                      -- UUID
  week_start TEXT NOT NULL,                 -- "2026-03-20" (Monday)
  week_end TEXT NOT NULL,                   -- "2026-03-26" (Sunday)
  readiness_avg REAL,
  readiness_trend_json TEXT,                -- JSON: [72, 68, 75, 81, 64, 70, null]
  training_completed INTEGER,
  training_scheduled INTEGER,
  avg_difficulty REAL,
  volume_change INTEGER,                    -- sets delta vs previous week
  calories_avg REAL,
  protein_avg REAL,
  nutrition_adherence REAL,                 -- 0-1
  sleep_avg REAL,
  sleep_consistency_minutes REAL,           -- avg wake time variance
  hydration_avg REAL,
  weight_start REAL,
  weight_end REAL,
  weight_change REAL,
  insight TEXT,                             -- generated key insight
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_health_weekly_start ON health_weekly_review(week_start);
```

### Modifications to Existing Tables

The `meso_exercises` table (defined in `MESOCYCLE_SYSTEM_DESIGN.md`) already has columns for feedback ratings. The following fields need to be **populated via the post-workout feedback UI** — no schema change needed:

- `pump_rating` INTEGER (1-5)
- `soreness_rating` INTEGER (1-5)
- `difficulty_rating` INTEGER (1-5)

If these columns do not yet exist on the `meso_exercise_sets` or session-level table, add:

```sql
-- Per-exercise feedback (add to meso_session_exercises or equivalent)
ALTER TABLE meso_session_exercises ADD COLUMN pump_rating INTEGER;
ALTER TABLE meso_session_exercises ADD COLUMN difficulty_rating INTEGER;
ALTER TABLE meso_session_exercises ADD COLUMN joint_discomfort INTEGER DEFAULT 0;
ALTER TABLE meso_session_exercises ADD COLUMN mmc_rating INTEGER;

-- Per-muscle-group soreness (collected next day, stored separately)
CREATE TABLE IF NOT EXISTS muscle_soreness_log (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,                       -- date soreness was reported (day after workout)
  muscle_group TEXT NOT NULL,               -- "chest", "quads", etc.
  rating INTEGER NOT NULL,                  -- 1-5
  workout_date TEXT,                        -- date of the workout that caused it
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_soreness_date ON muscle_soreness_log(date);
CREATE INDEX IF NOT EXISTS idx_soreness_muscle ON muscle_soreness_log(muscle_group);
```

---

## 11. PSEUDOCODE / DECISION TREES

### 11.1 Weekly Workout Adaptation Cycle

**Trigger:** User completes their last scheduled session for the week, or manually taps "Generate Next Week."

```
FUNCTION weeklyWorkoutAdaptation(mesoId, completedWeekNumber):

  meso = db.getMesocycle(mesoId)
  weekData = db.getWeekData(mesoId, completedWeekNumber)
  history = db.getMesoHistory(mesoId)

  // Step 1: Check if deload is needed
  deloadCheck = checkDeloadTriggers(mesoId, completedWeekNumber, meso.length, weekData, history)

  IF deloadCheck.shouldDeload:
    nextWeek = generateDeloadWeek(meso, weekData)
    nextWeek.isDeload = true
    nextWeek.deloadReasons = deloadCheck.triggers
    db.saveWeekPlan(mesoId, completedWeekNumber + 1, nextWeek)
    RETURN { type: "deload", reasons: deloadCheck.triggers, plan: nextWeek }

  // Step 2: Per muscle group adaptation
  muscleGroups = weekData.getActiveMuscleGroups()
  adaptations = {}

  FOR EACH muscle IN muscleGroups:
    // Volume decision
    volumeResult = decideVolume(muscle, weekData, completedWeekNumber, meso.length)

    // Exercise swap check
    swapCandidates = checkExerciseSwap(
      weekData.getExercisesForMuscle(muscle),
      muscle,
      history
    )

    // Load decision per exercise
    exercises = weekData.getExercisesForMuscle(muscle)
    loadDecisions = {}
    FOR EACH ex IN exercises:
      sets = weekData.getSetsForExercise(ex.id)
      loadDecisions[ex.id] = decideLoad(ex, sets)

    adaptations[muscle] = {
      volume: volumeResult,
      swaps: swapCandidates,
      loads: loadDecisions
    }

  // Step 3: Calculate next week's RIR target
  nextRir = calculateRirForWeek(completedWeekNumber + 1, meso.length)

  // Step 4: Generate next week's plan
  nextWeek = buildWeekPlan(meso, adaptations, nextRir)

  // Step 5: Apply readiness-based modification (if available)
  latestReadiness = db.getLatestReadiness()
  IF latestReadiness AND latestReadiness.score < 50:
    nextWeek = applyReadinessModifier(nextWeek, latestReadiness.dayType)

  // Step 6: Save
  db.saveWeekPlan(mesoId, completedWeekNumber + 1, nextWeek)
  db.saveAdaptationLog(mesoId, completedWeekNumber, adaptations)

  RETURN { type: "normal", adaptations, plan: nextWeek }


FUNCTION generateDeloadWeek(meso, lastWeekData):
  deloadPlan = {}
  FOR EACH muscle IN lastWeekData.getActiveMuscleGroups():
    currentSets = lastWeekData.totalSetsForMuscle(muscle)
    deloadSets = Math.max(VOLUME_LANDMARKS[muscle].mev, Math.round(currentSets * 0.5))
    deloadPlan[muscle] = {
      sets: deloadSets,
      rir: 5,
      loadMultiplier: 0.6   // 60% of working weight
    }
  RETURN deloadPlan


FUNCTION applyReadinessModifier(weekPlan, dayType):
  SWITCH dayType:
    CASE "light":
      // Reduce volume by ~15%
      FOR EACH exercise IN weekPlan.exercises:
        IF exercise.sets > 2:
          exercise.sets = exercise.sets - 1
      RETURN weekPlan

    CASE "recovery":
      // Reduce volume by ~30%, add 1 RIR
      FOR EACH exercise IN weekPlan.exercises:
        exercise.sets = Math.max(2, Math.round(exercise.sets * 0.7))
        exercise.targetRir = exercise.targetRir + 1
      RETURN weekPlan

    CASE "reset":
      // 50% volume, 50% load
      FOR EACH exercise IN weekPlan.exercises:
        exercise.sets = Math.max(1, Math.round(exercise.sets * 0.5))
        exercise.loadMultiplier = 0.5
      RETURN weekPlan

    DEFAULT:
      RETURN weekPlan  // "peak" and "standard" unchanged
```

### 11.2 Daily Readiness Calculation

**Trigger:** App open (first open of the day), or manual refresh.

```
FUNCTION dailyReadinessCalculation(date):

  // Step 1: Gather inputs from existing tracking modules
  context = {}

  // Sleep data (from sleep tracking table)
  sleepEntry = db.getSleepEntry(date) OR db.getSleepEntry(yesterday(date))
  context.sleep = {
    hours: sleepEntry?.hours ?? null,
    quality: sleepEntry?.quality ?? null,
    wakeTime: sleepEntry?.wake_time ?? null,
    bedtime: sleepEntry?.bedtime ?? null
  }
  context.sleepBaseline = db.getUserSetting("sleep_target_hours") ?? 8
  context.wakeTimeBaseline = db.getUserSetting("wake_time_target") ?? "7:00"

  // Mood and energy (from daily check-in / planner entry)
  dailyEntry = db.getDayEntry(date)
  context.mood = dailyEntry?.mood ?? null
  context.energy = dailyEntry?.energy ?? null

  // Soreness (from muscle_soreness_log, yesterday and today)
  recentSoreness = db.getSorenessRatings(date, 2)  // last 2 days
  context.sorenessRatings = aggregateByMuscle(recentSoreness)  // { chest: 3, quads: 4 }

  // Training load (from meso session data)
  last3DaySets = db.getCompletedSets(subtractDays(date, 3), date)
  context.trailing3DayVolume = last3DaySets.length

  // MRV estimate
  activeMuscles = db.getActiveMesocycleMuscles()
  totalMrv = activeMuscles.reduce((sum, m) => sum + VOLUME_LANDMARKS[m].mrv, 0)
  context.maxRecoverableVolume = Math.round(totalMrv / 7 * 3)  // 3-day pro-rated

  // Consistency
  last7Sessions = db.getSessionsInRange(subtractDays(date, 7), date)
  context.completedLast7 = last7Sessions.filter(s => s.completed).length
  context.scheduledLast7 = last7Sessions.length

  // Step 2: Calculate
  result = calculateReadiness(context)

  // Step 3: Store
  db.upsert("health_readiness", {
    date: date,
    score: result.score,
    category: result.category,
    day_type: result.dayType,
    explanation: result.explanation,
    components_json: JSON.stringify(result.components)
  })

  RETURN result
```

### 11.3 Nutrition Check Cycle

**Trigger:** Weekly (runs on Sunday evening or Monday morning). Can also run on-demand.

```
FUNCTION weeklyNutritionCheck(date):

  // Step 1: Gather 7-day and 14-day data
  meals7d = db.getMealEntries(subtractDays(date, 7), date)
  daysTracked = countUniqueDays(meals7d)

  IF daysTracked < 4:
    RETURN { status: "insufficient_data", message: "Need at least 4 days of meal logging for recommendations." }

  ctx = {
    avgCalories7d: mean(meals7d.map(d => d.totalCalories)),
    targetCalories: db.getUserSetting("calorie_target"),
    avgProtein7d: mean(meals7d.map(d => d.totalProtein)),
    targetProtein: db.getUserSetting("protein_target"),
    avgCarbs7d: mean(meals7d.map(d => d.totalCarbs)),
    avgFat7d: mean(meals7d.map(d => d.totalFat)),
    goal: db.getUserSetting("nutrition_goal"),  // "fat_loss" | "maintain" | "muscle_gain"
    adherenceRate: daysTracked / 7,
    daysTracked7d: daysTracked
  }

  // Weight trend (14-day linear regression)
  weights14d = db.getWeightEntries(subtractDays(date, 14), date)
  IF weights14d.length >= 4:
    ctx.weightTrend14d = calculateWeightSlope(weights14d)  // lbs/week
    ctx.currentWeight = weights14d[weights14d.length - 1].weight
  ELSE:
    ctx.weightTrend14d = null

  // Cross-system data
  latestReadiness = db.getLatestReadiness()
  ctx.readinessScore = latestReadiness?.score ?? 60
  ctx.energyLevel = db.getDayEntry(date)?.energy ?? 3

  // Training volume trend
  thisWeekSets = db.getCompletedSets(subtractDays(date, 7), date).length
  lastWeekSets = db.getCompletedSets(subtractDays(date, 14), subtractDays(date, 7)).length
  IF thisWeekSets > lastWeekSets * 1.1:
    ctx.trainingVolumeTrend = "increasing"
  ELSE IF thisWeekSets < lastWeekSets * 0.9:
    ctx.trainingVolumeTrend = "decreasing"
  ELSE:
    ctx.trainingVolumeTrend = "stable"

  // Step 2: Run calorie evaluation
  calorieAdj = evaluateCalories(ctx)
  calorieAdj = adjustForTrainingVolume(ctx, calorieAdj)

  // Step 3: Run protein evaluation
  proteinAlerts = evaluateProtein(ctx)

  // Step 4: Run carb evaluation
  isTrainingDay = db.hasScheduledWorkout(date)
  carbSuggestions = evaluateCarbs(ctx, isTrainingDay)

  // Step 5: Store adjustments
  FOR EACH adj IN calorieAdj:
    IF adj.type !== "info":
      db.insert("nutrition_adjustments", {
        id: uuid(),
        date: date,
        adjustment_type: adj.type,
        nutrient: "calories",
        current_value: ctx.targetCalories,
        recommended_value: adj.newTarget,
        reason: adj.reason,
        urgency: adj.urgency,
        accepted: 0
      })

  RETURN {
    calorieAdjustments: calorieAdj,
    proteinAlerts: proteinAlerts,
    carbSuggestions: carbSuggestions
  }


FUNCTION calculateWeightSlope(entries):
  // Simple linear regression: returns lbs/week
  // entries = [{ date, weight }, ...]
  n = entries.length
  IF n < 2: RETURN 0

  // Convert dates to day indices
  baseDate = entries[0].date
  points = entries.map(e => ({
    x: daysBetween(baseDate, e.date),
    y: e.weight
  }))

  sumX = sum(points.map(p => p.x))
  sumY = sum(points.map(p => p.y))
  sumXY = sum(points.map(p => p.x * p.y))
  sumXX = sum(points.map(p => p.x * p.x))

  slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  RETURN slope * 7  // convert from lbs/day to lbs/week
```

### 11.4 Alert Evaluation Cycle

**Trigger:** Daily, on app open (after readiness calculation).

```
FUNCTION dailyAlertEvaluation(date):

  // Step 1: Gather rolling averages for all alert conditions
  ctx = {}

  // Sleep (5-day average)
  sleep5d = db.getSleepEntries(subtractDays(date, 5), date)
  ctx.sleepAvg5d = sleep5d.length > 0 ? mean(sleep5d.map(s => s.hours)) : null
  ctx.sleepBaseline = db.getUserSetting("sleep_target_hours") ?? 8

  // Protein (5-day average)
  meals5d = db.getMealEntries(subtractDays(date, 5), date)
  ctx.proteinAvg5d = meals5d.length > 0 ? mean(dailyTotals(meals5d, "protein")) : null
  ctx.proteinTarget = db.getUserSetting("protein_target") ?? 180

  // Hydration (5-day average)
  water5d = db.getWaterEntries(subtractDays(date, 5), date)
  ctx.waterAvg5d = water5d.length > 0 ? mean(water5d.map(w => w.glasses)) : null
  ctx.waterGoal = db.getUserSetting("water_goal") ?? 8

  // Weight trend
  weights14d = db.getWeightEntries(subtractDays(date, 14), date)
  ctx.weightTrend14d = weights14d.length >= 4 ? calculateWeightSlope(weights14d) : null
  ctx.goal = db.getUserSetting("nutrition_goal") ?? "maintain"

  // Soreness (3-day average)
  soreness3d = db.getSorenessRatings(subtractDays(date, 3), date)
  allRatings = soreness3d.map(s => s.rating)
  ctx.sorenessAvg3d = allRatings.length > 0 ? mean(allRatings) : null

  // Workout adherence (14 days)
  sessions14d = db.getSessionsInRange(subtractDays(date, 14), date)
  completed14d = sessions14d.filter(s => s.completed).length
  ctx.workoutAdherence14d = sessions14d.length > 0 ? completed14d / sessions14d.length : 1

  // Mood (7-day average, mapped to numeric)
  MOOD_NUMERIC = { tough: 1, low: 2, okay: 3, good: 4, great: 5 }
  moods7d = db.getDayEntries(subtractDays(date, 7), date)
    .map(d => MOOD_NUMERIC[d.mood?.toLowerCase()])
    .filter(Boolean)
  ctx.moodAvg7d = moods7d.length > 0 ? mean(moods7d) : null

  // Consecutive missed workouts
  ctx.consecutiveMissedWorkouts = countConsecutiveMissed(date)

  // Step 2: Get existing alerts
  existingAlerts = db.getActiveAlerts()

  // Step 3: Evaluate
  newAlerts = evaluateAlerts(ctx, existingAlerts)

  // Step 4: Auto-resolve old alerts
  FOR EACH existing IN existingAlerts:
    rule = ALERT_RULES.find(r => r.id === existing.type)
    IF rule AND rule.resolveCondition(ctx):
      db.updateAlert(existing.id, { resolved: 1 })

  // Step 5: Store new alerts
  FOR EACH alert IN newAlerts:
    db.insert("health_alerts", alert)

  RETURN {
    newAlerts,
    activeAlerts: db.getActiveAlerts().slice(0, 3)  // max 3 displayed
  }


FUNCTION countConsecutiveMissed(date):
  count = 0
  checkDate = subtractDays(date, 1)
  WHILE count < 30:  // safety limit
    session = db.getScheduledSession(checkDate)
    IF session IS NULL:
      checkDate = subtractDays(checkDate, 1)
      CONTINUE
    IF session.completed:
      BREAK
    count++
    checkDate = subtractDays(checkDate, 1)
  RETURN count
```

### 11.5 Autopilot Generation

**Trigger:** App open (first open of the day). Cached for the day; regenerated if underlying data changes significantly.

```
FUNCTION generateDailyAutopilot(date):

  // Check cache
  cached = db.getAutopilot(date)
  IF cached AND cached.updated_at > subtractHours(now(), 2):
    RETURN JSON.parse(cached)  // serve cached if less than 2 hours old

  // Step 1: Readiness (may already be calculated today)
  readiness = db.getReadiness(date)
  IF NOT readiness:
    readiness = dailyReadinessCalculation(date)

  // Step 2: Training plan
  workout = db.getScheduledWorkout(date)
  trainingBrief = "Rest day — focus on recovery."
  IF workout:
    volumeAdj = getVolumeAdjustment(readiness.dayType)
    rirTarget = db.getCurrentMesoRirTarget()

    // Modify RIR based on readiness
    effectiveRir = rirTarget
    IF readiness.dayType === "recovery": effectiveRir = rirTarget + 1
    IF readiness.dayType === "reset": effectiveRir = rirTarget + 2

    trainingBrief = `${workout.name} — ${volumeAdj}, RIR ${effectiveRir}`

  // Step 3: Nutrition targets
  proteinTarget = db.getUserSetting("protein_target") ?? 180
  calorieTarget = db.getUserSetting("calorie_target") ?? 2400

  // Check for pending nutrition adjustment
  pendingAdj = db.getPendingNutritionAdjustment()
  IF pendingAdj AND pendingAdj.accepted === 1:
    calorieTarget = pendingAdj.recommended_value

  nutritionBrief = `Hit ${proteinTarget}g protein, ${calorieTarget} cal`

  // Step 4: Hydration
  waterGoal = db.getUserSetting("water_goal") ?? 8
  hydrationBrief = `${waterGoal} glasses minimum`

  // Step 5: Recovery / bedtime
  sleepTarget = db.getUserSetting("sleep_target_hours") ?? 8
  wakeTarget = db.getUserSetting("wake_time_target") ?? "7:00"
  wakeMin = parseTime(wakeTarget)
  bedtimeMin = wakeMin - (sleepTarget * 60) - 30
  IF bedtimeMin < 0: bedtimeMin += 1440
  bedtime = minutesToTime(bedtimeMin)
  recoveryBrief = `Sleep by ${bedtime} (${sleepTarget}h target)`

  // Step 6: Alerts
  alertResult = dailyAlertEvaluation(date)

  // Step 7: Recommendations
  recContext = gatherRecommendationInputs(date)
  recommendations = generateHealthRecommendations(recContext)

  // Step 8: Coaching message
  COACHING = {
    peak: "You're primed. Full intensity today — make it count.",
    standard: "Solid recovery — train as planned.",
    light: "Lighter day. Focus on what matters most.",
    recovery: "Recovery mode. Take care of the basics.",
    reset: "Full rest today. Your body needs it."
  }

  // Step 9: Assemble
  autopilot = {
    date,
    readiness: {
      score: readiness.score,
      category: readiness.category,
      explanation: readiness.explanation,
      coaching: COACHING[readiness.dayType]
    },
    plan: {
      training: trainingBrief,
      nutrition: nutritionBrief,
      hydration: hydrationBrief,
      recovery: recoveryBrief
    },
    alerts: alertResult.activeAlerts.map(a => ({
      type: a.type,
      priority: a.priority,
      message: a.message
    })),
    recommendations: recommendations.slice(0, 3).map(r => ({
      priority: r.priority,
      message: r.message,
      category: r.category
    }))
  }

  // Step 10: Cache
  db.upsert("health_autopilot", {
    date,
    readiness_json: JSON.stringify(autopilot.readiness),
    plan_json: JSON.stringify(autopilot.plan),
    alerts_json: JSON.stringify(autopilot.alerts),
    recommendations_json: JSON.stringify(autopilot.recommendations),
    updated_at: now()
  })

  RETURN autopilot
```

---

## 12. PHASED IMPLEMENTATION PLAN

### Phase 1: Core (Estimated: 2-3 weeks)

**Goal:** Get subjective feedback flowing and the readiness score visible. This is the foundation everything else depends on.

| Task | File(s) | Description | Priority |
|------|---------|-------------|----------|
| 1.1 | `electron/db.cjs` | Create new tables: `health_readiness`, `health_recommendations`, `muscle_soreness_log` | P0 |
| 1.2 | `src/lib/healthIntelligence.js` | New module: `calculateReadiness()`, `generateExplanation()`, helper functions. Port from `orchestrator.js` `evaluateReadiness()` with new 7-component formula. | P0 |
| 1.3 | `src/components/PostWorkoutFeedback.jsx` | New component: modal shown after exercise completion. Pump (1-5), difficulty (1-5), joint pain toggle, optional MMC. Writes to `meso_session_exercises`. | P0 |
| 1.4 | `src/components/SorenessCheckIn.jsx` | New component: shown on app open if yesterday had a workout. Per-muscle-group soreness (1-5). Writes to `muscle_soreness_log`. | P0 |
| 1.5 | `src/components/ReadinessCard.jsx` | New component: circular score + category + explanation + component bars. Reads from `health_readiness`. | P0 |
| 1.6 | `src/hooks/useHealthIntelligence.js` | New hook: gathers inputs from existing DB, calls `calculateReadiness()`, stores result, provides to UI. Runs on app open. | P0 |
| 1.7 | `src/lib/healthRecommendations.js` | New module: `generateHealthRecommendations()`. Reads all systems, outputs prioritized list. | P1 |
| 1.8 | `src/components/HealthRecommendations.jsx` | New component: prioritized list with icons and priority dots. | P1 |
| 1.9 | `src/pages/Dashboard.jsx` | Integrate ReadinessCard and HealthRecommendations into dashboard layout. | P1 |

**Phase 1 Definition of Done:**
- User completes a workout and is prompted for pump/difficulty feedback on each exercise
- Next-day soreness check-in appears on app open
- Readiness score is calculated and displayed on dashboard with explanation
- 3-5 daily recommendations appear below readiness card
- All data persists in SQLite

### Phase 2: Intelligence (Estimated: 3-4 weeks)

**Goal:** The system starts making smart decisions about workouts and nutrition.

| Task | File(s) | Description | Priority |
|------|---------|-------------|----------|
| 2.1 | `src/lib/workoutAutoregulation.js` | New module: `decideVolume()`, `decideLoad()`, `checkExerciseSwap()`, `checkDeloadTriggers()`. Full workout adaptation engine. | P0 |
| 2.2 | `src/lib/weeklyAdaptation.js` | New module: `weeklyWorkoutAdaptation()` — orchestrates per-muscle adaptation and generates next week's plan. Integrates with existing `mesoBuilder.js`. | P0 |
| 2.3 | `electron/db.cjs` | Create tables: `nutrition_adjustments`, `health_alerts` | P0 |
| 2.4 | `src/lib/nutritionAutoregulation.js` | New module: `evaluateCalories()`, `evaluateProtein()`, `evaluateCarbs()`, `calculateWeightSlope()`. | P0 |
| 2.5 | `src/lib/smartAlerts.js` | New module: `ALERT_RULES` definitions, `evaluateAlerts()`, cooldown management. | P1 |
| 2.6 | `src/components/NutritionAdjustmentCard.jsx` | New component: current vs. recommended with reasoning, accept/dismiss buttons. | P1 |
| 2.7 | `src/components/HealthAlertCard.jsx` | New component: alert banner with icon, message, action button, dismiss. | P1 |
| 2.8 | `src/pages/Workouts.jsx` | Integrate workout adaptation — show "Next Week Preview" with volume/load changes and reasoning per muscle group. | P1 |
| 2.9 | `src/pages/Meals.jsx` (or Macros) | Integrate nutrition adjustment card when suggestions are pending. | P2 |
| 2.10 | `src/hooks/useSmartAlerts.js` | New hook: runs alert evaluation daily, manages alert state. | P1 |

**Phase 2 Definition of Done:**
- After completing a training week, the system generates next week's plan with per-muscle volume/load adjustments and shows reasoning
- Exercise swap suggestions appear when pump is consistently low
- Deload triggers fire when appropriate (performance regression, excessive difficulty, excessive soreness)
- Weekly nutrition check produces calorie/protein recommendations
- Smart alerts fire for multi-day trends (sleep debt, low protein, etc.) with proper cooldowns
- Alerts can be dismissed and respect cooldown periods

### Phase 3: Experience (Estimated: 2-3 weeks)

**Goal:** Everything comes together into a polished, autopilot-style experience.

| Task | File(s) | Description | Priority |
|------|---------|-------------|----------|
| 3.1 | `electron/db.cjs` | Create tables: `health_autopilot`, `health_weekly_review` | P0 |
| 3.2 | `src/lib/autopilot.js` | New module: `generateDailyAutopilot()` — assembles all engine outputs into daily briefing. | P0 |
| 3.3 | `src/components/AutopilotCard.jsx` | New component: combined daily brief card with readiness, plan, alerts, recommendations. | P0 |
| 3.4 | `src/lib/weeklyReview.js` | New module: `generateWeeklyReview()`, `generateWeeklyInsight()`. Aggregates 7 days of data into summary. | P1 |
| 3.5 | `src/components/WeeklyHealthReview.jsx` | New component: 7-day summary with readiness trend, training stats, nutrition stats, weight trend, key insight. | P1 |
| 3.6 | `src/pages/Dashboard.jsx` | Replace top section with AutopilotCard as the primary dashboard element. | P0 |
| 3.7 | `src/pages/WeeklyReview.jsx` | Integrate WeeklyHealthReview component into existing weekly review page. | P1 |
| 3.8 | Cross-system coaching | Enhance readiness explanation and recommendations with cross-system logic (e.g., "Readiness is low because of 3 consecutive hard sessions AND poor sleep — consider a rest day"). | P2 |
| 3.9 | Settings integration | Add Health Intelligence settings: enable/disable autopilot, alert preferences, readiness component weights customization, notification preferences. | P2 |
| 3.10 | IPC layer | Add IPC handlers in `electron/main.cjs` and `electron/preload.cjs` for all new health intelligence DB operations. Expose via `window.plannerApi`. | P0 |

**Phase 3 Definition of Done:**
- Autopilot card is the first thing the user sees on app open
- Daily briefing includes readiness score, training plan (modified by readiness), nutrition targets, hydration goal, bedtime recommendation, active alerts, and top recommendations
- Weekly health review generates automatically on Sundays with trend visualizations and a key insight
- All engines work together — workout adaptation considers readiness, nutrition considers training volume, alerts consider all systems
- Settings allow customization of alert sensitivity and readiness weights

### Dependency Graph

```
Phase 1 (Foundation)
├── 1.1 DB tables ──────────────┐
├── 1.2 Readiness engine ───────┤
├── 1.3 Post-workout feedback ──┤
├── 1.4 Soreness check-in ──────┤
│                               ▼
│                    Phase 2 (Intelligence)
│                    ├── 2.1 Workout autoregulation (needs 1.3, 1.4)
│                    ├── 2.2 Weekly adaptation (needs 2.1)
│                    ├── 2.4 Nutrition autoregulation (needs 1.2)
│                    ├── 2.5 Smart alerts (needs 1.2, 1.6)
│                    │                    │
│                    │                    ▼
│                    │         Phase 3 (Experience)
│                    │         ├── 3.2 Autopilot (needs 1.2, 2.1, 2.4, 2.5)
│                    │         ├── 3.4 Weekly review (needs 1.2, 2.1, 2.4)
│                    │         └── 3.8 Cross-system coaching (needs all)
├── 1.5 Readiness card ─────────┤
├── 1.7 Recommendations ────────┤
└── 1.8 Recommendations UI ─────┘
```

### File Structure Summary

```
src/
├── lib/
│   ├── healthIntelligence.js          # Phase 1: Readiness score engine
│   ├── healthRecommendations.js       # Phase 1: Daily recommendations
│   ├── workoutAutoregulation.js       # Phase 2: Volume/load/swap decisions
│   ├── weeklyAdaptation.js            # Phase 2: Weekly adaptation orchestrator
│   ├── nutritionAutoregulation.js     # Phase 2: Calorie/macro adjustments
│   ├── smartAlerts.js                 # Phase 2: Trend-based alerts
│   ├── autopilot.js                   # Phase 3: Daily briefing generator
│   └── weeklyReview.js               # Phase 3: Weekly summary generator
├── hooks/
│   ├── useHealthIntelligence.js       # Phase 1: Readiness + recommendations hook
│   └── useSmartAlerts.js              # Phase 2: Alert management hook
├── components/
│   ├── PostWorkoutFeedback.jsx        # Phase 1: Pump/difficulty/pain modal
│   ├── SorenessCheckIn.jsx            # Phase 1: Next-day soreness per muscle
│   ├── ReadinessCard.jsx              # Phase 1: Score circle + breakdown
│   ├── HealthRecommendations.jsx      # Phase 1: Prioritized rec list
│   ├── NutritionAdjustmentCard.jsx    # Phase 2: Current vs. recommended
│   ├── HealthAlertCard.jsx            # Phase 2: Alert banner
│   ├── AutopilotCard.jsx              # Phase 3: Combined daily brief
│   └── WeeklyHealthReview.jsx         # Phase 3: 7-day summary
```

---

*End of Health Intelligence Layer Design Specification*
