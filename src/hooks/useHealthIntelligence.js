import { useState, useEffect, useCallback, useMemo } from "react";
import { ymd, addDays } from "../lib/dates.js";
import {
  calculateReadiness,
  generateHealthRecommendations,
  evaluateAlerts,
  generateAutopilotBrief,
} from "../lib/healthIntelligence.js";

const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;
const sleepApi = typeof window !== "undefined" ? window.sleepApi : null;
const workoutApi = typeof window !== "undefined" ? window.workoutApi : null;
const waterApi = typeof window !== "undefined" ? window.waterApi : null;
const bodyApi = typeof window !== "undefined" ? window.bodyApi : null;
const scheduleApi = typeof window !== "undefined" ? window.scheduleApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const healthIntelApi = typeof window !== "undefined" ? window.healthIntelApi : null;

export default function useHealthIntelligence() {
  const [readiness, setReadiness] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [autopilot, setAutopilot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const today = ymd(new Date());
        const yesterday = ymd(addDays(new Date(), -1));

        // Always recalculate from fresh data (don't use stale cache)

        // Gather data in parallel
        const [
          sleepData,
          yesterdayEntry,
          todayEntry,
          waterData,
          scheduledToday,
        ] = await Promise.all([
          sleepApi?.get(yesterday).catch(() => null),
          plannerApi?.getDay(yesterday).catch(() => null),
          plannerApi?.getDay(today).catch(() => null),
          waterApi?.get(yesterday).catch(() => null),
          scheduleApi?.getDate(today).catch(() => null),
        ]);

        // Get trailing data for trends
        const weekAgo = ymd(addDays(new Date(), -7));
        const twoWeeksAgo = ymd(addDays(new Date(), -14));
        const fiveDaysAgo = ymd(addDays(new Date(), -5));

        const [sleepRange, plannerRange, bodyStats] = await Promise.all([
          sleepApi?.range(fiveDaysAgo, yesterday).catch(() => []),
          plannerApi?.getRange(twoWeeksAgo, yesterday).catch(() => {}),
          bodyApi?.all().catch(() => []),
        ]);

        if (cancelled) return;

        // Compute averages
        const sleepHours = sleepData?.hours || null;
        const sleepAvg5d = (sleepRange || []).length > 0
          ? (sleepRange || []).reduce((s, d) => s + (d.hours || 0), 0) / sleepRange.length
          : null;

        // Wake variance
        const wakeTimes = (sleepRange || []).filter(s => s.waketime).map(s => {
          const [h, m] = s.waketime.split(":").map(Number);
          return h * 60 + m;
        });
        const avgWake = wakeTimes.length > 0 ? wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length : 0;
        const wakeVariance = wakeTimes.length > 0
          ? Math.sqrt(wakeTimes.reduce((s, t) => s + (t - avgWake) ** 2, 0) / wakeTimes.length)
          : 0;

        // Mood and energy from yesterday
        const mood = yesterdayEntry?.journalMood || null;
        const energy = yesterdayEntry?.journalEnergy || null;

        // Count habits
        const habitEntries = Object.values(plannerRange || {});
        const proteinValues = habitEntries.map(e => e?.nutrition?.protein || 0).filter(v => v > 0);
        const calorieValues = habitEntries.map(e => e?.nutrition?.calories || 0).filter(v => v > 0);
        const proteinAvg3d = proteinValues.slice(-3).length > 0
          ? proteinValues.slice(-3).reduce((a, b) => a + b, 0) / proteinValues.slice(-3).length : 0;
        const calorieAvg3d = calorieValues.slice(-3).length > 0
          ? calorieValues.slice(-3).reduce((a, b) => a + b, 0) / calorieValues.slice(-3).length : 0;

        // Weight trend
        const recentWeights = (bodyStats || []).filter(b => b.weight).slice(-14);
        let weightTrend14d = 0;
        if (recentWeights.length >= 4) {
          const first = recentWeights.slice(0, Math.ceil(recentWeights.length / 2));
          const second = recentWeights.slice(Math.ceil(recentWeights.length / 2));
          const avgFirst = first.reduce((s, b) => s + Number(b.weight), 0) / first.length;
          const avgSecond = second.reduce((s, b) => s + Number(b.weight), 0) / second.length;
          weightTrend14d = (avgSecond - avgFirst) / (recentWeights.length / 14);
        }

        // Workout adherence + real volume
        let completedLast7 = 0;
        let scheduledLast7 = 0;
        let recentVolume = 0; // total lbs lifted last 7 days
        let workoutDaysLast7 = 0;
        try {
          const logs = await workoutApi?.getRange(weekAgo, yesterday);
          if (logs) {
            const logEntries = Object.values(logs).filter(l => l?.completed);
            completedLast7 = logEntries.length;
            workoutDaysLast7 = logEntries.length;
            for (const log of logEntries) {
              for (const ex of (log.exercises || [])) {
                for (const set of (ex.sets || [])) {
                  const w = Number(set.weight) || 0;
                  const r = Number(set.reps) || 0;
                  if (w > 0 && r > 0) recentVolume += w * r;
                }
              }
            }
          }
          const sched = await scheduleApi?.getRange(weekAgo, yesterday);
          if (sched) scheduledLast7 = (sched || []).length;
        } catch {}

        // Supplement adherence (from settings)
        let supplementAdherence7d = 1;

        // Build readiness context
        const readinessCtx = {
          sleep: { hours: sleepHours || 7, quality: sleepData?.quality || 3, baselineHours: 7.5 },
          wakeVariance,
          mood: mood || "okay",
          energy: energy || 3,
          // Real workload: volume lifted last 7 days vs estimated MRV
          // Estimate MRV as ~5 sessions * 25,000 lbs per session = 125,000 lbs/week
          recentWorkload: recentVolume,
          maxRecoverableVolume: Math.max(recentVolume, 125000),
          avgSoreness: 1,
          completedLast7,
          scheduledLast7: Math.max(scheduledLast7, workoutDaysLast7, 1),
        };

        const readinessResult = calculateReadiness(readinessCtx);
        if (!cancelled) setReadiness(readinessResult);

        // Build recommendations context
        const recsCtx = {
          ...readinessCtx,
          readinessScore: readinessResult.score,
          readinessCategory: readinessResult.category,
          hasWorkoutToday: !!scheduledToday,
          proteinAvg3d,
          proteinTarget: 180,
          calorieAvg3d,
          calorieTarget: 2400,
          waterYesterday: waterData?.glasses || 0,
          waterGoal: waterData?.goal || 8,
          supplementAdherence7d,
          weightTrend14d,
          goal: "maintain",
          consecutiveHardSessions: 0,
          moodValue: mood,
        };

        const recsResult = generateHealthRecommendations(recsCtx);
        if (!cancelled) setRecommendations(recsResult);

        // Alerts
        const alertCtx = {
          sleepAvg5d: sleepAvg5d || 7,
          proteinAvg5d: proteinAvg3d,
          proteinTarget: 180,
          waterAvg5d: waterData?.glasses || 8,
          waterGoal: 8,
          weightFlat14d: Math.abs(weightTrend14d) < 0.3,
          fatLossGoal: false,
          sorenessAvg3d: 1,
          workoutAdherence14d: scheduledLast7 > 0 ? completedLast7 / scheduledLast7 : 1,
          moodAvg7d: energy || 3,
        };

        const alertsResult = evaluateAlerts(alertCtx);
        if (!cancelled) setAlerts(alertsResult);

        // Autopilot
        const brief = generateAutopilotBrief(readinessResult, recsResult, alertsResult, scheduledToday);
        if (!cancelled) setAutopilot(brief);

        // Save to DB
        if (healthIntelApi && !cancelled) {
          await healthIntelApi.saveReadiness(today, readinessResult).catch(() => {});
          await healthIntelApi.saveRecommendations(today, recsResult).catch(() => {});
          for (const a of alertsResult) {
            await healthIntelApi.saveAlert({ ...a, date: today }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("[useHealthIntelligence] Error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  const dismissAlert = useCallback(async (id) => {
    if (healthIntelApi) await healthIntelApi.dismissAlert(id).catch(() => {});
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return useMemo(() => ({
    readiness, recommendations, alerts, autopilot, loading, dismissAlert,
  }), [readiness, recommendations, alerts, autopilot, loading, dismissAlert]);
}
