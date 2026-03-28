/**
 * Apex OS — Mesocycle Builder Engine
 *
 * Generates structured mesocycle training blocks with week-specific volume,
 * intensity (RIR), and exercise prescriptions based on evidence-based
 * hypertrophy principles (Schoenfeld, Israetel, Helms).
 *
 * Exports: MESO_TEMPLATES, VOLUME_LANDMARKS, recommendTemplate, generateMesocycle
 */

import { FALLBACK_EXERCISES } from "./programBuilder.js";

// ---------------------------------------------------------------------------
// UUID helper
// ---------------------------------------------------------------------------
function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ===========================================================================
// 1. VOLUME LANDMARKS — per muscle group reference values (sets/week)
// ===========================================================================

export const VOLUME_LANDMARKS = {
  chest:         { mev: 8,  mav: 16, mrv: 22 },
  back:          { mev: 8,  mav: 18, mrv: 25 },
  quads:         { mev: 6,  mav: 14, mrv: 20 },
  hamstrings:    { mev: 4,  mav: 10, mrv: 16 },
  glutes:        { mev: 4,  mav: 10, mrv: 16 },
  lateral_delts: { mev: 8,  mav: 18, mrv: 25 },
  rear_delts:    { mev: 6,  mav: 14, mrv: 22 },
  front_delts:   { mev: 0,  mav: 4,  mrv: 12 },
  biceps:        { mev: 4,  mav: 12, mrv: 20 },
  triceps:       { mev: 4,  mav: 12, mrv: 18 },
  abs:           { mev: 4,  mav: 10, mrv: 16 },
  calves:        { mev: 4,  mav: 10, mrv: 16 },
  traps:         { mev: 0,  mav: 8,  mrv: 16 },
  forearms:      { mev: 0,  mav: 6,  mrv: 14 },
};

// ===========================================================================
// 2. MESOCYCLE TEMPLATES — 8 pre-built training splits
// ===========================================================================

