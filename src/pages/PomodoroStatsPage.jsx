import { useCallback, useEffect, useMemo, useState } from "react";
import { ymd, addDays } from "../lib/dates.js";

const focusApi = typeof window !== "undefined" ? window.focusApi : null;

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: 0 },
];

function fmtMins(mins) {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function PomodoroStatsPage() {
  const [sessions, setSessions] = useState([]);
  const [rangeIdx, setRangeIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  const load = useCallback(async () => {
    if (!focusApi) return;
    setLoading(true);
    const range = RANGES[rangeIdx];
    let start;
    if (range.days === 0) {
      start = "2000-01-01";
    } else {
      start = ymd(addDays(today, -(range.days - 1)));
    }
    const data = await focusApi.getRange(start, todayStr);
    setSessions(data || []);
    setLoading(false);
  }, [rangeIdx, today, todayStr]);

  useEffect(() => { load(); }, [load]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalMins = sessions.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
    const avgMins = totalSessions > 0 ? totalMins / totalSessions : 0;

    // Daily map
    const dailyMap = {};
    for (const s of sessions) {
      if (!dailyMap[s.date]) dailyMap[s.date] = 0;
      dailyMap[s.date] += (s.duration || 0) / 60;
    }

    // Top tasks
    const taskMap = {};
    for (const s of sessions) {
      const task = s.task || "Untitled";
      if (!taskMap[task]) taskMap[task] = { count: 0, mins: 0 };
      taskMap[task].count++;
      taskMap[task].mins += (s.duration || 0) / 60;
    }
    const topTasks = Object.entries(taskMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.mins - a.mins);

    // Streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 0;
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    // Walk backwards from today
    const allDates = new Set(Object.keys(dailyMap));
    let checking = new Date(d);
    // If today has no session, start from yesterday
    if (!allDates.has(ymd(checking))) {
      checking.setDate(checking.getDate() - 1);
    }
    while (allDates.has(ymd(checking))) {
      currentStreak++;
      checking.setDate(checking.getDate() - 1);
    }

    // Best streak: sort all dates and find longest consecutive run
    const sortedDates = [...allDates].sort();
    streak = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) { streak = 1; }
      else {
        const prev = new Date(sortedDates[i - 1] + "T00:00:00");
        const curr = new Date(sortedDates[i] + "T00:00:00");
        const diffDays = Math.round((curr - prev) / 86400000);
        streak = diffDays === 1 ? streak + 1 : 1;
      }
      if (streak > bestStreak) bestStreak = streak;
    }

    // Bar chart data: last N days
    const range = RANGES[rangeIdx];
    const numDays = range.days === 0 ? Math.min(sortedDates.length > 0 ?
      Math.round((today - new Date(sortedDates[0] + "T00:00:00")) / 86400000) + 1 : 30, 90) : range.days;
    const bars = [];
    const maxBars = Math.min(numDays, 60); // cap visible bars
    for (let i = maxBars - 1; i >= 0; i--) {
      const dt = addDays(today, -i);
      const key = ymd(dt);
      bars.push({ date: key, mins: dailyMap[key] || 0, label: dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
    }
    const maxMins = Math.max(...bars.map(b => b.mins), 1);

    return { totalSessions, totalMins, avgMins, topTasks, currentStreak, bestStreak, bars, maxMins };
  }, [sessions, rangeIdx, today]);

  return (
    <div className="daysPage">
      <style>{`
        .psStatCards { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .psStatCard { background: var(--paper); border: 1px solid var(--border); border-radius: 10px; padding: 16px; text-align: center; }
        .psStatValue { font-size: 28px; font-weight: 700; color: var(--accent); }
        .psStatLabel { font-size: 12px; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .psChart { background: var(--paper); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 24px; }
        .psChartTitle { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 14px; }
        .psChartBars { display: flex; align-items: flex-end; gap: 2px; height: 160px; overflow-x: auto; }
        .psBar { flex: 1; min-width: 8px; max-width: 24px; background: var(--accent); border-radius: 3px 3px 0 0; transition: height 0.3s; cursor: default; position: relative; }
        .psBar:hover { opacity: 0.8; }
        .psBarTip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--text); color: var(--bg); padding: 3px 7px; border-radius: 4px; font-size: 10px; white-space: nowrap; z-index: 10; }
        .psBar:hover .psBarTip { display: block; }
        .psChartLabels { display: flex; gap: 2px; margin-top: 4px; }
        .psChartLbl { flex: 1; min-width: 8px; max-width: 24px; font-size: 8px; color: var(--muted); text-align: center; overflow: hidden; }
        .psSection { background: var(--paper); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 24px; }
        .psSectionTitle { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 12px; }
        .psTaskRow { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .psTaskRow:last-child { border-bottom: none; }
        .psTaskName { font-size: 14px; color: var(--text); font-weight: 500; }
        .psTaskMeta { font-size: 12px; color: var(--muted); }
        .psTaskBar { height: 6px; background: var(--accent); border-radius: 3px; margin-top: 4px; transition: width 0.3s; }
        .psEmpty { text-align: center; padding: 60px 20px; color: var(--muted); font-size: 15px; }
        .psStreakRow { display: flex; gap: 24px; }
        .psStreakItem { flex: 1; text-align: center; }
        .psStreakVal { font-size: 32px; font-weight: 700; color: var(--accent); }
        .psStreakLbl { font-size: 12px; color: var(--muted); margin-top: 2px; }
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Focus Analytics</h1>
          <div className="weekBadge">{stats.totalSessions} sessions</div>
        </div>
        <div className="nav">
          {RANGES.map((r, i) => (
            <button key={r.label} className={`tabBtn ${rangeIdx === i ? "active" : ""}`}
              onClick={() => setRangeIdx(i)} type="button">{r.label}</button>
          ))}
        </div>
      </div>

      <div className="dsBody">
        {loading ? (
          <div className="psEmpty">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="psEmpty">No focus sessions recorded in this period.</div>
        ) : (
          <>
            <div className="psStatCards">
              <div className="psStatCard">
                <div className="psStatValue">{stats.totalSessions}</div>
                <div className="psStatLabel">Total Sessions</div>
              </div>
              <div className="psStatCard">
                <div className="psStatValue">{fmtMins(stats.totalMins)}</div>
                <div className="psStatLabel">Total Focus Time</div>
              </div>
              <div className="psStatCard">
                <div className="psStatValue">{fmtMins(stats.avgMins)}</div>
                <div className="psStatLabel">Avg Session</div>
              </div>
              <div className="psStatCard">
                <div className="psStatValue">{stats.currentStreak}</div>
                <div className="psStatLabel">Current Streak (days)</div>
              </div>
              <div className="psStatCard">
                <div className="psStatValue">{stats.bestStreak}</div>
                <div className="psStatLabel">Best Streak (days)</div>
              </div>
            </div>

            <div className="psChart">
              <div className="psChartTitle">Daily Focus Minutes</div>
              <div className="psChartBars">
                {stats.bars.map(b => (
                  <div key={b.date} className="psBar"
                    style={{ height: `${Math.max((b.mins / stats.maxMins) * 100, b.mins > 0 ? 4 : 0)}%` }}>
                    <div className="psBarTip">{b.label}: {Math.round(b.mins)}m</div>
                  </div>
                ))}
              </div>
              <div className="psChartLabels">
                {stats.bars.map((b, i) => (
                  <div key={b.date} className="psChartLbl">
                    {i % Math.max(1, Math.floor(stats.bars.length / 8)) === 0
                      ? new Date(b.date + "T00:00:00").getDate() : ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="psSection">
              <div className="psSectionTitle">Top Tasks</div>
              {stats.topTasks.length === 0 && (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>No tasks recorded.</div>
              )}
              {stats.topTasks.slice(0, 15).map(t => {
                const pct = stats.totalMins > 0 ? (t.mins / stats.totalMins) * 100 : 0;
                return (
                  <div key={t.name} className="psTaskRow">
                    <div style={{ flex: 1 }}>
                      <div className="psTaskName">{t.name}</div>
                      <div className="psTaskBar" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="psTaskMeta" style={{ marginLeft: 16, whiteSpace: "nowrap" }}>
                      {fmtMins(t.mins)} &middot; {t.count} sessions
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="psSection">
              <div className="psSectionTitle">Streaks</div>
              <div className="psStreakRow">
                <div className="psStreakItem">
                  <div className="psStreakVal">{stats.currentStreak}</div>
                  <div className="psStreakLbl">Current Streak</div>
                </div>
                <div className="psStreakItem">
                  <div className="psStreakVal">{stats.bestStreak}</div>
                  <div className="psStreakLbl">Best Streak</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
