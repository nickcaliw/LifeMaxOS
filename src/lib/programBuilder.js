/**
 * LifeMax OS — Workout Program Engine v2
 *
 * Generates structured, periodised training programs based on user profile,
 * schedules them onto a calendar, and provides progression targets.
 *
 * Exports: generateProgram, generateSchedule, calculateNextTargets, FALLBACK_EXERCISES
 */

import { EXERCISES, getExercisesForMuscle, filterExercises } from "./exerciseLibrary.js";

// ---------------------------------------------------------------------------
// UUID helper (works in browser and Electron)
// ---------------------------------------------------------------------------
function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback v4 UUID generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Shuffle helper (Fisher-Yates)
// ---------------------------------------------------------------------------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Range helper
// ---------------------------------------------------------------------------
function range(start, end) {
  const r = [];
  for (let i = start; i <= end; i++) r.push(i);
  return r;
}

// ===========================================================================
// 1. VOLUME TARGETS — weekly sets per muscle group by goal
// ===========================================================================
const VOLUME_MAP = {
  hypertrophy: { chest: 16, back: 18, quads: 16, hamstrings: 12, glutes: 8, lateral_delts: 18, biceps: 12, triceps: 12, abs: 8, calves: 8 },
  strength:    { chest: 12, back: 14, quads: 12, hamstrings: 10, glutes: 6, lateral_delts: 10, biceps: 8,  triceps: 10, abs: 4, calves: 4 },
  fat_loss:    { chest: 12, back: 14, quads: 12, hamstrings: 10, glutes: 8, lateral_delts: 14, biceps: 10, triceps: 10, abs: 10, calves: 6 },
  recomp:      { chest: 14, back: 16, quads: 14, hamstrings: 11, glutes: 8, lateral_delts: 16, biceps: 10, triceps: 10, abs: 8, calves: 6 },
  athletic:    { chest: 10, back: 12, quads: 12, hamstrings: 12, glutes: 8, lateral_delts: 10, biceps: 6,  triceps: 6,  abs: 8, calves: 6 },
};

const EXPERIENCE_MULT = { beginner: 0.7, intermediate: 1.0, advanced: 1.2 };

// ===========================================================================
// 2. PHASE-SPECIFIC PARAMETERS (sets, reps, RIR, rest)
// ===========================================================================
const PHASE_PARAMS = {
  accumulation: { setsRange: [3, 4], repsRange: [8, 12], rirRange: [3, 4], restRange: [90, 120],  volumeMult: 1.0 },
  progression:  { setsRange: [3, 4], repsRange: [6, 10], rirRange: [2, 3], restRange: [120, 150], volumeMult: 1.1 },
  peak:         { setsRange: [4, 5], repsRange: [6, 8],  rirRange: [1, 2], restRange: [150, 180], volumeMult: 1.15 },
  deload:       { setsRange: [2, 3], repsRange: [8, 12], rirRange: [5, 6], restRange: [60, 90],   volumeMult: 0.6 },
};

