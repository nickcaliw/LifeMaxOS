/**
 * Estimated 1RM using Epley formula
 */
export function calculate1RM(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Parse rep range string like "6-8" into [min, max]
 */
export function parseRepRange(reps) {
  if (!reps) return [8, 12];
  const match = String(reps).match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2])];
  const single = parseInt(reps);
  return isNaN(single) ? [8, 12] : [single, single + 2];
}

/**
 * Get the best working set from a set array (highest weight * reps)
 */
export function getBestWorkingSet(sets) {
  if (!sets || sets.length === 0) return null;
  return sets
    .filter(s => s.setType !== "warmup" && Number(s.weight) > 0 && Number(s.reps) > 0)
    .sort((a, b) => (Number(b.weight) * Number(b.reps)) - (Number(a.weight) * Number(a.reps)))[0] || null;
}

/**
 * Get weight increment based on exercise equipment
 */
function getWeightIncrement(equipment) {
  if (equipment === "dumbbell") return 5;
  if (equipment === "barbell") return 5;
  if (equipment === "cable" || equipment === "machine") return 5;
  return 5;
}

/**
 * Generate progressive overload recommendation
 * @param {object} params - { exerciseId, equipment, previousSets, targetReps, targetRir }
 * @returns {{ type, message, suggestedWeight, suggestedReps, icon }}
 */
export function getOverloadRecommendation({ equipment, previousSets, targetReps, targetRir }) {
  const prev = getBestWorkingSet(previousSets);
  if (!prev) return { type: "baseline", message: "First session — establish baseline", icon: "🆕" };

  const [repMin, repMax] = parseRepRange(targetReps);
  const prevWeight = Number(prev.weight);
  const prevReps = Number(prev.reps);
  const prevRir = prev.rir != null ? Number(prev.rir) : 2;
  const tRir = targetRir != null ? targetRir : 2;

  // Hit top of rep range at target RIR or lower → increase weight
  if (prevReps >= repMax && prevRir <= tRir) {
    const inc = getWeightIncrement(equipment);
    return {
      type: "increase_weight",
      message: `↑ Add ${inc} lbs`,
      suggestedWeight: prevWeight + inc,
      suggestedReps: repMin,
      icon: "⬆️",
    };
  }

  // Within rep range → increase reps
  if (prevReps >= repMin && prevReps < repMax) {
    return {
      type: "increase_reps",
      message: `→ Aim for ${prevReps + 1} reps`,
      suggestedWeight: prevWeight,
      suggestedReps: prevReps + 1,
      icon: "➡️",
    };
  }

  // Below rep range → hold
  if (prevReps < repMin) {
    return {
      type: "hold",
      message: "= Same weight, focus form",
      suggestedWeight: prevWeight,
      suggestedReps: repMin,
      icon: "⏸️",
    };
  }

  return { type: "hold", message: "Maintain current load", suggestedWeight: prevWeight, suggestedReps: prevReps, icon: "⏸️" };
}

/**
 * Detect personal records from current session
 */
export function detectPRs(currentSets, existingPRs) {
  const prs = [];
  for (const set of currentSets) {
    if (set.setType === "warmup" || !Number(set.weight) || !Number(set.reps)) continue;
    const w = Number(set.weight);
    const r = Number(set.reps);
    const e1rm = calculate1RM(w, r);

    const existingWeight = existingPRs?.records?.weight?.value || 0;
    const existingE1rm = existingPRs?.records?.e1rm?.value || 0;
    const existingMaxReps = existingPRs?.records?.maxReps?.value || 0;

    if (w > existingWeight) prs.push({ type: "weight", value: w, reps: r });
    if (e1rm > existingE1rm) prs.push({ type: "e1rm", value: e1rm });
    if (r > existingMaxReps && w >= (existingPRs?.records?.maxReps?.weight || 0)) prs.push({ type: "maxReps", value: r, weight: w });
  }
  return prs;
}

/**
 * Calculate total volume for a workout (sum of weight * reps for working sets)
 */
export function calculateTotalVolume(exercises) {
  let total = 0;
  for (const ex of exercises) {
    for (const set of (ex.sets || [])) {
      if (set.setType === "warmup") continue;
      total += (Number(set.weight) || 0) * (Number(set.reps) || 0);
    }
  }
  return total;
}
