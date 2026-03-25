/**
 * Workout Program Builder
 * Generates a structured training program based on user goals, experience, and constraints.
 */

import { EXERCISES, getExercisesForMuscle, filterExercises } from "./exerciseLibrary.js";

// ---------------------------------------------------------------------------
// Volume targets: weekly sets per muscle group by goal
// ---------------------------------------------------------------------------
const VOLUME_MAP = {
  hypertrophy: { chest: 16, back: 18, quads: 16, hamstrings: 12, glutes: 8, lateral_delts: 18, biceps: 12, triceps: 12, abs: 8, calves: 8 },
  strength:    { chest: 12, back: 14, quads: 12, hamstrings: 10, glutes: 6, lateral_delts: 10, biceps: 8,  triceps: 10, abs: 4, calves: 4 },
  fat_loss:    { chest: 12, back: 14, quads: 12, hamstrings: 10, glutes: 8, lateral_delts: 14, biceps: 10, triceps: 10, abs: 10, calves: 6 },
  recomp:      { chest: 14, back: 16, quads: 14, hamstrings: 11, glutes: 8, lateral_delts: 16, biceps: 10, triceps: 10, abs: 8, calves: 6 },
  athletic:    { chest: 10, back: 12, quads: 12, hamstrings: 12, glutes: 8, lateral_delts: 10, biceps: 6,  triceps: 6,  abs: 8, calves: 6 },
};

const EXPERIENCE_MULT = { beginner: 0.7, intermediate: 1.0, advanced: 1.2 };

// ---------------------------------------------------------------------------
// Rep & RIR ranges per goal
// ---------------------------------------------------------------------------
const REP_RANGES = {
  strength:    [3, 6],
  hypertrophy: [6, 12],
  fat_loss:    [10, 15],
  recomp:      [8, 12],
  athletic:    [6, 10],
};

const RIR_RANGES = {
  strength:    [1, 2],
  hypertrophy: [2, 3],
  fat_loss:    [2, 4],
  recomp:      [2, 3],
  athletic:    [2, 3],
};

// ---------------------------------------------------------------------------
// Rest seconds by goal (compounds get more rest)
// ---------------------------------------------------------------------------
const REST_BY_GOAL = {
  strength:    { compound: 180, isolation: 120 },
  hypertrophy: { compound: 120, isolation: 90 },
  fat_loss:    { compound: 90,  isolation: 60 },
  recomp:      { compound: 120, isolation: 90 },
  athletic:    { compound: 120, isolation: 75 },
};

