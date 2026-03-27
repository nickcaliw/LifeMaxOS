/**
 * Life Orchestrator Engine
 *
 * Pure logic module that receives context data and returns plan objects.
 * No React, no DOM, no external dependencies.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(n, decimals = 1) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

const MOOD_MAP = {
  tough: 0.2,
  low: 0.4,
  okay: 0.6,
  good: 0.8,
  great: 1.0,
};

const DAY_TYPES = [
  { min: 80, type: "peak" },
  { min: 60, type: "standard" },
  { min: 40, type: "light" },
  { min: 20, type: "recovery" },
  { min: 0, type: "reset" },
];

const TIER_1_KEYWORDS = ["sleep hygiene", "hydration", "strength training", "sleep", "water", "hydrat"];
const TIER_2_KEYWORDS = ["meditation", "deep work", "macro", "reading", "devotion", "creatine", "supplements"];

const SCHEDULE_COLORS = {
  focus: "#5B7CF5",
  workout: "#27ae60",
  meal: "#e67e22",
  recovery: "#9b59b6",
  habit: "#3498db",
  social: "#e74c3c",
};

const COACHING_MESSAGES = {
  peak: "You're primed. Full schedule today \u2014 make it count.",
  standard: "Solid foundation. Follow the plan and trust the process.",
  light: "Lighter day. Focus on what matters most.",
  recovery: "Recovery is part of the plan. Take care of the basics.",
  reset: "Just the essentials today. Rest is productive.",
};

function matchesTier(habitName, keywords) {
  const lower = habitName.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function assignTier(habit) {
  if (matchesTier(habit, TIER_1_KEYWORDS)) return 1;
  if (matchesTier(habit, TIER_2_KEYWORDS)) return 2;
  return 3;
}

/**
 * Parse a "HH:MM" string into total minutes since midnight.
 */
