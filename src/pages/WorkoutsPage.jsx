import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ymd, addDays, startOfWeekMonday } from "../lib/dates.js";
import { parseHevyCsv } from "../lib/hevyCsv.js";
import { generateSchedule } from "../lib/programBuilder.js";
import ActiveWorkout from "../components/ActiveWorkout.jsx";
import WorkoutOnboarding from "../components/WorkoutOnboarding.jsx";

const workoutApi = typeof window !== "undefined" ? window.workoutApi : null;
const dialogApi = typeof window !== "undefined" ? window.dialogApi : null;
const planApi = typeof window !== "undefined" ? window.planApi : null;
const scheduleApi = typeof window !== "undefined" ? window.scheduleApi : null;
const sleepApi = typeof window !== "undefined" ? window.sleepApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;

// ───────────────────────── helpers ─────────────────────────

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxx-xxxx-xxxx".replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

/** Phase coaching messages */
const PHASE_MSGS = {
  accumulation: { icon: "📈", label: "Accumulation", color: "#5B7CF5", tip: "Build your foundation. Focus on form and volume tolerance." },
  progression:  { icon: "🔥", label: "Progression",  color: "#e87b35", tip: "Weights go up, reps may come down. Trust the process." },
  peak:         { icon: "⚡", label: "Peak",          color: "#d14040", tip: "Final push. You're the strongest you've been this cycle." },
  deload:       { icon: "🧘", label: "Deload",        color: "#2ea043", tip: "Recovery week. Go light, sleep well. Gains are cemented here." },
};

function getPhaseInfo(phase) {
  return PHASE_MSGS[phase] || PHASE_MSGS.accumulation;
}

// ───────────────────────── hooks ─────────────────────────

function useActivePlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let found = null;
      if (planApi) {
        found = await planApi.getActive();
        if (!cancelled && found) setPlan(found);
      }
      // fallback: check old settings-based program
      if (!found && settingsApi) {
        const raw = await settingsApi.get("workout_program");
        if (raw && !cancelled) {
          try { found = { _legacy: true, ...JSON.parse(raw) }; setPlan(found); } catch {}
        }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { plan, setPlan, loading };
}

function useWeekSchedule(weekStart) {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    if (!scheduleApi) return;
    let cancelled = false;
    const s = ymd(weekStart);
    const e = ymd(addDays(weekStart, 6));
    scheduleApi.getRange(s, e).then(data => {
      if (!cancelled) setSchedule(data || []);
    });
    return () => { cancelled = true; };
  }, [weekStart]);

  return schedule;
}

function useWorkoutLogs(weekStart) {
  const [logs, setLogs] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  const timers = useRef({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = ymd(weekStart);
      const e = ymd(addDays(weekStart, 6));
      if (workoutApi) {
        const data = await workoutApi.getRange(s, e);
        if (!cancelled) setLogs(data || {});
      }
    }
    load();
    return () => { cancelled = true; };
  }, [weekStart, reloadKey]);

  const saveLog = useCallback((dateStr, log) => {
    setLogs(prev => ({ ...prev, [dateStr]: log }));
    if (timers.current[dateStr]) clearTimeout(timers.current[dateStr]);
    timers.current[dateStr] = setTimeout(() => {
      if (workoutApi) workoutApi.save(dateStr, log);
    }, 300);
  }, []);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  return { logs, saveLog, reload };
}

function useSleepToday(todayStr) {
  const [sleep, setSleep] = useState(null);
  useEffect(() => {
    if (sleepApi) sleepApi.get(todayStr).then(d => setSleep(d));
  }, [todayStr]);
  return sleep;
}

// ───────────────────────── component ─────────────────────────

