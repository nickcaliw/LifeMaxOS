import { useState, useEffect, useCallback, useMemo } from "react";
import { ymd, addDays } from "../lib/dates.js";
import { generateDailyPlan, calculateDailyScore } from "../lib/orchestrator.js";

// ---------------------------------------------------------------------------
// APIs — pulled from window so they work inside Electron but gracefully
// degrade to undefined when running in a browser.
// ---------------------------------------------------------------------------

const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;
const sleepApi = typeof window !== "undefined" ? window.sleepApi : null;
const workoutApi = typeof window !== "undefined" ? window.workoutApi : null;
const scheduleApi = typeof window !== "undefined" ? window.scheduleApi : null;
const goalsApi = typeof window !== "undefined" ? window.goalsApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const dailyPlanApi = typeof window !== "undefined" ? window.dailyPlanApi : null;
const bodyApi = typeof window !== "undefined" ? window.bodyApi : null;
const budgetApi = typeof window !== "undefined" ? window.budgetApi : null;
const collectionApi = typeof window !== "undefined" ? window.collectionApi : null;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function calculateHabitPct(entry) {
  if (!entry?.habits || typeof entry.habits !== "object") return null;
  const keys = Object.keys(entry.habits);
  if (keys.length === 0) return null;
  const completed = keys.filter((k) => !!entry.habits[k]).length;
  return completed / keys.length;
}

function countCompletedHabits(entry) {
  if (!entry?.habits || typeof entry.habits !== "object") return 0;
  return Object.values(entry.habits).filter(Boolean).length;
}

function countTotalHabits(entry) {
  if (!entry?.habits || typeof entry.habits !== "object") return 0;
  return Object.keys(entry.habits).length;
}

function getWeightTrend(bodyData) {
  if (!Array.isArray(bodyData) || bodyData.length < 2) return "stable";
  // Sort descending by date, take latest 7 entries
  const sorted = [...bodyData]
    .filter((b) => b?.weight != null)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 7);
  if (sorted.length < 2) return "stable";

  const recentHalf = sorted.slice(0, Math.min(3, sorted.length));
  const olderHalf = sorted.slice(Math.min(3, sorted.length), Math.min(6, sorted.length));
  if (olderHalf.length === 0) return "stable";

  const avgRecent = recentHalf.reduce((s, e) => s + e.weight, 0) / recentHalf.length;
  const avgOlder = olderHalf.reduce((s, e) => s + e.weight, 0) / olderHalf.length;
  const diff = avgRecent - avgOlder;
  if (diff > 0.5) return "up";
  if (diff < -0.5) return "down";
  return "stable";
}

function buildBudgetContext(budget) {
  if (!budget) return null;
  const spent = budget.spent ?? budget.total_spent ?? 0;
  const limit = budget.budget ?? budget.limit ?? budget.total ?? 0;
  if (!limit) return { percentUsed: 0, remaining: 0 };
  return {
    percentUsed: Math.round((spent / limit) * 100),
    remaining: limit - spent,
  };
}

function getOverdueContacts(people) {
  if (!Array.isArray(people)) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = ymd(cutoff);

  return people.filter((p) => {
    if (!p?.last_contact_date) return true; // never contacted
    return p.last_contact_date < cutoffStr;
  });
}

function getApproachingGoals(goals) {
  if (!Array.isArray(goals)) return [];
  const now = new Date();
  const soon = addDays(now, 7);
  const soonStr = ymd(soon);
  const todayStr = ymd(now);

  return goals.filter((g) => {
    if (!g?.deadline) return false;
    return g.deadline >= todayStr && g.deadline <= soonStr;
  });
}

function getJournalDaysSince(entry) {
  if (
    entry?.journal ||
    entry?.journalMood ||
    entry?.journalEnergy ||
    entry?.journalContent
  ) {
    return 0;
  }
  // Without deeper lookback we default to 1 (yesterday had no journal)
  return 1;
}

