import { useCallback, useMemo, useRef, useState } from "react";
import { HABITS } from "../lib/constants.js";
import { ymd, addDays, startOfWeekMonday } from "../lib/dates.js";
import { bestStreakForHabit, currentStreakEndingOn } from "../lib/habits.js";
import { useWeekData } from "../hooks/useDb.js";
import { useHabits } from "../hooks/useHabits.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

function buildHeatmapWeeks(allData, today, habitsList, year) {
  // Build weeks from Jan 1 to Dec 31 of the given year
  const weeks = [];
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  // Start from the Monday on or before Jan 1
  let cursor = startOfWeekMonday(jan1);

  while (cursor <= dec31 || weeks.length === 0) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(cursor, d);
      const key = ymd(date);
      const inYear = date.getFullYear() === year;
      const entry = allData?.[key];
      let done = 0;
      if (entry?.habits) {
        for (const h of habitsList) if (entry.habits[h]) done++;
      }
      const pct = habitsList.length ? Math.round((done / habitsList.length) * 100) : 0;
      const isFuture = date > today;
      days.push({ key, pct, isFuture: isFuture || !inYear, date, inYear });
    }
    weeks.push(days);
    cursor = addDays(cursor, 7);
    if (cursor > dec31 && weeks.length > 0) break;
  }
  return weeks;
}

function heatColor(pct, isFuture) {
  if (isFuture) return "var(--border)";
  if (pct === 0) return "var(--bg)";
  if (pct < 25) return "#c6e48b";
  if (pct < 50) return "#7bc96f";
  if (pct < 75) return "#239a3b";
  return "#196127";
}