export default function WorkoutsPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(today));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [chartView, setChartView] = useState("week");
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthLogs, setMonthLogs] = useState({});
  const [activeWorkoutMode, setActiveWorkoutMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [showProgram, setShowProgram] = useState(() => {
    try { return localStorage.getItem("wo_show_program") !== "false"; } catch { return true; }
  });

  const toggleProgram = useCallback(() => {
    setShowProgram(prev => {
      const next = !prev;
      try { localStorage.setItem("wo_show_program", String(next)); } catch {}
      return next;
    });
  }, []);

  const { plan, setPlan, loading: planLoading } = useActivePlan();
  const weekSchedule = useWeekSchedule(weekStart);
  const { logs, saveLog, reload } = useWorkoutLogs(weekStart);
  const sleepToday = useSleepToday(todayStr);

  // Load month data
  useEffect(() => {
    if (!workoutApi) return;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const start = ymd(new Date(year, month, 1));
    const end = ymd(new Date(year, month + 1, 0));
    workoutApi.getRange(start, end).then(data => setMonthLogs(data || {}));
  }, [monthDate, logs]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  // Filter schedule based on showProgram toggle
  const visibleSchedule = useMemo(() => {
    return showProgram ? weekSchedule : [];
  }, [weekSchedule, showProgram]);

  // Find today's scheduled session
  const todaySession = useMemo(() => {
    return visibleSchedule.find(s => s.date === selectedDate) || null;
  }, [visibleSchedule, selectedDate]);

  const log = logs[selectedDate];
  const isRestDay = !todaySession && !log?.hevyTitle;
  const isHevyImport = !!log?.hevyTitle;

  // Phase info
  const phaseInfo = todaySession ? getPhaseInfo(todaySession.phase) : null;

  // Week progress
  const weekStats = useMemo(() => {
    const scheduled = visibleSchedule.filter(s => s.status !== 'rest');
    const completed = scheduled.filter(s => {
      const l = logs[s.date];
      return l?.completed || s.status === 'completed';
    });
    return { total: scheduled.length, completed: completed.length };
  }, [visibleSchedule, logs]);

  // Build workout template from schedule session
  const template = useMemo(() => {
    if (!todaySession) return null;
    const exercises = todaySession.exercises || [];
    return {
      title: todaySession.session_label || todaySession.sessionLabel || "Workout",
      subtitle: todaySession.session_type || todaySession.sessionType || "",
      notes: todaySession.coaching_cue || todaySession.coachingCue || "",
      exercises: exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rir: ex.rir,
        restSeconds: ex.restSeconds,
        exerciseId: ex.exerciseId,
        targetWeight: ex.targetWeight,
        lastSession: ex.lastSession,
      })),
    };
  }, [todaySession]);

  // Create empty log structure
  function createEmptyLog(tmpl) {
    if (!tmpl?.exercises?.length) return null;
    return {
      completed: false,
      exercises: tmpl.exercises.map(ex => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets || 3 }, () => ({ weight: "", reps: "", rir: "" })),
      })),
    };
  }

  const currentLog = log || createEmptyLog(template);

  const updateSet = (exIdx, setIdx, field, value) => {
    const current = logs[selectedDate] || createEmptyLog(template);
    if (!current) return;
    const next = {
      ...current,
      exercises: current.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value }),
        }
      ),
    };
    saveLog(selectedDate, next);
  };

  const toggleCompleted = () => {
    const current = logs[selectedDate] || createEmptyLog(template);
    if (!current) return;
    saveLog(selectedDate, { ...current, completed: !current.completed });
  };

  // Navigation
  const goPrevWeek = () => { const n = addDays(weekStart, -7); setWeekStart(n); setSelectedDate(ymd(n)); };
  const goNextWeek = () => { const n = addDays(weekStart, 7); setWeekStart(n); setSelectedDate(ymd(n)); };
  const goToday = () => { setWeekStart(startOfWeekMonday(today)); setSelectedDate(todayStr); };
  const goToDate = (dateStr) => {
    setSelectedDate(dateStr);
    const [y, m, d] = dateStr.split("-").map(Number);
    setWeekStart(startOfWeekMonday(new Date(y, m - 1, d)));
  };

  // Hevy import
  const importHevyCsv = async () => {
    if (!dialogApi || !workoutApi) return;
    try {
      const csvText = await dialogApi.openCsv();
      if (!csvText) return;
      const parsed = parseHevyCsv(csvText);
      const allDates = Object.keys(parsed);
      if (allDates.length === 0) { setImportStatus("No workouts found in CSV"); setTimeout(() => setImportStatus(null), 3000); return; }
      const existingDates = await workoutApi.allDates() || [];
      const existingSet = new Set(existingDates);
      const toImport = [];
      let skippedDuplicates = 0;
      for (const d of allDates) {
        if (!existingSet.has(d)) {
          toImport.push(d);
        } else {
          // Check if existing is already a Hevy import with the same title — skip if identical
          const existing = await workoutApi.get(d);
          if (existing?.hevyTitle && existing.hevyTitle === parsed[d].hevyTitle) {
            skippedDuplicates++;
          } else {
            // Overwrite — Hevy data is the source of truth for actual workouts performed
            toImport.push(d);
          }
        }
      }
      if (toImport.length === 0) { setImportStatus(`All ${allDates.length} workouts already imported`); setTimeout(() => setImportStatus(null), 4000); return; }
      for (const dateStr of toImport) await workoutApi.save(dateStr, parsed[dateStr]);
      setImportStatus(skippedDuplicates > 0 ? `Imported ${toImport.length} workouts (${skippedDuplicates} duplicates skipped)` : `Imported ${toImport.length} workouts`);
      setTimeout(() => setImportStatus(null), 5000);
      reload();
    } catch (err) { setImportStatus(`Import error: ${err.message}`); setTimeout(() => setImportStatus(null), 5000); }
  };

  // Save plan from onboarding
  const handleOnboardingComplete = async (data) => {
    const { program, ...onboardingData } = data;
    if (!program) { setShowOnboarding(false); return; }

    // Deactivate old plans
    if (planApi) await planApi.deactivateAll();

    const planId = uuid();
    const planData = { ...program, id: planId, onboarding: onboardingData };

    if (planApi) await planApi.save(planId, planData, 'active');

    // Convert onboarding preferredDays (0=Mon..6=Sun) to JS day-of-week (0=Sun..6=Sat)
    const obDays = onboardingData.schedule?.preferredDays || [];
    const jsDays = obDays.map(d => ((d + 1) % 7)); // 0=Mon->1, 6=Sun->0

    // Generate schedule entries for the full plan
    const startDate = ymd(startOfWeekMonday(new Date()));
    const scheduleEntries = generateSchedule(planData, startDate, jsDays);

    // Save schedule to database
    if (scheduleApi && scheduleEntries.length > 0) {
      await scheduleApi.bulkInsert(
        scheduleEntries.map(s => ({
          id: s.id,
          plan_id: planId,
          date: s.date,
          status: s.status || 'scheduled',
          data: {
            session_type: s.session_type,
            sessionType: s.session_type,
            session_label: s.session_label || s.session_type,
            sessionLabel: s.session_label || s.session_type,
            phase: s.phase,
            phase_type: s.phase_type,
            week_number: s.week_number,
            exercises: s.exercises_json || [],
            estimated_duration_min: s.estimated_duration_min,
            estimatedDurationMin: s.estimated_duration_min,
            rir: s.rir,
            coaching_cue: s.coaching_cue,
            coachingCue: s.coaching_cue,
          },
        }))
      );
    }

    // Also save to old settings for backward compat
    if (settingsApi) await settingsApi.set("workout_program", JSON.stringify(program));

    setPlan({ id: planId, ...planData });
    setShowOnboarding(false);
    reload();
  };

  // Month chart data
  const weekRange = (() => {
    const mon = weekStart;
    const sun = addDays(weekStart, 6);
    const l = mon.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const r = sun.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${l} \u2014 ${r}`;
  })();

  const monthDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const startPad = firstDow === 0 ? 6 : firstDow - 1;
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = ymd(date);
      const dayLog = monthLogs[key];
      const hasHevy = dayLog?.hevyTitle;
      const completed = !!dayLog?.completed;
      const hasData = !!dayLog;
      const isFuture = date > today;
      days.push({ key, day: d, completed, hasData, hasHevy, isFuture, isSelected: key === selectedDate, isToday: key === todayStr });
    }
    return days;
  }, [monthDate, monthLogs, today, todayStr, selectedDate]);

  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const canNextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) <= today;

  const monthStats = useMemo(() => {
    const valid = monthDays.filter(d => d && !d.isFuture);
    const completed = valid.filter(d => d.completed);
    return { completed: completed.length, total: valid.length };
  }, [monthDays]);

  // ─────────── Readiness ───────────
  const readinessMsg = useMemo(() => {
    if (!sleepToday) return null;
    const hours = sleepToday.hours || 0;
    if (hours < 5.5) return { level: "low", msg: `Sleep was low (${hours.toFixed(1)}h). Consider a lighter session today.`, color: "#e87b35" };
    if (hours < 6.5) return { level: "moderate", msg: `Sleep was ${hours.toFixed(1)}h — manageable. Stay focused on quality reps.`, color: "#c07b1a" };
    return { level: "good", msg: `Sleep: ${hours.toFixed(1)}h. You're good to go.`, color: "#2ea043" };
  }, [sleepToday]);

  // ─────────── Estimated duration ───────────
  const estDuration = todaySession?.estimated_duration_min || todaySession?.estimatedDurationMin || (template?.exercises ? Math.round(template.exercises.length * 7.5) : null);

  // ─────────── Up next ───────────
  const upNext = useMemo(() => {
    return visibleSchedule
      .filter(s => s.date > selectedDate)
      .slice(0, 2);
  }, [visibleSchedule, selectedDate]);

  // Show onboarding
  if (showOnboarding || (!planLoading && !plan)) {
    return <WorkoutOnboarding onComplete={handleOnboardingComplete} onCancel={plan ? () => setShowOnboarding(false) : null} />;
  }

  return (
    <div className="workoutsPage">
      <style>{WO_STYLES}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Workouts</h1>
          {plan && <div className="weekBadge">{plan.split?.toUpperCase() || plan.goal?.toUpperCase() || "TRAINING"}</div>}
        </div>
        <div className="nav">
          <button
            className={`btn ${showProgram ? "woProgramOnBtn" : ""}`}
            onClick={toggleProgram}
            title={showProgram ? "Hide program schedule" : "Show program schedule"}
            type="button"
            style={{ marginRight: 4 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showProgram ? (
                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
              ) : (
                <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
              )}
            </svg>
            {showProgram ? "Program" : "Program"}
          </button>
          <button className="btn" onClick={() => setShowOnboarding(true)} title="Change Program" type="button" style={{ marginRight: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="btn" onClick={importHevyCsv} title="Import Hevy CSV">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import Hevy
          </button>
        </div>
      </div>

      {importStatus && <div className="woImportStatus">{importStatus}</div>}

      {/* View Toggle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div className="waterChartToggle">
          <button className={`waterChartToggleBtn ${chartView === "week" ? "waterChartToggleActive" : ""}`} onClick={() => setChartView("week")} type="button">Weekly</button>
          <button className={`waterChartToggleBtn ${chartView === "month" ? "waterChartToggleActive" : ""}`} onClick={() => setChartView("month")} type="button">Monthly</button>
        </div>
      </div>

      {chartView === "week" ? (
        <>
          {/* Week navigation */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button className="waterChartNavBtn" onClick={goPrevWeek} type="button">&lsaquo;</button>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)", minWidth: 160, textAlign: "center" }}>{weekRange}</div>
            <button className="waterChartNavBtn" onClick={goNextWeek} type="button">&rsaquo;</button>
            <button className="btn btnPrimary" onClick={goToday} style={{ fontSize: 12, padding: "4px 12px" }}>Today</button>
          </div>

          {/* Week strip — schedule-aware */}
          <div className="woWeekStrip">
            {weekDates.map(d => {
              const ds = ymd(d);
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDate;
              const dayLog = logs[ds];
              const completed = dayLog?.completed;
              const hasHevy = !!dayLog?.hevyTitle;
              const hasLoggedWorkout = !hasHevy && dayLog?.exercises?.length > 0;
              const session = visibleSchedule.find(s => s.date === ds);
              const hasData = hasHevy || hasLoggedWorkout;
              const isRest = !session && !hasData;
              const isPast = d < today && !isToday;
              const isMissed = isPast && session && !completed && !hasData;
              const stripLabel = hasHevy ? dayLog.hevyTitle : hasLoggedWorkout ? (dayLog.exercises[0]?.name?.split("(")[0]?.trim() || "Workout") : session ? (session.session_label || session.sessionLabel || "Workout") : "Rest";
              const dur = session?.estimated_duration_min || session?.estimatedDurationMin;

              return (
                <button
                  key={ds}
                  className={[
                    "woStripDay",
                    isToday && "woStripToday",
                    isSelected && "woStripSelected",
                    completed && "woStripDone",
                    isMissed && "woStripMissed",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setSelectedDate(ds)}
                  type="button"
                >
                  <div className="woStripDow">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="woStripDate">{d.getDate()}</div>
                  <div className={`woStripType ${isRest ? "woStripRest" : ""}`}>{stripLabel}</div>
                  {dur && !isRest && <div className="woStripDur">~{dur} min</div>}
                  {completed && <div className="woStripCheck">{"\u2713"}</div>}
                  {isMissed && <div className="woStripMissedDot" />}
                </button>
              );
            })}
          </div>

          {/* ═══════════ TODAY'S WORKOUT HERO ═══════════ */}
          <div className="woContent">

            {/* Phase + Progress bar */}
            {phaseInfo && todaySession && (
              <div className="woPhaseBar">
                <div className="woPhasePill" style={{ background: phaseInfo.color + "18", color: phaseInfo.color }}>
                  {phaseInfo.icon} {phaseInfo.label} Phase
                  {todaySession.week_number && <span className="woPhaseWeek"> &middot; Week {todaySession.week_number}</span>}
                </div>
                <div className="woWeekProgress">
                  {weekStats.completed}/{weekStats.total} sessions this week
                </div>
              </div>
            )}

            {/* Header */}
            <div className="woHeader">
              <div>
                <div className="woHeaderDay">
                  {selectedDateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </div>
                {isRestDay && !isHevyImport ? (
                  <div className="woHeaderTitle">Rest & Recovery</div>
                ) : (
                  <div className="woHeaderTitle">
                    {isHevyImport ? log.hevyTitle : (template?.title || "Workout")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isHevyImport && <span className="woHevyLabel">Hevy Import</span>}
                {!isRestDay && !isHevyImport && !currentLog?.completed && (
                  <button className="btn btnPrimary woStartBtn" onClick={() => setActiveWorkoutMode(true)} type="button">
                    Start Workout
                  </button>
                )}
                {!isRestDay && (
                  <button className={`btn ${currentLog?.completed ? "woCompletedBtn" : ""}`} onClick={toggleCompleted} type="button">
                    {currentLog?.completed ? "\u2713 Completed" : "Mark Complete"}
                  </button>
                )}
              </div>
            </div>

            {/* Session meta */}
            {template && !isRestDay && !isHevyImport && (
              <div className="woSessionMeta">
                {estDuration && <span>{estDuration} min</span>}
                <span>{template.exercises.length} exercises</span>
                <span>{template.exercises.reduce((s, e) => s + (e.sets || 3), 0)} sets</span>
                {todaySession?.rir !== undefined && <span>RIR {todaySession.rir}</span>}
              </div>
            )}

            {/* Coaching cue */}
            {template?.notes && !isHevyImport && (
              <div className="woCoachingCue">{template.notes}</div>
            )}

            {/* Readiness check */}
            {readinessMsg && !isRestDay && (
              <div className="woReadiness" style={{ borderColor: readinessMsg.color + "40" }}>
                <div className="woReadinessIcon" style={{ color: readinessMsg.color }}>
                  {readinessMsg.level === "good" ? "\u2713" : readinessMsg.level === "moderate" ? "!" : "\u26A0"}
                </div>
                <div className="woReadinessMsg">{readinessMsg.msg}</div>
              </div>
            )}

            {/* ═══ REST DAY ═══ */}
            {isRestDay && !isHevyImport && (
              <div className="woRestCard">
                <div className="emptyState">
                  <div className="emptyStateIcon" style={{ fontSize: 40 }}>🧘</div>
                  <div className="emptyStateTitle">Recovery is part of the plan.</div>
                  <div className="emptyStateSub">
                    Rest days let your body absorb training stress and grow stronger.
                  </div>
                </div>
                {upNext.length > 0 && (
                  <div className="woUpNext" style={{ marginTop: 24 }}>
                    <div className="woUpNextLabel">UP NEXT</div>
                    {upNext.map(s => (
                      <div key={s.date} className="woUpNextItem" onClick={() => goToDate(s.date)}>
                        <span className="woUpNextDate">
                          {new Date(s.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        <span className="woUpNextSession">{s.session_label || s.sessionLabel}</span>
                        {(s.estimated_duration_min || s.estimatedDurationMin) && (
                          <span className="woUpNextDur">~{s.estimated_duration_min || s.estimatedDurationMin} min</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ HEVY IMPORT ═══ */}
            {isHevyImport && (
              <div className="woExercises">
                {log.exercises.map((ex, exIdx) => (
                  <div className="woExCard" key={exIdx}>
                    <div className="woExHeader">
                      <div className="woExName">{ex.name}</div>
                      <div className="woExTarget">{ex.sets.length} sets</div>
                    </div>
                    <div className="woSetsGrid">
                      <div className="woSetHeader"><span>Set</span><span>Weight (lbs)</span><span>Reps</span></div>
                      {ex.sets.map((s, si) => (
                        <div className="woSetRow" key={si}>
                          <span className="woSetNum">{si + 1}</span>
                          <input type="number" className="woSetInput" value={s.weight} onChange={e => updateSet(exIdx, si, "weight", e.target.value)} />
                          <input type="number" className="woSetInput" value={s.reps} onChange={e => updateSet(exIdx, si, "reps", e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ═══ SCHEDULED WORKOUT EXERCISES ═══ */}
            {template && !isRestDay && !isHevyImport && (
              <div className="woExercises">
                {template.exercises.map((ex, exIdx) => {
                  const exLog = currentLog?.exercises?.[exIdx];
                  return (
                    <div className="woExCard" key={exIdx}>
                      <div className="woExHeader">
                        <div>
                          <div className="woExName">{ex.name}</div>
                          {ex.lastSession && (
                            <div className="woExLast">Last: {ex.lastSession}</div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <div className="woExTarget">{ex.sets} x {ex.reps}</div>
                          {ex.rir !== undefined && <div className="woExRir">RIR {ex.rir}</div>}
                        </div>
                      </div>
                      {ex.targetWeight && (
                        <div className="woExTargetWeight">
                          Target: {ex.targetWeight} lbs
                        </div>
                      )}
                      <div className="woSetsGrid">
                        <div className="woSetHeader">
                          <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span>RIR</span>
                        </div>
                        {Array.from({ length: ex.sets || 3 }, (_, si) => {
                          const setLog = exLog?.sets?.[si] || { weight: "", reps: "", rir: "" };
                          return (
                            <div className="woSetRow woSetRow4" key={si}>
                              <span className="woSetNum">{si + 1}</span>
                              <input type="number" className="woSetInput" placeholder="\u2014" value={setLog.weight} onChange={e => updateSet(exIdx, si, "weight", e.target.value)} />
                              <input type="number" className="woSetInput" placeholder="\u2014" value={setLog.reps} onChange={e => updateSet(exIdx, si, "reps", e.target.value)} />
                              <input type="number" className="woSetInput" placeholder="\u2014" value={setLog.rir} onChange={e => updateSet(exIdx, si, "rir", e.target.value)} />
                            </div>
                          );
                        })}
                      </div>
                      {ex.restSeconds && (
                        <div className="woExRest">Rest: {ex.restSeconds}s</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Up next (on training days) */}
            {!isRestDay && upNext.length > 0 && (
              <div className="woUpNext" style={{ marginTop: 24 }}>
                <div className="woUpNextLabel">UP NEXT</div>
                {upNext.map(s => (
                  <div key={s.date} className="woUpNextItem" onClick={() => goToDate(s.date)}>
                    <span className="woUpNextDate">
                      {new Date(s.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="woUpNextSession">{s.session_label || s.sessionLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ═══════════ MONTHLY VIEW ═══════════ */
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="waterMonthChart">
            <div className="waterChartHeader">
              <button className="waterChartNavBtn" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} type="button">&lsaquo;</button>
              <div className="waterWeekTitle">{monthLabel}</div>
              <button className="waterChartNavBtn" onClick={() => canNextMonth && setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} disabled={!canNextMonth} type="button">&rsaquo;</button>
            </div>
            <div className="waterMonthStats">
              <div className="waterMonthStat">
                <div className="waterMonthStatNum waterMonthStatGoal">{monthStats.completed}</div>
                <div className="waterMonthStatLabel">Completed</div>
              </div>
            </div>
            <div className="waterMonthGrid">
              <div className="waterMonthDow">Mon</div><div className="waterMonthDow">Tue</div><div className="waterMonthDow">Wed</div>
              <div className="waterMonthDow">Thu</div><div className="waterMonthDow">Fri</div><div className="waterMonthDow">Sat</div><div className="waterMonthDow">Sun</div>
              {monthDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} className="waterMonthCell waterMonthCellEmpty" />;
                return (
                  <div
                    key={day.key}
                    className={[
                      "waterMonthCell",
                      day.isFuture ? "waterMonthCellFuture" : "",
                      day.isSelected ? "waterMonthCellSelected" : "",
                      day.isToday ? "waterMonthCellToday" : "",
                      day.completed ? "waterMonthCellGoal" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => !day.isFuture && goToDate(day.key)}
                    style={{ cursor: day.isFuture ? "default" : "pointer" }}
                  >
                    <div className="waterMonthCellDay">{day.day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Workout Overlay */}
      {activeWorkoutMode && template && (
        <ActiveWorkout
          workout={template}
          previousData={null}
          onComplete={(result) => { saveLog(selectedDate, result); setActiveWorkoutMode(false); reload(); }}
          onCancel={() => setActiveWorkoutMode(false)}
        />
      )}
    </div>
  );
}

// ───────────────────────── styles ─────────────────────────

const WO_STYLES = `
/* Phase bar */
.woPhaseBar{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.woPhasePill{
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.woPhaseWeek{
  font-weight: 600;
  opacity: 0.8;
}
.woWeekProgress{
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

/* Session meta */
.woSessionMeta{
  display: flex;
  gap: 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 12px;
}
.woSessionMeta span{
  padding: 3px 10px;
  background: var(--chip);
  border-radius: 999px;
}

/* Coaching cue */
.woCoachingCue{
  font-size: 13px;
  font-weight: 600;
  font-style: italic;
  color: var(--muted);
  padding: 12px 14px;
  background: var(--accent-soft, rgba(91,124,245,0.06));
  border-radius: 10px;
  margin-bottom: 16px;
  border-left: 3px solid var(--accent);
}

/* Readiness */
.woReadiness{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--chip);
  border: 1px solid;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.woReadinessIcon{
  font-size: 16px;
  font-weight: 900;
}
.woReadinessMsg{
  flex: 1;
}

/* Start button */
/* Program toggle active state */
.woProgramOnBtn{
  background: var(--accent-soft, rgba(91,124,245,0.08));
  border-color: var(--accent);
  color: var(--accent);
}

.woStartBtn{
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 700;
}

/* Exercise enhancements */
.woExLast{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}
.woExRir{
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  padding: 2px 8px;
  background: var(--accent-soft, rgba(91,124,245,0.08));
  border-radius: 999px;
}
.woExTargetWeight{
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  padding: 6px 14px;
  background: var(--accent-soft, rgba(91,124,245,0.04));
  border-bottom: 1px solid var(--line2);
}
.woExRest{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  padding: 6px 14px;
  border-top: 1px solid var(--line2);
}

/* 4-column set grid */
.woSetRow4{
  grid-template-columns: 40px 1fr 1fr 1fr;
}
.woSetRow4 + .woSetRow4{
  /* inherits */
}
.woSetsGrid .woSetHeader:has(+ .woSetRow4),
.woSetHeader:nth-child(1){
  /* auto */
}

/* Missed strip day */
.woStripMissed{
  background: rgba(232,123,53,0.06);
  border-color: rgba(232,123,53,0.2);
}
.woStripMissedDot{
  position: absolute;
  top: 6px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e87b35;
}
.woStripDur{
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

/* Up next */
.woUpNext{
  border-top: 1px solid var(--line2);
  padding-top: 16px;
}
.woUpNextLabel{
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}
.woUpNextItem{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.woUpNextItem:hover{
  background: var(--chip);
}
.woUpNextDate{
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  min-width: 100px;
}
.woUpNextSession{
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  flex: 1;
}
.woUpNextDur{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
`;