// ---------------------------------------------------------------------------
// Split definitions
// ---------------------------------------------------------------------------
function getSplit(daysPerWeek) {
  if (daysPerWeek === 3) return {
    name: "Full Body (A/B/C)",
    days: [
      { dayOfWeek: 1, label: "Day 1", title: "Full Body A", subtitle: "Chest & Back Focus", muscles: ["chest", "back", "quads", "lateral_delts", "biceps", "abs"] },
      { dayOfWeek: 2, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
      { dayOfWeek: 3, label: "Day 2", title: "Full Body B", subtitle: "Legs & Shoulders Focus", muscles: ["quads", "hamstrings", "glutes", "lateral_delts", "triceps", "calves"] },
      { dayOfWeek: 4, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
      { dayOfWeek: 5, label: "Day 3", title: "Full Body C", subtitle: "Pull & Arms Focus", muscles: ["back", "chest", "hamstrings", "biceps", "triceps", "abs"] },
      { dayOfWeek: 6, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
      { dayOfWeek: 7, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
    ],
  };

  if (daysPerWeek === 4) return {
    name: "Upper/Lower",
    days: [
      { dayOfWeek: 1, label: "Day 1", title: "Upper A", subtitle: "Chest & Back", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { dayOfWeek: 2, label: "Day 2", title: "Lower A", subtitle: "Quads & Glutes", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { dayOfWeek: 3, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
      { dayOfWeek: 4, label: "Day 3", title: "Upper B", subtitle: "Shoulders & Arms", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { dayOfWeek: 5, label: "Day 4", title: "Lower B", subtitle: "Hamstrings & Posterior", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { dayOfWeek: 6, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
      { dayOfWeek: 7, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
    ],
  };

  if (daysPerWeek === 5) return {
    name: "Upper/Lower/Push/Pull/Legs",
    days: [
      { dayOfWeek: 1, label: "Day 1", title: "Upper", subtitle: "Chest, Back & Arms", muscles: ["chest", "back", "lateral_delts", "biceps", "triceps"] },
      { dayOfWeek: 2, label: "Day 2", title: "Lower", subtitle: "Quads, Hams & Glutes", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { dayOfWeek: 3, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
      { dayOfWeek: 4, label: "Day 3", title: "Push", subtitle: "Chest, Delts & Triceps", muscles: ["chest", "lateral_delts", "triceps"] },
      { dayOfWeek: 5, label: "Day 4", title: "Pull", subtitle: "Back & Biceps", muscles: ["back", "biceps", "abs"] },
      { dayOfWeek: 6, label: "Day 5", title: "Legs", subtitle: "Full Lower Body", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { dayOfWeek: 7, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
    ],
  };

  // 6 days — PPL x2
  return {
    name: "Push/Pull/Legs x2",
    days: [
      { dayOfWeek: 1, label: "Day 1", title: "Push", subtitle: "Chest & Triceps", muscles: ["chest", "lateral_delts", "triceps"] },
      { dayOfWeek: 2, label: "Day 2", title: "Pull", subtitle: "Back & Biceps", muscles: ["back", "biceps", "abs"] },
      { dayOfWeek: 3, label: "Day 3", title: "Legs", subtitle: "Quads & Glutes", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { dayOfWeek: 4, label: "Day 4", title: "Push", subtitle: "Shoulders & Chest", muscles: ["chest", "lateral_delts", "triceps"] },
      { dayOfWeek: 5, label: "Day 5", title: "Pull", subtitle: "Back Thickness & Arms", muscles: ["back", "biceps", "abs"] },
      { dayOfWeek: 6, label: "Day 6", title: "Legs", subtitle: "Hamstrings & Posterior", muscles: ["quads", "hamstrings", "glutes", "calves"] },
      { dayOfWeek: 7, label: "Rest", title: "Rest Day", subtitle: "Recovery", muscles: [] },
    ],
  };
}

// ---------------------------------------------------------------------------
// Phase generation
// ---------------------------------------------------------------------------
function range(start, end) {
  const r = [];
  for (let i = start; i <= end; i++) r.push(i);
  return r;
}

function generatePhases(weekCount) {
  if (weekCount <= 4) {
    return [{ name: "Training Block", weeks: range(1, weekCount), volumeMultiplier: 1.0 }];
  }
  if (weekCount <= 8) {
    return [
      { name: "Accumulation", weeks: range(1, 3), volumeMultiplier: 1.0 },
      { name: "Intensification", weeks: range(4, 6), volumeMultiplier: 1.1 },
      { name: "Peak", weeks: range(7, weekCount - 1), volumeMultiplier: 1.15 },
      { name: "Deload", weeks: [weekCount], volumeMultiplier: 0.6 },
    ];
  }
  // 12 weeks
  return [
    { name: "Accumulation", weeks: range(1, 4), volumeMultiplier: 1.0 },
    { name: "Intensification", weeks: range(5, 8), volumeMultiplier: 1.1 },
    { name: "Peak", weeks: range(9, weekCount - 1), volumeMultiplier: 1.15 },
    { name: "Deload", weeks: [weekCount], volumeMultiplier: 0.6 },
  ];
}

// ---------------------------------------------------------------------------
// Injury-to-body-part mapping for filtering
// ---------------------------------------------------------------------------
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
  const muscleLower = (exercise.muscle || "").toLowerCase();
  for (const injury of injuries) {
    const keywords = INJURY_BODY_PARTS[injury] || [];
    for (const kw of keywords) {
      if (nameLower.includes(kw) || muscleLower.includes(kw)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Exercise picking
// ---------------------------------------------------------------------------

/**
 * Built-in exercise database fallback.
 * Used when exerciseLibrary.js is not available or has no data for a muscle.
 */
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

function getExercisesFor(muscle) {
  // Try exerciseLibrary first, fall back to built-in
  let exercises = [];
  try {
    if (typeof getExercisesForMuscle === "function") {
      exercises = getExercisesForMuscle(muscle);
    }
  } catch (e) { /* ignore */ }
  if (!exercises || exercises.length === 0) {
    exercises = FALLBACK_EXERCISES[muscle] || [];
  }
  return exercises;
}

/**
 * Pick exercises for a muscle group, filling the target set count.
 * Compounds first, then isolation.
 */
function pickExercises(muscle, targetSets, goal, injuries) {
  let pool = getExercisesFor(muscle).filter(ex => isExerciseSafe(ex, injuries));
  if (pool.length === 0) return [];

  const compounds = pool.filter(e => e.compound);
  const isolations = pool.filter(e => !e.compound);

  const [repLow, repHigh] = REP_RANGES[goal] || [6, 12];
  const [rirLow, rirHigh] = RIR_RANGES[goal] || [2, 3];
  const rest = REST_BY_GOAL[goal] || { compound: 120, isolation: 90 };

  const repStr = `${repLow}-${repHigh}`;
  const rir = Math.round((rirLow + rirHigh) / 2);

  const selected = [];
  let remaining = targetSets;

  // Shuffle helper
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Add compounds first
  for (const ex of shuffle(compounds)) {
    if (remaining <= 0) break;
    const sets = Math.min(remaining, goal === "strength" ? 4 : 3);
    selected.push({
      exerciseId: ex.id,
      name: ex.name,
      sets,
      reps: repStr,
      rir,
      restSeconds: rest.compound,
    });
    remaining -= sets;
  }

  // Fill with isolations
  for (const ex of shuffle(isolations)) {
    if (remaining <= 0) break;
    const sets = Math.min(remaining, 3);
    selected.push({
      exerciseId: ex.id,
      name: ex.name,
      sets,
      reps: repStr,
      rir,
      restSeconds: rest.isolation,
    });
    remaining -= sets;
  }

  // If we still have remaining sets, add more sets to existing exercises
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

// ---------------------------------------------------------------------------
// Distribute weekly volume across training days
// ---------------------------------------------------------------------------
function distributeVolume(volumeTargets, splitDays) {
  // Count how many training days each muscle appears in
  const muscleDayCounts = {};
  for (const day of splitDays) {
    for (const muscle of day.muscles || []) {
      muscleDayCounts[muscle] = (muscleDayCounts[muscle] || 0) + 1;
    }
  }

  // For each day, compute per-muscle target sets (weekly / frequency, rounded up)
  return splitDays.map(day => {
    const muscleAlloc = {};
    for (const muscle of day.muscles || []) {
      const weekly = volumeTargets[muscle] || 0;
      const freq = muscleDayCounts[muscle] || 1;
      muscleAlloc[muscle] = Math.ceil(weekly / freq);
    }
    return muscleAlloc;
  });
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------
export function generateProgram({ goal, daysPerWeek, experienceLevel, bodyWeight, bodyFat, injuries, weekCount }) {
  const normalizedGoal = (goal || "hypertrophy").toLowerCase().replace(/\s+/g, "_");
  const normInjuries = (injuries || []).map(i => i.toLowerCase().replace(/\s+/g, "_")).filter(i => i !== "none");
  const mult = EXPERIENCE_MULT[experienceLevel] || 1.0;
  const wc = weekCount || 8;

  // Calculate adjusted volume targets
  const baseVolume = VOLUME_MAP[normalizedGoal] || VOLUME_MAP.hypertrophy;
  const volumeTargets = {};
  for (const [muscle, sets] of Object.entries(baseVolume)) {
    volumeTargets[muscle] = Math.round(sets * mult);
  }

  // Get split
  const split = getSplit(daysPerWeek || 4);

  // Generate phases
  const phases = generatePhases(wc);

  // Distribute volume and pick exercises
  const dayAllocations = distributeVolume(volumeTargets, split.days);

  const days = split.days.map((day, idx) => {
    if (!day.muscles || day.muscles.length === 0) {
      return { ...day, exercises: [] };
    }
    const alloc = dayAllocations[idx];
    let exercises = [];
    for (const muscle of day.muscles) {
      const targetSets = alloc[muscle] || 0;
      if (targetSets > 0) {
        exercises = exercises.concat(pickExercises(muscle, targetSets, normalizedGoal, normInjuries));
      }
    }
    return { ...day, exercises };
  });

  return {
    version: 1,
    goal: normalizedGoal,
    split: split.name,
    daysPerWeek: daysPerWeek || 4,
    experienceLevel: experienceLevel || "intermediate",
    bodyWeight: bodyWeight || null,
    bodyFat: bodyFat || null,
    injuries: normInjuries,
    weekCount: wc,
    startDate: new Date().toISOString().slice(0, 10),
    currentWeek: 1,
    currentPhase: 0,
    phases,
    volumeTargets,
    days,
  };
}
