import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ymd, startOfWeekMonday, addDays } from "../lib/dates.js";
import { HABITS, HOURS, defaultEntry } from "../lib/constants.js";
import { defaultHabits, progressFor, currentStreakEndingOn, bestStreakForHabit } from "../lib/habits.js";
import { useHabits } from "../hooks/useHabits.js";
import { getWorkoutForDate } from "../lib/workouts.js";
import { getQuoteForDate } from "../lib/quotes.js";
import { getContentLoader, SPIRITUAL_PATHS } from "../lib/spirituality.js";
import { playBell } from "../lib/sounds.js";
import AutoGrowTextarea from "../components/AutoGrowTextarea.jsx";
import StarRating from "../components/StarRating.jsx";
import OrchestratorView from "../components/OrchestratorView.jsx";
import useOrchestrator from "../hooks/useOrchestrator.js";
import useHealthSync from "../hooks/useHealthSync.js";
import useHealthIntelligence from "../hooks/useHealthIntelligence.js";
import ReadinessCard from "../components/ReadinessCard.jsx";
import HealthRecommendations from "../components/HealthRecommendations.jsx";
import { ConfettiCelebration, MilestoneToast } from "../components/Celebration.jsx";
import { generateSmartInsights } from "../lib/smartInsights.js";

const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;
const workoutApi = typeof window !== "undefined" ? window.workoutApi : null;
const journalApi = typeof window !== "undefined" ? window.journalApi : null;
const goalsApi = typeof window !== "undefined" ? window.goalsApi : null;
const affirmationsApi = typeof window !== "undefined" ? window.affirmationsApi : null;
const focusApi = typeof window !== "undefined" ? window.focusApi : null;
const waterApi = typeof window !== "undefined" ? window.waterApi : null;
const sleepApi = typeof window !== "undefined" ? window.sleepApi : null;
const meditationApi = typeof window !== "undefined" ? window.meditationApi : null;
const supplementsApi = typeof window !== "undefined" ? window.supplementsApi : null;
const projectsApi = typeof window !== "undefined" ? window.projectsApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const aiApi = typeof window !== "undefined" ? window.aiApi : null;

const FOCUS_MODES = {
  work: { label: "Work", duration: 25 * 60 },
  shortBreak: { label: "Short Break", duration: 5 * 60 },
  longBreak: { label: "Long Break", duration: 15 * 60 },
};

function formatFocusTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DashboardPage({ onNavigate, spiritualPath: spPath, focusTimer }) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);
  const greeting = useMemo(() => {
    const h = today.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, [today]);

  const { habits: HABITS_LIST } = useHabits();
  const { plan: orchPlan, score: orchScore, loading: orchLoading } = useOrchestrator();
  const { readiness: hiReadiness, recommendations: hiRecs, alerts: hiAlerts, dismissAlert: hiDismiss } = useHealthIntelligence();
  const [showOrchestrator, setShowOrchestrator] = useState(false);
  const { syncStatus: healthSync } = useHealthSync();
  const [userName, setUserName] = useState("");

  // ── Planner state (editable) ──
  const [dayData, setDayData] = useState(null);
  const [plannerTab, setPlannerTab] = useState("planner");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const saveTimer = useRef(null);
  const autoCheckRanRef = useRef(false);

  // ── Widget state ──
  const [workoutLog, setWorkoutLog] = useState(null);
  const [journalEntry, setJournalEntry] = useState(null);
  const [goals, setGoals] = useState([]);
  const [weekData, setWeekData] = useState({});
  const [allData, setAllData] = useState({});
  const [affirmations, setAffirmations] = useState([]);
  const [waterData, setWaterData] = useState(null);
  const [sleepData, setSleepData] = useState(null);
  const [meditationData, setMeditationData] = useState(null);
  const [supplements, setSupplements] = useState([]);
  const [suppLog, setSuppLog] = useState({});
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [activeProjects, setActiveProjects] = useState([]);
  const [sleepRange, setSleepRange] = useState({});
  const [meditationRange, setMeditationRange] = useState({});
  const [todaySteps, setTodaySteps] = useState(null);
  const [todayHeartRate, setTodayHeartRate] = useState(null);
  const [todayActiveCal, setTodayActiveCal] = useState(null);

  // ── Focus timer (shared from App.jsx) ──
  const focusMode = focusTimer.mode;
  const focusTimeLeft = focusTimer.timeLeft;
  const focusRunning = focusTimer.running;
  const focusTask = focusTimer.task;
  const focusSessions = focusTimer.sessions;
  const focusDuration = focusTimer.modeDuration;
  const focusStart = focusTimer.start;
  const focusPause = focusTimer.pause;
  const focusReset = focusTimer.reset;
  const focusModeChange = focusTimer.changeMode;
  const focusTotalMin = focusTimer.totalMin;
  const focusProgress = focusTimer.progress;
  const focusIsBreak = focusTimer.isBreak;
  const focusCircumference = 2 * Math.PI * 40;
  const focusDashOffset = focusCircumference * (1 - focusProgress);

  // ── Load all data ──
  useEffect(() => {
    async function load() {
      if (plannerApi) {
        const e = await plannerApi.getDay(todayStr);
        setDayData(e || defaultEntry(todayStr, HABITS_LIST));
        const ws = startOfWeekMonday(today);
        const [range, all] = await Promise.all([
          plannerApi.getRange(ymd(ws), ymd(addDays(ws, 6))),
          plannerApi.getAll(),
        ]);
        setWeekData(range || {});
        setAllData(all || {});
      } else {
        setDayData(defaultEntry(todayStr, HABITS_LIST));
      }
      if (workoutApi) setWorkoutLog(await workoutApi.get(todayStr));
      if (journalApi) setJournalEntry(await journalApi.get(todayStr));
      if (goalsApi) {
        const g = await goalsApi.list();
        setGoals((g || []).filter(gl => gl.status !== "completed").slice(0, 3));
      }
      if (affirmationsApi) {
        const a = await affirmationsApi.list();
        setAffirmations((a || []).filter(af => af.active !== false));
      }
      if (waterApi) setWaterData(await waterApi.get(todayStr));
      if (sleepApi) {
        setSleepData(await sleepApi.get(todayStr));
        const sr = await sleepApi.range(ymd(addDays(today, -30)), todayStr);
        setSleepRange(sr || {});
      }
      if (meditationApi) {
        setMeditationData(await meditationApi.get(todayStr));
        const mr = await meditationApi.range(ymd(addDays(today, -30)), todayStr);
        setMeditationRange(mr || {});
      }
      if (supplementsApi) {
        const sl = await supplementsApi.list();
        setSupplements((sl || []).filter(s => s.active !== false));
        setSuppLog(await supplementsApi.getLog(todayStr) || {});
      }
      if (projectsApi) {
        const p = await projectsApi.list();
        setActiveProjects((p || []).filter(proj => (proj.status || "active") === "active").slice(0, 3));
      }
      if (settingsApi) {
        const wu = await settingsApi.get("weightUnit");
        if (wu) setWeightUnit(wu);
        const un = await settingsApi.get("user_name");
        if (un) setUserName(un);
        // Apple Health data
        const stepsRaw = await settingsApi.get(`steps_${todayStr}`);
        if (stepsRaw) try { setTodaySteps(JSON.parse(stepsRaw)); } catch {}
        const hrRaw = await settingsApi.get(`heartrate_${todayStr}`);
        if (hrRaw) try { setTodayHeartRate(JSON.parse(hrRaw)); } catch {}
        const acRaw = await settingsApi.get(`activecal_${todayStr}`);
        if (acRaw) try { setTodayActiveCal(JSON.parse(acRaw)); } catch {}
      }
    }
    load();
  }, [todayStr, today]);

  // ── Planner save (debounced) ──
  const updateDay = useCallback((patch) => {
    setDayData(prev => {
      const current = prev || defaultEntry(todayStr, HABITS_LIST);
      const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (plannerApi) plannerApi.saveDay(todayStr, next);
      }, 300);
      return next;
    });
  }, [todayStr]);

  const toggleWeightUnit = () => {
    const next = weightUnit === "lbs" ? "kg" : "lbs";
    setWeightUnit(next);
    if (settingsApi) settingsApi.set("weightUnit", next);
  };

  // ── Derived data ──
  const day = dayData || defaultEntry(todayStr, HABITS_LIST);
  if (!Array.isArray(day.top3)) day.top3 = day.priorities || ["", "", ""];
  if (!Array.isArray(day.wins)) day.wins = ["", "", ""];

  const workout = useMemo(() => getWorkoutForDate(today), [today]);
  const quote = useMemo(() => getQuoteForDate(today), [today]);
  const spiritualPath = spPath || "christianity";
  const [spiritualContent, setSpiritualContent] = useState(null);
  useEffect(() => {
    const loader = getContentLoader(spiritualPath);
    loader(today).then(setSpiritualContent);
  }, [spiritualPath, today]);
  const spiritualTitle = SPIRITUAL_PATHS[spiritualPath]?.dashboardTitle || "Daily Quote";

  const habitsTotal = HABITS_LIST.length;
  let habitsDone = 0;
  if (day.habits) { for (const h of HABITS_LIST) if (day.habits[h]) habitsDone++; }
  const habitsPct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0;

  const weekHabitPct = useMemo(() => {
    let t = 0, d = 0;
    for (let i = 0; i < 7; i++) {
      const k = ymd(addDays(startOfWeekMonday(today), i));
      const e = weekData[k];
      for (const h of HABITS_LIST) { t++; if (e?.habits?.[h]) d++; }
    }
    return t ? Math.round((d / t) * 100) : 0;
  }, [weekData, today, HABITS_LIST]);

  const n = day.nutrition;
  const hasNutrition = n && (n.calories || n.protein || n.carbs || n.fat);

  const dailyAffirmation = useMemo(() => {
    if (!affirmations.length) return null;
    const start = new Date(today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    return affirmations[dayOfYear % affirmations.length];
  }, [affirmations, today]);

  const top3 = day.top3?.filter(t => t) || [];

  const waterGlasses = waterData?.glasses || 0;
  const waterGoal = waterData?.goal || 8;
  const waterPct = Math.min(100, Math.round((waterGlasses / waterGoal) * 100));

  const sleepHours = sleepData?.hours ? parseFloat(sleepData.hours) : null;
  const sleepQuality = sleepData?.quality || 0;
  const qualityLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const medMinutes = meditationData?.minutes || meditationData?.duration || 0;

  const suppTotal = supplements.length;
  const suppDone = supplements.filter(s => !!suppLog[s.id]).length;
  const suppPct = suppTotal ? Math.round((suppDone / suppTotal) * 100) : 0;

  // ── Auto-check habits based on tracked data ──
  useEffect(() => {
    if (!dayData?.habits || autoCheckRanRef.current) return;
    // Wait until core data sources have been attempted (non-null means loaded)
    if (sleepData === null && waterData === null && workoutLog === null) return;

    autoCheckRanRef.current = true;

    const habits = dayData.habits;
    const updated = {};
    let changed = false;

    for (const [name, checked] of Object.entries(habits)) {
      if (checked) continue; // already checked, never uncheck
      const lower = name.toLowerCase();

      let shouldCheck = false;

      if (lower.includes("sleep")) {
        shouldCheck = sleepData?.hours >= 7;
      } else if (lower.includes("hydration") || lower.includes("water")) {
        shouldCheck = waterData?.glasses >= 8;
      } else if (lower.includes("strength") || lower.includes("training") || lower.includes("hevy")) {
        shouldCheck = workoutLog?.completed === true;
      } else if (lower.includes("weigh")) {
        shouldCheck = !!(dayData.weightAm || dayData.weightPm);
      } else if (lower.includes("creatine") || lower.includes("supplement")) {
        shouldCheck = suppDone > 0;
      } else if (lower.includes("macro") || lower.includes("tracking") || lower.includes("myf")) {
        shouldCheck = dayData.nutrition?.calories > 0;
      }

      if (shouldCheck) {
        updated[name] = true;
        changed = true;
      }
    }

    if (changed) {
      updateDay(prev => ({
        ...prev,
        habits: { ...prev.habits, ...updated },
      }));
    }
  }, [dayData, sleepData, waterData, workoutLog, suppDone, updateDay]);

  // Reset auto-check flag when date changes
  useEffect(() => {
    autoCheckRanRef.current = false;
  }, [todayStr]);

  const { done: habitProgress_done, total: habitProgress_total, pct: habitProgress_pct } = progressFor(day, HABITS_LIST);

  const bestByHabit = useMemo(() => {
    const out = {};
    for (const h of HABITS_LIST) out[h] = bestStreakForHabit(allData, h);
    return out;
  }, [allData, HABITS_LIST]);

  // ── Daily Score ──
  const dailyScore = useMemo(() => {
    let score = 0, possible = 0;
    const breakdown = [];
    const habitsEarned = Math.round((habitsPct / 100) * 40);
    possible += 40; score += habitsEarned;
    breakdown.push({ label: "Habits", earned: habitsEarned, max: 40 });
    const waterEarned = Math.round((waterPct / 100) * 10);
    possible += 10; score += waterEarned;
    breakdown.push({ label: "Water", earned: waterEarned, max: 10 });
    let sleepEarned = 0;
    if (sleepHours !== null) { sleepEarned += 5; if (sleepQuality >= 4) sleepEarned += 5; else if (sleepQuality >= 3) sleepEarned += 3; else if (sleepQuality >= 1) sleepEarned += 1; }
    possible += 10; score += sleepEarned;
    breakdown.push({ label: "Sleep", earned: sleepEarned, max: 10 });
    const workoutEarned = workoutLog?.completed ? 10 : 0;
    possible += 10; score += workoutEarned;
    breakdown.push({ label: "Workout", earned: workoutEarned, max: 10 });
    const medEarned = medMinutes >= 10 ? 10 : medMinutes > 0 ? 5 : 0;
    possible += 10; score += medEarned;
    breakdown.push({ label: "Meditation", earned: medEarned, max: 10 });
    if (suppTotal > 0) { const suppEarned = Math.round((suppPct / 100) * 10); possible += 10; score += suppEarned; breakdown.push({ label: "Supplements", earned: suppEarned, max: 10 }); }
    const journalEarned = journalEntry?.content ? 5 : 0;
    possible += 5; score += journalEarned;
    breakdown.push({ label: "Journal", earned: journalEarned, max: 5 });
    const focusEarned = focusSessions.length >= 2 ? 5 : focusSessions.length >= 1 ? 3 : 0;
    possible += 5; score += focusEarned;
    breakdown.push({ label: "Focus", earned: focusEarned, max: 5 });
    return { score, possible, pct: possible ? Math.round((score / possible) * 100) : 0, breakdown };
  }, [habitsPct, waterPct, sleepHours, sleepQuality, workoutLog, medMinutes, suppTotal, suppPct, journalEntry, focusSessions]);

  // Momentum Streak
  const momentumStreak = useMemo(() => {
    if (!allData || typeof allData !== "object") return { current: 0, best: 0 };
    const sortedDates = Object.keys(allData).sort().reverse();
    let current = 0, best = 0, counting = true;
    for (const dateStr of sortedDates) {
      const e = allData[dateStr];
      if (!e) { if (counting) break; continue; }
      let s = 0;
      const habs = e.habits || {};
      let hDone = 0;
      for (const h of HABITS_LIST) if (habs[h]) hDone++;
      s += hDone > 0 ? 1 : 0;
      if (e.goal) s++;
      if (e.grateful) s++;
      if (e.rating && e.rating >= 3) s++;
      const active = s >= 2;
      if (active) { if (counting) current++; best = Math.max(best, counting ? current : 0); }
      else { if (counting) counting = false; }
    }
    best = Math.max(best, current);
    return { current, best };
  }, [allData, HABITS_LIST]);

  // Insights
  // Today's quick tips
  const todayTips = useMemo(() => {
    const tips = [];
    if (habitsPct < 50 && habitsPct > 0) tips.push({ type: "warn", text: `Habits at ${habitsPct}% — try to complete at least half today.` });
    if (habitsPct >= 90) tips.push({ type: "good", text: "Crushing your habits today! Keep it up." });
    if (sleepHours !== null && sleepHours < 6) tips.push({ type: "warn", text: `Only ${sleepHours.toFixed(1)}h sleep — consider an earlier bedtime tonight.` });
    if (sleepHours !== null && sleepHours >= 8) tips.push({ type: "good", text: "Great sleep last night — you're well-rested." });
    if (waterPct < 50 && waterGlasses > 0) tips.push({ type: "warn", text: `Only ${waterGlasses}/${waterGoal} glasses — drink more water!` });
    if (focusSessions.length >= 3) tips.push({ type: "good", text: `${focusSessions.length} focus sessions — you're in the zone!` });
    if (momentumStreak.current >= 7) tips.push({ type: "good", text: `${momentumStreak.current}-day momentum streak — incredible consistency!` });
    if (momentumStreak.current >= 3 && momentumStreak.current < 7) tips.push({ type: "good", text: `${momentumStreak.current}-day streak — keep the momentum going!` });
    return tips;
  }, [habitsPct, sleepHours, waterPct, waterGlasses, waterGoal, focusSessions, momentumStreak]);

  // Smart AI insights (pattern detection from historical data)
  const smartInsights = useMemo(() => {
    return generateSmartInsights(allData, sleepRange, null, meditationRange, null, HABITS_LIST);
  }, [allData, sleepRange, meditationRange, HABITS_LIST]);

  const insights = useMemo(() => {
    // Combine today's tips with smart insights, deduped
    return [...todayTips, ...smartInsights.map(s => ({
      type: s.type === "good" ? "good" : s.type === "action" ? "warn" : "tip",
      text: s.text,
      emoji: s.emoji,
    }))].slice(0, 6);
  }, [todayTips, smartInsights]);

  // Reminders
  const reminders = useMemo(() => {
    const items = [];
    if (!day.weightAm) items.push({ icon: "⚖️", text: "Log morning weight", page: "planner" });
    if (waterGlasses === 0) items.push({ icon: "💧", text: "Track water intake", page: "water" });
    if (sleepHours === null) items.push({ icon: "😴", text: "Log last night's sleep", page: "sleep" });
    if (!hasNutrition) items.push({ icon: "🍽️", text: "Log nutrition", page: "planner" });
    if (habitsDone === 0) items.push({ icon: "✅", text: "Start checking off habits", page: "planner" });
    else if (habitsPct < 100) items.push({ icon: "✅", text: `Finish habits (${habitsDone}/${habitsTotal})`, page: "planner" });
    if (suppTotal > 0 && suppDone === 0) items.push({ icon: "💊", text: "Take supplements", page: "supplements" });
    else if (suppTotal > 0 && suppDone < suppTotal) items.push({ icon: "💊", text: `Supplements (${suppDone}/${suppTotal})`, page: "supplements" });
    if (medMinutes === 0) items.push({ icon: "🧘", text: "Meditate", page: "meditation" });
    if (!journalEntry?.content) items.push({ icon: "📝", text: "Write journal", page: "journal" });
    if (!day.goal) items.push({ icon: "🎯", text: "Set today's goal", page: "planner" });
    if (!day.grateful) items.push({ icon: "🙏", text: "Write gratitude", page: "planner" });
    const hour = new Date().getHours();
    if (hour >= 17 && !day.weightPm) items.push({ icon: "⚖️", text: "Log evening weight", page: "planner" });
    return items;
  }, [day, waterGlasses, sleepHours, hasNutrition, habitsDone, habitsPct, habitsTotal, suppTotal, suppDone, medMinutes, journalEntry]);

  const scoreColor = dailyScore.pct >= 80 ? "#4caf50" : dailyScore.pct >= 50 ? "var(--accent)" : "#ff9800";

  // ── Celebrations ──
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState(null);
  const celebratedRef = useRef(new Set());

  const celebrate = useCallback((key, emoji, message) => {
    if (celebratedRef.current.has(key)) return;
    celebratedRef.current.add(key);
    setShowConfetti(true);
    setToast({ emoji, message });
  }, []);

  // Watch for milestone achievements
  useEffect(() => {
    if (!dayData) return;
    // All habits completed
    if (habitsPct === 100 && HABITS_LIST.length > 0) celebrate("habits100", "🔥", "All habits completed! Perfect day!");
    // Water goal hit
    if (waterPct >= 100) celebrate("water100", "💧", "Water goal reached!");
    // All supplements taken
    if (suppTotal > 0 && suppDone === suppTotal) celebrate("supps100", "💊", "All supplements taken!");
    // Daily score 100%
    if (dailyScore.pct === 100) celebrate("score100", "🏆", "Perfect daily score! Incredible!");
    // Daily score 80%+
    else if (dailyScore.pct >= 80 && !celebratedRef.current.has("score80")) celebrate("score80", "⭐", "Daily score above 80%! Great work!");
    // Streak milestones
    if (momentumStreak.current === 7) celebrate("streak7", "🔥", "7-day streak! One full week!");
    if (momentumStreak.current === 14) celebrate("streak14", "🔥", "14-day streak! Two weeks strong!");
    if (momentumStreak.current === 30) celebrate("streak30", "🏅", "30-day streak! Unstoppable!");
  }, [habitsPct, waterPct, suppDone, suppTotal, dailyScore.pct, momentumStreak.current, dayData, HABITS_LIST, celebrate]);

  // ── LifeMax Coach ──
  const [coachMsg, setCoachMsg] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [hasAiKey, setHasAiKey] = useState(false);
  const coachFetchedRef = useRef(false);

  // Check for API key
  useEffect(() => {
    if (!settingsApi) return;
    settingsApi.get("ai_api_key").then(k => setHasAiKey(!!k));
  }, []);

  const generateCoachMessage = useCallback(async (forceRegenerate = false) => {
    if (!aiApi || !settingsApi || !hasAiKey) return;

    // Check cache first
    if (!forceRegenerate) {
      const cached = await settingsApi.get(`ai_coach_${todayStr}`);
      if (cached) {
        setCoachMsg(cached);
        return;
      }
    }

    setCoachLoading(true);
    try {
      const habitsCompleted = habitsDone;
      const habitsGoal = habitsTotal;

      // Build Apple Health trends from last 7 days
      let sleepTrendStr = "";
      if (sleepRange && Array.isArray(sleepRange) && sleepRange.length > 0) {
        const recent7 = sleepRange.slice(-7);
        const avgSleep = recent7.reduce((s, d) => s + (d.hours || 0), 0) / recent7.length;
        const sleepDays = recent7.map(d => `${d.date}: ${(d.hours || 0).toFixed(1)}h`).join(", ");
        sleepTrendStr = `Sleep trend (last ${recent7.length} days): avg ${avgSleep.toFixed(1)}h — ${sleepDays}`;
      }

      let stepsTrendStr = "";
      try {
        const stepsArr = [];
        for (let i = 6; i >= 0; i--) {
          const d = ymd(addDays(new Date(), -i));
          const raw = await settingsApi.get(`steps_${d}`);
          if (raw) { const p = JSON.parse(raw); stepsArr.push({ date: d, steps: p.count || 0 }); }
        }
        if (stepsArr.length > 0) {
          const avgSteps = Math.round(stepsArr.reduce((s, d) => s + d.steps, 0) / stepsArr.length);
          stepsTrendStr = `Steps trend (last ${stepsArr.length} days): avg ${avgSteps.toLocaleString()} — ${stepsArr.map(d => `${d.date}: ${d.steps.toLocaleString()}`).join(", ")}`;
        }
      } catch {}

      let hrTrendStr = "";
      try {
        const hrArr = [];
        for (let i = 6; i >= 0; i--) {
          const d = ymd(addDays(new Date(), -i));
          const raw = await settingsApi.get(`heartrate_${d}`);
          if (raw) { const p = JSON.parse(raw); hrArr.push({ date: d, avg: p.avg || 0, min: p.min || 0, max: p.max || 0 }); }
        }
        if (hrArr.length > 0) {
          const avgHR = Math.round(hrArr.reduce((s, d) => s + d.avg, 0) / hrArr.length);
          hrTrendStr = `Resting heart rate trend (last ${hrArr.length} days): avg ${avgHR} bpm — ${hrArr.map(d => `${d.date}: avg ${d.avg}, min ${d.min}, max ${d.max}`).join(", ")}`;
        }
      } catch {}

      let calTrendStr = "";
      try {
        const calArr = [];
        for (let i = 6; i >= 0; i--) {
          const d = ymd(addDays(new Date(), -i));
          const raw = await settingsApi.get(`activecal_${d}`);
          if (raw) { const p = JSON.parse(raw); calArr.push({ date: d, cal: p.total || 0 }); }
        }
        if (calArr.length > 0) {
          const avgCal = Math.round(calArr.reduce((s, d) => s + d.cal, 0) / calArr.length);
          calTrendStr = `Active calories trend (last ${calArr.length} days): avg ${avgCal} — ${calArr.map(d => `${d.date}: ${d.cal}`).join(", ")}`;
        }
      } catch {}

      const userContext = [
        `Date: ${todayStr}, Current time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (the user has only been awake since this morning — today's steps, active calories, and heart rate are still accumulating and should NOT be compared to full-day totals from previous days)`,
        `Daily Score: ${dailyScore.pct}%`,
        `Habits: ${habitsCompleted}/${habitsGoal} completed (${habitsPct}%)`,
        sleepHours !== null ? `Sleep last night: ${sleepHours.toFixed(1)} hours, quality: ${qualityLabels[sleepQuality] || "N/A"}` : "Sleep: not logged yet",
        sleepTrendStr,
        workoutLog?.completed ? "Workout: completed" : "Workout: not done yet",
        `Water: ${waterGlasses}/${waterGoal} glasses (${waterPct}%)`,
        todaySteps ? `Steps today: ${todaySteps.count?.toLocaleString()}` : "",
        stepsTrendStr,
        todayHeartRate ? `Heart rate today: avg ${todayHeartRate.avg} bpm (min ${todayHeartRate.min}, max ${todayHeartRate.max})` : "",
        hrTrendStr,
        todayActiveCal ? `Active calories today: ${todayActiveCal.total}` : "",
        calTrendStr,
        goals.length > 0 ? `Active goals: ${goals.map(g => g.title || g.name).join(", ")}` : "No active goals set",
        journalEntry?.content ? `Journal mood: ${journalEntry.mood || "written"}` : "Journal: not written yet",
        `Focus sessions: ${focusSessions.length} (${focusTotalMin} min total)`,
        dailyAffirmation ? `Today's affirmation: "${dailyAffirmation.text}"` : "",
        momentumStreak.current > 0 ? `Momentum streak: ${momentumStreak.current} days` : "",
        medMinutes > 0 ? `Meditation: ${medMinutes} min` : "Meditation: not done yet",
        suppTotal > 0 ? `Supplements: ${suppDone}/${suppTotal} taken` : "",
      ].filter(Boolean).join("\n");

      const messages = [
        {
          role: "system",
          content: `You are a warm, encouraging life coach inside a personal dashboard app called LifeMaxOS. The user is viewing their daily dashboard. You have access to their real data including Apple Health metrics (steps, heart rate, active calories, sleep), habits, workouts, water, goals, focus sessions, and more. Analyze trends in their data — spot patterns, improvements, or concerns. Based on their real data for today AND recent trends, give a personalized coaching message (4-6 sentences). Be specific — mention actual numbers and trends. If you see a pattern (e.g. declining sleep, increasing resting heart rate, low step count), call it out with actionable advice. Balance encouragement with honest, data-driven nudges. Use a warm, conversational tone. Do NOT use markdown formatting, bullet points, or headers — just flowing prose. Do not start with "Hey" or greetings.`
        },
        {
          role: "user",
          content: `Here is my data for today:\n${userContext}\n\nGive me a brief, personalized coaching message.`
        }
      ];

      const [apiKey, provider] = await Promise.all([
        settingsApi.get("ai_api_key"),
        settingsApi.get("ai_provider").catch(() => "openai"),
      ]);
      const result = await aiApi.chat(messages, { apiKey, provider: provider || "openai", maxTokens: 300, temperature: 0.8 });

      if (result?.content) {
        setCoachMsg(result.content);
        await settingsApi.set(`ai_coach_${todayStr}`, result.content);
      } else if (result?.error) {
        console.error("LifeMax Coach error:", result.error);
        setCoachMsg(result.error);
      }
    } catch (err) {
      console.error("LifeMax Coach error:", err);
      setCoachMsg(null);
    } finally {
      setCoachLoading(false);
    }
  }, [aiApi, settingsApi, hasAiKey, todayStr, habitsDone, habitsTotal, habitsPct, dailyScore.pct, sleepHours, sleepQuality, qualityLabels, workoutLog, waterGlasses, waterGoal, waterPct, goals, journalEntry, focusSessions, focusTotalMin, dailyAffirmation, momentumStreak.current, medMinutes, suppDone, suppTotal, todaySteps, todayHeartRate, todayActiveCal, sleepRange]);

  // Auto-generate on load (once data is ready)
  useEffect(() => {
    if (!hasAiKey || coachFetchedRef.current) return;
    // Wait until core data has loaded
    if (dayData === null) return;
    coachFetchedRef.current = true;
    generateCoachMessage(false);
  }, [hasAiKey, dayData, generateCoachMessage]);

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════
  return (
    <div className="dashPage">
      <style>{`
        .dashCoach {
          background: linear-gradient(135deg, #fbf7f0 0%, #f0ecff 100%);
          border-radius: 12px;
          padding: 16px 18px;
          border-left: 4px solid var(--accent, #5B7CF5);
          margin-bottom: 12px;
          box-shadow: 0 1px 4px rgba(91,124,245,0.08);
        }
        .dashCoachHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .dashCoachTitle {
          font-weight: 600;
          font-size: 14px;
          color: var(--text, #3d3a35);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dashCoachIcon {
          font-size: 16px;
        }
        .dashCoachRegenBtn {
          background: none;
          border: 1px solid var(--line2, #ddd);
          border-radius: 6px;
          padding: 4px 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text2, #8a8579);
          transition: all 0.2s;
        }
        .dashCoachRegenBtn:hover:not(:disabled) {
          border-color: var(--accent, #5B7CF5);
          color: var(--accent, #5B7CF5);
          background: rgba(91,124,245,0.06);
        }
        .dashCoachRegenBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .dashCoachBody {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text, #3d3a35);
        }
        .dashCoachLoading {
          font-size: 13px;
          color: var(--text2, #8a8579);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
        }
        .dashCoachSpinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid var(--line2, #ddd);
          border-top-color: var(--accent, #5B7CF5);
          border-radius: 50%;
          animation: dashCoachSpin 0.8s linear infinite;
        }
        @keyframes dashCoachSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <ConfettiCelebration show={showConfetti} onDone={() => setShowConfetti(false)} />
      <MilestoneToast show={!!toast} emoji={toast?.emoji} message={toast?.message} onDone={() => setToast(null)} />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">{greeting}{userName ? `, ${userName}` : ""}</h1>
          <div className="weekBadge">
            {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <div className="dashTopbarRight">
          {orchPlan && (
            <button
              className={`btn ${showOrchestrator ? "dashOrchBtnActive" : ""}`}
              onClick={() => setShowOrchestrator(p => !p)}
              type="button"
              title="Life Orchestrator"
              style={{ marginRight: 4 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              Orchestrator
            </button>
          )}
          {momentumStreak.current > 0 && (
            <div className="dashStreakBadge">🔥 {momentumStreak.current}d</div>
          )}
          <button className="dashScoreBtn" onClick={() => setShowScoreBreakdown(p => !p)} type="button">
            <svg viewBox="0 0 100 100" width="42" height="42">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line2)" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 * (1 - dailyScore.pct / 100)}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <span className="dashScoreBtnValue">{dailyScore.pct}</span>
          </button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="dashBody">
        {/* ── LEFT COLUMN: Life Orchestrator + Key Widgets ── */}
        <div className="dashLeft">

          {/* Orchestrator — toggled */}
          {showOrchestrator && orchPlan && (
            <OrchestratorView plan={orchPlan} score={orchScore} onNavigate={onNavigate} />
          )}

          {/* Affirmation */}
          {dailyAffirmation && (
            <div className="dashAffirmation">
              <div className="dashAffirmationText">{dailyAffirmation.text}</div>
            </div>
          )}

          {/* LifeMax Coach */}
          {hasAiKey && (coachMsg || coachLoading) && (
            <div className="dashCoach">
              <div className="dashCoachHeader">
                <div className="dashCoachTitle">
                  <span className="dashCoachIcon">🧠</span> LifeMax Coach
                </div>
                <button
                  className="dashCoachRegenBtn"
                  onClick={() => generateCoachMessage(true)}
                  disabled={coachLoading}
                  type="button"
                  title="Get a fresh coaching message"
                >
                  {coachLoading ? (
                    <span className="dashCoachSpinner" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" />
                      <path d="M2.5 11.5a10 10 0 0 1 18.4-4.5" /><path d="M21.5 12.5a10 10 0 0 1-18.4 4.5" />
                    </svg>
                  )}
                </button>
              </div>
              {coachLoading && !coachMsg ? (
                <div className="dashCoachLoading">
                  <span className="dashCoachSpinner" /> Generating your coaching message...
                </div>
              ) : coachMsg ? (
                <div className="dashCoachBody">{coachMsg}</div>
              ) : null}
            </div>
          )}

          {/* Readiness + Health Recommendations */}
          {hiReadiness && (
            <ReadinessCard
              score={hiReadiness.score}
              category={hiReadiness.category}
              explanation={hiReadiness.explanation}
              components={hiReadiness.components}
            />
          )}
          {hiRecs && hiRecs.length > 0 && (
            <HealthRecommendations recommendations={hiRecs} />
          )}

          {/* Insights + Reminders */}
          <div className="dashInsightsStack">
            {insights.length > 0 && (
              <div className="dashInsights">
                <div className="dashInsightsTitle">Insights</div>
                {insights.slice(0, 5).map((tip, i) => (
                  <div key={i} className={`dashInsightItem dashInsight-${tip.type}`}>
                    <span className="dashInsightIcon">
                      {tip.emoji || (tip.type === "good" ? "\u2713" : tip.type === "warn" ? "!" : "\u{1F4A1}")}
                    </span>
                    {tip.text}
                  </div>
                ))}
              </div>
            )}
            {/* Reminders checklist */}
            {(
              reminders.length > 0 ? (
                <div className="dashReminders">
                  <div className="dashRemindersHeader">
                    <div className="dashRemindersTitle">Reminders</div>
                    <div className="dashRemindersBadge">{reminders.length}</div>
                  </div>
                  <div className="dashRemindersList">
                    {reminders.map((r, i) => (
                      <button key={i} className="dashReminderItem" onClick={() => onNavigate(r.page)} type="button">
                        <span className="dashReminderIcon">{r.icon}</span>
                        <span className="dashReminderText">{r.text}</span>
                        <span className="dashReminderArrow">{"\u203A"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="dashReminders dashRemindersDone">
                  <div className="dashRemindersDoneIcon">{"\u{1F389}"}</div>
                  <div className="dashRemindersDoneText">All caught up!</div>
                </div>
              )
            )}
          </div>

          {/* Score Breakdown (toggled from topbar) */}
          {showScoreBreakdown && (
            <div className="dashScoreBreakdown">
              <div className="dashScoreBreakdownTitle">Score Breakdown</div>
              <div className="dashScoreBreakdownTable">
                {dailyScore.breakdown.map((row) => (
                  <div className="dashScoreBreakdownRow" key={row.label}>
                    <div className="dashScoreBreakdownLabel">{row.label}</div>
                    <div className="dashScoreBreakdownBar">
                      <div className="dashScoreBreakdownFill" style={{ width: `${row.max ? (row.earned / row.max) * 100 : 0}%` }} />
                    </div>
                    <div className="dashScoreBreakdownPts">{row.earned}/{row.max}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats Row — compact health data */}
          {/* When readiness card is shown, hide sleep & habits (already covered by readiness) */}
          <div className="dashQuickStats">
            {!hiReadiness && (
              <button className="dashQStat" onClick={() => onNavigate("sleep")} type="button">
                <span className="dashQStatLabel">Sleep</span>
                <span className="dashQStatVal">{sleepHours !== null ? `${sleepHours.toFixed(1)}h` : "\u2014"}</span>
              </button>
            )}
            <button className="dashQStat" onClick={() => onNavigate("water")} type="button">
              <span className="dashQStatLabel">Water</span>
              <span className="dashQStatVal">{waterGlasses}/{waterGoal}</span>
            </button>
            {!hiReadiness && (
              <button className="dashQStat" onClick={() => onNavigate("habits")} type="button">
                <span className="dashQStatLabel">Habits</span>
                <span className="dashQStatVal">{habitsPct}%</span>
              </button>
            )}
            {todaySteps && (
              <div className="dashQStat">
                <span className="dashQStatLabel">Steps</span>
                <span className="dashQStatVal">{todaySteps.count.toLocaleString()}</span>
              </div>
            )}
            {todayHeartRate && (
              <div className="dashQStat">
                <span className="dashQStatLabel">HR</span>
                <span className="dashQStatVal">{todayHeartRate.avg} bpm</span>
              </div>
            )}
          </div>

          {/* Focus Timer */}
          <div className="dashFocusCompact">
            <div className="dashFocusModes">
              {Object.entries(FOCUS_MODES).map(([key, { label }]) => (
                <button key={key} className={`dashFocusModeBtn ${focusMode === key ? "dashFocusModeBtnActive" : ""}`}
                  onClick={() => focusModeChange(key)} type="button">{label}</button>
              ))}
            </div>
            <div className="dashFocusMain">
              <div className={`dashFocusCircle ${focusIsBreak ? "dashFocusBreak" : ""} ${focusRunning ? "dashFocusRunning" : ""}`}>
                <svg viewBox="0 0 90 90" width="90" height="90" style={{ position: "absolute", top: 0, left: 0 }}>
                  <circle cx="45" cy="45" r="40" fill="none" stroke="var(--line2)" strokeWidth="4" />
                  <circle cx="45" cy="45" r="40" fill="none"
                    stroke={focusIsBreak ? "#4caf50" : "var(--accent)"} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={focusCircumference} strokeDashoffset={focusDashOffset}
                    transform="rotate(-90 45 45)" />
                </svg>
                <div className="dashFocusTime">{formatFocusTime(focusTimeLeft)}</div>
              </div>
              <div className="dashFocusStats">
                <span className="dashFocusStatNum">{focusSessions.length}</span> sessions
                <span className="dashFocusStatSep">{"\u00B7"}</span>
                <span className="dashFocusStatNum">{focusTotalMin}</span> min
              </div>
            </div>
            <div className="dashFocusControls">
              {!focusRunning ? (
                <button className="btn btnPrimary" onClick={focusStart} type="button">
                  {focusTimeLeft < focusDuration && focusTimeLeft > 0 ? "Resume" : "Start"}
                </button>
              ) : (
                <button className="btn" onClick={focusPause} type="button">Pause</button>
              )}
              <button className="btn" onClick={focusReset} type="button">Reset</button>
            </div>
            <input type="text" className="dashFocusTaskInput" placeholder="Working on..." value={focusTask}
              onChange={e => setFocusTask(e.target.value)} />
          </div>

          {/* Supplements (compact) */}
          {suppTotal > 0 && (
            <div className="dashSuppCompact">
              <div className="dashSuppHeader">
                <div className="dashSuppTitle">Supplements</div>
                <div className="dashSuppProgress">{suppDone}/{suppTotal}</div>
              </div>
              <div className="progressBar" style={{ height: 5, marginBottom: 10 }}>
                <div className="progressFill" style={{ width: `${suppPct}%` }} />
              </div>
              <div className="dashSuppList">
                {supplements.map(s => {
                  const taken = !!suppLog[s.id];
                  return (
                    <div key={s.id} className={`dashSuppRow ${taken ? "dashSuppRowDone" : ""}`}>
                      <div className={`dashSuppCheck ${taken ? "dashSuppCheckDone" : ""}`}>
                        {taken && "\u2713"}
                      </div>
                      <span className="dashSuppName">{s.name}</span>
                      {s.dosage && <span className="dashSuppDose">{s.dosage}</span>}
                    </div>
                  );
                })}
              </div>
              <button className="dashSuppOpenBtn" onClick={() => onNavigate("supplements")} type="button">
                Open Supplements {"\u203A"}
              </button>
            </div>
          )}

          {/* Quotes — compact single-line */}
          {spiritualContent && (
            <div className="dashQuoteCompact">
              <span className="dashQuoteCompactText">"{spiritualContent.verse || spiritualContent.text}"</span>
              <span className="dashQuoteCompactAuthor"> — {spiritualContent.reference || spiritualContent.author}</span>
            </div>
          )}
          <div className="dashQuoteCompact" style={{ marginTop: spiritualContent ? 6 : 0 }}>
            <span className="dashQuoteCompactText">"{quote.text}"</span>
            <span className="dashQuoteCompactAuthor"> — {quote.author}</span>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Today's Planner ── */}
        <div className="dashRight">
          <div className="dashPlannerHeader">
            <div className="dashPlannerTitle">Today's Planner</div>
            <div className="dashPlannerTabs">
              <button className={`tabBtn ${plannerTab === "planner" ? "active" : ""}`}
                onClick={() => setPlannerTab("planner")} type="button">Planner</button>
              <button className={`tabBtn ${plannerTab === "habits" ? "active" : ""}`}
                onClick={() => setPlannerTab("habits")} type="button">Habits</button>
              <button className={`tabBtn ${plannerTab === "journal" ? "active" : ""}`}
                onClick={() => setPlannerTab("journal")} type="button">Journal</button>
            </div>
          </div>

          <div className="dashPlannerBody">
            {plannerTab === "planner" ? (
              <>
                <div className="dpSection dpWakeRow">
                  <div className="dpLabel">Wake up time</div>
                  <input
                    type="time"
                    className="input dpWakeInput"
                    value={day.wakeTime || ""}
                    onChange={v => updateDay(cur => ({ ...cur, wakeTime: v.target.value }))}
                  />
                </div>
                <div className="dpSection">
                  <div className="dpLabel">Grateful for</div>
                  <AutoGrowTextarea value={day.grateful} onChange={v => updateDay(cur => ({ ...cur, grateful: v }))}
                    placeholder="What am I grateful for?" className="input" rows={1} minHeight={34} maxHeight={160} />
                </div>
                <div className="dpSection">
                  <div className="dpLabel">How I want to feel</div>
                  <AutoGrowTextarea value={day.feel} onChange={v => updateDay(cur => ({ ...cur, feel: v }))}
                    placeholder="Calm, focused, energized..." className="input" rows={1} minHeight={34} maxHeight={160} />
                </div>
                <div className="dpSection">
                  <div className="dpLabel">Daily goal</div>
                  <AutoGrowTextarea value={day.goal} onChange={v => updateDay(cur => ({ ...cur, goal: v }))}
                    placeholder="What matters most today?" className="input" rows={1} minHeight={34} maxHeight={160} />
                </div>

                <div className="divider" />

                <div className="dpSection">
                  <div className="dpLabel">Agenda</div>
                  <div className="agenda">
                    {HOURS.map(h => (
                      <div className="row" key={h}>
                        <div className="time">{h}</div>
                        <AutoGrowTextarea
                          value={day.agenda?.[h] || ""}
                          onChange={v => updateDay(cur => ({ ...cur, agenda: { ...cur.agenda, [h]: v } }))}
                          placeholder="" className="input inputSlim" rows={1} minHeight={32} maxHeight={220} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divider" />

                <div className="dpSection">
                  <div className="dpLabel">Top 3 things to do</div>
                  <div className="list3">
                    {day.top3.map((t, i) => (
                      <div className="row" key={i}>
                        <div className="num">{i + 1}.</div>
                        <AutoGrowTextarea value={t}
                          onChange={v => updateDay(cur => { const next = [...cur.top3]; next[i] = v; return { ...cur, top3: next }; })}
                          placeholder="" className="input inputSlim" rows={1} minHeight={32} maxHeight={200} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dpSection">
                  <div className="dpLabel">Notes</div>
                  <AutoGrowTextarea value={day.notes} onChange={v => updateDay(cur => ({ ...cur, notes: v }))}
                    placeholder="Notes..." className="input inputNotes" rows={3} minHeight={80} maxHeight={420} />
                </div>

                <div className="dpSection">
                  <div className="dpLabel">Top 3 wins</div>
                  <div className="list3">
                    {day.wins.map((w, i) => (
                      <div className="row" key={i}>
                        <div className="num">{i + 1}.</div>
                        <AutoGrowTextarea value={w}
                          onChange={v => updateDay(cur => { const next = [...cur.wins]; next[i] = v; return { ...cur, wins: next }; })}
                          placeholder="" className="input inputSlim" rows={1} minHeight={32} maxHeight={200} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divider" />

                <div className="dpSection">
                  <div className="dpLabel">Nutrition</div>
                  <div className="nutritionGrid">
                    {[{ key: "calories", label: "Cal", unit: "" }, { key: "protein", label: "Protein", unit: "g" },
                      { key: "carbs", label: "Carbs", unit: "g" }, { key: "fat", label: "Fat", unit: "g" }].map(({ key, label, unit }) => (
                      <div className="nutritionField" key={key}>
                        <div className="nutritionLabel">{label}</div>
                        <div className="nutritionInputWrap">
                          <input type="number" className="nutritionInput" placeholder="—"
                            value={day.nutrition?.[key] ?? ""}
                            onChange={e => updateDay(cur => ({ ...cur, nutrition: { ...(cur.nutrition || {}), [key]: e.target.value } }))} />
                          {unit && <span className="nutritionUnit">{unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dpSection">
                  <div className="weightHeader">
                    <div className="dpLabel" style={{ marginBottom: 0 }}>Weight</div>
                    <button className="weightUnitToggle" onClick={toggleWeightUnit} type="button">{weightUnit}</button>
                  </div>
                  <div className="weightGrid">
                    {[{ key: "weightAm", label: "AM" }, { key: "weightPm", label: "PM" }].map(({ key, label }) => {
                      const val = Number(day[key]) || 0;
                      const converted = val ? (weightUnit === "lbs" ? (val / 2.20462).toFixed(1) : (val * 2.20462).toFixed(1)) : null;
                      const otherUnit = weightUnit === "lbs" ? "kg" : "lbs";
                      return (
                        <div className="weightField" key={key}>
                          <div className="weightLabel">{label}</div>
                          <div className="nutritionInputWrap">
                            <input type="number" step="0.1" className="nutritionInput" placeholder="—"
                              value={day[key] ?? ""}
                              onChange={e => updateDay(cur => ({ ...cur, [key]: e.target.value }))} />
                            <span className="nutritionUnit">{weightUnit}</span>
                          </div>
                          {converted && <div className="weightConversion">{converted} {otherUnit}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="dpSection rateRow">
                  <div className="dpLabel labelInline">Rate my day</div>
                  <StarRating value={day.rating} onChange={v => updateDay(cur => ({ ...cur, rating: v }))} />
                </div>
              </>
            ) : plannerTab === "habits" ? (
              <>
                <div className="dpSection">
                  <div className="habitsTop">
                    <div className="dpLabel" style={{ marginBottom: 0 }}>Daily habits</div>
                    <div className="habitsActions">
                      <button className="miniBtn" onClick={() => updateDay(cur => {
                        const next = { ...(cur.habits || defaultHabits(HABITS_LIST)) };
                        HABITS_LIST.forEach(h => (next[h] = true));
                        return { ...cur, habits: next };
                      })} type="button">Mark all</button>
                      <button className="miniBtn" onClick={() => updateDay(cur => {
                        const next = { ...(cur.habits || defaultHabits(HABITS_LIST)) };
                        HABITS_LIST.forEach(h => (next[h] = false));
                        return { ...cur, habits: next };
                      })} type="button">Clear</button>
                    </div>
                  </div>
                  <div className="progressWrap">
                    <div className="progressBar">
                      <div className="progressFill" style={{ width: `${habitProgress_pct}%` }} />
                    </div>
                    <div className="progressMeta">
                      <span className="pct">{habitProgress_pct}%</span>
                      <span className="counts">{habitProgress_done}/{habitProgress_total}</span>
                    </div>
                  </div>
                  <div className="habitList">
                    {HABITS_LIST.map(h => {
                      const checked = !!day.habits?.[h];
                      const curStreak = currentStreakEndingOn(allData, todayStr, h);
                      const best = bestByHabit[h] || 0;
                      return (
                        <button key={h} className={`habitRow ${checked ? "checked" : ""}`}
                          onClick={() => updateDay(cur => {
                            const next = { ...(cur.habits || defaultHabits(HABITS_LIST)) };
                            next[h] = !next[h];
                            return { ...cur, habits: next };
                          })} type="button">
                          <span className={`check ${checked ? "on" : ""}`}>{checked ? "✓" : ""}</span>
                          <div className="habitMid">
                            <div className="habitText">{h}</div>
                            <div className="streakRow">
                              <span className="streakBadge">🔥 {curStreak}</span>
                              <span className="bestBadge">🏆 {best}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : plannerTab === "journal" ? (
              <>
                <div className="dpSection">
                  <div className="dpLabel">How are you feeling?</div>
                  <div className="jnlMoodPicker">
                    {[
                      { value: "great", label: "Great", emoji: "😄", color: "#27ae60" },
                      { value: "good", label: "Good", emoji: "🙂", color: "#2ecc71" },
                      { value: "okay", label: "Okay", emoji: "😐", color: "#f1c40f" },
                      { value: "low", label: "Low", emoji: "😔", color: "#e67e22" },
                      { value: "tough", label: "Tough", emoji: "😢", color: "#e74c3c" },
                    ].map(m => (
                      <button key={m.value}
                        className={`jnlMoodBtn ${day.journalMood === m.value ? "jnlMoodActive" : ""}`}
                        style={day.journalMood === m.value ? { background: m.color + "20", borderColor: m.color } : {}}
                        onClick={() => updateDay(cur => ({ ...cur, journalMood: m.value }))}
                        type="button">
                        <span className="jnlMoodEmoji">{m.emoji}</span>
                        <span className="jnlMoodLabel">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="dpSection">
                  <div className="dpLabel">Energy level</div>
                  <div className="jnlEnergyPicker">
                    {[{ level: 1, label: "Very Low" }, { level: 2, label: "Low" }, { level: 3, label: "Medium" }, { level: 4, label: "High" }, { level: 5, label: "Very High" }].map(e => (
                      <button key={e.level}
                        className={`jnlEnergyBtn ${day.journalEnergy === e.level ? "jnlEnergyActive" : ""}`}
                        onClick={() => updateDay(cur => ({ ...cur, journalEnergy: e.level }))}
                        type="button">
                        <div className="jnlEnergyBars">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="jnlEnergyBar"
                              style={{ height: i * 4, background: i <= e.level ? (day.journalEnergy === e.level ? "var(--accent)" : "var(--muted)") : "var(--line2)" }} />
                          ))}
                        </div>
                        <span className="jnlEnergyLabel">{e.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="dpSection">
                  <div className="dpLabel">What's influencing your mood?</div>
                  <div className="jnlTagPicker">
                    {["Work", "Exercise", "Social", "Sleep", "Weather", "Food", "Stress", "Family", "Health", "Creativity"].map(tag => (
                      <button key={tag}
                        className={`jnlTag ${(day.journalTags || []).includes(tag) ? "jnlTagActive" : ""}`}
                        onClick={() => updateDay(cur => {
                          const prev = cur.journalTags || [];
                          const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
                          return { ...cur, journalTags: next };
                        })}
                        type="button">
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="dpSection">
                  <div className="dpLabel">Journal</div>
                  <AutoGrowTextarea
                    value={day.journal || ""}
                    onChange={v => updateDay(cur => ({ ...cur, journal: v }))}
                    placeholder="Write your thoughts..."
                    className="input inputJournal" rows={10} minHeight={200} maxHeight={800} />
                </div>
              </>
            ) : null}
          </div>

        </div>
      </div>

    </div>
  );
}