export const MESO_TEMPLATES = [
  // -----------------------------------------------------------------------
  // Template 1: Full Body 3x (Beginner)
  // -----------------------------------------------------------------------
  {
    id: "full_body_3",
    name: "Full Body 3x",
    daysPerWeek: 3,
    experience: "beginner",
    recoveryDemand: "low",
    bestGoals: ["hypertrophy", "recomp", "strength_hypertrophy"],
    description: "Hit every muscle 3x/week. Great for beginners or time-constrained lifters.",
    days: [
      { label: "Full Body A", muscles: ["chest", "back", "quads", "lateral_delts", "triceps", "abs"] },
      { label: "Full Body B", muscles: ["back", "chest", "hamstrings", "glutes", "lateral_delts", "calves"] },
      { label: "Full Body C", muscles: ["chest", "back", "quads", "biceps", "lateral_delts", "abs"] },
    ],
    weeklyVolume: {
      chest: 8, back: 8, quads: 6, hamstrings: 6, glutes: 4,
      lateral_delts: 6, biceps: 6, triceps: 4, abs: 4, calves: 4,
    },
  },

  // -----------------------------------------------------------------------
  // Template 2: Upper/Lower 4x
  // -----------------------------------------------------------------------
  {
    id: "upper_lower_4",
    name: "Upper / Lower 4x",
    daysPerWeek: 4,
    experience: "beginner",
    recoveryDemand: "moderate",
    bestGoals: ["hypertrophy", "strength_hypertrophy", "recomp"],
    description: "Classic upper/lower split. Balanced development with 2x frequency per muscle.",
    days: [
      { label: "Upper A", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Lower A", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { label: "Upper B", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Lower B", muscles: ["hamstrings", "glutes", "quads", "calves", "abs"] },
    ],
    weeklyVolume: {
      chest: 12, back: 12, quads: 10, hamstrings: 8, glutes: 6,
      lateral_delts: 12, biceps: 10, triceps: 10, abs: 6, calves: 6,
    },
  },

  // -----------------------------------------------------------------------
  // Template 3: Push/Pull/Legs 6x
  // -----------------------------------------------------------------------
  {
    id: "ppl_6",
    name: "Push / Pull / Legs 6x",
    daysPerWeek: 6,
    experience: "intermediate",
    recoveryDemand: "high",
    bestGoals: ["hypertrophy", "specialization"],
    description: "High-volume PPL run twice per week. For serious hypertrophy.",
    days: [
      { label: "Push A", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Pull A", muscles: ["back", "biceps", "abs"] },
      { label: "Legs A", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { label: "Push B", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Pull B", muscles: ["back", "biceps", "abs"] },
      { label: "Legs B", muscles: ["hamstrings", "glutes", "quads", "calves"] },
    ],
    weeklyVolume: {
      chest: 16, back: 16, quads: 12, hamstrings: 10, glutes: 8,
      lateral_delts: 14, biceps: 12, triceps: 12, abs: 6, calves: 8,
    },
  },

  // -----------------------------------------------------------------------
  // Template 4: Push/Pull/Legs 5x (with rest day mid-week)
  // -----------------------------------------------------------------------
  {
    id: "ppl_5",
    name: "Push / Pull / Legs 5x",
    daysPerWeek: 5,
    experience: "intermediate",
    recoveryDemand: "moderate",
    bestGoals: ["hypertrophy", "recomp"],
    description: "PPL with an extra upper/lower day. Rest day mid-week for recovery.",
    days: [
      { label: "Push", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Pull", muscles: ["back", "biceps", "abs"] },
      { label: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { label: "Upper", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Lower", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
    ],
    weeklyVolume: {
      chest: 14, back: 14, quads: 10, hamstrings: 10, glutes: 8,
      lateral_delts: 14, biceps: 10, triceps: 10, abs: 6, calves: 6,
    },
  },

  // -----------------------------------------------------------------------
  // Template 5: Upper/Lower/PPL 5x Hybrid
  // -----------------------------------------------------------------------
  {
    id: "hybrid_5",
    name: "Upper / Lower / PPL Hybrid 5x",
    daysPerWeek: 5,
    experience: "intermediate",
    recoveryDemand: "moderate",
    bestGoals: ["hypertrophy", "strength_hypertrophy"],
    description: "Upper/lower start, PPL finish. Balanced frequency with variety.",
    days: [
      { label: "Upper", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Lower", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { label: "Push", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Pull", muscles: ["back", "biceps", "abs"] },
      { label: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    ],
    weeklyVolume: {
      chest: 14, back: 14, quads: 10, hamstrings: 10, glutes: 8,
      lateral_delts: 12, biceps: 10, triceps: 10, abs: 6, calves: 6,
    },
  },

  // -----------------------------------------------------------------------
  // Template 6: Chest & Arms Specialization 5x
  // -----------------------------------------------------------------------
  {
    id: "chest_arms_spec_5",
    name: "Chest & Arms Specialization 5x",
    daysPerWeek: 5,
    experience: "intermediate",
    recoveryDemand: "moderate",
    bestGoals: ["specialization"],
    description: "Prioritize chest, biceps, and triceps with maintenance volume elsewhere.",
    days: [
      { label: "Push (Chest Focus)", muscles: ["chest", "triceps"] },
      { label: "Pull", muscles: ["back", "biceps", "abs"] },
      { label: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { label: "Chest & Biceps", muscles: ["chest", "biceps"] },
      { label: "Shoulders & Triceps", muscles: ["lateral_delts", "triceps"] },
    ],
    weeklyVolume: {
      chest: 20, back: 10, quads: 8, hamstrings: 6, glutes: 4,
      lateral_delts: 10, biceps: 16, triceps: 14, abs: 4, calves: 4,
    },
  },

  // -----------------------------------------------------------------------
  // Template 7: Back & Shoulders Specialization 5x
  // -----------------------------------------------------------------------
  {
    id: "back_shoulders_spec_5",
    name: "Back & Shoulders Specialization 5x",
    daysPerWeek: 5,
    experience: "intermediate",
    recoveryDemand: "moderate",
    bestGoals: ["specialization"],
    description: "Prioritize back width, rear delts, and side delts for V-taper development.",
    days: [
      { label: "Pull (Back Heavy)", muscles: ["back", "biceps"] },
      { label: "Push", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { label: "Back & Rear Delts", muscles: ["back", "lateral_delts"] },
      { label: "Shoulders & Arms", muscles: ["lateral_delts", "biceps", "triceps"] },
    ],
    weeklyVolume: {
      chest: 8, back: 20, quads: 8, hamstrings: 6, glutes: 4,
      lateral_delts: 16, biceps: 10, triceps: 8, abs: 4, calves: 4,
    },
  },

  // -----------------------------------------------------------------------
  // Template 8: Glutes & Legs Specialization 5x
  // -----------------------------------------------------------------------
  {
    id: "legs_glutes_spec_5",
    name: "Glutes & Legs Specialization 5x",
    daysPerWeek: 5,
    experience: "intermediate",
    recoveryDemand: "high",
    bestGoals: ["specialization"],
    description: "Three leg days per week. Upper body at maintenance volume.",
    days: [
      { label: "Legs (Quad Focus)", muscles: ["quads", "glutes", "calves"] },
      { label: "Upper A", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Legs (Glute/Ham)", muscles: ["hamstrings", "glutes", "quads"] },
      { label: "Upper B", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Legs (Accessory)", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
    ],
    weeklyVolume: {
      chest: 8, back: 8, quads: 18, hamstrings: 14, glutes: 16,
      lateral_delts: 6, biceps: 6, triceps: 6, abs: 4, calves: 10,
    },
  },
];

// ===========================================================================
// 3. VOLUME ADJUSTMENT MULTIPLIERS
// ===========================================================================

const GOAL_MULT = {
  hypertrophy: 1.0,
  specialization: 1.0, // handled separately via spec targets
  strength_hypertrophy: 0.85,
  recomp: 0.9,
};

const EXPERIENCE_MULT = {
  beginner: 0.7,
  intermediate: 1.0,
  advanced: 1.15,
};

function getRecoveryMult(recoveryScore) {
  if (recoveryScore == null) return 1.0;
  if (recoveryScore <= 3) return 0.80;
  if (recoveryScore <= 6) return 1.0;
  return 1.10;
}

// ===========================================================================
// 4. SPLIT RECOMMENDATION ENGINE
// ===========================================================================

const EXP_ORDER = ["beginner", "intermediate", "advanced"];

/**
 * Score a single template against a user profile.
 * Returns 0 if the template is hard-disqualified.
 */
function scoreTemplate(template, profile) {
  let score = 0;
  const daysPerWeek = profile.days_per_week ?? profile.daysPerWeek ?? 4;
  const experience = profile.experience ?? "intermediate";
  const goal = profile.goal ?? "hypertrophy";
  const recoveryScore = profile.recovery_score ?? profile.recoveryScore ?? 5;
  const specTargets = profile.specialization_targets ?? profile.specializationTargets ?? [];

  // 1. Days match (40 points max — critical filter)
  const daysDiff = Math.abs(template.daysPerWeek - daysPerWeek);
  if (daysDiff === 0) {
    score += 40;
  } else if (daysDiff === 1) {
    score += 15;
  } else {
    return 0; // hard disqualify
  }

  // 2. Experience match (20 points max)
  const userExp = EXP_ORDER.indexOf(experience);
  const templateMinExp = EXP_ORDER.indexOf(template.experience);
  if (userExp >= templateMinExp) {
    score += 20;
  } else {
    score -= 20;
  }

  // 3. Goal alignment (20 points max)
  if (template.bestGoals.includes(goal)) {
    score += 20;
  } else {
    score += 5;
  }

  // 4. Recovery match (15 points max)
  const RECOVERY_MAP = { low: 3, moderate: 2, high: 1 };
  const demandScore = RECOVERY_MAP[template.recoveryDemand] ?? 2;
  if (recoveryScore >= 7) {
    score += 15;
  } else if (recoveryScore >= 4) {
    score += demandScore <= 2 ? 15 : 5;
  } else {
    score += demandScore === 3 ? 15 : 0;
  }

  // 5. Specialization match (5 points max)
  if (goal === "specialization" && specTargets.length > 0) {
    let covered = 0;
    for (const target of specTargets) {
      const freq = template.days.filter((d) => d.muscles.includes(target)).length;
      if (freq >= 2) covered++;
    }
    const ratio = specTargets.length > 0 ? covered / specTargets.length : 0;
    score += Math.round(ratio * 5);
  }

  return Math.max(score, 0);
}

/**
 * Rank all templates for a user profile.
 * Returns array sorted by score descending: [{ template, score }]
 */
export function recommendTemplate(profile) {
  if (!profile) return [];

  const scored = MESO_TEMPLATES.map((template) => ({
    template,
    score: scoreTemplate(template, profile),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ===========================================================================
// 5. RIR SCHEDULE
// ===========================================================================

/**
 * Compute the target RIR range for a given training week.
 * @param {number} weekNumber — 1-indexed week within the meso
 * @param {number} totalTrainingWeeks — weeks excluding deload
 * @param {boolean} isDeload — whether this is the deload week
 * @returns {{ rirLow: number, rirHigh: number }}
 */
function getRirForWeek(weekNumber, totalTrainingWeeks, isDeload = false) {
  if (isDeload) return { rirLow: 5, rirHigh: 6 };
  if (totalTrainingWeeks <= 0) return { rirLow: 3, rirHigh: 4 };

  // Map week position (0..1) to RIR range.
  // Week 1 => RIR 3-4, last training week => RIR 1-2
  const progress = (weekNumber - 1) / Math.max(totalTrainingWeeks - 1, 1);

  // RIR high goes from 4 -> 2, RIR low goes from 3 -> 1
  const rirHigh = Math.round(4 - progress * 2);
  const rirLow = Math.round(3 - progress * 2);

  return {
    rirLow: Math.max(rirLow, 1),
    rirHigh: Math.max(rirHigh, rirLow + 1, 2),
  };
}

// ===========================================================================
// 6. VOLUME ALLOCATION
// ===========================================================================

/**
 * Compute adjusted weekly volume for each muscle in the template,
 * taking into account goal, experience, recovery, and specialization.
 */
function computeAdjustedWeeklyVolume(template, profile) {
  const goal = profile.goal ?? "hypertrophy";
  const experience = profile.experience ?? "intermediate";
  const recoveryScore = profile.recovery_score ?? profile.recoveryScore ?? 5;
  const specTargets = profile.specialization_targets ?? profile.specializationTargets ?? [];

  const goalMult = GOAL_MULT[goal] ?? 1.0;
  const expMult = EXPERIENCE_MULT[experience] ?? 1.0;
  const recMult = getRecoveryMult(recoveryScore);

  const adjusted = {};

  for (const [muscle, baseSets] of Object.entries(template.weeklyVolume)) {
    let mult = goalMult * expMult * recMult;

    // Specialization: boost specialized muscles, maintain others
    if (goal === "specialization" && specTargets.length > 0) {
      if (specTargets.includes(muscle)) {
        mult *= 1.3;
      } else {
        mult *= 0.65;
      }
    }

    let sets = Math.round(baseSets * mult);

    // Clamp to volume landmarks
    const landmarks = VOLUME_LANDMARKS[muscle];
    if (landmarks) {
      sets = Math.max(sets, landmarks.mev);
      sets = Math.min(sets, landmarks.mrv);
    }

    adjusted[muscle] = sets;
  }

  return adjusted;
}

/**
 * Allocate weekly muscle volume to a specific day based on how many days
 * train that muscle, with a week-over-week volume ramp.
 *
 * @param {Object} weeklyVolume — { muscle: totalWeeklySets }
 * @param {Object} templateDay — { muscles: [...] }
 * @param {number} weekNumber — 1-indexed
 * @param {number} totalTrainingWeeks — excluding deload
 * @param {Object} template — full template (to count frequency)
 * @param {boolean} isDeload
 * @returns {Object} — { muscle: setsForThisDay }
 */
function allocateVolumeToDay(weeklyVolume, templateDay, weekNumber, totalTrainingWeeks, template, isDeload = false) {
  const result = {};

  for (const muscle of templateDay.muscles) {
    const totalWeekly = weeklyVolume[muscle] ?? 0;
    if (totalWeekly <= 0) {
      result[muscle] = 0;
      continue;
    }

    // Count how many days in the template train this muscle
    const frequency = template.days.filter((d) => d.muscles.includes(muscle)).length;
    if (frequency === 0) {
      result[muscle] = 0;
      continue;
    }

    // Base sets per session: split evenly across days
    let baseSetsPerSession = Math.round(totalWeekly / frequency);

    if (isDeload) {
      // Deload: 50% volume
      result[muscle] = Math.max(Math.ceil(baseSetsPerSession * 0.5), 1);
      continue;
    }

    // Volume ramp: start at ~baseline (MEV-ish), ramp up over the meso.
    // Week 1 = baseline. Each subsequent week adds 0-1 sets per muscle per session.
    // The total weekly volume at week 1 should be near MEV; by the last week, near the target.
    const landmarks = VOLUME_LANDMARKS[muscle];
    const mev = landmarks ? landmarks.mev : 4;

    // Week 1 per-session = mev / frequency (floored), then ramp up to full target
    const mevPerSession = Math.max(Math.round(mev / frequency), 1);
    const targetPerSession = baseSetsPerSession;

    if (totalTrainingWeeks <= 1) {
      result[muscle] = targetPerSession;
      continue;
    }

    // Linear ramp from mevPerSession to targetPerSession
    const progress = (weekNumber - 1) / (totalTrainingWeeks - 1);
    const ramped = Math.round(mevPerSession + (targetPerSession - mevPerSession) * progress);

    // Ensure at least 1 set, and don't exceed per-session MRV heuristic
    result[muscle] = Math.max(Math.min(ramped, 10), 1);
  }

  return result;
}

// ===========================================================================
// 7. EXERCISE SELECTION
// ===========================================================================

/**
 * Stimulus-to-fatigue scoring heuristic for exercise selection.
 * Compounds are preferred for primary muscles when volume is higher;
 * isolations are preferred for accessories and when volume is low.
 */
function scoreExercise(exercise, _muscle, options = {}) {
  let score = 50; // base

  // Stimulus: isolations get a slight stimulus-per-set edge for hypertrophy
  if (!exercise.compound) {
    score += 10; // better stimulus-to-fatigue ratio for most muscles
  }

  // Compounds get a "do first" priority bonus for sequencing, but for
  // selection purposes we slightly prefer them for variety
  if (exercise.compound) {
    score += 5;
  }

  // Equipment filtering
  if (options.equipment && options.equipment.length > 0) {
    const eqName = (exercise.equipment || exercise.name || "").toLowerCase();
    const hasMatch = options.equipment.some((eq) => eqName.includes(eq.toLowerCase()));
    // Don't hard-filter; just deprioritize if equipment doesn't match
    if (!hasMatch && options.equipment.length > 0) {
      score -= 5;
    }
  }

  // Injury/avoidance filtering
  if (options.avoidExercises && options.avoidExercises.includes(exercise.id)) {
    return -1; // hard exclude
  }

  // Add randomness for variety between mesocycles
  score += Math.random() * 8;

  return score;
}

/**
 * Select exercises for a specific muscle group given a target number of sets.
 *
 * @param {string} muscle — e.g. "chest"
 * @param {number} targetSets — total sets for this muscle in this session
 * @param {Object} options — { equipment, injuries, avoidExercises, maxExercises }
 * @returns {Array} — [{ exerciseId, name, sets, repLow, repHigh, rir, restSeconds }]
 */
function selectExercisesForMuscle(muscle, targetSets, options = {}) {
  if (targetSets <= 0) return [];

  const maxExercises = options.maxExercises ?? 3;
  const rir = options.rir ?? 3;

  // Get exercise pool
  let pool = FALLBACK_EXERCISES[muscle] || [];
  if (pool.length === 0) return [];

  // Score and sort
  const scored = pool
    .map((ex) => ({ ...ex, score: scoreExercise(ex, muscle, options) }))
    .filter((ex) => ex.score >= 0) // remove hard-excluded
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  // Determine how many exercises to use
  let numExercises;
  if (targetSets <= 2) {
    numExercises = 1;
  } else if (targetSets <= 4) {
    numExercises = Math.min(2, scored.length);
  } else {
    numExercises = Math.min(maxExercises, scored.length);
  }

  // Pick top exercises, ensuring at least one compound if available
  const selected = [];
  const compounds = scored.filter((e) => e.compound);
  const isolations = scored.filter((e) => !e.compound);

  // Lead with a compound if one exists
  if (compounds.length > 0) {
    selected.push(compounds[0]);
  }

  // Fill remaining slots from the rest of the sorted pool
  for (const ex of scored) {
    if (selected.length >= numExercises) break;
    if (!selected.find((s) => s.id === ex.id)) {
      selected.push(ex);
    }
  }

  // Distribute sets across selected exercises
  // First exercise (compound) gets ~60%, second ~30%, third ~10%
  const setDistribution = distributeSetsAcrossExercises(targetSets, selected.length);

  // Determine rep ranges: compounds get lower reps, isolations get higher
  return selected.map((ex, i) => {
    const isCompound = ex.compound;
    return {
      exerciseId: ex.id,
      name: ex.name,
      muscle,
      sets: setDistribution[i],
      repLow: isCompound ? 6 : 10,
      repHigh: isCompound ? 12 : 15,
      rir,
      restSeconds: isCompound ? 150 : 90,
      compound: isCompound,
      order: 0, // will be set during day assembly
    };
  });
}

/**
 * Distribute N total sets across M exercises using a weighted split:
 * Ex 1: ~55%, Ex 2: ~30%, Ex 3: ~15%
 */
function distributeSetsAcrossExercises(totalSets, numExercises) {
  if (numExercises <= 0) return [];
  if (numExercises === 1) return [totalSets];

  const weights = [0.55, 0.30, 0.15].slice(0, numExercises);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  // Normalize weights
  const normalized = weights.map((w) => w / weightSum);

  const distribution = normalized.map((w) => Math.max(Math.round(totalSets * w), 1));

  // Adjust rounding to match totalSets exactly
  let diff = totalSets - distribution.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (diff > 0) {
    distribution[idx % distribution.length]++;
    diff--;
    idx++;
  }
  while (diff < 0) {
    // Remove from last exercises first
    const rIdx = distribution.length - 1 - ((-diff - 1) % distribution.length);
    if (distribution[rIdx] > 1) {
      distribution[rIdx]--;
      diff++;
    } else {
      break;
    }
  }

  return distribution;
}

// ===========================================================================
// 8. DAY ASSEMBLY — combine exercises for all muscles in a session
// ===========================================================================

/**
 * Assemble a complete training day: select exercises for each muscle,
 * order them properly (compounds first, abs last).
 */
function assembleDayExercises(muscleSets, options = {}) {
  const allExercises = [];

  for (const [muscle, sets] of Object.entries(muscleSets)) {
    if (sets <= 0) continue;
    const exercises = selectExercisesForMuscle(muscle, sets, {
      ...options,
      rir: options.rir ?? 3,
    });
    allExercises.push(...exercises);
  }

  // Sort: compounds first, then isolations, abs/calves last
  const LAST_MUSCLES = ["abs", "calves"];
  allExercises.sort((a, b) => {
    const aLast = LAST_MUSCLES.includes(a.muscle) ? 1 : 0;
    const bLast = LAST_MUSCLES.includes(b.muscle) ? 1 : 0;
    if (aLast !== bLast) return aLast - bLast;

    // Compounds before isolations
    if (a.compound && !b.compound) return -1;
    if (!a.compound && b.compound) return 1;

    // Higher sets first (primary muscles)
    return b.sets - a.sets;
  });

  // Assign order
  allExercises.forEach((ex, i) => {
    ex.order = i + 1;
  });

  return allExercises;
}

// ===========================================================================
// 9. CALENDAR MAPPING
// ===========================================================================

/**
 * Map training days to calendar dates.
 * @param {string} startDate — ISO date string "YYYY-MM-DD"
 * @param {number} numWeeks — total weeks including deload
 * @param {number[]} preferredDays — array of weekday indices (0=Sun, 1=Mon, ..., 6=Sat)
 * @param {number} daysPerWeek — number of training days per week
 * @returns {Array<{ weekIndex, dayIndex, date }>}
 */
function mapCalendarDates(startDate, numWeeks, preferredDays, daysPerWeek) {
  const dates = [];
  const start = new Date(startDate + "T12:00:00");

  // Convert preferred days from onboarding format (0=Mon..6=Sun) to JS getDay() (0=Sun..6=Sat)
  // If not provided, use default spacing
  let jsDaySlots;
  if (preferredDays && preferredDays.length > 0) {
    // Convert: 0=Mon→1, 1=Tue→2, ..., 5=Sat→6, 6=Sun→0
    jsDaySlots = preferredDays.map(d => (d + 1) % 7).sort((a, b) => a - b);
  } else {
    jsDaySlots = generateDefaultDaySlots(daysPerWeek);
  }

  // Ensure we have enough slots
  while (jsDaySlots.length < daysPerWeek) {
    for (let d = 1; d <= 6 && jsDaySlots.length < daysPerWeek; d++) {
      if (!jsDaySlots.includes(d)) jsDaySlots.push(d);
    }
  }
  jsDaySlots = jsDaySlots.slice(0, daysPerWeek).sort((a, b) => a - b);

  // Find the Monday of the week containing the start date
  const startDow = start.getDay(); // 0=Sun
  const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
  const firstMonday = new Date(start);
  firstMonday.setDate(start.getDate() + mondayOffset);

  for (let week = 0; week < numWeeks; week++) {
    for (let di = 0; di < jsDaySlots.length; di++) {
      const targetDow = jsDaySlots[di]; // JS day of week (0=Sun..6=Sat)

      // Calculate offset from Monday (Mon=1, so Mon offset = 0, Tue = 1, etc.)
      let dayOffset = targetDow === 0 ? 6 : targetDow - 1; // Convert to Mon=0 offset

      const date = new Date(firstMonday);
      date.setDate(firstMonday.getDate() + week * 7 + dayOffset);

      dates.push({
        weekIndex: week,
        dayIndex: di,
        date: formatDate(date),
      });
    }
  }

  // Sort each week's dates chronologically
  dates.sort((a, b) => {
    if (a.weekIndex !== b.weekIndex) return a.weekIndex - b.weekIndex;
    return a.date.localeCompare(b.date);
  });

  // Reassign dayIndex within each week after sorting
  let currentWeek = -1;
  let idx = 0;
  for (const d of dates) {
    if (d.weekIndex !== currentWeek) {
      currentWeek = d.weekIndex;
      idx = 0;
    }
    d.dayIndex = idx++;
  }

  return dates;
}

function generateDefaultDaySlots(daysPerWeek) {
  // JS getDay() format: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const patterns = {
    3: [1, 3, 5],          // Mon, Wed, Fri
    4: [1, 2, 4, 5],       // Mon, Tue, Thu, Fri
    5: [1, 2, 3, 5, 6],    // Mon-Wed, Fri-Sat
    6: [1, 2, 3, 4, 5, 6], // Mon-Sat
  };
  return patterns[daysPerWeek] || patterns[4];
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ===========================================================================
// 10. MESOCYCLE GENERATOR — main entry point
// ===========================================================================

/**
 * Generate a complete mesocycle training block.
 *
 * @param {Object} config
 * @param {Object} config.profile — user profile (experience, goal, recovery_score, etc.)
 * @param {Object} [config.template] — a MESO_TEMPLATES entry, or a custom split object
 * @param {number} [config.mesoLength=6] — total weeks including deload (e.g. 5+1=6)
 * @param {boolean} [config.includeDeload=true] — whether the last week is a deload
 * @param {string} [config.startDate] — ISO date "YYYY-MM-DD"
 * @param {number[]} [config.preferredDays] — weekday indices for training days
 * @param {string[]} [config.equipment] — available equipment keywords
 * @param {string[]} [config.injuries] — body parts to avoid
 * @param {string[]} [config.avoidExercises] — exercise IDs to exclude
 * @param {string[]} [config.specialization] — muscles to specialize (overrides profile)
 *
 * @returns {Object} — { mesoId, name, weeks, days, exercises, metadata }
 */
export function generateMesocycle(config = {}) {
  const {
    profile = {},
    template: templateInput,
    mesoLength = 6,
    includeDeload = true,
    startDate,
    preferredDays,
    equipment,
    injuries,
    avoidExercises,
    specialization,
  } = config;

  // Resolve template
  const template = templateInput || MESO_TEMPLATES[0];
  if (!template || !template.days || template.days.length === 0) {
    throw new Error("mesoBuilder: template must have at least one day defined.");
  }

  // Apply specialization override
  const effectiveProfile = { ...profile };
  if (specialization && specialization.length > 0) {
    effectiveProfile.specialization_targets = specialization;
    if (!effectiveProfile.goal) effectiveProfile.goal = "specialization";
  }

  // Compute adjusted weekly volume
  const weeklyVolume = computeAdjustedWeeklyVolume(template, effectiveProfile);

  // Determine training vs deload weeks
  const totalWeeks = Math.max(mesoLength, 2);
  const trainingWeeks = includeDeload ? totalWeeks - 1 : totalWeeks;
  const hasDeload = includeDeload && totalWeeks > 1;

  // Calendar dates
  const resolvedStart = startDate || formatDate(new Date());
  const calendarDates = mapCalendarDates(
    resolvedStart,
    totalWeeks,
    preferredDays,
    template.daysPerWeek
  );

  // Exercise selection options
  const exerciseOptions = {
    equipment: equipment || [],
    avoidExercises: avoidExercises || [],
    maxExercises: 3,
  };

  // Build the mesocycle
  const mesoId = uuid();
  const weeks = [];
  const allDays = [];
  const allExercises = [];

  for (let w = 0; w < totalWeeks; w++) {
    const weekNumber = w + 1;
    const isDeload = hasDeload && weekNumber === totalWeeks;
    const rir = getRirForWeek(isDeload ? 0 : weekNumber, trainingWeeks, isDeload);

    const weekId = uuid();
    const weekDays = [];

    for (let d = 0; d < template.days.length; d++) {
      const templateDay = template.days[d];

      // Allocate volume for this day
      const muscleSets = allocateVolumeToDay(
        weeklyVolume,
        templateDay,
        weekNumber,
        trainingWeeks,
        template,
        isDeload
      );

      // Select exercises
      const dayExercises = assembleDayExercises(muscleSets, {
        ...exerciseOptions,
        rir: rir.rirLow, // use the lower end for prescription
      });

      // Apply RIR to each exercise
      for (const ex of dayExercises) {
        ex.rir = rir.rirLow;
        ex.rirHigh = rir.rirHigh;
      }

      // Find calendar date for this day
      const calEntry = calendarDates.find(
        (ce) => ce.weekIndex === w && ce.dayIndex === d
      );

      const dayId = uuid();
      const dayObj = {
        id: dayId,
        mesoId,
        weekId,
        weekNumber,
        dayNumber: d + 1,
        label: templateDay.label,
        targetMuscles: templateDay.muscles,
        date: calEntry ? calEntry.date : null,
        isDeload,
        isRestDay: false,
        exercises: dayExercises.map((ex) => ({
          id: uuid(),
          dayId,
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscle: ex.muscle,
          sets: ex.sets,
          repLow: ex.repLow,
          repHigh: ex.repHigh,
          rirTarget: ex.rir,
          rirHigh: ex.rirHigh,
          restSeconds: ex.restSeconds,
          order: ex.order,
          compound: ex.compound,
        })),
      };

      weekDays.push(dayObj);
      allDays.push(dayObj);

      // Flatten exercises for top-level array
      for (const ex of dayObj.exercises) {
        allExercises.push(ex);
      }
    }

    weeks.push({
      id: weekId,
      mesoId,
      weekNumber,
      isDeload,
      rirLow: rir.rirLow,
      rirHigh: rir.rirHigh,
      days: weekDays,
    });
  }

  return {
    mesoId,
    name: template.name,
    templateId: template.id || "custom",
    startDate: resolvedStart,
    totalWeeks,
    trainingWeeks,
    hasDeload,
    weeklyVolume,
    weeks,
    days: allDays,
    exercises: allExercises,
    metadata: {
      profile: effectiveProfile,
      template: {
        id: template.id,
        name: template.name,
        daysPerWeek: template.daysPerWeek,
      },
      generatedAt: new Date().toISOString(),
    },
  };
}

// ===========================================================================
// 11. UTILITY EXPORTS
// ===========================================================================

/**
 * Get a template by ID.
 */
export function getTemplateById(templateId) {
  return MESO_TEMPLATES.find((t) => t.id === templateId) || null;
}

/**
 * Compute the adjusted weekly volume for a template + profile without
 * generating the full mesocycle. Useful for UI previews.
 */
export function previewWeeklyVolume(template, profile) {
  if (!template || !profile) return {};
  return computeAdjustedWeeklyVolume(template, profile);
}

/**
 * Get volume landmark data for a muscle group.
 */
export function getVolumeLandmarks(muscle) {
  return VOLUME_LANDMARKS[muscle] || null;
}

/**
 * Validate a custom split configuration.
 * Returns { valid: boolean, warnings: string[], errors: string[] }
 */
export function validateCustomSplit(days, weeklyVolume) {
  const warnings = [];
  const errors = [];

  if (!days || days.length === 0) {
    errors.push("At least one training day is required.");
    return { valid: false, warnings, errors };
  }

  if (days.length > 7) {
    errors.push("Cannot have more than 7 training days per week.");
  }

  // Check that every major muscle appears at least once
  const allMuscles = new Set();
  for (const day of days) {
    if (!day.muscles || day.muscles.length === 0) {
      warnings.push(`Day "${day.label || "Unnamed"}" has no muscles assigned.`);
    }
    if (day.muscles && day.muscles.length > 6) {
      warnings.push(`Day "${day.label || "Unnamed"}" has ${day.muscles.length} muscles — session may be too long.`);
    }
    for (const m of day.muscles || []) {
      allMuscles.add(m);
    }
  }

  const majorMuscles = ["chest", "back", "quads", "hamstrings", "glutes", "lateral_delts", "biceps", "triceps"];
  for (const muscle of majorMuscles) {
    if (!allMuscles.has(muscle)) {
      warnings.push(`${muscle} has no training day assigned.`);
    }
  }

  // Validate volume if provided
  if (weeklyVolume) {
    for (const [muscle, sets] of Object.entries(weeklyVolume)) {
      const landmarks = VOLUME_LANDMARKS[muscle];
      if (landmarks) {
        if (sets < landmarks.mev) {
          warnings.push(`${muscle}: ${sets} sets/week is below MEV (${landmarks.mev}).`);
        }
        if (sets > landmarks.mrv) {
          warnings.push(`${muscle}: ${sets} sets/week exceeds MRV (${landmarks.mrv}).`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
