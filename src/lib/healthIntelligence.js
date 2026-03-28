/**
 * Health Intelligence Engine
 *
 * Pure logic module for readiness scoring, health recommendations,
 * trend alerts, workout adaptation, and daily briefing generation.
 *
 * All functions are pure — no side effects, no DOM, no React.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const MOOD_MAP = {
  great: 1.0,
  good: 0.8,
  okay: 0.6,
  low: 0.4,
  tough: 0.2,
};

const MOOD_VALUE_MAP = {
  great: 5,
  good: 4,
  okay: 3,
  low: 2,
  tough: 1,
};

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// ---------------------------------------------------------------------------
// 1. calculateReadiness
// ---------------------------------------------------------------------------

export function calculateReadiness(context) {
  const {
    sleep = {},
    wakeVariance = 0,
    mood = 'okay',
    energy = 3,
    recentWorkload = 0,
    maxRecoverableVolume = 150,
    avgSoreness = 1,
    completedLast7 = 0,
    scheduledLast7 = 0,
  } = context;

  const hours = sleep.hours ?? 7;
  const quality = sleep.quality ?? 3;
  const baselineHours = sleep.baselineHours ?? 7.5;

  // Component scores
  const sleepScore = clamp(hours / baselineHours, 0, 1.2) * 30;
  const sleepConsistency = clamp(1 - Math.abs(wakeVariance) / 60, 0, 1) * 10;
  const moodScore = (MOOD_MAP[mood] ?? 0.6) * 15;
  const energyScore = ((energy || 3) / 5) * 15;
  const workloadScore =
    (1 - clamp(recentWorkload / maxRecoverableVolume, 0, 1)) * 15;
  const sorenessScore = (1 - (clamp(avgSoreness, 1, 5) - 1) / 4) * 10;
  const consistencyScore =
    clamp(completedLast7 / Math.max(scheduledLast7, 1), 0, 1) * 5;

  const components = {
    sleep: round2(sleepScore),
    sleepConsistency: round2(sleepConsistency),
    mood: round2(moodScore),
    energy: round2(energyScore),
    workload: round2(workloadScore),
    soreness: round2(sorenessScore),
    consistency: round2(consistencyScore),
  };

  const total = round2(
    sleepScore +
      sleepConsistency +
      moodScore +
      energyScore +
      workloadScore +
      sorenessScore +
      consistencyScore
  );

  const score = clamp(Math.round(total), 0, 100);

  let category;
  if (score >= 80) category = 'peak';
  else if (score >= 65) category = 'good';
  else if (score >= 50) category = 'moderate';
  else if (score >= 35) category = 'low';
  else category = 'very_low';

  const explanation = buildExplanation(category, components);

  return { score, category, explanation, components };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function buildExplanation(category, components) {
  // Max possible per component
  const maxScores = {
    sleep: 30,
    sleepConsistency: 10,
    mood: 15,
    energy: 15,
    workload: 15,
    soreness: 10,
    consistency: 5,
  };

  const labels = {
    sleep: 'Sleep',
    sleepConsistency: 'Sleep consistency',
    mood: 'Mood',
    energy: 'Energy',
    workload: 'Training load',
    soreness: 'Soreness',
    consistency: 'Consistency',
  };

  // Compute ratio of actual / max for each component
  const ratios = Object.keys(maxScores).map((key) => ({
    key,
    label: labels[key],
    ratio: components[key] / maxScores[key],
    actual: components[key],
    max: maxScores[key],
  }));

  // Sort ascending to find drags, descending to find positives
  const sorted = [...ratios].sort((a, b) => a.ratio - b.ratio);
  const drags = sorted.filter((r) => r.ratio < 0.65).slice(0, 2);
  const positives = [...ratios]
    .sort((a, b) => b.ratio - a.ratio)
    .filter((r) => r.ratio >= 0.7)
    .slice(0, 1);

  const categoryLabels = {
    peak: 'Recovery is excellent',
    good: 'Recovery is good',
    moderate: 'Recovery is moderate',
    low: 'Recovery is low',
    very_low: 'Recovery is very low',
  };

  let sentence = categoryLabels[category] + '.';

  if (drags.length > 0) {
    const dragNames = drags.map((d) => d.label.toLowerCase());
    if (drags.length === 1) {
      sentence += ` ${drags[0].label} was below target`;
    } else {
      sentence += ` ${drags[0].label} was below target and ${dragNames[1]} is elevated`;
    }
  }

  if (positives.length > 0 && drags.length > 0) {
    sentence += `, but ${positives[0].label.toLowerCase()} is solid.`;
  } else if (positives.length > 0) {
    sentence += ` ${positives[0].label} is solid.`;
  } else if (drags.length > 0) {
    sentence += '.';
  }

  return sentence;
}

// ---------------------------------------------------------------------------
// 2. generateHealthRecommendations
// ---------------------------------------------------------------------------

export function generateHealthRecommendations(context) {
  const {
    sleep = {},
    readinessScore = 50,
    readinessCategory = 'moderate',
    hasWorkoutToday = false,
    avgSoreness = 1,
    proteinAvg3d = 0,
    proteinTarget = 150,
    calorieAvg3d = 0,
    calorieTarget = 2000,
    waterYesterday = 0,
    waterGoal = 100,
    supplementAdherence7d = 1,
    weightTrend14d = 0,
    goal = 'maintain',
    consecutiveHardSessions = 0,
    moodValue = 'okay',
    mood = 'okay',
  } = context;

  const hours = sleep.hours ?? 7;
  const effectiveMood = moodValue || mood;
  const results = [];

  // Rule 1: very low sleep
  if (hours < 6) {
    results.push({
      id: uuid(),
      category: 'sleep',
      priority: 'HIGH',
      message: 'Sleep was very low. Consider a lighter day.',
      action: 'reduce_intensity',
    });
  }

  // Rule 2: low readiness + workout today
  if (readinessScore < 50 && hasWorkoutToday) {
    results.push({
      id: uuid(),
      category: 'training',
      priority: 'HIGH',
      message: 'Readiness is low. Reduce workout volume today.',
      action: 'reduce_volume',
    });
  }

  // Rule 3: high soreness
  if (avgSoreness > 3.5) {
    results.push({
      id: uuid(),
      category: 'recovery',
      priority: 'HIGH',
      message: 'Accumulated soreness is high. Lighten the load.',
      action: 'reduce_volume',
    });
  }

  // Rule 4: low protein
  if (proteinAvg3d < proteinTarget * 0.8) {
    results.push({
      id: uuid(),
      category: 'nutrition',
      priority: 'HIGH',
      message: `Protein has been low. Hit ${proteinTarget}g today.`,
      action: 'increase_protein',
    });
  }

  // Rule 5: peak readiness + workout today
  if (readinessScore > 80 && hasWorkoutToday) {
    results.push({
      id: uuid(),
      category: 'training',
      priority: 'LOW',
      message: "You're primed. Push hard today.",
      action: 'increase_intensity',
    });
  }

  // Rule 6: consecutive hard sessions
  if (consecutiveHardSessions >= 5) {
    results.push({
      id: uuid(),
      category: 'training',
      priority: 'MEDIUM',
      message: '5 hard sessions in a row. Hold volume steady.',
      action: 'maintain_volume',
    });
  }

  // Rule 7: very low calories
  if (calorieAvg3d < calorieTarget * 0.7) {
    results.push({
      id: uuid(),
      category: 'nutrition',
      priority: 'MEDIUM',
      message: 'Calories very low. Eat enough to support recovery.',
      action: 'increase_calories',
    });
  }

  // Rule 8: poor hydration
  if (waterYesterday < waterGoal * 0.6) {
    results.push({
      id: uuid(),
      category: 'hydration',
      priority: 'MEDIUM',
      message: 'Hydration was poor yesterday. Drink more today.',
      action: 'increase_water',
    });
  }

  // Rule 9: weight stall on fat loss
  if (
    goal === 'fat_loss' &&
    Math.abs(weightTrend14d) < 0.1
  ) {
    results.push({
      id: uuid(),
      category: 'nutrition',
      priority: 'MEDIUM',
      message: 'Weight loss has stalled. Review calorie target.',
      action: 'review_calories',
    });
  }

  // Rule 10: low mood
  if (effectiveMood === 'tough' || effectiveMood === 'low') {
    results.push({
      id: uuid(),
      category: 'wellness',
      priority: 'MEDIUM',
      message: 'Mood is low. Prioritize sleep and movement.',
      action: 'prioritize_recovery',
    });
  }

  // Rule 11: low supplement adherence
  if (supplementAdherence7d < 0.5) {
    results.push({
      id: uuid(),
      category: 'supplements',
      priority: 'LOW',
      message: 'Supplement adherence is low.',
      action: 'take_supplements',
    });
  }

  // Rule 12: below-target sleep (but not critically low)
  if (hours < 7 && hours >= 6) {
    results.push({
      id: uuid(),
      category: 'sleep',
      priority: 'LOW',
      message: 'Sleep below target. Aim for an earlier bedtime.',
      action: 'improve_sleep',
    });
  }

  // Sort by priority then return top 5
  results.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return results.slice(0, 5);
}

// ---------------------------------------------------------------------------
// 3. evaluateAlerts
// ---------------------------------------------------------------------------

export function evaluateAlerts(context) {
  const {
    sleepAvg5d = 7,
    proteinAvg5d = 150,
    proteinTarget = 150,
    waterAvg5d = 100,
    waterGoal = 100,
    weightTrend14d = 0,
    goal = 'maintain',
    sorenessAvg3d = 1,
    workoutAdherence14d = 1,
    moodAvg7d = 3,
  } = context;

  const alerts = [];

  // Sleep debt
  if (sleepAvg5d < 6.5) {
    alerts.push({
      id: uuid(),
      type: 'sleep_debt',
      priority: 'HIGH',
      message: 'Sleep debt building. Recovery will suffer.',
      action: 'improve_sleep',
      cooldownDays: 3,
    });
  }

  // Protein consistently low
  if (proteinAvg5d < proteinTarget * 0.8) {
    alerts.push({
      id: uuid(),
      type: 'low_protein',
      priority: 'HIGH',
      message: 'Protein consistently low.',
      action: 'increase_protein',
      cooldownDays: 5,
    });
  }

  // Hydration consistently poor
  if (waterAvg5d < waterGoal * 0.6) {
    alerts.push({
      id: uuid(),
      type: 'low_hydration',
      priority: 'MEDIUM',
      message: 'Hydration consistently poor.',
      action: 'increase_water',
      cooldownDays: 3,
    });
  }

  // Weight stalled on fat loss
  if (goal === 'fat_loss' && Math.abs(weightTrend14d) < 0.1) {
    alerts.push({
      id: uuid(),
      type: 'weight_stall',
      priority: 'MEDIUM',
      message: 'Weight loss stalled. Adjust calories.',
      action: 'review_calories',
      cooldownDays: 7,
    });
  }

  // High fatigue accumulation
  if (sorenessAvg3d > 4.0) {
    alerts.push({
      id: uuid(),
      type: 'high_fatigue',
      priority: 'HIGH',
      message: 'High fatigue accumulation.',
      action: 'reduce_volume',
      cooldownDays: 3,
    });
  }

  // Training consistency dropping
  if (workoutAdherence14d < 0.6) {
    alerts.push({
      id: uuid(),
      type: 'low_adherence',
      priority: 'MEDIUM',
      message: 'Training consistency dropping.',
      action: 'review_schedule',
      cooldownDays: 7,
    });
  }

  // Mood trending down
  if (moodAvg7d < 2.5) {
    alerts.push({
      id: uuid(),
      type: 'low_mood',
      priority: 'MEDIUM',
      message: 'Mood trending down. Consider recovery.',
      action: 'prioritize_recovery',
      cooldownDays: 5,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// 4. computeWorkoutAdaptation
// ---------------------------------------------------------------------------

export function computeWorkoutAdaptation(feedback) {
  const {
    pumpAvg = 3,
    sorenessAvg = 2,
    difficultyAvg = 3,
    repsHitTarget = false,
    loadProgressed = false,
    weeksAtCurrentVolume = 0,
  } = feedback;

  // Check fatigue first (highest priority for safety)
  if (sorenessAvg >= 4 || difficultyAvg >= 4) {
    return {
      action: 'remove_set',
      reason: 'Too much fatigue',
      detail:
        sorenessAvg >= 4
          ? `Soreness avg ${sorenessAvg}/5 indicates excessive muscle damage. Drop 1-2 sets.`
          : `Difficulty avg ${difficultyAvg}/5 is too high. Reduce volume to stay productive.`,
    };
  }

  // Poor stimulus for extended period
  if (pumpAvg <= 1 && difficultyAvg <= 2 && weeksAtCurrentVolume >= 2) {
    return {
      action: 'swap_exercise',
      reason: 'Poor stimulus',
      detail:
        'Pump and difficulty have been very low for 2+ weeks. The exercise may not be effective for this muscle group.',
    };
  }

  // Strong stimulus, low fatigue → can add volume
  if (pumpAvg >= 4 && sorenessAvg <= 2 && difficultyAvg <= 2) {
    return {
      action: 'add_set',
      reason: 'Strong stimulus, low fatigue',
      detail:
        'Excellent pump with minimal soreness and low difficulty. You can handle more volume.',
    };
  }

  // Progressive overload opportunity
  if (repsHitTarget && loadProgressed) {
    return {
      action: 'increase_load',
      reason: 'Progressive overload',
      detail:
        'All rep targets hit and load progressed. Increase weight next session.',
    };
  }

  // Productive range — maintain
  if (pumpAvg >= 3 && sorenessAvg <= 3 && difficultyAvg === 3) {
    return {
      action: 'maintain',
      reason: 'Productive range',
      detail:
        'Good stimulus-to-fatigue ratio. Keep current volume and intensity.',
    };
  }

  // Default: maintain
  return {
    action: 'maintain',
    reason: 'No clear signal to change',
    detail:
      'Feedback is mixed. Maintain current programming and reassess next week.',
  };
}

// ---------------------------------------------------------------------------
// 5. generateAutopilotBrief
// ---------------------------------------------------------------------------

export function generateAutopilotBrief(
  readiness,
  recommendations,
  alerts,
  workoutToday
) {
  const byCategory = (cat) =>
    recommendations.filter((r) => r.category === cat);

  // Training brief
  let training;
  if (!workoutToday) {
    training = 'Rest day. Focus on recovery and nutrition.';
  } else if (readiness.category === 'peak') {
    training = 'Push hard today. Readiness is excellent.';
  } else if (readiness.category === 'good') {
    training = 'Solid day for training. Stick to the plan.';
  } else if (readiness.category === 'moderate') {
    training = 'Moderate readiness. Train but consider lighter loads.';
  } else {
    training = 'Readiness is low. Reduce volume or consider resting.';
  }

  // Nutrition brief
  const nutritionRecs = byCategory('nutrition');
  let nutrition;
  if (nutritionRecs.length === 0) {
    nutrition = 'Nutrition on track. Keep it up.';
  } else {
    nutrition = nutritionRecs.map((r) => r.message).join(' ');
  }

  // Recovery brief
  const recoveryRecs = [
    ...byCategory('recovery'),
    ...byCategory('sleep'),
    ...byCategory('wellness'),
  ];
  let recovery;
  if (recoveryRecs.length === 0) {
    recovery = 'Recovery looks good. No action needed.';
  } else {
    recovery = recoveryRecs.map((r) => r.message).join(' ');
  }

  // Hydration brief
  const hydrationRecs = byCategory('hydration');
  let hydration;
  if (hydrationRecs.length === 0) {
    hydration = 'Hydration is adequate.';
  } else {
    hydration = hydrationRecs.map((r) => r.message).join(' ');
  }

  // Top alert
  const topAlert = alerts.length > 0 ? alerts[0] : null;

  return {
    readiness: {
      score: readiness.score,
      category: readiness.category,
      explanation: readiness.explanation,
    },
    training,
    nutrition,
    recovery,
    hydration,
    topAlert,
  };
}

// ---------------------------------------------------------------------------
// 6. evaluateNutritionTrends
// ---------------------------------------------------------------------------

export function evaluateNutritionTrends(context) {
  const {
    avgCalories7d = 0,
    targetCalories = 2000,
    avgProtein7d = 0,
    targetProtein = 150,
    weightTrend14d = 0,
    goal = 'maintain',
    energyLevel = 3,
    readinessScore = 50,
  } = context;

  const trends = [];

  // -- Calorie analysis by goal --

  if (goal === 'fat_loss') {
    // Stalled weight loss
    if (Math.abs(weightTrend14d) < 0.1 && avgCalories7d >= targetCalories * 0.9) {
      trends.push({
        type: 'reduce_calories',
        currentValue: Math.round(avgCalories7d),
        recommendedValue: Math.round(avgCalories7d - 125),
        reason:
          'Weight loss has stalled. Reduce daily calories by 100-150 to restart progress.',
      });
    }

    // Losing too fast (more than 1.5 lbs/week)
    if (weightTrend14d < -1.5) {
      trends.push({
        type: 'increase_calories',
        currentValue: Math.round(avgCalories7d),
        recommendedValue: Math.round(avgCalories7d + 100),
        reason:
          'Losing weight too quickly. Increase calories by 100 to preserve muscle.',
      });
    }

    // Calories way too low — risk of muscle loss
    if (avgCalories7d < targetCalories * 0.7) {
      trends.push({
        type: 'increase_calories',
        currentValue: Math.round(avgCalories7d),
        recommendedValue: Math.round(targetCalories * 0.85),
        reason:
          'Calorie intake is very low. Risk of muscle loss and metabolic slowdown.',
      });
    }
  }

  if (goal === 'muscle_gain') {
    // Not gaining
    if (weightTrend14d < 0.1 && avgCalories7d <= targetCalories) {
      trends.push({
        type: 'increase_calories',
        currentValue: Math.round(avgCalories7d),
        recommendedValue: Math.round(avgCalories7d + 150),
        reason:
          'Not gaining weight. Increase daily calories by 100-150 to support muscle growth.',
      });
    }

    // Gaining too fast (likely excess fat)
    if (weightTrend14d > 1.0) {
      trends.push({
        type: 'reduce_calories',
        currentValue: Math.round(avgCalories7d),
        recommendedValue: Math.round(avgCalories7d - 100),
        reason:
          'Gaining weight too quickly. Reduce calories slightly to minimize fat gain.',
      });
    }
  }

  if (goal === 'maintain') {
    // Drifting away from target
    if (Math.abs(avgCalories7d - targetCalories) > targetCalories * 0.15) {
      const direction =
        avgCalories7d > targetCalories ? 'reduce_calories' : 'increase_calories';
      trends.push({
        type: direction,
        currentValue: Math.round(avgCalories7d),
        recommendedValue: Math.round(targetCalories),
        reason: `Calorie intake has drifted from target. Aim for ${Math.round(targetCalories)} daily.`,
      });
    }
  }

  // -- Protein analysis (all goals) --

  if (avgProtein7d < targetProtein * 0.8) {
    trends.push({
      type: 'increase_protein',
      currentValue: Math.round(avgProtein7d),
      recommendedValue: Math.round(targetProtein),
      reason: `Protein averaging ${Math.round(avgProtein7d)}g is below the ${Math.round(targetProtein)}g target. Prioritize protein-rich meals.`,
    });
  }

  // -- Energy / readiness driven suggestions --

  if (energyLevel <= 2 && avgCalories7d < targetCalories * 0.85) {
    trends.push({
      type: 'increase_calories',
      currentValue: Math.round(avgCalories7d),
      recommendedValue: Math.round(targetCalories * 0.95),
      reason:
        'Low energy may be linked to under-eating. Consider increasing intake closer to target.',
    });
  }

  if (readinessScore < 40 && avgProtein7d < targetProtein * 0.9) {
    trends.push({
      type: 'increase_protein',
      currentValue: Math.round(avgProtein7d),
      recommendedValue: Math.round(targetProtein),
      reason:
        'Low readiness combined with suboptimal protein. Adequate protein supports recovery.',
    });
  }

  return trends;
}
