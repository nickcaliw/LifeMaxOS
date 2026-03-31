import { useCallback, useEffect, useMemo, useState } from "react";
import { ymd, startOfWeekMonday, addDays } from "../lib/dates.js";

const focusApi = typeof window !== "undefined" ? window.focusApi : null;

const MODES = {
  work: { label: "Work", duration: 25 * 60 },
  shortBreak: { label: "Short Break", duration: 5 * 60 },
  longBreak: { label: "Long Break", duration: 15 * 60 },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FOCUS_GOAL = 2; // hours per day

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusTimerPage({ focusTimer }) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  // Use shared timer from App.jsx
  const mode = focusTimer.mode;
  const customDuration = focusTimer.customDuration;
  const setCustomDuration = focusTimer.setCustomDuration;
  const timeLeft = focusTimer.timeLeft;
  const running = focusTimer.running;
  const taskLabel = focusTimer.task;
  const setTaskLabel = focusTimer.setTask;

  const sessions = focusTimer.sessions;
  const modeDuration = focusTimer.modeDuration;
  const [weekSessions, setWeekSessions] = useState([]);
  const [allRangeData, setAllRangeData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chart
  const [chartView, setChartView] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const loadWeekSessions = useCallback(async () => {
    if (!focusApi) return;
    const ws = startOfWeekMonday(today);
    const data = await focusApi.getRange(ymd(ws), ymd(addDays(ws, 6)));
    setWeekSessions(data || []);
  }, [today]);

  // Load range data for charts
  const loadRangeData = useCallback(async () => {
    if (!focusApi) return;
    const sixtyAgo = addDays(today, -60);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const earliest = monthStart < sixtyAgo ? monthStart : sixtyAgo;
    const weekStart = addDays(startOfWeekMonday(today), weekOffset * 7);
    const finalEarliest = weekStart < earliest ? weekStart : earliest;
    const data = await focusApi.getRange(ymd(finalEarliest), todayStr);
    setAllRangeData(data || []);
  }, [today, todayStr, monthDate, weekOffset]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadWeekSessions(), loadRangeData()]).finally(() => setLoading(false));
  }, [loadWeekSessions, loadRangeData]);

  // Reload week/range data when sessions change (e.g. after timer completes)
  useEffect(() => {
    loadWeekSessions();
    loadRangeData();
  }, [sessions.length, loadWeekSessions, loadRangeData]);

  const handleStart = focusTimer.start;
  const handlePause = focusTimer.pause;
  const handleReset = focusTimer.reset;
  const handleModeChange = focusTimer.changeMode;
  const handleDeleteSession = async (id) => {
    if (focusApi) await focusApi.delete(id);
    focusTimer.loadSessions();
    loadWeekSessions();
    loadRangeData();
  };

  // Build hours-by-date from range data
  const hoursByDate = useMemo(() => {
    const map = {};
    for (const s of allRangeData) {
      if (!s.date) continue;
      map[s.date] = (map[s.date] || 0) + ((s.durationMin || s.duration || 0) / 60);
    }
    return map;
  }, [allRangeData]);

  // --- WEEK CHART ---
  const weekChartMonday = useMemo(() => addDays(startOfWeekMonday(today), weekOffset * 7), [today, weekOffset]);

  const weekBars = useMemo(() => {
    const maxHrs = Math.max(FOCUS_GOAL, ...Object.values(hoursByDate));
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekChartMonday, i);
      const key = ymd(d);
      const hrs = hoursByDate[key] || 0;
      const isFuture = d > today;
      return {
        key, label: DAY_LABELS[i],
        dayNum: d.getDate(), hours: hrs,
        pct: maxHrs > 0 ? Math.round((hrs / maxHrs) * 100) : 0,
        metGoal: hrs >= FOCUS_GOAL,
        isFuture,
      };
    });
  }, [hoursByDate, weekChartMonday, today]);

  const weekLabel = useMemo(() => {
    const sun = addDays(weekChartMonday, 6);
    return `${weekChartMonday.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${sun.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }, [weekChartMonday]);

  const weeklyStats = useMemo(() => {
    const ws = startOfWeekMonday(today);
    const totalMin = weekSessions.reduce((sum, s) => sum + (s.durationMin || s.duration || 0), 0);
    return { totalHours: (totalMin / 60).toFixed(1), count: weekSessions.length };
  }, [weekSessions, today]);

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
      const hrs = hoursByDate[key] || 0;
      const isFuture = date > today;
      days.push({
        key, day: d, hours: hrs,
        metGoal: hrs >= FOCUS_GOAL,
        hasData: hrs > 0,
        isFuture, isToday: key === todayStr,
      });
    }
    return days;
  }, [monthDate, hoursByDate, today, todayStr]);

  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const canNextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) <= today;

  const monthStats = useMemo(() => {
    const valid = monthDays.filter(d => d && !d.isFuture);
    const tracked = valid.filter(d => d.hasData);
    const met = valid.filter(d => d.metGoal);
    const totalHrs = tracked.reduce((s, d) => s + d.hours, 0);
    return { tracked: tracked.length, metGoal: met.length, totalHours: totalHrs.toFixed(1) };
  }, [monthDays]);

  const progress = modeDuration > 0 ? timeLeft / modeDuration : 0;
  const circumference = 2 * Math.PI * 130;
  const dashOffset = circumference * (1 - progress);
  const isBreak = mode !== "work";

  return (
    <div className="focusPage">
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Focus Timer</h1>
          {sessions.length > 0 && <div className="weekBadge">{sessions.length} sessions today</div>}
        </div>
      </div>

      {loading ? (
        <div className="loadingMsg">Loading...</div>
      ) : (
        <div className="focusContent">
          <div className="focusLeft">
            {/* Mode toggles */}
            <div className="focusModes">
              {Object.entries(MODES).map(([key, { label }]) => (
                <button
                  key={key}
                  className={`focusModeBtn ${mode === key ? "focusModeBtnActive" : ""}`}
                  onClick={() => handleModeChange(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Timer circle */}
            <div className={`focusCircle ${isBreak ? "focusBreak" : ""} ${running ? "focusRunning" : ""}`}>
              <svg viewBox="0 0 280 280" width="280" height="280" style={{ position: "absolute", top: 0, left: 0 }}>
                <circle cx="140" cy="140" r="130" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle
                  cx="140" cy="140" r="130" fill="none"
                  stroke={isBreak ? "#4caf50" : "var(--accent)"}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  transform="rotate(-90 140 140)"
                />
              </svg>
              <div className="focusTime">{formatTime(timeLeft)}</div>
              <div className="focusLabel">{MODES[mode].label}</div>
            </div>

            {/* Task input */}
            <input
              type="text"
              className="focusTaskInput"
              placeholder="What are you working on?"
              value={taskLabel}
              onChange={e => setTaskLabel(e.target.value)}
            />

            {/* Custom duration */}
            <div className="focusControls">
              <input
                type="number"
                className="focusDurationInput"
                placeholder="Min"
                min="1" max="120"
                value={customDuration}
                onChange={e => setCustomDuration(e.target.value)}
                disabled={running}
              />
              {!running ? (
                <button className="btn btnPrimary" onClick={handleStart} type="button">
                  {timeLeft < modeDuration && timeLeft > 0 ? "Resume" : "Start"}
                </button>
              ) : (
                <button className="btn" onClick={handlePause} type="button">Pause</button>
              )}
              <button className="btn" onClick={handleReset} type="button">Reset</button>
            </div>
          </div>

          <div className="focusRight">
            {/* Today's sessions */}
            <div className="focusSessions">
              <div className="focusSessionsTitle">Today's Sessions</div>
              {sessions.length === 0 ? (
                <div className="focusSessionItem" style={{ justifyContent: "center", color: "var(--muted)" }}>
                  No sessions yet today
                </div>
              ) : (
                sessions.map(s => (
                  <div className="focusSessionItem" key={s.id}>
                    <div className="focusSessionTask">{s.task}</div>
                    <div className="focusSessionDur">{s.durationMin || s.duration}m</div>
                    <div className="focusSessionTime">
                      {new Date(s.completedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <button className="affDeleteBtn" onClick={() => handleDeleteSession(s.id)} style={{ opacity: 1 }} type="button">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Stats */}
            <div className="focusStats">
              <div className="focusStatsCards">
                <div className="focusStatCard">
                  <div className="focusStatValue">{weeklyStats.totalHours}</div>
                  <div className="focusStatLabel">Week Hours</div>
                </div>
                <div className="focusStatCard">
                  <div className="focusStatValue">{weeklyStats.count}</div>
                  <div className="focusStatLabel">Sessions</div>
                </div>
              </div>
            </div>

            {/* Chart Toggle */}
            <div className="waterChartToggle" style={{ alignSelf: "center" }}>
              <button className={`waterChartToggleBtn ${chartView === "week" ? "waterChartToggleActive" : ""}`} onClick={() => setChartView("week")} type="button">Weekly</button>
              <button className={`waterChartToggleBtn ${chartView === "month" ? "waterChartToggleActive" : ""}`} onClick={() => setChartView("month")} type="button">Monthly</button>
            </div>

            {/* Weekly Chart */}
            {chartView === "week" && (
              <div className="waterWeekChart">
                <div className="waterChartHeader">
                  <button className="waterChartNavBtn" onClick={() => setWeekOffset(o => o - 1)} type="button">&lsaquo;</button>
                  <div className="waterWeekTitle">{weekLabel}</div>
                  <button className="waterChartNavBtn" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset === 0} type="button">&rsaquo;</button>
                </div>
                <div className="waterWeekBars">
                  {weekBars.map(bar => (
                    <div
                      className={`waterWeekBarWrap ${bar.isFuture ? "waterWeekBarFuture" : ""}`}
                      key={bar.key}
                    >
                      <div className="waterWeekValue">{bar.isFuture ? "" : `${bar.hours.toFixed(1)}h`}</div>
                      <div
                        className={`waterWeekBar ${bar.metGoal ? "waterWeekBarGoal" : "waterWeekBarPartial"}`}
                        style={{ height: bar.isFuture ? "0%" : `${bar.pct}%` }}
                      />
                      {!bar.isFuture && bar.metGoal && <div className="waterWeekGoalCheck">&#10003;</div>}
                      <div className="waterWeekLabel">{bar.label}</div>
                      <div className="waterWeekDayNum">{bar.dayNum}</div>
                    </div>
                  ))}
                </div>
                <div className="waterChartLegend">
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendGoal" /> {FOCUS_GOAL}h+ goal</span>
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendPartial" /> Below goal</span>
                </div>
              </div>
            )}

            {/* Monthly Chart */}
            {chartView === "month" && (
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
                    <div className="waterMonthStatNum waterMonthStatGoal">{monthStats.metGoal}</div>
                    <div className="waterMonthStatLabel">{FOCUS_GOAL}h+ days</div>
                  </div>
                  <div className="waterMonthStat">
                    <div className="waterMonthStatNum">{monthStats.totalHours}</div>
                    <div className="waterMonthStatLabel">Total hours</div>
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
                          <div className="waterMonthCellGlasses">{day.hours.toFixed(1)}h</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="waterChartLegend">
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendGoal" /> {FOCUS_GOAL}h+ focus</span>
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendPartial" /> Some focus</span>
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendMissed" /> No sessions</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