// ===========================================================================
// 3. SPLIT CANDIDATES
// ===========================================================================
const SPLIT_CANDIDATES = [
  {
    id: "full_body",
    name: "Full Body (A/B/C)",
    daysPerWeek: 3,
    minExperience: "beginner",
    bestGoals: ["fat_loss", "recomp", "athletic"],
    recoveryDemand: "low",
    sessions: [
      { label: "Day 1", title: "Full Body A", subtitle: "Chest & Back Focus", muscles: ["chest", "back", "quads", "lateral_delts", "biceps", "abs"] },
      { label: "Day 2", title: "Full Body B", subtitle: "Legs & Shoulders Focus", muscles: ["quads", "hamstrings", "glutes", "lateral_delts", "triceps", "calves"] },
      { label: "Day 3", title: "Full Body C", subtitle: "Pull & Arms Focus", muscles: ["back", "chest", "hamstrings", "biceps", "triceps", "abs"] },
    ],
  },
  {
    id: "upper_lower",
    name: "Upper/Lower",
    daysPerWeek: 4,
    minExperience: "beginner",
    bestGoals: ["hypertrophy", "strength", "recomp"],
    recoveryDemand: "moderate",
    sessions: [
      { label: "Day 1", title: "Upper A", subtitle: "Chest & Back", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Day 2", title: "Lower A", subtitle: "Quads & Glutes", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { label: "Day 3", title: "Upper B", subtitle: "Shoulders & Arms", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Day 4", title: "Lower B", subtitle: "Hamstrings & Posterior", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
    ],
  },
  {
    id: "hybrid_ul_ppl",
    name: "Hybrid Upper/Lower + PPL",
    daysPerWeek: 5,
    minExperience: "intermediate",
    bestGoals: ["hypertrophy", "recomp"],
    recoveryDemand: "moderate",
    sessions: [
      { label: "Day 1", title: "Upper", subtitle: "Chest, Back & Arms", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { label: "Day 2", title: "Lower", subtitle: "Quads, Hams & Glutes", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { label: "Day 3", title: "Push", subtitle: "Chest, Delts & Triceps", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Day 4", title: "Pull", subtitle: "Back & Biceps", muscles: ["back", "biceps", "abs"] },
      { label: "Day 5", title: "Legs", subtitle: "Full Lower Body", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    ],
  },
  {
    id: "ppl_x2",
    name: "Push/Pull/Legs x2",
    daysPerWeek: 6,
    minExperience: "intermediate",
    bestGoals: ["hypertrophy", "strength"],
    recoveryDemand: "high",
    sessions: [
      { label: "Day 1", title: "Push A", subtitle: "Chest & Triceps", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Day 2", title: "Pull A", subtitle: "Back & Biceps", muscles: ["back", "biceps", "abs"] },
      { label: "Day 3", title: "Legs A", subtitle: "Quads & Glutes", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { label: "Day 4", title: "Push B", subtitle: "Shoulders & Chest", muscles: ["chest", "lateral_delts", "triceps"] },
      { label: "Day 5", title: "Pull B", subtitle: "Back Thickness & Arms", muscles: ["back", "biceps", "abs"] },
      { label: "Day 6", title: "Legs B", subtitle: "Hamstrings & Posterior", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    ],
  },
  {
    id: "arnold",
    name: "Arnold Split",
    daysPerWeek: 6,
    minExperience: "advanced",
    bestGoals: ["hypertrophy"],
    recoveryDemand: "high",
    sessions: [
      { label: "Day 1", title: "Chest & Back A", subtitle: "Heavy Compounds", muscles: ["chest", "back"] },
      { label: "Day 2", title: "Shoulders & Arms A", subtitle: "Press & Curl Focus", muscles: ["lateral_delts", "biceps", "triceps"] },
      { label: "Day 3", title: "Legs A", subtitle: "Quad Dominant", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { label: "Day 4", title: "Chest & Back B", subtitle: "Volume Focus", muscles: ["chest", "back"] },
      { label: "Day 5", title: "Shoulders & Arms B", subtitle: "Isolation Focus", muscles: ["lateral_delts", "biceps", "triceps"] },
      { label: "Day 6", title: "Legs B", subtitle: "Posterior Chain", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
    ],
  },
];

// ===========================================================================
// 4. SPLIT SCORING
// ===========================================================================
const EXPERIENCE_RANK = { beginner: 0, intermediate: 1, advanced: 2 };
const RECOVERY_RANK = { low: 0, moderate: 1, high: 2 };

function scoreSplit(candidate, { daysPerWeek, goal, experienceLevel, weekCount }) {
  const scores = {};

  // Days match (30%) — penalty proportional to distance
  const dayDiff = Math.abs(candidate.daysPerWeek - daysPerWeek);
  scores.days_match = dayDiff === 0 ? 1.0 : dayDiff === 1 ? 0.5 : 0.1;

  // Goal alignment (25%) — 1.0 if goal in bestGoals, 0.4 otherwise
  scores.goal_alignment = candidate.bestGoals.includes(goal) ? 1.0 : 0.4;

  // Experience fit (20%) — penalise if split demands more experience than user has
  const userExp = EXPERIENCE_RANK[experienceLevel] ?? 1;
  const minExp = EXPERIENCE_RANK[candidate.minExperience] ?? 0;
  if (userExp >= minExp) {
    // Good fit or overqualified (slight penalty for overqualified)
    scores.experience_fit = userExp === minExp ? 1.0 : 0.8;
  } else {
    scores.experience_fit = 0.2; // under-qualified
  }

  // Recovery fit (15%) — beginners should avoid high-recovery splits
  const recoveryLevel = RECOVERY_RANK[candidate.recoveryDemand] ?? 1;
  if (userExp >= recoveryLevel) {
    scores.recovery_fit = 1.0;
  } else {
    scores.recovery_fit = 0.3;
  }

  // Duration fit (10%) — longer programs benefit from higher frequency splits
  const wc = weekCount || 8;
  if (wc >= 12 && candidate.daysPerWeek >= 5) {
    scores.duration_fit = 1.0;
  } else if (wc <= 6 && candidate.daysPerWeek <= 4) {
    scores.duration_fit = 1.0;
  } else {
    scores.duration_fit = 0.7;
  }

  // Weighted total
  const total =
    scores.days_match * 0.30 +
    scores.goal_alignment * 0.25 +
    scores.experience_fit * 0.20 +
    scores.recovery_fit * 0.15 +
    scores.duration_fit * 0.10;

  return { ...scores, total };
}

function selectBestSplit(params) {
  let best = null;
  let bestScore = -1;

  for (const candidate of SPLIT_CANDIDATES) {
    const score = scoreSplit(candidate, params);
    if (score.total > bestScore) {
      bestScore = score.total;
      best = { ...candidate, score };
    }
  }
  return best;
}

// ===========================================================================
// 5. PHASE GENERATION
// ===========================================================================
function generatePhases(weekCount) {
  if (weekCount === "ongoing" || weekCount === 0) {
    // Repeating 4-week blocks (return one cycle; scheduler repeats)
    return [
      { name: "Accumulation", type: "accumulation", weeks: [1, 2, 3], volumeMultiplier: 1.0 },
      { name: "Deload",       type: "deload",       weeks: [4],       volumeMultiplier: 0.6 },
    ];
  }

  const wc = Number(weekCount) || 8;

  if (wc <= 4) {
    return [
      { name: "Accumulation", type: "accumulation", weeks: range(1, Math.max(wc - 1, 1)), volumeMultiplier: 1.0 },
      { name: "Deload",       type: "deload",       weeks: [wc],                           volumeMultiplier: 0.6 },
    ];
  }

  if (wc <= 8) {
    return [
      { name: "Accumulation", type: "accumulation", weeks: range(1, 3), volumeMultiplier: 1.0 },
      { name: "Deload",       type: "deload",       weeks: [4],         volumeMultiplier: 0.6 },
      { name: "Progression",  type: "progression",  weeks: range(5, 7), volumeMultiplier: 1.1 },
      { name: "Deload",       type: "deload",       weeks: [8],         volumeMultiplier: 0.6 },
    ];
  }

  if (wc <= 12) {
    return [
      { name: "Accumulation", type: "accumulation", weeks: range(1, 3),  volumeMultiplier: 1.0 },
      { name: "Deload",       type: "deload",       weeks: [4],          volumeMultiplier: 0.6 },
      { name: "Progression",  type: "progression",  weeks: range(5, 7),  volumeMultiplier: 1.1 },
      { name: "Deload",       type: "deload",       weeks: [8],          volumeMultiplier: 0.6 },
      { name: "Peak",         type: "peak",          weeks: range(9, 11), volumeMultiplier: 1.15 },
      { name: "Deload",       type: "deload",       weeks: [12],         volumeMultiplier: 0.6 },
    ];
  }

  // 16 weeks
  return [
    { name: "Accumulation I",  type: "accumulation", weeks: range(1, 3),   volumeMultiplier: 1.0 },
    { name: "Deload",          type: "deload",       weeks: [4],           volumeMultiplier: 0.6 },
    { name: "Accumulation II", type: "accumulation", weeks: range(5, 8),   volumeMultiplier: 1.05 },
    { name: "Deload",          type: "deload",       weeks: [9],           volumeMultiplier: 0.6 },
    { name: "Progression",     type: "progression",  weeks: range(10, 12), volumeMultiplier: 1.1 },
    { name: "Deload",          type: "deload",       weeks: [13],          volumeMultiplier: 0.6 },
    { name: "Peak",            type: "peak",          weeks: range(14, 15), volumeMultiplier: 1.15 },
    { name: "Deload",          type: "deload",       weeks: [16],          volumeMultiplier: 0.6 },
  ];
}

/**
 * Look up which phase a given week number falls into.
 * Returns the phase object or the first accumulation phase as default.
 */
function getPhaseForWeek(phases, weekNum) {
  for (const phase of phases) {
    if (phase.weeks.includes(weekNum)) return phase;
  }
  return phases[0];
}

// ===========================================================================
// 6. INJURY / EQUIPMENT FILTERING
// ===========================================================================
const INJURY_BODY_PARTS = {
  lower_back: ["lower back", "lower_back", "erector"],
  shoulder:   ["shoulder", "delt", "rotator"],
  knee:       ["knee", "quad extension", "lunge", "squat"],
  wrist:      ["wrist", "curl"],
  neck:       ["neck", "trap", "shrug"],
  hip:        ["hip", "glute", "hip thrust"],
};

function isExerciseSafe(exercise, injuries) {
  if (!injuries || injuries.length === 0 || injuries.includes("none")) return true;
  const nameLower = (exercise.name || "").toLowerCase();
  const muscleLower = (exercise.muscle || exercise.primaryMuscle || "").toLowerCase();
  for (const injury of injuries) {
    const keywords = INJURY_BODY_PARTS[injury] || [];
    for (const kw of keywords) {
      if (nameLower.includes(kw) || muscleLower.includes(kw)) return false;
    }
  }
  return true;
}

// ===========================================================================
// 7. FALLBACK EXERCISE DATABASE
// ===========================================================================
const FALLBACK_EXERCISES = {
  chest: [
    { id: "bench_press_bb", name: "Bench Press (Barbell)", compound: true, muscle: "chest" },
    { id: "incline_bench_bb", name: "Incline Bench Press (Barbell)", compound: true, muscle: "chest" },
    { id: "bench_press_db", name: "Bench Press (Dumbbell)", compound: true, muscle: "chest" },
    { id: "incline_bench_db", name: "Incline Bench Press (Dumbbell)", compound: true, muscle: "chest" },
    { id: "cable_fly", name: "Cable Fly Crossovers", compound: false, muscle: "chest" },
    { id: "chest_press_machine", name: "Chest Press (Machine)", compound: false, muscle: "chest" },
    { id: "pec_deck", name: "Pec Deck (Machine)", compound: false, muscle: "chest" },
  ],
  back: [
    { id: "pull_up", name: "Pull Up", compound: true, muscle: "back" },
    { id: "bent_row_bb", name: "Bent Over Row (Barbell)", compound: true, muscle: "back" },
    { id: "lat_pulldown", name: "Lat Pulldown (Cable)", compound: true, muscle: "back" },
    { id: "seated_row", name: "Seated Row (Cable)", compound: true, muscle: "back" },
    { id: "db_row", name: "Dumbbell Row", compound: false, muscle: "back" },
    { id: "chest_supported_row", name: "Chest Supported Row (Dumbbell)", compound: false, muscle: "back" },
    { id: "lat_pulldown_machine", name: "Lat Pulldown (Machine)", compound: false, muscle: "back" },
  ],
  quads: [
    { id: "squat_bb", name: "Squat (Barbell)", compound: true, muscle: "quads" },
    { id: "leg_press", name: "Leg Press (Machine)", compound: true, muscle: "quads" },
    { id: "front_squat", name: "Front Squat (Barbell)", compound: true, muscle: "quads" },
    { id: "hack_squat", name: "Hack Squat (Machine)", compound: true, muscle: "quads" },
    { id: "leg_extension", name: "Leg Extension (Machine)", compound: false, muscle: "quads" },
    { id: "goblet_squat", name: "Goblet Squat (Dumbbell)", compound: false, muscle: "quads" },
  ],
  hamstrings: [
    { id: "rdl_bb", name: "Romanian Deadlift (Barbell)", compound: true, muscle: "hamstrings" },
    { id: "rdl_db", name: "Romanian Deadlift (Dumbbell)", compound: true, muscle: "hamstrings" },
    { id: "seated_leg_curl", name: "Seated Leg Curl (Machine)", compound: false, muscle: "hamstrings" },
    { id: "lying_leg_curl", name: "Lying Leg Curl (Machine)", compound: false, muscle: "hamstrings" },
    { id: "nordic_curl", name: "Nordic Hamstring Curl", compound: false, muscle: "hamstrings" },
  ],
  glutes: [
    { id: "hip_thrust_bb", name: "Hip Thrust (Barbell)", compound: true, muscle: "glutes" },
    { id: "hip_thrust_machine", name: "Hip Thrust (Machine)", compound: true, muscle: "glutes" },
    { id: "cable_pull_through", name: "Cable Pull Through", compound: false, muscle: "glutes" },
    { id: "glute_kickback", name: "Glute Kickback (Cable)", compound: false, muscle: "glutes" },
  ],
  lateral_delts: [
    { id: "ohp_bb", name: "Overhead Press (Barbell)", compound: true, muscle: "lateral_delts" },
    { id: "ohp_db", name: "Overhead Press (Dumbbell)", compound: true, muscle: "lateral_delts" },
    { id: "lateral_raise_db", name: "Lateral Raise (Dumbbell)", compound: false, muscle: "lateral_delts" },
    { id: "lateral_raise_cable", name: "Lateral Raise (Cable)", compound: false, muscle: "lateral_delts" },
    { id: "lateral_raise_machine", name: "Lateral Raise (Machine)", compound: false, muscle: "lateral_delts" },
    { id: "upright_row", name: "Upright Row (Cable)", compound: false, muscle: "lateral_delts" },
  ],
  biceps: [
    { id: "barbell_curl", name: "Bicep Curl (Barbell)", compound: false, muscle: "biceps" },
    { id: "db_curl", name: "Bicep Curl (Dumbbell)", compound: false, muscle: "biceps" },
    { id: "hammer_curl", name: "Hammer Curl (Dumbbell)", compound: false, muscle: "biceps" },
    { id: "preacher_curl", name: "Preacher Curl (Machine)", compound: false, muscle: "biceps" },
    { id: "incline_curl", name: "Incline Curl (Dumbbell)", compound: false, muscle: "biceps" },
    { id: "cable_curl", name: "Cable Curl", compound: false, muscle: "biceps" },
  ],
  triceps: [
    { id: "close_grip_bench", name: "Close Grip Bench Press", compound: true, muscle: "triceps" },
    { id: "tricep_pushdown", name: "Triceps Pushdown (Cable)", compound: false, muscle: "triceps" },
    { id: "tricep_rope", name: "Triceps Rope Pushdown", compound: false, muscle: "triceps" },
    { id: "overhead_ext", name: "Overhead Triceps Extension (Cable)", compound: false, muscle: "triceps" },
    { id: "skull_crusher", name: "Skull Crushers (Barbell)", compound: false, muscle: "triceps" },
    { id: "dips", name: "Dips", compound: true, muscle: "triceps" },
  ],
  abs: [
    { id: "cable_crunch", name: "Cable Crunch", compound: false, muscle: "abs" },
    { id: "hanging_leg_raise", name: "Hanging Leg Raise", compound: false, muscle: "abs" },
    { id: "ab_wheel", name: "Ab Wheel Rollout", compound: false, muscle: "abs" },
    { id: "decline_crunch", name: "Decline Crunch", compound: false, muscle: "abs" },
  ],
  calves: [
    { id: "standing_calf", name: "Standing Calf Raise", compound: false, muscle: "calves" },
    { id: "seated_calf", name: "Seated Calf Raise", compound: false, muscle: "calves" },
    { id: "leg_press_calf", name: "Leg Press Calf Raise", compound: false, muscle: "calves" },
  ],
};

// ===========================================================================
// 8. EXERCISE SELECTION
// ===========================================================================
function getExercisesFor(muscle) {
  let exercises = [];
  try {
    if (typeof getExercisesForMuscle === "function") {
      exercises = getExercisesForMuscle(muscle);
    }
  } catch (_) { /* ignore */ }

  // Normalise exerciseLibrary format to the internal shape
  if (exercises && exercises.length > 0) {
    exercises = exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      compound: ex.category === "compound" || ex.compound === true,
      muscle: ex.primaryMuscle || ex.muscle || muscle,
      equipment: ex.equipment || null,
    }));
  } else {
    exercises = FALLBACK_EXERCISES[muscle] || [];
  }
  return exercises;
}

/**
 * Pick exercises for a muscle group to fill targetSets.
 * Uses phase parameters for reps/RIR/rest instead of goal-level defaults.
 */
function pickExercises(muscle, targetSets, phaseType, injuries, equipment) {
  const params = PHASE_PARAMS[phaseType] || PHASE_PARAMS.accumulation;
  let pool = getExercisesFor(muscle).filter((ex) => isExerciseSafe(ex, injuries));

  // Equipment filter — if user specified available equipment, restrict pool
  if (equipment && equipment.length > 0) {
    const filtered = pool.filter((ex) => {
      if (!ex.equipment) return true; // fallback exercises without equipment tag pass
      return equipment.includes(ex.equipment);
    });
    if (filtered.length > 0) pool = filtered;
  }

  if (pool.length === 0) return [];

  const compounds = pool.filter((e) => e.compound);
  const isolations = pool.filter((e) => !e.compound);

  const [repLow, repHigh] = params.repsRange;
  const [rirLow, rirHigh] = params.rirRange;
  const [restLow, restHigh] = params.restRange;
  const repStr = `${repLow}-${repHigh}`;
  const rir = Math.round((rirLow + rirHigh) / 2);
  const compoundRest = restHigh;
  const isolationRest = restLow;

  const selected = [];
  let remaining = targetSets;

  // Compounds first (higher sets in peak phases)
  const compoundSetCap = params.setsRange[1];
  for (const ex of shuffle(compounds)) {
    if (remaining <= 0) break;
    const sets = Math.min(remaining, compoundSetCap);
    selected.push({
      exerciseId: ex.id,
      name: ex.name,
      muscle,
      compound: true,
      sets,
      reps: repStr,
      rir,
      restSeconds: compoundRest,
    });
    remaining -= sets;
  }

  // Isolation fill
  const isolationSetCap = params.setsRange[0];
  for (const ex of shuffle(isolations)) {
    if (remaining <= 0) break;
    const sets = Math.min(remaining, isolationSetCap);
    selected.push({
      exerciseId: ex.id,
      name: ex.name,
      muscle,
      compound: false,
      sets,
      reps: repStr,
      rir,
      restSeconds: isolationRest,
    });
    remaining -= sets;
  }

  // Overflow — distribute remaining sets across existing exercises
  if (remaining > 0 && selected.length > 0) {
    let idx = 0;
    while (remaining > 0) {
      selected[idx % selected.length].sets += 1;
      remaining -= 1;
      idx++;
    }
  }

  return selected;
}

// ===========================================================================
// 9. DURATION ESTIMATION
// ===========================================================================
/**
 * Estimate session duration in minutes.
 * Formula per exercise: sets * (avg_reps * 4s + rest_seconds) / 60
 */
function estimateDuration(exercises) {
  let totalSeconds = 0;
  for (const ex of exercises) {
    const repParts = (ex.reps || "8-12").split("-").map(Number);
    const avgReps = (repParts[0] + (repParts[1] || repParts[0])) / 2;
    const timePerSet = avgReps * 4 + (ex.restSeconds || 90);
    totalSeconds += ex.sets * timePerSet;
  }
  return Math.round(totalSeconds / 60);
}

// ===========================================================================
// 10. VOLUME DISTRIBUTION
// ===========================================================================
function computeVolumeTargets(goal, experienceLevel, focusMuscles) {
  const baseVolume = VOLUME_MAP[goal] || VOLUME_MAP.hypertrophy;
  const mult = EXPERIENCE_MULT[experienceLevel] || 1.0;
  const volumeTargets = {};
  const hasFocus = focusMuscles && focusMuscles.length > 0;

  for (const [muscle, sets] of Object.entries(baseVolume)) {
    let adjusted = Math.round(sets * mult);
    if (hasFocus) {
      if (focusMuscles.includes(muscle)) {
        adjusted = Math.round(adjusted * 1.2);
      } else {
        adjusted = Math.round(adjusted * 0.9);
      }
    }
    volumeTargets[muscle] = adjusted;
  }
  return volumeTargets;
}

function distributeVolume(volumeTargets, sessions, volumeMultiplier) {
  // Count how many sessions each muscle appears in
  const muscleDayCounts = {};
  for (const session of sessions) {
    for (const muscle of session.muscles || []) {
      muscleDayCounts[muscle] = (muscleDayCounts[muscle] || 0) + 1;
    }
  }

  return sessions.map((session) => {
    const muscleAlloc = {};
    for (const muscle of session.muscles || []) {
      const weekly = volumeTargets[muscle] || 0;
      const freq = muscleDayCounts[muscle] || 1;
      const adjusted = Math.round((weekly / freq) * (volumeMultiplier || 1.0));
      muscleAlloc[muscle] = Math.max(adjusted, 1);
    }
    return muscleAlloc;
  });
}

// ===========================================================================
// 11. MAIN GENERATION — generateProgram
// ===========================================================================
export function generateProgram({
  goal,
  daysPerWeek,
  experienceLevel,
  bodyWeight,
  bodyFat,
  injuries,
  equipment,
  weekCount,
  focusMuscles,
  sessionDurationTarget,
  age,
  sex,
  heightInches,
  maxExercisesPerSession,
}) {
  const normalizedGoal = (goal || "hypertrophy").toLowerCase().replace(/\s+/g, "_");
  const normExp = (experienceLevel || "intermediate").toLowerCase();
  const normInjuries = (injuries || [])
    .map((i) => i.toLowerCase().replace(/\s+/g, "_"))
    .filter((i) => i !== "none");
  const normEquipment = equipment || [];
  const normFocus = (focusMuscles || []).map((m) => m.toLowerCase().replace(/\s+/g, "_"));
  const wc = weekCount || 8;
  const dpw = daysPerWeek || 4;
  const maxExPerSession = maxExercisesPerSession || 6;
  const userAge = age || 30;
  const userSex = (sex || "male").toLowerCase();

  // --- Age-based recovery adjustment ---
  // Older trainees need slightly less volume, more recovery
  const ageFactor = userAge < 25 ? 1.05 : userAge < 35 ? 1.0 : userAge < 45 ? 0.92 : userAge < 55 ? 0.85 : 0.78;

  // --- Sex-based volume adjustment ---
  // Women generally tolerate higher relative volume with better recovery
  const sexFactor = userSex === "female" ? 1.05 : 1.0;

  // --- Select best split ---
  const split = selectBestSplit({
    daysPerWeek: dpw,
    goal: normalizedGoal,
    experienceLevel: normExp,
    weekCount: wc,
  });

  // --- Generate phases ---
  const phases = generatePhases(wc);

  // --- Volume targets with experience + focus + age/sex adjustments ---
  const rawVolume = computeVolumeTargets(normalizedGoal, normExp, normFocus);
  const volumeTargets = {};
  for (const [muscle, sets] of Object.entries(rawVolume)) {
    volumeTargets[muscle] = Math.round(sets * ageFactor * sexFactor);
  }

  // --- Build sessions for each phase ---
  const phaseBlocks = phases.map((phase) => {
    const dayAllocations = distributeVolume(volumeTargets, split.sessions, phase.volumeMultiplier);

    const sessions = split.sessions.map((session, idx) => {
      if (!session.muscles || session.muscles.length === 0) {
        return { ...session, exercises: [], estimated_duration_min: 0 };
      }
      const alloc = dayAllocations[idx];
      let exercises = [];
      for (const muscle of session.muscles) {
        const targetSets = alloc[muscle] || 0;
        if (targetSets > 0) {
          exercises = exercises.concat(
            pickExercises(muscle, targetSets, phase.type, normInjuries, normEquipment)
          );
        }
      }

      // Exercise count limiting: respect user's maxExercisesPerSession
      if (exercises.length > maxExPerSession) {
        // Keep compounds first, then top isolation by sets
        const compounds = exercises.filter(e => e.compound);
        const isolations = exercises.filter(e => !e.compound);
        const kept = compounds.slice(0, maxExPerSession);
        const remaining = maxExPerSession - kept.length;
        if (remaining > 0) {
          // Pick isolations with highest sets (most volume)
          isolations.sort((a, b) => b.sets - a.sets);
          kept.push(...isolations.slice(0, remaining));
        }
        // Redistribute lost volume into remaining exercises
        const lostSets = exercises.reduce((s, e) => s + e.sets, 0) - kept.reduce((s, e) => s + e.sets, 0);
        if (lostSets > 0 && kept.length > 0) {
          const extraPerEx = Math.ceil(lostSets / kept.length);
          for (let i = 0; i < Math.min(lostSets, kept.length); i++) {
            kept[i] = { ...kept[i], sets: kept[i].sets + 1 };
          }
        }
        exercises = kept;
      }

      // Duration trimming: if a target session duration is set, trim isolation exercises
      const dur = estimateDuration(exercises);
      const maxDur = sessionDurationTarget || 90;
      if (dur > maxDur && exercises.length > 2) {
        let trimmed = [...exercises];
        while (estimateDuration(trimmed) > maxDur && trimmed.length > 2) {
          const lastIso = trimmed.findLastIndex((e) => !e.compound);
          if (lastIso === -1) break;
          trimmed.splice(lastIso, 1);
        }
        exercises = trimmed;
      }

      return {
        ...session,
        exercises,
        estimated_duration_min: estimateDuration(exercises),
      };
    });

    return {
      name: phase.name,
      type: phase.type,
      weeks: phase.weeks,
      volumeMultiplier: phase.volumeMultiplier,
      sessions,
    };
  });

  // --- Build the flat "days" view (first accumulation phase as default) ---
  const defaultPhase = phaseBlocks.find((p) => p.type === "accumulation") || phaseBlocks[0];
  const days = defaultPhase.sessions.map((session, idx) => ({
    dayOfWeek: idx + 1,
    label: session.label,
    title: session.title,
    subtitle: session.subtitle,
    muscles: session.muscles,
    exercises: session.exercises,
    estimated_duration_min: session.estimated_duration_min,
  }));

  return {
    id: uuid(),
    version: 2,
    goal: normalizedGoal,
    split: split.name,
    splitId: split.id,
    splitScore: split.score,
    daysPerWeek: split.daysPerWeek,
    experienceLevel: normExp,
    bodyWeight: bodyWeight || null,
    bodyFat: bodyFat || null,
    age: userAge,
    sex: userSex,
    heightInches: heightInches || null,
    maxExercisesPerSession: maxExPerSession,
    injuries: normInjuries,
    equipment: normEquipment,
    focusMuscles: normFocus,
    weekCount: wc,
    startDate: new Date().toISOString().slice(0, 10),
    currentWeek: 1,
    currentPhase: 0,
    phases,
    phaseBlocks,
    volumeTargets,
    days,
  };
}

// ===========================================================================
// 12. AUTO-CALENDAR SCHEDULING — generateSchedule
// ===========================================================================

/**
 * Map training sessions onto calendar dates.
 *
 * @param {Object}   program         - Output of generateProgram
 * @param {string}   startDate       - YYYY-MM-DD
 * @param {number[]} preferredDays   - Array of JS day-of-week numbers (0=Sun..6=Sat)
 *                                     e.g. [1,3,5] for Mon/Wed/Fri
 * @returns {Object[]} Array of schedule entries (rest days are omitted)
 */
export function generateSchedule(program, startDate, preferredDays) {
  const schedule = [];
  const start = parseDate(startDate);
  const phases = program.phases || [];
  const phaseBlocks = program.phaseBlocks || [];
  const sessionsPerWeek = program.daysPerWeek;
  const totalWeeks = program.weekCount === "ongoing" ? 52 : Number(program.weekCount) || 8;

  // Determine which calendar days of the week to use
  let calendarDays = preferredDays && preferredDays.length >= sessionsPerWeek
    ? preferredDays.slice(0, sessionsPerWeek)
    : autoSpaceDays(sessionsPerWeek);

  // Sort them so the week proceeds in order
  calendarDays = [...calendarDays].sort((a, b) => a - b);

  for (let week = 1; week <= totalWeeks; week++) {
    // Determine phase for this week
    const phase = getPhaseForWeek(phases, resolveOngoingWeek(week, phases));
    const phaseBlock = phaseBlocks.find(
      (pb) => pb.type === phase.type && pb.weeks.includes(resolveOngoingWeek(week, phases))
    ) || phaseBlocks[0];

    const sessions = phaseBlock ? phaseBlock.sessions : program.days;

    for (let s = 0; s < sessionsPerWeek && s < sessions.length; s++) {
      const session = sessions[s];
      const date = getDateForWeekDay(start, week, calendarDays[s]);

      schedule.push({
        id: uuid(),
        plan_id: program.id,
        date: formatDate(date),
        session_type: session.title || session.label,
        session_label: session.label,
        phase: phase.name,
        phase_type: phase.type,
        week_number: week,
        exercises_json: session.exercises || [],
        estimated_duration_min: session.estimated_duration_min || estimateDuration(session.exercises || []),
        status: "scheduled",
      });
    }
  }

  return schedule;
}

/**
 * For "ongoing" programs, map absolute week number into the 4-week cycle.
 */
function resolveOngoingWeek(absoluteWeek, phases) {
  const maxWeek = Math.max(...phases.flatMap((p) => p.weeks));
  if (absoluteWeek <= maxWeek) return absoluteWeek;
  return ((absoluteWeek - 1) % maxWeek) + 1;
}

/**
 * Automatically space N training days across the week with recovery gaps.
 * Returns array of JS day-of-week numbers (0=Sun..6=Sat).
 */
function autoSpaceDays(count) {
  const patterns = {
    2: [1, 4],           // Mon, Thu
    3: [1, 3, 5],        // Mon, Wed, Fri
    4: [1, 2, 4, 5],     // Mon, Tue, Thu, Fri
    5: [1, 2, 3, 5, 6],  // Mon-Wed, Fri-Sat
    6: [1, 2, 3, 4, 5, 6], // Mon-Sat
  };
  return patterns[count] || patterns[4];
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get the calendar Date for a given week number and day-of-week.
 * Week 1 starts on the week containing startDate.
 */
function getDateForWeekDay(startDate, weekNumber, dayOfWeek) {
  // Find the Monday of the start week
  const startDay = startDate.getDay(); // 0=Sun
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  const startMonday = new Date(startDate);
  startMonday.setDate(startDate.getDate() + mondayOffset);

  // Add (weekNumber - 1) weeks
  const targetMonday = new Date(startMonday);
  targetMonday.setDate(startMonday.getDate() + (weekNumber - 1) * 7);

  // Add dayOfWeek offset (0=Sun, 1=Mon, ..., 6=Sat)
  const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // convert to Mon=0 offset
  const result = new Date(targetMonday);
  result.setDate(targetMonday.getDate() + dayOffset);
  return result;
}

// ===========================================================================
// 13. TARGET CALCULATION — calculateNextTargets (Double Progression)
// ===========================================================================

/**
 * Calculate the next session's target weight and reps for an exercise
 * using the double progression model.
 *
 * @param {Object[]} history - Array of past session records for this exercise,
 *   each: { weight, sets: [{ reps, rir }], repRange: [low, high] }
 *   Sorted newest-first.
 * @param {Object}   options
 * @param {number}   options.weightIncrement - Smallest weight jump (default 2.5)
 * @returns {{ weight: number, targetReps: string, note: string }}
 */
export function calculateNextTargets(history, options = {}) {
  const increment = options.weightIncrement || 2.5;

  if (!history || history.length === 0) {
    return {
      weight: null,
      targetReps: null,
      note: "No history — start with a comfortable working weight.",
    };
  }

  const latest = history[0];
  const { weight, sets, repRange } = latest;
  const [repLow, repHigh] = repRange || [8, 12];

  if (!sets || sets.length === 0) {
    return { weight, targetReps: `${repLow}-${repHigh}`, note: "No set data recorded." };
  }

  const allReps = sets.map((s) => s.reps);
  const allHitTop = allReps.every((r) => r >= repHigh);
  const allHitBottom = allReps.every((r) => r >= repLow);
  const anyBelowBottom = allReps.some((r) => r < repLow);

  // Rule 1: All sets at top of range -> increase weight, reset to bottom
  if (allHitTop) {
    return {
      weight: weight + increment,
      targetReps: `${repLow}-${repHigh}`,
      note: `All sets hit ${repHigh} reps — increase weight to ${weight + increment} and aim for ${repLow} reps.`,
    };
  }

  // Rule 2: All sets at or above bottom -> keep weight, aim for +1 rep
  if (allHitBottom && !allHitTop) {
    const avgReps = Math.round(allReps.reduce((a, b) => a + b, 0) / allReps.length);
    const targetRep = Math.min(avgReps + 1, repHigh);
    return {
      weight,
      targetReps: `${targetRep}`,
      note: `Good progress — keep ${weight} and aim for ${targetRep} reps per set.`,
    };
  }

  // Rule 3: Any set below bottom -> repeat same weight and rep target
  if (anyBelowBottom) {
    const previousTarget = Math.max(repLow, Math.min(...allReps) + 1);
    return {
      weight,
      targetReps: `${repLow}-${repHigh}`,
      note: `Some sets under ${repLow} reps — repeat ${weight} and focus on hitting ${repLow}+ reps on all sets.`,
    };
  }

  // Fallback
  return {
    weight,
    targetReps: `${repLow}-${repHigh}`,
    note: "Continue with current weight.",
  };
}

// ===========================================================================
// Exports
// ===========================================================================
export { FALLBACK_EXERCISES };