function parseTime(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Convert total minutes since midnight to "H:MM" (24h).
 */
function minutesToTime(totalMinutes) {
  const clamped = clamp(totalMinutes, 0, 24 * 60 - 1);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function getDayTypeForScore(score) {
  for (const { min, type } of DAY_TYPES) {
    if (score >= min) return type;
  }
  return "reset";
}

// ---------------------------------------------------------------------------
// 1. evaluateReadiness
// ---------------------------------------------------------------------------

export function evaluateReadiness(context) {
  const {
    sleep = {},
    mood = null,
    energy = null,
    stressLevel = null,
    yesterdayHabitPct = null,
    yesterdayScore = null,
  } = context || {};

  // Sleep (30%)
  const hours = sleep?.hours ?? null;
  const sleepScore = hours !== null ? clamp(hours / 8, 0, 1.2) * 30 : 0.6 * 30; // default mid if unknown

  // Recovery (25%)
  const moodVal = mood ? (MOOD_MAP[mood.toLowerCase()] ?? 0.6) : 0.6;
  const stressVal = stressLevel !== null ? (6 - stressLevel) / 5 : 0.5;
  const recoveryScore = ((moodVal + stressVal) / 2) * 25;

  // Energy (20%)
  const energyScore = ((energy || 3) / 5) * 20;

  // Momentum (15%)
  const momentumScore = (yesterdayHabitPct !== null ? yesterdayHabitPct : 0.5) * 15;

  // Load (10%)
  const loadScore = ((yesterdayScore !== null ? yesterdayScore : 50) / 100) * 10;

  const raw = sleepScore + recoveryScore + energyScore + momentumScore + loadScore;
  const score = clamp(Math.round(raw), 0, 100);
  const dayType = getDayTypeForScore(score);

  const levelMap = {
    peak: "Peak Performance",
    standard: "Standard",
    light: "Light",
    recovery: "Recovery",
    reset: "Reset",
  };

  return {
    score,
    level: levelMap[dayType],
    dayType,
  };
}

// ---------------------------------------------------------------------------
// 2. filterHabits
// ---------------------------------------------------------------------------

export function filterHabits(habits, dayType) {
  if (!habits || habits.length === 0) return [];

  const tier1 = habits.filter((h) => assignTier(h) === 1);
  const tier2 = habits.filter((h) => assignTier(h) === 2);
  const tier3 = habits.filter((h) => assignTier(h) === 3);

  switch (dayType) {
    case "peak":
      return [...tier1, ...tier2, ...tier3];
    case "standard":
      return [...tier1, ...tier2];
    case "light":
      return [...tier1, ...tier2.slice(0, 2)];
    case "recovery":
      return [...tier1];
    case "reset":
      return tier1.slice(0, 3);
    default:
      return [...tier1, ...tier2];
  }
}

// ---------------------------------------------------------------------------
// 3. scorePriorities
// ---------------------------------------------------------------------------

export function scorePriorities(items) {
  if (!items || items.length === 0) return [];

  const now = Date.now();

  const scored = items.map((item) => {
    let score = 0;

    // Critical flag: big boost
    if (item.critical) score += 50;

    // Missed yesterday: strong signal
    if (item.missedYesterday) score += 30;

    // Streak at risk
    if (item.streakAtRisk) score += 20;

    // Goal connected
    if (item.goalId) score += 15;

    // Deadline urgency
    if (item.deadline) {
      const deadlineMs = new Date(item.deadline).getTime();
      const daysUntil = (deadlineMs - now) / (1000 * 60 * 60 * 24);
      if (daysUntil <= 0) {
        score += 40; // overdue
      } else if (daysUntil <= 1) {
        score += 35;
      } else if (daysUntil <= 3) {
        score += 25;
      } else if (daysUntil <= 7) {
        score += 15;
      } else {
        score += 5;
      }
    }

    return { ...item, priorityScore: score };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);
  return scored;
}

// ---------------------------------------------------------------------------
// 4. evaluateCrossSignals
// ---------------------------------------------------------------------------

export function evaluateCrossSignals(context) {
  const alerts = [];
  const {
    sleep = {},
    mood = null,
    energy = null,
    stressLevel = null,
    bodyStats = {},
    budget = {},
    social = {},
    goals = {},
    habits = {},
    journalDaysSince = null,
    workouts = {},
  } = context || {};

  const hours = sleep?.hours ?? null;

  // Sleep -> Workout signal
  if (hours !== null && hours < 5) {
    alerts.push({
      type: "sleep-workout",
      action: "Scale back workout intensity or swap for a walk",
      reason: `Only ${hours}h of sleep last night`,
      message: `You slept ${hours} hours. Consider a lighter workout or active recovery instead of full intensity.`,
      priority: "high",
    });
  } else if (hours !== null && hours < 6.5) {
    alerts.push({
      type: "sleep-workout",
      action: "Reduce workout volume",
      reason: `${hours}h of sleep is below optimal`,
      message: `With ${hours}h of sleep, lower your volume today and focus on form over intensity.`,
      priority: "medium",
    });
  }

  // Mood -> Day type signal
  if (mood === "tough" || mood === "low") {
    alerts.push({
      type: "mood-day",
      action: "Switch to a lighter day plan",
      reason: `Mood is ${mood}`,
      message: `Your mood is ${mood} today. Consider reducing commitments and adding something you enjoy.`,
      priority: mood === "tough" ? "high" : "medium",
    });
  }

  // Budget signal
  if (budget && budget.percentUsed !== undefined && budget.daysRemaining !== undefined) {
    const expectedPct = 1 - budget.daysRemaining / 30;
    if (budget.percentUsed > expectedPct + 0.15) {
      alerts.push({
        type: "budget-warning",
        action: "Review spending and cut discretionary purchases",
        reason: `${Math.round(budget.percentUsed * 100)}% of budget used with ${budget.daysRemaining} days left`,
        message: `You've used ${Math.round(budget.percentUsed * 100)}% of your budget with ${budget.daysRemaining} days remaining. ${budget.topCategory ? `Top spend: ${budget.topCategory}.` : ""} Time to tighten up.`,
        priority: budget.percentUsed > 0.9 ? "high" : "medium",
      });
    }
  }

  // Social signal
  if (social && social.overdueContacts && social.overdueContacts.length > 0) {
    const top = social.overdueContacts.slice(0, 3);
    const names = top.map((c) => c.name).join(", ");
    const maxDays = Math.max(...top.map((c) => c.daysSince));
    alerts.push({
      type: "social-overdue",
      action: `Reach out to ${top[0].name}`,
      reason: `${top.length} contact${top.length > 1 ? "s" : ""} overdue (up to ${maxDays} days)`,
      message: `Time to reconnect: ${names}. Maintaining relationships is part of the plan.`,
      priority: maxDays > 30 ? "high" : "medium",
    });
  }

  // Weight trend signal
  if (bodyStats && bodyStats.weightTrend && bodyStats.goal) {
    const { weightTrend, goal } = bodyStats;
    const goalLower = goal.toLowerCase();
    const misaligned =
      (goalLower.includes("lose") && weightTrend === "up") ||
      (goalLower.includes("gain") && weightTrend === "down");
    if (misaligned) {
      alerts.push({
        type: "weight-trend",
        action: "Review nutrition and training alignment",
        reason: `Weight trending ${weightTrend} but goal is "${goal}"`,
        message: `Your weight is trending ${weightTrend}, which doesn't align with your goal to ${goal}. Review your nutrition plan.`,
        priority: "medium",
      });
    }
  }

  // Goals approaching deadline
  if (goals && goals.approaching && goals.approaching.length > 0) {
    for (const g of goals.approaching) {
      if (g.daysLeft <= 3) {
        alerts.push({
          type: "goal-deadline",
          action: `Prioritize "${g.name}" today`,
          reason: `${g.daysLeft} day${g.daysLeft !== 1 ? "s" : ""} until deadline`,
          message: `Goal "${g.name}" is due in ${g.daysLeft} day${g.daysLeft !== 1 ? "s" : ""}. Make it a top priority.`,
          priority: "high",
        });
      } else if (g.daysLeft <= 7) {
        alerts.push({
          type: "goal-deadline",
          action: `Schedule time for "${g.name}"`,
          reason: `${g.daysLeft} days until deadline`,
          message: `Goal "${g.name}" is due in ${g.daysLeft} days. Keep it on your radar.`,
          priority: "medium",
        });
      }
    }
  }

  // Journal signal
  if (journalDaysSince !== null && journalDaysSince >= 3) {
    alerts.push({
      type: "journal-lapse",
      action: "Write a short journal entry today",
      reason: `${journalDaysSince} days since last journal entry`,
      message: `It's been ${journalDaysSince} days since you last journaled. Even a few sentences helps with clarity and reflection.`,
      priority: journalDaysSince >= 7 ? "high" : "medium",
    });
  }

  // Consistency / habits signal
  if (habits && habits.sevenDayAvg !== undefined) {
    if (habits.sevenDayAvg < 0.4) {
      alerts.push({
        type: "consistency-warning",
        action: "Reduce habit count and focus on core habits only",
        reason: `7-day habit average is ${Math.round(habits.sevenDayAvg * 100)}%`,
        message: `Your habit completion has dropped to ${Math.round(habits.sevenDayAvg * 100)}% this week. Simplify: do fewer things well rather than many things poorly.`,
        priority: "high",
      });
    } else if (habits.sevenDayAvg < 0.6) {
      alerts.push({
        type: "consistency-dip",
        action: "Recommit to your top 3 habits today",
        reason: `7-day habit average is ${Math.round(habits.sevenDayAvg * 100)}%`,
        message: `Habit completion at ${Math.round(habits.sevenDayAvg * 100)}% this week. Pick your 3 most important and nail those.`,
        priority: "medium",
      });
    }
  }

  // Workout missed signal
  if (workouts) {
    const missed = workouts.missedThisWeek || 0;
    const completed = workouts.completedThisWeek || 0;
    if (missed >= 2 && completed < missed) {
      alerts.push({
        type: "workout-consistency",
        action: "Schedule a make-up workout today",
        reason: `${missed} workouts missed this week`,
        message: `You've missed ${missed} workout${missed > 1 ? "s" : ""} this week. Even a quick 20-minute session counts.`,
        priority: missed >= 3 ? "high" : "medium",
      });
    }
  }

  // Stress signal
  if (stressLevel !== null && stressLevel >= 4) {
    alerts.push({
      type: "stress-high",
      action: "Add a decompression block to your schedule",
      reason: `Stress level at ${stressLevel}/5`,
      message: `High stress detected. Build in 15-20 minutes of intentional rest \u2014 a walk, meditation, or breathwork.`,
      priority: stressLevel === 5 ? "high" : "medium",
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// 5. calculateDailyScore
// ---------------------------------------------------------------------------

export function calculateDailyScore(dayData) {
  const {
    habitsCompleted = 0,
    habitsTotal = 1,
    focusMinutes = 0,
    prioritiesCompleted = 0,
    workoutCompleted = false,
    isTrainingDay = false,
    sleepHours = 0,
    nutritionLogged = false,
    journalWritten = false,
    readingDone = false,
    spiritualDone = false,
    socialInteraction = false,
    gratitudeWritten = false,
  } = dayData || {};

  const breakdown = [];
  const gains = [];
  const gaps = [];

  // --- Habits (30 pts) ---
  const total = Math.max(habitsTotal, 1);
  const habitPts = round((habitsCompleted / total) * 30);
  breakdown.push({ label: "Habits", earned: habitPts, max: 30 });
  if (habitPts >= 25) gains.push(`${habitsCompleted}/${habitsTotal} habits completed`);
  else if (habitPts < 15) gaps.push(`Only ${habitsCompleted}/${habitsTotal} habits done`);

  // --- Productivity (20 pts) ---
  // Focus time: 0-10, target 120min
  const focusPts = round(clamp(focusMinutes / 120, 0, 1) * 10);
  // Priorities: 0-10, 3.33 each
  const priorityPts = round(clamp(prioritiesCompleted * (10 / 3), 0, 10));
  const prodTotal = round(focusPts + priorityPts);
  breakdown.push({ label: "Productivity", earned: prodTotal, max: 20 });
  if (focusMinutes >= 90) gains.push(`${focusMinutes} minutes of focused work`);
  else if (focusMinutes < 30) gaps.push("Minimal focus time logged");
  if (prioritiesCompleted === 3) gains.push("All 3 top priorities completed");
  else if (prioritiesCompleted === 0) gaps.push("No priorities completed");

  // --- Health (20 pts) ---
  let workoutMax = 8;
  let sleepMax = 6;
  let nutritionMax = 6;

  let workoutPts = 0;
  if (isTrainingDay) {
    workoutPts = workoutCompleted ? 8 : 0;
  } else {
    // Redistribute workout points across sleep and nutrition
    workoutMax = 0;
    sleepMax = 10;
    nutritionMax = 10;
  }

  const sleepPts = round(clamp(sleepHours / 8, 0, 1) * sleepMax);
  const nutritionPts = nutritionLogged ? nutritionMax : 0;
  const healthTotal = round(workoutPts + sleepPts + nutritionPts);
  breakdown.push({ label: "Health", earned: healthTotal, max: 20 });
  if (workoutCompleted && isTrainingDay) gains.push("Workout completed");
  else if (isTrainingDay && !workoutCompleted) gaps.push("Missed scheduled workout");
  if (sleepHours >= 7) gains.push(`${sleepHours}h of sleep`);
  else if (sleepHours < 6) gaps.push(`Only ${sleepHours}h of sleep`);
  if (nutritionLogged) gains.push("Nutrition tracked");
  else gaps.push("Nutrition not logged");

  // --- Growth (15 pts) ---
  const journalPts = journalWritten ? 5 : 0;
  const readingPts = readingDone ? 5 : 0;
  const spiritualPts = spiritualDone ? 5 : 0;
  const growthTotal = journalPts + readingPts + spiritualPts;
  breakdown.push({ label: "Growth", earned: growthTotal, max: 15 });
  if (journalWritten) gains.push("Journal entry written");
  else gaps.push("No journal entry");
  if (readingDone) gains.push("Reading completed");
  else gaps.push("No reading done");
  if (spiritualDone) gains.push("Spiritual practice done");
  else gaps.push("Spiritual practice skipped");

  // --- Connection (15 pts) ---
  const socialPts = socialInteraction ? 8 : 0;
  const gratitudePts = gratitudeWritten ? 7 : 0;
  const connectionTotal = socialPts + gratitudePts;
  breakdown.push({ label: "Connection", earned: connectionTotal, max: 15 });
  if (socialInteraction) gains.push("Social connection made");
  else gaps.push("No social interaction");
  if (gratitudeWritten) gains.push("Gratitude logged");
  else gaps.push("Gratitude not logged");

  const score = clamp(
    Math.round(habitPts + prodTotal + healthTotal + growthTotal + connectionTotal),
    0,
    100
  );

  return {
    score,
    breakdown,
    explanation: { gains, gaps },
  };
}

// ---------------------------------------------------------------------------
// 6. generateDailyPlan
// ---------------------------------------------------------------------------

export function generateDailyPlan(context) {
  const {
    todayStr = new Date().toISOString().slice(0, 10),
    wakeTime = "6:30",
    bedTime = "22:00",
    workoutTime = "afternoon",
    workoutSession = null,
    habits: habitList,
    habitsList,
    routines = null,
    activeGoalTasks = [],
    missedTasks = [],
    userName = null,
    sleep,
    mood,
    energy,
    stressLevel,
    yesterdayHabitPct,
    yesterdayScore,
    // cross-signal context
    bodyStats,
    budget,
    social,
    goals,
    journalDaysSince,
    workouts,
  } = context || {};

  // Resolve habit list — accept either `habits` (array) or `habitsList`
  const resolvedHabits = Array.isArray(habitList) ? habitList : Array.isArray(habitsList) ? habitsList : [];

  // Readiness
  const readiness = evaluateReadiness({
    sleep,
    mood,
    energy,
    stressLevel,
    yesterdayHabitPct,
    yesterdayScore,
  });

  // Greeting
  const nowHour = new Date().getHours();
  let timeOfDay;
  if (nowHour < 12) timeOfDay = "morning";
  else if (nowHour < 17) timeOfDay = "afternoon";
  else timeOfDay = "evening";
  const greeting = `Good ${timeOfDay}${userName ? `, ${userName}` : ""}.`;

  // Coaching message
  const coachingMessage = COACHING_MESSAGES[readiness.dayType] || COACHING_MESSAGES.standard;

  // Priorities
  const allTasks = [
    ...missedTasks.map((t) => ({ ...t, missedYesterday: true })),
    ...activeGoalTasks,
  ];
  const scoredPriorities = scorePriorities(allTasks);
  const topPriorities = scoredPriorities.slice(0, 3);

  // Filtered habits
  const filteredHabits = filterHabits(resolvedHabits, readiness.dayType);

  // Cross signals
  const alerts = evaluateCrossSignals({
    sleep,
    mood,
    energy,
    stressLevel,
    yesterdayHabitPct,
    yesterdayScore,
    bodyStats,
    budget,
    social,
    goals,
    habits: context?.habits || { sevenDayAvg: 0.5 },
    journalDaysSince,
    workouts,
  });

  // Schedule building
  const schedule = buildSchedule({
    wakeTime,
    bedTime,
    workoutTime,
    workoutSession,
    topPriorities,
    routines,
    dayType: readiness.dayType,
  });

  // Yesterday explanation
  let yesterdayExplanation = null;
  if (yesterdayScore !== null) {
    if (yesterdayScore >= 80) yesterdayExplanation = "Excellent day yesterday. Keep the momentum.";
    else if (yesterdayScore >= 60) yesterdayExplanation = "Good day yesterday. Room to push a bit more.";
    else if (yesterdayScore >= 40) yesterdayExplanation = "Decent effort yesterday. Let's level up today.";
    else yesterdayExplanation = "Yesterday was tough. Fresh start today.";
  }

  return {
    greeting,
    readiness,
    coachingMessage,
    topPriorities,
    schedule,
    habits: filteredHabits,
    totalHabits: resolvedHabits.length,
    alerts,
    yesterdayScore: yesterdayScore ?? null,
    yesterdayExplanation,
  };
}

/**
 * Internal helper to build a time-blocked schedule.
 */
function buildSchedule({ wakeTime, bedTime, workoutTime, workoutSession, topPriorities, routines, dayType }) {
  const wake = parseTime(wakeTime);
  const bed = parseTime(bedTime);
  const schedule = [];

  function addBlock(startMin, label, type, durationMin, goalConnection, color) {
    schedule.push({
      time: minutesToTime(startMin),
      label,
      type,
      duration: durationMin,
      ...(goalConnection ? { goalConnection } : {}),
      color,
    });
  }

  // --- Morning block: wake -> wake + 2.5h (150 min) ---
  let cursor = wake;

  if (routines?.morning?.length > 0) {
    addBlock(cursor, "Morning Routine", "routine", 30, null, SCHEDULE_COLORS.habit);
    cursor += 30;
  }

  addBlock(cursor, "Spiritual Practice", "spiritual", 20, null, SCHEDULE_COLORS.recovery);
  cursor += 20;

  addBlock(cursor, "Breakfast", "meal", 30, null, SCHEDULE_COLORS.meal);
  cursor += 30;

  addBlock(cursor, "Morning Habits", "habit", 30, null, SCHEDULE_COLORS.habit);
  cursor += 30;

  // Workout in morning slot
  if (workoutTime === "morning" && workoutSession) {
    addBlock(cursor, workoutSession.name || "Workout", "workout", 60, null, SCHEDULE_COLORS.workout);
    cursor += 60;
  }

  // --- Focus block: wake + 2.5h -> wake + 5h (150 min) ---
  const focusStart = wake + 150;
  cursor = focusStart;

  if (dayType !== "reset" && dayType !== "recovery") {
    const p1 = topPriorities[0];
    const focusDuration = dayType === "light" ? 60 : 90;
    addBlock(
      cursor,
      p1 ? `Deep Work: ${p1.title}` : "Deep Work Block",
      "focus",
      focusDuration,
      p1?.goalId || null,
      SCHEDULE_COLORS.focus
    );
    cursor += focusDuration;

    addBlock(cursor, "Break", "break", 15, null, SCHEDULE_COLORS.recovery);
    cursor += 15;

    if (dayType !== "light") {
      const p2 = topPriorities[1];
      addBlock(
        cursor,
        p2 ? `Focus: ${p2.title}` : "Focus Block",
        "focus",
        60,
        p2?.goalId || null,
        SCHEDULE_COLORS.focus
      );
      cursor += 60;
    }
  }

  // --- Midday: wake + 5h -> wake + 7h (120 min) ---
  const middayStart = wake + 300;
  cursor = middayStart;

  addBlock(cursor, "Lunch", "meal", 30, null, SCHEDULE_COLORS.meal);
  cursor += 30;

  addBlock(cursor, "Light Habits / Admin", "habit", 30, null, SCHEDULE_COLORS.habit);
  cursor += 30;

  addBlock(cursor, "Social / Connection", "social", 30, null, SCHEDULE_COLORS.social);
  cursor += 30;

  // --- Afternoon: wake + 7h -> wake + 10h (180 min) ---
  const afternoonStart = wake + 420;
  cursor = afternoonStart;

  if (workoutTime === "afternoon" && workoutSession) {
    addBlock(cursor, workoutSession.name || "Workout", "workout", 60, null, SCHEDULE_COLORS.workout);
    cursor += 60;
    addBlock(cursor, "Post-Workout Recovery", "recovery", 20, null, SCHEDULE_COLORS.recovery);
    cursor += 20;
  } else {
    const p3 = topPriorities[2];
    if (p3 && dayType !== "reset" && dayType !== "recovery") {
      addBlock(
        cursor,
        `Work: ${p3.title}`,
        "focus",
        60,
        p3?.goalId || null,
        SCHEDULE_COLORS.focus
      );
      cursor += 60;
    }
    addBlock(cursor, "Tasks & Projects", "focus", 60, null, SCHEDULE_COLORS.focus);
    cursor += 60;
  }

  // Evening workout
  if (workoutTime === "evening" && workoutSession) {
    addBlock(cursor, workoutSession.name || "Workout", "workout", 60, null, SCHEDULE_COLORS.workout);
    cursor += 60;
  }

  // --- Evening: wake + 10h -> bedtime ---
  const eveningStart = wake + 600;
  cursor = eveningStart;

  addBlock(cursor, "Dinner", "meal", 45, null, SCHEDULE_COLORS.meal);
  cursor += 45;

  addBlock(cursor, "Reading", "growth", 30, null, SCHEDULE_COLORS.habit);
  cursor += 30;

  addBlock(cursor, "Journal & Reflection", "growth", 20, null, SCHEDULE_COLORS.recovery);
  cursor += 20;

  if (routines?.evening?.length > 0) {
    addBlock(cursor, "Evening Routine", "routine", 20, null, SCHEDULE_COLORS.habit);
    cursor += 20;
  }

  addBlock(cursor, "Wind Down", "recovery", 30, null, SCHEDULE_COLORS.recovery);

  // Filter out anything past bedtime
  return schedule.filter((block) => parseTime(block.time) < bed);
}

// ---------------------------------------------------------------------------
// 7. generateWeeklyInsights
// ---------------------------------------------------------------------------

export function generateWeeklyInsights(weekData) {
  const {
    dailyScores = [],
    habitCompletionRate = 0,
    workoutsCompleted = 0,
    workoutsScheduled = 0,
    avgSleep = 0,
    moodTrend = "stable",
    goalsProgressed = 0,
  } = weekData || {};

  const insights = [];
  const wins = [];
  const struggles = [];

  // Week score
  const weekScore =
    dailyScores.length > 0
      ? Math.round(dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length)
      : 0;

  // Score trend
  if (dailyScores.length >= 7) {
    const firstHalf = dailyScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const secondHalf = dailyScores.slice(4).reduce((a, b) => a + b, 0) / 3;
    if (secondHalf > firstHalf + 5) {
      insights.push("Your scores trended upward as the week progressed. Strong finish.");
      wins.push("Improved performance through the week");
    } else if (firstHalf > secondHalf + 5) {
      insights.push("Scores dipped toward the end of the week. Consider front-loading rest.");
      struggles.push("Energy declined through the week");
    } else {
      insights.push("Consistent scoring throughout the week. Steady effort.");
    }
  }

  // Best/worst day
  if (dailyScores.length > 0) {
    const best = Math.max(...dailyScores);
    const worst = Math.min(...dailyScores);
    const bestDay = dailyScores.indexOf(best);
    const worstDay = dailyScores.indexOf(worst);
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (best > 70) wins.push(`Best day: ${dayNames[bestDay] || `Day ${bestDay + 1}`} (${best} pts)`);
    if (worst < 40) struggles.push(`Toughest day: ${dayNames[worstDay] || `Day ${worstDay + 1}`} (${worst} pts)`);
  }

  // Habits
  const habitPct = Math.round(habitCompletionRate * 100);
  if (habitPct >= 80) {
    wins.push(`${habitPct}% habit completion rate`);
    insights.push("Excellent habit consistency this week. Your systems are working.");
  } else if (habitPct >= 60) {
    insights.push(`${habitPct}% habit completion. Good, but there's room to tighten up.`);
  } else {
    struggles.push(`Habit completion at ${habitPct}%`);
    insights.push("Habit completion dropped below 60%. Consider reducing your habit count to focus on essentials.");
  }

  // Workouts
  if (workoutsScheduled > 0) {
    const workoutPct = workoutsCompleted / workoutsScheduled;
    if (workoutPct >= 1) {
      wins.push(`All ${workoutsCompleted} scheduled workouts completed`);
    } else if (workoutPct >= 0.5) {
      insights.push(`${workoutsCompleted}/${workoutsScheduled} workouts completed. Schedule flexibility may help.`);
    } else {
      struggles.push(`Only ${workoutsCompleted}/${workoutsScheduled} workouts completed`);
    }
  }

  // Sleep
  if (avgSleep >= 7.5) {
    wins.push(`Averaging ${round(avgSleep)}h of sleep`);
  } else if (avgSleep >= 6.5) {
    insights.push(`Sleep averaging ${round(avgSleep)}h. Aim for 7.5+ for optimal recovery.`);
  } else if (avgSleep > 0) {
    struggles.push(`Sleep averaging only ${round(avgSleep)}h`);
    insights.push("Sleep is the foundation. Prioritize getting to bed earlier next week.");
  }

  // Mood
  if (moodTrend === "improving") {
    wins.push("Mood trended upward this week");
  } else if (moodTrend === "declining") {
    struggles.push("Mood trended downward");
    insights.push("Mood has been declining. Check sleep, social connection, and stress load.");
  }

  // Goals
  if (goalsProgressed > 0) {
    wins.push(`Made progress on ${goalsProgressed} goal${goalsProgressed > 1 ? "s" : ""}`);
  } else {
    struggles.push("No goal progress recorded this week");
    insights.push("No goals progressed. Block 30 minutes daily for your top goal next week.");
  }

  // Overall
  if (weekScore >= 75) {
    insights.push("Strong week overall. Maintain the standard and keep pushing.");
  } else if (weekScore >= 50) {
    insights.push("Solid week with some gaps. Pick one area to improve next week.");
  } else {
    insights.push("Tough week. Reset, simplify, and focus on the basics next week.");
  }

  return {
    insights,
    wins,
    struggles,
    weekScore,
  };
}
