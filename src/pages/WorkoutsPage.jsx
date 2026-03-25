import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ymd, addDays, startOfWeekMonday } from "../lib/dates.js";
import {
  PROGRAM_NAME,
  WORKOUT_DAYS,
  getWorkoutForDate,
  createEmptyLog,
} from "../lib/workouts.js";
import { parseHevyCsv } from "../lib/hevyCsv.js";
import ActiveWorkout from "../components/ActiveWorkout.jsx";
import WorkoutOnboarding from "../components/WorkoutOnboarding.jsx";
import { useWorkoutProgram } from "../hooks/useWorkoutProgram.js";

const api = typeof window !== "undefined" ? window.workoutApi : null;
const dialogApi = typeof window !== "undefined" ? window.dialogApi : null;

function useWorkoutLogs(weekStart) {
  const [logs, setLogs] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  const timers = useRef({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = ymd(weekStart);
      const e = ymd(addDays(weekStart, 6));
      if (api) {
        const data = await api.getRange(s, e);
        if (!cancelled) setLogs(data || {});
      }
    }
    load();
    return () => { cancelled = true; };
  }, [weekStart, reloadKey]);

  const saveLog = useCallback((dateStr, log) => {
    setLogs((prev) => ({ ...prev, [dateStr]: log }));
    if (timers.current[dateStr]) clearTimeout(timers.current[dateStr]);
    timers.current[dateStr] = setTimeout(() => {
      if (api) api.save(dateStr, log);
    }, 300);
  }, []);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  return { logs, saveLog, reload };
}