export default function HabitsPage() {
  const { habits: HABITS_LIST, addHabit, removeHabit, renameHabit, reorderHabits } = useHabits();
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);
  const [view, setView] = useState("matrix"); // "matrix" | "heatmap" | "monthly"
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(today));
  const [showHistorical, setShowHistorical] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [editingHabit, setEditingHabit] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmDeleteHabit, setConfirmDeleteHabit] = useState(null);
  const dragIdx = useRef(null);
  const overIdx = useRef(null);

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    addHabit(newHabitName.trim());
    setNewHabitName("");
  };

  const handleRename = () => {
    if (editingHabit && editingValue.trim()) renameHabit(editingHabit, editingValue.trim());
    setEditingHabit(null);
    setEditingValue("");
  };

  const handleDragStart = (idx) => (e) => { dragIdx.current = idx; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (idx) => (e) => { e.preventDefault(); overIdx.current = idx; };
  const handleDragEnd = () => {
    if (dragIdx.current !== null && overIdx.current !== null && dragIdx.current !== overIdx.current) {
      const next = [...HABITS_LIST];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx.current, 0, moved);
      reorderHabits(next);
    }
    dragIdx.current = null;
    overIdx.current = null;
  };
  const { weekData, allData, loading, saveDay } = useWeekData(weekStart);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const goPrev = () => setWeekStart((d) => addDays(d, -7));
  const goNext = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeekMonday(today));

  // Weekly stats per habit
  const habitStats = useMemo(() => {
    return HABITS_LIST.map((h) => {
      let weekDone = 0;
      for (const d of weekDates) {
        const key = ymd(d);
        if (weekData[key]?.habits?.[h]) weekDone++;
      }
      const streak = currentStreakEndingOn(allData, todayStr, h);
      const best = bestStreakForHabit(allData, h);
      return { name: h, weekDone, streak, best };
    });
  }, [HABITS_LIST, weekData, allData, weekDates, todayStr]);

  // Overall weekly completion
  const overallStats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const d of weekDates) {
      const key = ymd(d);
      const entry = weekData[key];
      for (const h of HABITS_LIST) {
        total++;
        if (entry?.habits?.[h]) done++;
      }
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }, [HABITS_LIST, weekData, weekDates]);

  // Per-day completion
  const dayStats = useMemo(() => {
    return weekDates.map((d) => {
      const key = ymd(d);
      const entry = weekData[key];
      let done = 0;
      for (const h of HABITS_LIST) if (entry?.habits?.[h]) done++;
      return { date: d, dateStr: key, done, pct: Math.round((done / HABITS_LIST.length) * 100) };
    });
  }, [HABITS_LIST, weekData, weekDates]);

  const toggleHabit = (dateStr, habit) => {
    const entry = weekData[dateStr] || {
      date: dateStr, tab: "planner", grateful: "", feel: "", goal: "",
      agenda: {}, top3: ["", "", ""], notes: "",
      wins: ["", "", ""], rating: 3, habits: {},
      nutrition: { calories: "", protein: "", carbs: "", fat: "" },
    };
    const habits = { ...(entry.habits || {}) };
    habits[habit] = !habits[habit];
    saveDay(dateStr, { ...entry, habits });
  };

  const weekRange = (() => {
    const mon = weekStart;
    const sun = addDays(weekStart, 6);
    const l = mon.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const r = sun.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${l} — ${r}`;
  })();

  // Heatmap year navigation
  const [heatmapYear, setHeatmapYear] = useState(today.getFullYear());

  // Heatmap data (Jan 1 - Dec 31 of selected year)
  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(allData, today, HABITS_LIST, heatmapYear), [allData, today, HABITS_LIST, heatmapYear]);

  // Streak milestones
  const streakMilestones = useMemo(() => {
    const milestones = [];
    for (const h of HABITS_LIST) {
      const streak = currentStreakEndingOn(allData, todayStr, h);
      const best = bestStreakForHabit(allData, h);
      if (streak >= 7) milestones.push({ habit: h, streak, best, type: "active" });
    }
    milestones.sort((a, b) => b.streak - a.streak);
    return milestones;
  }, [HABITS_LIST, allData, todayStr]);

  // --- MONTHLY CHART ---
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
      const entry = allData?.[key];
      let done = 0;
      if (entry?.habits) {
        for (const h of HABITS_LIST) if (entry.habits[h]) done++;
      }
      const pct = HABITS_LIST.length ? Math.round((done / HABITS_LIST.length) * 100) : 0;
      const isFuture = date > today;
      days.push({
        key, day: d, done, pct,
        metGoal: pct === 100 && HABITS_LIST.length > 0,
        hasData: done > 0,
        isFuture,
        isToday: key === todayStr,
      });
    }
    return days;
  }, [HABITS_LIST, monthDate, allData, today, todayStr]);

  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const canNextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) <= today;

  const monthStats = useMemo(() => {
    const valid = monthDays.filter(d => d && !d.isFuture);
    const tracked = valid.filter(d => d.hasData);
    const perfect = valid.filter(d => d.metGoal);
    const avgPct = tracked.length > 0 ? Math.round(tracked.reduce((s, d) => s + d.pct, 0) / tracked.length) : 0;
    return { tracked: tracked.length, perfect: perfect.length, avgPct };
  }, [monthDays]);

  // Overall streak (all habits 100% day)
  const overallStreak = useMemo(() => {
    let streak = 0;
    let cursor = today;
    while (true) {
      const key = ymd(cursor);
      const entry = allData?.[key];
      let allDone = true;
      for (const h of HABITS_LIST) {
        if (!entry?.habits?.[h]) { allDone = false; break; }
      }
      if (!allDone) break;
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }, [HABITS_LIST, allData, today]);

  // Historical habits — found in past entries but not in current habit list
  const historicalHabits = useMemo(() => {
    const currentSet = new Set(HABITS_LIST);
    const found = new Set();
    for (const key of Object.keys(allData || {})) {
      const entry = allData[key];
      if (!entry?.habits) continue;
      for (const h of Object.keys(entry.habits)) {
        if (!currentSet.has(h) && entry.habits[h]) found.add(h);
      }
    }
    return [...found].sort();
  }, [HABITS_LIST, allData]);

  const historicalStats = useMemo(() => {
    if (!showHistorical || historicalHabits.length === 0) return [];
    return historicalHabits.map(h => {
      let weekDone = 0;
      for (const d of weekDates) {
        const key = ymd(d);
        if (weekData[key]?.habits?.[h]) weekDone++;
      }
      const streak = currentStreakEndingOn(allData, todayStr, h);
      const best = bestStreakForHabit(allData, h);
      return { name: h, weekDone, streak, best };
    });
  }, [showHistorical, historicalHabits, weekData, allData, weekDates, todayStr]);

  // Total days with any habits logged
  const totalActiveDays = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(allData || {})) {
      const entry = allData[key];
      if (entry?.habits) {
        for (const h of HABITS_LIST) {
          if (entry.habits[h]) { count++; break; }
        }
      }
    }
    return count;
  }, [HABITS_LIST, allData]);

  return (
    <div className="habitsPage">
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Habits</h1>
          <div className="weekBadge">{overallStats.pct}% this week</div>
        </div>
        <div className="nav">
          <div className="hbViewToggle">
            <button className={`btn ${view === "matrix" ? "btnPrimary" : ""}`} onClick={() => setView("matrix")}>Matrix</button>
            <button className={`btn ${view === "monthly" ? "btnPrimary" : ""}`} onClick={() => setView("monthly")}>Monthly</button>
            <button className={`btn ${view === "heatmap" ? "btnPrimary" : ""}`} onClick={() => setView("heatmap")}>Streaks</button>
          </div>
          {view === "matrix" && (
            <>
              <button className="btn" onClick={goPrev} aria-label="Previous week">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div className="range">{weekRange}</div>
              <button className="btn" onClick={goNext} aria-label="Next week">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
              </button>
              <button className="btn btnPrimary" onClick={goToday}>Today</button>
            </>
          )}
          {historicalHabits.length > 0 && (
            <button
              className={`btn ${showHistorical ? "btnPrimary" : ""}`}
              onClick={() => setShowHistorical(p => !p)}
              type="button"
            >
              {showHistorical ? "Hide" : "Show"} Past ({historicalHabits.length})
            </button>
          )}
          <button
            className={`btn ${editMode ? "btnPrimary" : ""}`}
            onClick={() => setEditMode(p => !p)}
            type="button"
          >
            {editMode ? "Done" : "Edit Habits"}
          </button>
        </div>
      </div>

      {/* Edit Mode Panel */}
      {editMode && (
        <div className="hbEditPanel">
          <div className="hbEditList">
            {HABITS_LIST.map((h, idx) => (
              <div key={h} className="hbEditRow" draggable onDragStart={handleDragStart(idx)} onDragOver={handleDragOver(idx)} onDragEnd={handleDragEnd}>
                <div className="hbEditGrip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/>
                    <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
                    <circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/>
                  </svg>
                </div>
                {editingHabit === h ? (
                  <input className="hbEditInput" value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditingHabit(null); setEditingValue(""); } }}
                    autoFocus />
                ) : (
                  <div className="hbEditName" onDoubleClick={() => { setEditingHabit(h); setEditingValue(h); }}>{h}</div>
                )}
                <button className="hbEditRename" onClick={() => { setEditingHabit(h); setEditingValue(h); }} type="button" title="Rename">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="hbEditDelete" onClick={() => setConfirmDeleteHabit(h)} type="button" title="Remove">×</button>
              </div>
            ))}
          </div>
          <div className="hbEditAdd">
            <input className="hbEditInput" placeholder="Add a new habit..." value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddHabit(); }} />
            <button className="btn btnPrimary" onClick={handleAddHabit} type="button">Add</button>
          </div>
          <ConfirmDialog
            open={!!confirmDeleteHabit}
            title="Remove Habit"
            message={`Remove "${confirmDeleteHabit}"? Historical data is preserved.`}
            confirmLabel="Remove"
            danger
            onConfirm={() => { removeHabit(confirmDeleteHabit); setConfirmDeleteHabit(null); }}
            onCancel={() => setConfirmDeleteHabit(null)}
          />
        </div>
      )}

      {loading ? (
        <div className="loadingMsg">Loading...</div>
      ) : view === "monthly" ? (
        <div className="habitsContent" style={{ maxWidth: 640 }}>
          <div className="waterMonthChart">
            <div className="waterChartHeader">
              <button className="waterChartNavBtn" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} type="button">&lsaquo;</button>
              <div className="waterWeekTitle">{monthLabel}</div>
              <button className="waterChartNavBtn" onClick={() => canNextMonth && setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} disabled={!canNextMonth} type="button">&rsaquo;</button>
            </div>

            <div className="waterMonthStats">
              <div className="waterMonthStat">
                <div className="waterMonthStatNum">{monthStats.tracked}</div>
                <div className="waterMonthStatLabel">Active days</div>
              </div>
              <div className="waterMonthStat">
                <div className="waterMonthStatNum waterMonthStatGoal">{monthStats.perfect}</div>
                <div className="waterMonthStatLabel">Perfect days</div>
              </div>
              <div className="waterMonthStat">
                <div className="waterMonthStatNum">{monthStats.avgPct}%</div>
                <div className="waterMonthStatLabel">Avg completion</div>
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
                      day.isToday ? "waterMonthCellToday" : "",
                      day.metGoal ? "waterMonthCellGoal" : "",
                      day.hasData && !day.metGoal ? "waterMonthCellPartial" : "",
                      !day.hasData && !day.isFuture ? "waterMonthCellMissed" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="waterMonthCellDay">{day.day}</div>
                    {!day.isFuture && day.hasData && (
                      <div className="waterMonthCellGlasses">{day.pct}%</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="waterChartLegend">
              <span className="waterLegendItem"><span className="waterLegendDot waterLegendGoal" /> 100% complete</span>
              <span className="waterLegendItem"><span className="waterLegendDot waterLegendPartial" /> Partial</span>
              <span className="waterLegendItem"><span className="waterLegendDot waterLegendMissed" /> No data</span>
            </div>
          </div>
        </div>
      ) : view === "heatmap" ? (
        <div className="habitsContent">
          {/* Streak Stats Cards */}
          <div className="hbStreakCards">
            <div className="hbStreakCard">
              <div className="hbStreakCardValue">{overallStreak}</div>
              <div className="hbStreakCardLabel">Perfect Day Streak</div>
            </div>
            <div className="hbStreakCard">
              <div className="hbStreakCardValue">{totalActiveDays}</div>
              <div className="hbStreakCardLabel">Total Active Days</div>
            </div>
            <div className="hbStreakCard">
              <div className="hbStreakCardValue">{overallStats.pct}%</div>
              <div className="hbStreakCardLabel">This Week</div>
            </div>
          </div>

          {/* GitHub-style Heatmap */}
          <div className="hbHeatmapSection">
            <div className="hbHeatmapTitleRow">
              <button className="btn" onClick={() => setHeatmapYear(y => y - 1)} type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div className="hbHeatmapTitle">{heatmapYear} Contribution Heatmap</div>
              <button className="btn" onClick={() => setHeatmapYear(y => y + 1)} disabled={heatmapYear >= today.getFullYear()} type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
              </button>
            </div>
            <div className="hbHeatmap">
              <div className="hbHeatmapDayLabels">
                <div>Mon</div>
                <div></div>
                <div>Wed</div>
                <div></div>
                <div>Fri</div>
                <div></div>
                <div></div>
              </div>
              <div className="hbHeatmapGridWrap">
                <div className="hbHeatmapMonths">
                  {(() => {
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const labels = [];
                    let lastMonth = -1;
                    for (let wi = 0; wi < heatmapWeeks.length; wi++) {
                      const firstInYear = heatmapWeeks[wi].find(d => d.inYear);
                      if (firstInYear) {
                        const m = firstInYear.date.getMonth();
                        if (m !== lastMonth) {
                          labels.push({ month: months[m], col: wi });
                          lastMonth = m;
                        }
                      }
                    }
                    return labels.map(l => (
                      <div key={l.month} className="hbHeatmapMonthLabel" style={{ gridColumn: l.col + 1 }}>{l.month}</div>
                    ));
                  })()}
                </div>
                <div className="hbHeatmapGrid">
                  {heatmapWeeks.map((week, wi) => (
                    <div className="hbHeatmapCol" key={wi}>
                      {week.map((day) => (
                        <div
                          key={day.key}
                          className={`hbHeatmapCell ${!day.inYear ? "hbHeatmapCellOutside" : ""}`}
                          style={{ backgroundColor: !day.inYear ? "transparent" : heatColor(day.pct, day.isFuture) }}
                          title={day.inYear ? `${day.key}: ${day.pct}%` : ""}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="hbHeatmapLegend">
              <span>Less</span>
              <div className="hbHeatmapCell" style={{ backgroundColor: "var(--bg)" }} />
              <div className="hbHeatmapCell" style={{ backgroundColor: "#c6e48b" }} />
              <div className="hbHeatmapCell" style={{ backgroundColor: "#7bc96f" }} />
              <div className="hbHeatmapCell" style={{ backgroundColor: "#239a3b" }} />
              <div className="hbHeatmapCell" style={{ backgroundColor: "#196127" }} />
              <span>More</span>
            </div>
          </div>

          {/* Active Streak Milestones */}
          {streakMilestones.length > 0 && (
            <div className="hbMilestones">
              <div className="hbMilestonesTitle">Active Streaks (7+ days)</div>
              {streakMilestones.map((m) => (
                <div className="hbMilestoneRow" key={m.habit}>
                  <div className="hbMilestoneName">{m.habit}</div>
                  <div className="hbMilestoneStreak">🔥 {m.streak} days</div>
                  <div className="hbMilestoneBest">Best: {m.best}</div>
                  <div className="hbMilestoneBar">
                    <div className="progressBar">
                      <div className="progressFill" style={{ width: `${Math.min(100, (m.streak / Math.max(m.best, 30)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Per-habit streak list */}
          <div className="hbStreakList">
            <div className="hbStreakListTitle">All Habits</div>
            {HABITS_LIST.map((h) => {
              const streak = currentStreakEndingOn(allData, todayStr, h);
              const best = bestStreakForHabit(allData, h);
              return (
                <div className="hbStreakListRow" key={h}>
                  <div className="hbStreakListName">{h}</div>
                  <div className="hbStreakListBadges">
                    <span className="hbStreakBadge">🔥 {streak}</span>
                    <span className="hbBestBadge">🏆 {best}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="habitsContent">
          {/* Daily completion bar chart */}
          <div className="hbDayBars">
            {dayStats.map((ds) => (
              <div className="hbDayBar" key={ds.dateStr}>
                <div className="hbBarTrack">
                  <div
                    className="hbBarFill"
                    style={{ height: `${ds.pct}%` }}
                  />
                </div>
                <div className="hbBarLabel">
                  {ds.date.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className="hbBarPct">{ds.pct}%</div>
              </div>
            ))}
          </div>

          {/* Habit matrix */}
          <div className="hbMatrix">
            <div className="hbMatrixHeader">
              <div className="hbMatrixName">Habit</div>
              {weekDates.map((d) => (
                <div className="hbMatrixDay" key={ymd(d)}>
                  {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                </div>
              ))}
              <div className="hbMatrixStat">Streak</div>
              <div className="hbMatrixStat">Best</div>
              <div className="hbMatrixStat">Week</div>
            </div>

            {habitStats.map((hs) => (
              <div className="hbMatrixRow" key={hs.name}>
                <div className="hbMatrixName" title={hs.name}>{hs.name}</div>
                {weekDates.map((d) => {
                  const key = ymd(d);
                  const checked = !!weekData[key]?.habits?.[hs.name];
                  const isToday = key === todayStr;
                  return (
                    <button
                      className={`hbMatrixCell ${checked ? "hbCellDone" : ""} ${isToday ? "hbCellToday" : ""}`}
                      key={key}
                      onClick={() => toggleHabit(key, hs.name)}
                      type="button"
                    >
                      {checked && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                <div className="hbMatrixStat hbStatStreak">
                  {hs.streak > 0 ? `🔥 ${hs.streak}` : "—"}
                </div>
                <div className="hbMatrixStat hbStatBest">
                  {hs.best > 0 ? `🏆 ${hs.best}` : "—"}
                </div>
                <div className="hbMatrixStat hbStatWeek">
                  {hs.weekDone}/{7}
                </div>
              </div>
            ))}

            {/* Historical habits (removed but have past data) */}
            {showHistorical && historicalStats.length > 0 && (
              <>
                <div className="hbMatrixDivider">
                  <span>Past Habits</span>
                </div>
                {historicalStats.map((hs) => (
                  <div className="hbMatrixRow hbMatrixRowHistorical" key={hs.name}>
                    <div className="hbMatrixName" title={hs.name}>{hs.name}</div>
                    {weekDates.map((d) => {
                      const key = ymd(d);
                      const checked = !!weekData[key]?.habits?.[hs.name];
                      return (
                        <div
                          className={`hbMatrixCell hbCellHistorical ${checked ? "hbCellDone" : ""}`}
                          key={key}
                        >
                          {checked && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                    <div className="hbMatrixStat hbStatStreak">
                      {hs.streak > 0 ? `🔥 ${hs.streak}` : "—"}
                    </div>
                    <div className="hbMatrixStat hbStatBest">
                      {hs.best > 0 ? `🏆 ${hs.best}` : "—"}
                    </div>
                    <div className="hbMatrixStat hbStatWeek">
                      {hs.weekDone}/{7}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