function getGoalTasks(goals) {
  if (!Array.isArray(goals)) return [];
  return goals
    .flatMap((g) => {
      if (Array.isArray(g?.tasks)) {
        return g.tasks
          .filter((t) => !t.completed)
          .map((t) => ({ ...t, goalName: g.name || g.title }));
      }
      return [];
    })
    .slice(0, 10); // cap so context stays manageable
}

function getMissedTasks(entry, plan) {
  if (!plan?.data?.priorities && !plan?.priorities) return [];
  const priorities = plan?.data?.priorities || plan?.priorities || [];
  return priorities.filter((p) => !p.completed && !p.done);
}

function getHabitsList(entry) {
  if (!entry?.habits || typeof entry.habits !== "object") return [];
  return Object.keys(entry.habits);
}

function countCompletedPriorities(plan) {
  const priorities = plan?.data?.priorities || plan?.priorities || [];
  return priorities.filter((p) => p.completed || p.done).length;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default function useOrchestrator() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dayType, setDayType] = useState("normal");
  const [readiness, setReadiness] = useState({});
  const [score, setScore] = useState(null);
  const [genId, setGenId] = useState(0); // bumped by refresh()

  const refresh = useCallback(() => setGenId((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const today = ymd(new Date());
        const yesterday = ymd(addDays(new Date(), -1));
        const currentMonth = today.slice(0, 7); // YYYY-MM

        // -----------------------------------------------------------------
        // 1. Check for existing plan
        // -----------------------------------------------------------------
        let existing = null;
        try {
          existing = await dailyPlanApi?.get(today);
        } catch (_) {
          /* noop */
        }

        if (existing && existing.greeting && genId === 0) {
          // Plan already exists for today — reuse it
          const planData = existing;

          if (!cancelled) {
            setPlan(planData);
            setDayType(existing.day_type || planData?.readiness?.dayType || "normal");
            setReadiness(planData?.readiness || {});
          }

          // Still check yesterday's score
          let yPlan = null;
          try {
            yPlan = await dailyPlanApi?.get(yesterday);
          } catch (_) {
            /* noop */
          }
          if (!cancelled) setScore(yPlan?.score != null ? { score: yPlan.score, breakdown: yPlan.score_breakdown } : null);
          if (!cancelled) setLoading(false);
          return;
        }

        // -----------------------------------------------------------------
        // 2. Gather context in parallel
        // -----------------------------------------------------------------
        const [
          sleepData,
          yesterdayEntry,
          todayEntry,
          scheduledWorkout,
          goals,
          userName,
          yesterdayPlan,
        ] = await Promise.all([
          sleepApi?.get(yesterday).catch(() => null),
          plannerApi?.getDay(yesterday).catch(() => null),
          plannerApi?.getDay(today).catch(() => null),
          scheduleApi?.getDate(today).catch(() => null),
          goalsApi?.list().catch(() => []),
          settingsApi?.get("user_name").catch(() => null),
          dailyPlanApi?.get(yesterday).catch(() => null),
        ]);

        const [budgetData, people, bodyData, wakeTime, bedTime, workoutTime] =
          await Promise.all([
            budgetApi?.get(currentMonth).catch(() => null),
            collectionApi?.list("people").catch(() => []),
            bodyApi?.all().catch(() => []),
            settingsApi?.get("wake_time").catch(() => null),
            settingsApi?.get("bed_time").catch(() => null),
            settingsApi?.get("workout_time").catch(() => null),
          ]);

        if (cancelled) return;

        // -----------------------------------------------------------------
        // 3. Build context
        // -----------------------------------------------------------------
        const context = {
          todayStr: today,
          sleep: { hours: sleepData?.hours || null },
          mood: yesterdayEntry?.journalMood || null,
          energy: yesterdayEntry?.journalEnergy || null,
          stressLevel: null,
          yesterdayHabitPct: calculateHabitPct(yesterdayEntry),
          yesterdayScore: yesterdayPlan?.score || null,

          bodyStats: {
            weightTrend: getWeightTrend(
              Array.isArray(bodyData) ? bodyData : []
            ),
            goal: "maintain",
          },
          budget: buildBudgetContext(budgetData),
          social: { overdueContacts: getOverdueContacts(people) },
          goals: { approaching: getApproachingGoals(goals) },
          habits: { sevenDayAvg: 0.7 },
          journalDaysSince: getJournalDaysSince(yesterdayEntry),
          workouts: { missedThisWeek: 0, completedThisWeek: 0 },

          wakeTime: wakeTime || "6:30",
          bedTime: bedTime || "22:00",
          workoutTime: workoutTime || "afternoon",
          workoutSession: scheduledWorkout,
          habitsList: getHabitsList(todayEntry || yesterdayEntry),  // habit names array
          routines: null,
          activeGoalTasks: getGoalTasks(goals),
          missedTasks: getMissedTasks(yesterdayEntry, yesterdayPlan),
          userName: userName || null,
        };

        // -----------------------------------------------------------------
        // 4. Generate plan
        // -----------------------------------------------------------------
        const generatedPlan = generateDailyPlan(context);

        if (cancelled) return;

        setPlan(generatedPlan);
        setDayType(generatedPlan?.readiness?.dayType || "normal");
        setReadiness(generatedPlan?.readiness || {});

        // Save to database
        try {
          await dailyPlanApi?.save(
            today,
            generatedPlan,
            generatedPlan?.readiness?.score ?? null,
            generatedPlan?.readiness?.dayType ?? "normal",
            null,
            null
          );
        } catch (e) {
          console.warn("[useOrchestrator] Failed to save daily plan:", e);
        }

        // -----------------------------------------------------------------
        // 5. Score yesterday if needed
        // -----------------------------------------------------------------
        if (yesterdayPlan && yesterdayPlan.score == null) {
          try {
            let yesterdayWorkout = null;
            try {
              yesterdayWorkout = await workoutApi?.get(yesterday);
            } catch (_) {
              /* noop */
            }

            const scoreResult = calculateDailyScore({
              habitsCompleted: countCompletedHabits(yesterdayEntry),
              habitsTotal: countTotalHabits(yesterdayEntry),
              focusMinutes: 0,
              prioritiesCompleted: countCompletedPriorities(yesterdayPlan),
              workoutCompleted: !!yesterdayWorkout?.completed,
              isTrainingDay: !!yesterdayPlan?.workoutSession,
              sleepHours: sleepData?.hours || 7,
              nutritionLogged: !!(
                yesterdayEntry?.nutrition?.calories
              ),
              journalWritten: !!(
                yesterdayEntry?.journal || yesterdayEntry?.journalMood
              ),
              readingDone: false,
              spiritualDone: false,
              socialInteraction: false,
              gratitudeWritten: !!yesterdayEntry?.grateful,
            });

            if (!cancelled) {
              setScore(scoreResult);
            }

            await dailyPlanApi?.save(
              yesterday,
              yesterdayPlan,
              yesterdayPlan.readiness_score,
              yesterdayPlan.day_type,
              scoreResult.score,
              scoreResult.breakdown
            );
          } catch (e) {
            console.warn(
              "[useOrchestrator] Failed to score yesterday:",
              e
            );
          }
        } else if (yesterdayPlan?.score != null) {
          if (!cancelled)
            setScore({
              score: yesterdayPlan.score,
              breakdown: yesterdayPlan.score_breakdown,
            });
        }
      } catch (err) {
        console.error("[useOrchestrator] Error generating plan:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [genId]);

  return useMemo(
    () => ({ plan, loading, dayType, readiness, score, refresh }),
    [plan, loading, dayType, readiness, score, refresh]
  );
}