export default function WorkoutsPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(today));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [chartView, setChartView] = useState("week");
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthLogs, setMonthLogs] = useState({});
  const [activeWorkoutMode, setActiveWorkoutMode] = useState(false);

  const { program, hasProgram, saveProgram, loading: programLoading } = useWorkoutProgram();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { logs, saveLog, reload } = useWorkoutLogs(weekStart);

  // Load month data
  useEffect(() => {
    if (!api) return;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const start = ymd(new Date(year, month, 1));
    const end = ymd(new Date(year, month + 1, 0));
    api.getRange(start, end).then(data => setMonthLogs(data || {}));
  }, [monthDate, logs]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const template = useMemo(() => getWorkoutForDate(selectedDateObj), [selectedDateObj]);
  const log = logs[selectedDate] || createEmptyLog(template);
  const isHevyImport = !!log?.hevyTitle;
  const isRestDay = !isHevyImport && (!template || template.exercises.length === 0);

  const updateSet = (exIdx, setIdx, field, value) => {
    const current = logs[selectedDate] || createEmptyLog(template);
    if (!current) return;
    const next = {
      ...current,
      exercises: current.exercises.map((ex, ei) =>
        ei !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, [field]: value }
              ),
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

  const goPrevWeek = () => {
    const newStart = addDays(weekStart, -7);
    setWeekStart(newStart);
    setSelectedDate(ymd(newStart));
  };
  const goNextWeek = () => {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
    setSelectedDate(ymd(newStart));
  };
  const goToday = () => {
    setWeekStart(startOfWeekMonday(today));
    setSelectedDate(todayStr);
  };

  const [importStatus, setImportStatus] = useState(null);

  const importHevyCsv = async () => {
    if (!dialogApi || !api) return;
    try {
      const csvText = await dialogApi.openCsv();
      if (!csvText) return;

      const parsed = parseHevyCsv(csvText);
      const allDates = Object.keys(parsed);
      if (allDates.length === 0) {
        setImportStatus("No workouts found in CSV");
        setTimeout(() => setImportStatus(null), 3000);
        return;
      }

      // Check existing workout logs — overwrite if they're just empty templates (completed: false)
      const existingDates = await api.allDates() || [];
      const existingSet = new Set(existingDates);
      const toImport = [];
      for (const d of allDates) {
        if (!existingSet.has(d)) {
          toImport.push(d);
        } else {
          // Check if existing is just an empty template
          const existing = await api.get(d);
          if (!existing || !existing.completed) {
            toImport.push(d); // overwrite template with real data
          }
        }
      }

      if (toImport.length === 0) {
        setImportStatus(`All ${allDates.length} workouts already imported`);
        setTimeout(() => setImportStatus(null), 4000);
        return;
      }

      for (const dateStr of toImport) {
        await api.save(dateStr, parsed[dateStr]);
      }

      const skipped = allDates.length - toImport.length;
      const msg = skipped > 0
        ? `Imported ${toImport.length} workouts (${skipped} already existed)`
        : `Imported ${toImport.length} workouts`;
      setImportStatus(msg);
      setTimeout(() => setImportStatus(null), 5000);
      reload();
    } catch (err) {
      setImportStatus(`Import error: ${err.message}`);
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  const weekRange = (() => {
    const mon = weekStart;
    const sun = addDays(weekStart, 6);
    const l = mon.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const r = sun.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${l} \u2014 ${r}`;
  })();

  const goToDate = (dateStr) => {
    setSelectedDate(dateStr);
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    setWeekStart(startOfWeekMonday(date));
  };

  // --- MONTH CHART ---
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
      const tmpl = getWorkoutForDate(date);
      const dayLog = monthLogs[key];
      const hasHevy = dayLog?.hevyTitle;
      const isRest = !hasHevy && (!tmpl || tmpl.exercises.length === 0);
      const completed = !!dayLog?.completed;
      const hasData = !!dayLog;
      const isFuture = date > today;
      const label = hasHevy ? dayLog.hevyTitle : (tmpl?.title || "Rest");

      days.push({
        key, day: d, isRest, completed, hasData, hasHevy,
        label, isFuture,
        isSelected: key === selectedDate,
        isToday: key === todayStr,
      });
    }
    return days;
  }, [monthDate, monthLogs, today, todayStr, selectedDate]);

  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const canNextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) <= today;

  const monthStats = useMemo(() => {
    const valid = monthDays.filter(d => d && !d.isFuture);
    const workoutDays = valid.filter(d => !d.isRest || d.hasHevy);
    const completed = valid.filter(d => d.completed);
    return { workoutDays: workoutDays.length, completed: completed.length, total: valid.length };
  }, [monthDays]);

  // Show workout onboarding for new users or when requested
  if (showOnboarding || (!programLoading && !hasProgram)) {
    return (
      <WorkoutOnboarding onComplete={(prog) => {
        saveProgram(prog);
        setShowOnboarding(false);
      }} />
    );
  }

  return (
    <div className="workoutsPage">
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Workouts</h1>
          <div className="weekBadge">{program?.split?.toUpperCase() || PROGRAM_NAME}</div>
        </div>
        <div className="nav">
          <button className="btn" onClick={() => setShowOnboarding(true)} title="Change Program" type="button" style={{ marginRight: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="btn" onClick={importHevyCsv} title="Import Hevy CSV">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import Hevy
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="woImportStatus">{importStatus}</div>
      )}

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

          {/* Week strip */}
          <div className="woWeekStrip">
            {weekDates.map((d) => {
              const ds = ymd(d);
              const tmpl = getWorkoutForDate(d);
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDate;
              const dayLog = logs[ds];
              const completed = dayLog?.completed;
              const hasHevy = dayLog?.hevyTitle;
              const isRest = !hasHevy && (!tmpl || tmpl.exercises.length === 0);
              const stripLabel = hasHevy ? dayLog.hevyTitle : (tmpl?.title || "Rest");

              return (
                <button
                  key={ds}
                  className={[
                    "woStripDay",
                    isToday && "woStripToday",
                    isSelected && "woStripSelected",
                    completed && "woStripDone",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setSelectedDate(ds)}
                  type="button"
                >
                  <div className="woStripDow">
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div className="woStripDate">{d.getDate()}</div>
                  <div className={`woStripType ${isRest ? "woStripRest" : ""}`}>
                    {stripLabel}
                  </div>
                  {completed && <div className="woStripCheck">{"\u2713"}</div>}
                </button>
              );
            })}
          </div>

          {/* Workout content */}
          <div className="woContent">
            <div className="woHeader">
              <div>
                <div className="woHeaderDay">
                  {selectedDateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <div className="woHeaderTitle">
                  {isHevyImport
                    ? log.hevyTitle
                    : template
                      ? `${template.title} \u2014 ${template.subtitle}`
                      : "Rest Day"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isHevyImport && <span className="woHevyLabel">Hevy Import</span>}
                {!isRestDay && !log?.completed && (
                  <button
                    className="btn btnPrimary"
                    onClick={() => setActiveWorkoutMode(true)}
                    type="button"
                  >
                    Start Workout
                  </button>
                )}
                {!isRestDay && (
                  <button
                    className={`btn ${log?.completed ? "woCompletedBtn" : ""}`}
                    onClick={toggleCompleted}
                    type="button"
                  >
                    {log?.completed ? "✓ Completed" : "Mark Complete"}
                  </button>
                )}
              </div>
            </div>

            {template?.notes && !isHevyImport && (
              <div className="woNotes">{template.notes}</div>
            )}

            {isHevyImport ? (
              <div className="woExercises">
                {log.exercises.map((ex, exIdx) => (
                  <div className="woExCard" key={exIdx}>
                    <div className="woExHeader">
                      <div className="woExName">{ex.name}</div>
                      <div className="woExTarget">{ex.sets.length} sets</div>
                    </div>
                    <div className="woSetsGrid">
                      <div className="woSetHeader">
                        <span>Set</span>
                        <span>Weight (lbs)</span>
                        <span>Reps</span>
                      </div>
                      {ex.sets.map((s, si) => (
                        <div className="woSetRow" key={si}>
                          <span className="woSetNum">{si + 1}</span>
                          <input type="number" className="woSetInput" value={s.weight} onChange={(e) => updateSet(exIdx, si, "weight", e.target.value)} />
                          <input type="number" className="woSetInput" value={s.reps} onChange={(e) => updateSet(exIdx, si, "reps", e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : isRestDay ? (
              <div className="woRestCard">
                <div className="emptyState">
                  <div className="emptyStateIcon">💪</div>
                  <div className="emptyStateTitle">Rest & Recover</div>
                  <div className="emptyStateSub">{template?.notes || "Recovery is part of the process. Take the day off, stretch, or do some light cardio."}</div>
                </div>
              </div>
            ) : (
              <div className="woExercises">
                {template.exercises.map((ex, exIdx) => {
                  const exLog = log?.exercises?.[exIdx];
                  return (
                    <div className="woExCard" key={exIdx}>
                      <div className="woExHeader">
                        <div className="woExName">{ex.name}</div>
                        <div className="woExTarget">{ex.sets} x {ex.reps}</div>
                      </div>
                      <div className="woSetsGrid">
                        <div className="woSetHeader">
                          <span>Set</span>
                          <span>Weight (lbs)</span>
                          <span>Reps</span>
                        </div>
                        {Array.from({ length: ex.sets }, (_, si) => {
                          const setLog = exLog?.sets?.[si] || { weight: "", reps: "" };
                          return (
                            <div className="woSetRow" key={si}>
                              <span className="woSetNum">{si + 1}</span>
                              <input type="number" className="woSetInput" placeholder="\u2014" value={setLog.weight} onChange={(e) => updateSet(exIdx, si, "weight", e.target.value)} />
                              <input type="number" className="woSetInput" placeholder="\u2014" value={setLog.reps} onChange={(e) => updateSet(exIdx, si, "reps", e.target.value)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Monthly View */
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="waterMonthChart">
            <div className="waterChartHeader">
              <button className="waterChartNavBtn" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} type="button">&lsaquo;</button>
              <div className="waterWeekTitle">{monthLabel}</div>
              <button className="waterChartNavBtn" onClick={() => canNextMonth && setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} disabled={!canNextMonth} type="button">&rsaquo;</button>
            </div>

            <div className="waterMonthStats">
              <div className="waterMonthStat">
                <div className="waterMonthStatNum">{monthStats.workoutDays}</div>
                <div className="waterMonthStatLabel">Workout days</div>
              </div>
              <div className="waterMonthStat">
                <div className="waterMonthStatNum waterMonthStatGoal">{monthStats.completed}</div>
                <div className="waterMonthStatLabel">Completed</div>
              </div>
              <div className="waterMonthStat">
                <div className="waterMonthStatNum waterMonthStatMissed">{monthStats.workoutDays - monthStats.completed}</div>
                <div className="waterMonthStatLabel">Missed</div>
              </div>
            </div>

            <div className="waterMonthGrid">
              <div className="waterMonthDow">Mon</div>
              <div className="waterMonthDow">Tue</div>
              <div className="waterMonthDow">Wed</div>
              <div className="waterMonthDow">Thu</div>
              <div className="waterMonthDow">Fri</div>
              <div className="waterMonthDow">Sat</div>
              <div className="waterMonthDow">Sun</div>
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
                      !day.isRest && !day.completed && !day.isFuture ? "waterMonthCellPartial" : "",
                      day.isRest && !day.hasHevy && !day.isFuture ? "waterMonthCellMissed" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => !day.isFuture && goToDate(day.key)}
                    style={{ cursor: day.isFuture ? "default" : "pointer" }}
                  >
                    <div className="waterMonthCellDay">{day.day}</div>
                    {!day.isFuture && (
                      <div className="waterMonthCellGlasses" style={{ fontSize: 8 }}>{day.label}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="waterChartLegend">
              <span className="waterLegendItem"><span className="waterLegendDot waterLegendGoal" /> Completed</span>
              <span className="waterLegendItem"><span className="waterLegendDot waterLegendPartial" /> Scheduled</span>
              <span className="waterLegendItem"><span className="waterLegendDot waterLegendMissed" /> Rest</span>
            </div>
          </div>
        </div>
      )}
      {/* Active Workout Overlay */}
      {activeWorkoutMode && template && (
        <ActiveWorkout
          workout={template}
          previousData={null}
          onComplete={(result) => {
            saveLog(selectedDate, result);
            setActiveWorkoutMode(false);
            reload();
          }}
          onCancel={() => setActiveWorkoutMode(false)}
        />
      )}
    </div>
  );
}
