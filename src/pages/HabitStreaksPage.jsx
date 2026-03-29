import { useCallback, useEffect, useMemo, useState } from "react";
import { HABITS as DEFAULT_HABITS } from "../lib/constants.js";

const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;

const HEATMAP_EMPTY = "#ebedf0";
const HEATMAP_SHADES = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];
const WEEKS_SHOWN = 12;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d) {
  return d.toISOString().split("T")[0];
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function computeStreaks(habitName, allEntries) {
  const dates = Object.keys(allEntries).sort();
  if (dates.length === 0) return { current: 0, best: 0, total: 0, totalDays: 0, byDate: {} };

  const byDate = {};
  let total = 0;
  let totalDays = 0;

  for (const d of dates) {
    const entry = allEntries[d];
    const habits = entry.habits || {};
    if (habitName in habits) {
      totalDays++;
      if (habits[habitName]) {
        byDate[d] = true;
        total++;
      } else {
        byDate[d] = false;
      }
    }
  }

  // Compute current streak (from today backward)
  let current = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);
  while (true) {
    const key = ymd(cursor);
    if (byDate[key] === true) {
      current++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }

  // Compute best streak
  let best = 0;
  let streak = 0;
  const sortedDates = Object.keys(byDate).sort();
  for (const d of sortedDates) {
    if (byDate[d]) {
      streak++;
      if (streak > best) best = streak;
    } else {
      streak = 0;
    }
  }

  return { current, best, total, totalDays, byDate };
}

function getHeatmapDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  // End of current week (Saturday)
  const endOfWeek = addDays(today, 6 - dayOfWeek);
  // Go back WEEKS_SHOWN weeks
  const start = addDays(endOfWeek, -(WEEKS_SHOWN * 7) + 1);

  const weeks = [];
  let d = new Date(start);
  let week = [];
  for (let i = 0; i < WEEKS_SHOWN * 7; i++) {
    week.push(ymd(d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    d = addDays(d, 1);
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const d = new Date(w[0] + "T00:00:00");
    const m = d.getMonth();
    if (m !== lastMonth) {
      labels.push({ index: wi, label: d.toLocaleDateString(undefined, { month: "short" }) });
      lastMonth = m;
    }
  });
  return labels;
}

export default function HabitStreaksPage() {
  const [allEntries, setAllEntries] = useState({});
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("current"); // current | best | rate
  const [expandedHabit, setExpandedHabit] = useState(null);

  useEffect(() => {
    async function load() {
      const [entries, customRaw] = await Promise.all([
        plannerApi ? plannerApi.getAll() : {},
        settingsApi ? settingsApi.get("custom_habits") : null,
      ]);
      setAllEntries(entries || {});
      if (customRaw) {
        try {
          const parsed = JSON.parse(customRaw);
          if (Array.isArray(parsed) && parsed.length > 0) setHabits(parsed);
        } catch { /* use defaults */ }
      }
      setLoading(false);
    }
    load();
  }, []);

  const streaksData = useMemo(() => {
    return habits.map(h => ({
      name: h,
      ...computeStreaks(h, allEntries),
    }));
  }, [habits, allEntries]);

  const sortedData = useMemo(() => {
    return [...streaksData].sort((a, b) => {
      if (sortBy === "current") return b.current - a.current;
      if (sortBy === "best") return b.best - a.best;
      const rateA = a.totalDays > 0 ? a.total / a.totalDays : 0;
      const rateB = b.totalDays > 0 ? b.total / b.totalDays : 0;
      return rateB - rateA;
    });
  }, [streaksData, sortBy]);

  const heatmapWeeks = useMemo(() => getHeatmapDates(), []);
  const monthLabels = useMemo(() => getMonthLabels(heatmapWeeks), [heatmapWeeks]);

  const summary = useMemo(() => {
    const totalHabits = habits.length;
    const dates = Object.keys(allEntries).sort();
    if (dates.length === 0) return { totalHabits, avgRate: 0 };
    let totalChecked = 0;
    let totalPossible = 0;
    for (const d of dates) {
      const h = allEntries[d]?.habits || {};
      for (const name of habits) {
        if (name in h) {
          totalPossible++;
          if (h[name]) totalChecked++;
        }
      }
    }
    return {
      totalHabits,
      avgRate: totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0,
    };
  }, [habits, allEntries]);

  const getMonthlyBreakdown = useCallback((habitData) => {
    const months = {};
    for (const [d, done] of Object.entries(habitData.byDate)) {
      const m = d.substring(0, 7); // YYYY-MM
      if (!months[m]) months[m] = { done: 0, total: 0 };
      months[m].total++;
      if (done) months[m].done++;
    }
    return Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  }, []);

  if (loading) {
    return (
      <div className="daysPage">
        <div className="topbar">
          <div className="topbarLeft"><h1 className="pageTitle">Habit Streaks</h1></div>
        </div>
        <div className="dsBody" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="daysPage">
      <style>{`
        .hsBody { flex: 1; overflow-y: auto; padding: 24px; }
        .hsSummary {
          display: flex; gap: 24px; margin-bottom: 24px;
        }
        .hsSummaryCard {
          background: var(--paper, #fbf7f0); border-radius: 14px;
          border: 1.5px solid var(--border, #ddd); padding: 20px 28px;
          flex: 1; text-align: center;
        }
        .hsSummaryVal {
          font-size: 32px; font-weight: 800; color: var(--accent, #5B7CF5);
          line-height: 1.1;
        }
        .hsSummaryLabel { font-size: 13px; color: var(--muted, #888); margin-top: 4px; }
        .hsSortRow { display: flex; gap: 8px; margin-bottom: 20px; align-items: center; }
        .hsSortLabel { font-size: 13px; color: var(--muted, #888); font-weight: 600; }
        .hsGrid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .hsCard {
          background: var(--paper, #fbf7f0); border-radius: 14px;
          border: 1.5px solid var(--border, #ddd); padding: 18px;
          cursor: pointer; transition: all .15s;
        }
        .hsCard:hover { border-color: var(--accent, #5B7CF5); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.06); }
        .hsCard.hsExpanded { border-color: var(--accent, #5B7CF5); box-shadow: 0 0 0 3px rgba(91,124,245,.1); grid-column: 1 / -1; }
        .hsCardHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .hsHabitName { font-size: 15px; font-weight: 700; color: var(--text, #333); }
        .hsStreakBadge {
          display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700;
          padding: 3px 10px; border-radius: 10px;
        }
        .hsStreakActive { background: rgba(76,175,80,.12); color: #2e7d32; }
        .hsStreakBroken { background: rgba(158,158,158,.12); color: #9e9e9e; }
        .hsStats { display: flex; gap: 16px; margin-bottom: 12px; }
        .hsStat { text-align: center; }
        .hsStatVal { font-size: 18px; font-weight: 800; color: var(--text, #333); }
        .hsStatLabel { font-size: 10px; color: var(--muted, #888); text-transform: uppercase; letter-spacing: .3px; }
        .hsHeatmap { display: flex; gap: 3px; margin-top: 8px; }
        .hsHeatCol { display: flex; flex-direction: column; gap: 3px; }
        .hsHeatCell {
          width: 12px; height: 12px; border-radius: 2px; transition: background .15s;
        }
        .hsHeatCell:hover { outline: 1.5px solid var(--text, #333); outline-offset: -1px; }
        .hsHeatLabels { display: flex; flex-direction: column; gap: 3px; margin-right: 4px; padding-top: 18px; }
        .hsHeatDayLabel { font-size: 9px; color: var(--muted, #888); height: 12px; line-height: 12px; }
        .hsMonthLabels { display: flex; gap: 3px; margin-left: 28px; margin-bottom: 4px; }
        .hsMonthLabel { font-size: 9px; color: var(--muted, #888); }
        .hsExpandedBody { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border, #ddd); }
        .hsFullHeatmap { overflow-x: auto; }
        .hsMonthly { margin-top: 16px; }
        .hsMonthRow {
          display: flex; align-items: center; gap: 12px; margin-bottom: 6px;
        }
        .hsMonthName { font-size: 13px; color: var(--text, #333); font-weight: 600; width: 80px; }
        .hsMonthBar {
          flex: 1; height: 20px; border-radius: 6px; background: var(--bg, #f6f1e8);
          overflow: hidden; position: relative;
        }
        .hsMonthFill {
          height: 100%; border-radius: 6px; transition: width .3s;
        }
        .hsMonthPct { font-size: 12px; color: var(--muted, #888); font-weight: 600; width: 40px; text-align: right; }
        .hsRate {
          font-size: 13px; color: var(--muted, #888); font-weight: 600;
        }
        .hsExpandedStats {
          display: flex; gap: 24px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .hsExpandedStat { text-align: center; }
        .hsExpandedStatVal { font-size: 24px; font-weight: 800; color: var(--accent, #5B7CF5); }
        .hsExpandedStatLabel { font-size: 11px; color: var(--muted, #888); }
        .hsEmpty { text-align: center; color: var(--muted, #888); padding: 60px 20px; font-size: 14px; }
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Habit Streaks</h1>
          <div className="weekBadge">{habits.length} habits</div>
        </div>
      </div>

      <div className="hsBody dsBody">
        <div className="hsSummary">
          <div className="hsSummaryCard">
            <div className="hsSummaryVal">{summary.totalHabits}</div>
            <div className="hsSummaryLabel">Habits Tracked</div>
          </div>
          <div className="hsSummaryCard">
            <div className="hsSummaryVal">{summary.avgRate}%</div>
            <div className="hsSummaryLabel">Avg Daily Completion</div>
          </div>
          <div className="hsSummaryCard">
            <div className="hsSummaryVal">
              {streaksData.reduce((max, s) => Math.max(max, s.current), 0)}
            </div>
            <div className="hsSummaryLabel">Longest Active Streak</div>
          </div>
        </div>

        <div className="hsSortRow">
          <span className="hsSortLabel">Sort by:</span>
          {[
            { key: "current", label: "Current Streak" },
            { key: "best", label: "Best Streak" },
            { key: "rate", label: "Completion Rate" },
          ].map(s => (
            <button key={s.key} className={`tabBtn ${sortBy === s.key ? "active" : ""}`}
              onClick={() => setSortBy(s.key)} type="button">{s.label}</button>
          ))}
        </div>

        {sortedData.length === 0 && (
          <div className="hsEmpty">
            No habit data found. Start tracking habits in the Planner.
          </div>
        )}

        <div className="hsGrid">
          {sortedData.map(h => {
            const rate = h.totalDays > 0 ? Math.round((h.total / h.totalDays) * 100) : 0;
            const isExpanded = expandedHabit === h.name;
            const isActive = h.current > 0;

            return (
              <div key={h.name} className={`hsCard ${isExpanded ? "hsExpanded" : ""}`}
                onClick={() => setExpandedHabit(isExpanded ? null : h.name)}>
                <div className="hsCardHeader">
                  <div className="hsHabitName">{h.name}</div>
                  <div className={`hsStreakBadge ${isActive ? "hsStreakActive" : "hsStreakBroken"}`}>
                    {isActive ? "🔥" : "—"} {h.current}d
                  </div>
                </div>

                <div className="hsStats">
                  <div className="hsStat">
                    <div className="hsStatVal">{h.current}</div>
                    <div className="hsStatLabel">Current</div>
                  </div>
                  <div className="hsStat">
                    <div className="hsStatVal">{h.best}</div>
                    <div className="hsStatLabel">Best</div>
                  </div>
                  <div className="hsStat">
                    <div className="hsStatVal">{h.total}</div>
                    <div className="hsStatLabel">Total</div>
                  </div>
                  <div className="hsStat">
                    <div className="hsStatVal hsRate">{rate}%</div>
                    <div className="hsStatLabel">Rate</div>
                  </div>
                </div>

                {/* Mini heatmap */}
                {!isExpanded && (
                  <div className="hsHeatmap">
                    {heatmapWeeks.slice(-6).map((week, wi) => (
                      <div key={wi} className="hsHeatCol">
                        {week.map(day => (
                          <div key={day} className="hsHeatCell" title={day}
                            style={{
                              background: h.byDate[day] === true
                                ? HEATMAP_SHADES[2]
                                : h.byDate[day] === false
                                  ? HEATMAP_EMPTY
                                  : HEATMAP_EMPTY,
                            }} />
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded view */}
                {isExpanded && (
                  <div className="hsExpandedBody" onClick={e => e.stopPropagation()}>
                    <div className="hsExpandedStats">
                      <div className="hsExpandedStat">
                        <div className="hsExpandedStatVal">{h.current}</div>
                        <div className="hsExpandedStatLabel">Current Streak</div>
                      </div>
                      <div className="hsExpandedStat">
                        <div className="hsExpandedStatVal">{h.best}</div>
                        <div className="hsExpandedStatLabel">Best Streak</div>
                      </div>
                      <div className="hsExpandedStat">
                        <div className="hsExpandedStatVal">{h.total}</div>
                        <div className="hsExpandedStatLabel">Days Completed</div>
                      </div>
                      <div className="hsExpandedStat">
                        <div className="hsExpandedStatVal">{rate}%</div>
                        <div className="hsExpandedStatLabel">Completion Rate</div>
                      </div>
                    </div>

                    {/* Full heatmap (12 weeks) */}
                    <div className="hsFullHeatmap">
                      <div className="hsMonthLabels">
                        {monthLabels.map((ml, i) => (
                          <span key={i} className="hsMonthLabel"
                            style={{ marginLeft: ml.index * 15 - (i > 0 ? monthLabels[i - 1].index * 15 + 20 : 0) }}>
                            {ml.label}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex" }}>
                        <div className="hsHeatLabels">
                          {DAY_LABELS.filter((_, i) => i % 2 === 1).map(l => (
                            <div key={l} className="hsHeatDayLabel" style={{ marginBottom: 3 }}>{l}</div>
                          ))}
                        </div>
                        <div className="hsHeatmap">
                          {heatmapWeeks.map((week, wi) => (
                            <div key={wi} className="hsHeatCol">
                              {week.map(day => {
                                const done = h.byDate[day];
                                let color = HEATMAP_EMPTY;
                                if (done === true) {
                                  // Use darker green for streaks
                                  const d = new Date(day + "T00:00:00");
                                  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
                                  color = HEATMAP_SHADES[dayOfYear % HEATMAP_SHADES.length] || HEATMAP_SHADES[2];
                                }
                                return (
                                  <div key={day} className="hsHeatCell"
                                    title={`${day}: ${done === true ? "Done" : done === false ? "Missed" : "No data"}`}
                                    style={{ background: color }} />
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Monthly breakdown */}
                    <div className="hsMonthly">
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                        Monthly Breakdown
                      </div>
                      {getMonthlyBreakdown(h).map(([month, data]) => {
                        const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                        const d = new Date(month + "-01T00:00:00");
                        const label = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
                        return (
                          <div key={month} className="hsMonthRow">
                            <div className="hsMonthName">{label}</div>
                            <div className="hsMonthBar">
                              <div className="hsMonthFill"
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 80 ? "#30a14e" : pct >= 50 ? "#40c463" : pct >= 25 ? "#9be9a8" : HEATMAP_EMPTY,
                                }} />
                            </div>
                            <div className="hsMonthPct">{pct}%</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ textAlign: "center", marginTop: 12 }}>
                      <button className="btn btnSmall" onClick={() => setExpandedHabit(null)} type="button">
                        Collapse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
