import { useEffect, useMemo, useState } from "react";
import { ymd, addDays } from "../lib/dates.js";

const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;

const MOODS = [
  { value: "great", label: "Great", emoji: "\u{1F604}", color: "#27ae60", level: 5 },
  { value: "good",  label: "Good",  emoji: "\u{1F642}", color: "#2ecc71", level: 4 },
  { value: "okay",  label: "Okay",  emoji: "\u{1F610}", color: "#f1c40f", level: 3 },
  { value: "low",   label: "Low",   emoji: "\u{1F614}", color: "#e67e22", level: 2 },
  { value: "tough", label: "Tough", emoji: "\u{1F622}", color: "#e74c3c", level: 1 },
];

const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.value, m]));

function getMoodLevel(value) {
  return MOOD_MAP[value]?.level || 0;
}
function getMoodInfo(value) {
  return MOOD_MAP[value] || null;
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatDow(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
}

export default function MoodTrackerPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  const [range, setRange] = useState("30"); // "7", "30", "90"
  const [entries, setEntries] = useState({});

  // Load planner entries for the selected range
  useEffect(() => {
    if (!plannerApi) return;
    const days = parseInt(range);
    const start = ymd(addDays(today, -(days - 1)));
    const end = todayStr;
    plannerApi.getRange(start, end).then(data => setEntries(data || {}));
  }, [range, todayStr]);

  // Build mood data array (sorted by date)
  const moodData = useMemo(() => {
    const days = parseInt(range);
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = ymd(addDays(today, -i));
      const entry = entries[date];
      const mood = entry?.journalMood || null;
      const energy = entry?.journalEnergy || null;
      const tags = entry?.journalTags || [];
      const rating = entry?.rating || null;
      result.push({ date, mood, energy, tags, rating, level: getMoodLevel(mood) });
    }
    return result;
  }, [entries, range, today]);

  // Stats
  const stats = useMemo(() => {
    const withMood = moodData.filter(d => d.mood);
    if (withMood.length === 0) return null;

    const avgMood = withMood.reduce((s, d) => s + d.level, 0) / withMood.length;
    const withEnergy = moodData.filter(d => d.energy);
    const avgEnergy = withEnergy.length > 0 ? withEnergy.reduce((s, d) => s + d.energy, 0) / withEnergy.length : null;

    // Most common mood
    const moodCounts = {};
    withMood.forEach(d => { moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1; });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Most common tags
    const tagCounts = {};
    moodData.forEach(d => d.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Streak: consecutive days with mood logged
    let streak = 0;
    for (let i = moodData.length - 1; i >= 0; i--) {
      if (moodData[i].mood) streak++;
      else break;
    }

    // Trend: compare last 7 days avg to previous 7 days avg
    const recent7 = moodData.slice(-7).filter(d => d.mood);
    const prev7 = moodData.slice(-14, -7).filter(d => d.mood);
    let trend = null;
    if (recent7.length >= 3 && prev7.length >= 3) {
      const recentAvg = recent7.reduce((s, d) => s + d.level, 0) / recent7.length;
      const prevAvg = prev7.reduce((s, d) => s + d.level, 0) / prev7.length;
      const diff = recentAvg - prevAvg;
      if (diff > 0.3) trend = "up";
      else if (diff < -0.3) trend = "down";
      else trend = "stable";
    }

    return {
      avgMood, avgEnergy, topMood, topTags, streak, trend,
      logged: withMood.length, total: moodData.length,
    };
  }, [moodData]);

  // Weekly averages for bar chart
  const weeklyAvgs = useMemo(() => {
    const weeks = [];
    const days = parseInt(range);
    const numWeeks = Math.ceil(days / 7);
    for (let w = 0; w < numWeeks; w++) {
      const start = w * 7;
      const end = Math.min(start + 7, days);
      const slice = moodData.slice(start, end);
      const withMood = slice.filter(d => d.mood);
      const avg = withMood.length > 0 ? withMood.reduce((s, d) => s + d.level, 0) / withMood.length : 0;
      const label = slice[0]?.date ? formatDateShort(slice[0].date).split(",")[0] : "";
      weeks.push({ avg, label, count: withMood.length });
    }
    return weeks;
  }, [moodData, range]);

  // Mood distribution
  const distribution = useMemo(() => {
    const counts = { great: 0, good: 0, okay: 0, low: 0, tough: 0 };
    moodData.forEach(d => { if (d.mood && counts[d.mood] !== undefined) counts[d.mood]++; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return MOODS.map(m => ({
      ...m,
      count: counts[m.value],
      pct: total > 0 ? Math.round((counts[m.value] / total) * 100) : 0,
    }));
  }, [moodData]);

  const todayEntry = moodData[moodData.length - 1];
  const todayMood = todayEntry?.mood ? getMoodInfo(todayEntry.mood) : null;

  return (
    <div className="moodPage">
      <style>{STYLES}</style>

      <div className="topbar">
        <h1 className="pageTitle">Mood Tracker</h1>
        <div className="moodRangePicker">
          {[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ].map(r => (
            <button
              key={r.value}
              className={`moodRangeBtn ${range === r.value ? "moodRangeBtnActive" : ""}`}
              onClick={() => setRange(r.value)}
              type="button"
            >{r.label}</button>
          ))}
        </div>
      </div>

      <div className="moodContent">
        {/* Today's mood */}
        <div className="moodTodayCard">
          {todayMood ? (
            <>
              <div className="moodTodayEmoji">{todayMood.emoji}</div>
              <div className="moodTodayLabel">
                Today you're feeling <strong style={{ color: todayMood.color }}>{todayMood.label}</strong>
              </div>
              {todayEntry?.energy && (
                <div className="moodTodayEnergy">
                  Energy: {["", "Very Low", "Low", "Medium", "High", "Very High"][todayEntry.energy]}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="moodTodayEmoji" style={{ opacity: 0.4 }}>?</div>
              <div className="moodTodayLabel" style={{ color: "var(--muted)" }}>
                No mood logged today. Log it in your Planner's Journal tab.
              </div>
            </>
          )}
        </div>

        {/* Stats row */}
        {stats && (
          <div className="moodStatsRow">
            <div className="moodStatCard">
              <div className="moodStatValue">
                {stats.topMood ? getMoodInfo(stats.topMood)?.emoji : "--"}
              </div>
              <div className="moodStatLabel">Most common</div>
            </div>
            <div className="moodStatCard">
              <div className="moodStatValue">{stats.avgMood.toFixed(1)}</div>
              <div className="moodStatLabel">Avg mood (1-5)</div>
            </div>
            {stats.avgEnergy !== null && (
              <div className="moodStatCard">
                <div className="moodStatValue">{stats.avgEnergy.toFixed(1)}</div>
                <div className="moodStatLabel">Avg energy</div>
              </div>
            )}
            <div className="moodStatCard">
              <div className="moodStatValue">{stats.streak}</div>
              <div className="moodStatLabel">Day streak</div>
            </div>
            <div className="moodStatCard">
              <div className="moodStatValue">
                {stats.trend === "up" ? "\u2191" : stats.trend === "down" ? "\u2193" : stats.trend === "stable" ? "\u2192" : "--"}
              </div>
              <div className="moodStatLabel">Trend</div>
            </div>
          </div>
        )}

        {/* Mood timeline chart */}
        <div className="moodChartCard">
          <div className="moodChartTitle">Mood Over Time</div>
          <div className="moodChart">
            {/* Y-axis labels */}
            <div className="moodChartY">
              {MOODS.map(m => (
                <div key={m.value} className="moodChartYLabel">{m.emoji}</div>
              ))}
            </div>
            {/* Grid + dots */}
            <div className="moodChartArea">
              {/* Horizontal grid lines */}
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className="moodChartGridLine" style={{ bottom: `${((level - 1) / 4) * 100}%` }} />
              ))}
              {/* Data line + dots */}
              <svg className="moodChartSvg" viewBox={`0 0 ${moodData.length} 100`} preserveAspectRatio="none">
                {/* Line connecting mood dots */}
                {(() => {
                  const points = moodData
                    .map((d, i) => d.level > 0 ? { x: i + 0.5, y: 100 - ((d.level - 1) / 4) * 100 } : null)
                    .filter(Boolean);
                  if (points.length < 2) return null;
                  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                  return <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.5" />;
                })()}
              </svg>
              {/* Dot layer (HTML for tooltips) */}
              <div className="moodChartDots">
                {moodData.map((d, i) => {
                  if (!d.mood) return null;
                  const info = getMoodInfo(d.mood);
                  const left = `${((i + 0.5) / moodData.length) * 100}%`;
                  const bottom = `${((d.level - 1) / 4) * 100}%`;
                  return (
                    <div
                      key={d.date}
                      className="moodChartDot"
                      style={{ left, bottom, background: info.color }}
                      title={`${formatDateShort(d.date)}: ${info.label}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          {/* X-axis labels */}
          <div className="moodChartX">
            {moodData.filter((_, i) => {
              const step = Math.max(1, Math.floor(moodData.length / 8));
              return i % step === 0;
            }).map(d => (
              <div key={d.date} className="moodChartXLabel">{formatDow(d.date)}</div>
            ))}
          </div>
        </div>

        {/* Distribution */}
        <div className="moodChartCard">
          <div className="moodChartTitle">Mood Distribution</div>
          <div className="moodDistribution">
            {distribution.map(m => (
              <div key={m.value} className="moodDistRow">
                <div className="moodDistEmoji">{m.emoji}</div>
                <div className="moodDistLabel">{m.label}</div>
                <div className="moodDistBarTrack">
                  <div
                    className="moodDistBarFill"
                    style={{ width: `${m.pct}%`, background: m.color }}
                  />
                </div>
                <div className="moodDistPct">{m.pct}%</div>
                <div className="moodDistCount">{m.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly averages */}
        {weeklyAvgs.length > 1 && (
          <div className="moodChartCard">
            <div className="moodChartTitle">Weekly Averages</div>
            <div className="moodWeeklyChart">
              {weeklyAvgs.map((w, i) => (
                <div key={i} className="moodWeeklyBar">
                  <div className="moodWeeklyBarTrack">
                    <div
                      className="moodWeeklyBarFill"
                      style={{
                        height: `${(w.avg / 5) * 100}%`,
                        background: w.avg >= 4 ? "#27ae60" : w.avg >= 3 ? "#f1c40f" : w.avg >= 2 ? "#e67e22" : w.avg > 0 ? "#e74c3c" : "var(--line2)",
                      }}
                    />
                  </div>
                  <div className="moodWeeklyLabel">{w.label}</div>
                  {w.avg > 0 && <div className="moodWeeklyVal">{w.avg.toFixed(1)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top mood influencers */}
        {stats?.topTags?.length > 0 && (
          <div className="moodChartCard">
            <div className="moodChartTitle">Top Mood Influencers</div>
            <div className="moodTagCloud">
              {stats.topTags.map(([tag, count]) => (
                <div key={tag} className="moodTagItem">
                  <span className="moodTagName">{tag}</span>
                  <span className="moodTagCount">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent entries */}
        <div className="moodChartCard">
          <div className="moodChartTitle">Recent Entries</div>
          <div className="moodRecentList">
            {moodData.slice().reverse().filter(d => d.mood).slice(0, 14).map(d => {
              const info = getMoodInfo(d.mood);
              return (
                <div key={d.date} className="moodRecentRow">
                  <div className="moodRecentDate">{formatDateShort(d.date)}</div>
                  <div className="moodRecentMood" style={{ color: info?.color }}>
                    {info?.emoji} {info?.label}
                  </div>
                  {d.energy && (
                    <div className="moodRecentEnergy">
                      Energy: {d.energy}/5
                    </div>
                  )}
                  {d.tags.length > 0 && (
                    <div className="moodRecentTags">
                      {d.tags.map(t => <span key={t} className="moodRecentTag">{t}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
            {moodData.filter(d => d.mood).length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
                No mood data yet. Log your mood in the Planner's Journal tab.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const STYLES = `
.moodPage{
  display: flex;
  flex-direction: column;
  height: 100%;
}
.moodContent{
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 40px;
  max-width: 720px;
}

/* Range picker */
.moodRangePicker{
  display: flex;
  gap: 4px;
  background: var(--chip);
  border-radius: 8px;
  padding: 3px;
}
.moodRangeBtn{
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.moodRangeBtnActive{
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Today card */
.moodTodayCard{
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--paper);
  border: 1px solid var(--line2);
  border-radius: 14px;
  margin-bottom: 16px;
}
.moodTodayEmoji{
  font-size: 36px;
  line-height: 1;
}
.moodTodayLabel{
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.moodTodayEnergy{
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

/* Stats row */
.moodStatsRow{
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.moodStatCard{
  flex: 1;
  min-width: 80px;
  background: var(--paper);
  border: 1px solid var(--line2);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
}
.moodStatValue{
  font-size: 22px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.02em;
}
.moodStatLabel{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 4px;
}

/* Chart card */
.moodChartCard{
  background: var(--paper);
  border: 1px solid var(--line2);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}
.moodChartTitle{
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 14px;
}

/* Mood timeline chart */
.moodChart{
  display: flex;
  gap: 8px;
  height: 140px;
}
.moodChartY{
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  padding: 4px 0;
}
.moodChartYLabel{
  font-size: 14px;
  line-height: 1;
}
.moodChartArea{
  flex: 1;
  position: relative;
  overflow: hidden;
}
.moodChartGridLine{
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--line2);
}
.moodChartSvg{
  position: absolute;
  inset: 4px 0;
  width: 100%;
  height: calc(100% - 8px);
}
.moodChartDots{
  position: absolute;
  inset: 4px 0;
  width: 100%;
  height: calc(100% - 8px);
}
.moodChartDot{
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  transition: transform 0.15s;
  cursor: default;
}
.moodChartDot:hover{
  transform: translate(-50%, 50%) scale(1.5);
}
.moodChartX{
  display: flex;
  justify-content: space-between;
  padding: 6px 30px 0;
}
.moodChartXLabel{
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

/* Distribution */
.moodDistribution{
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.moodDistRow{
  display: flex;
  align-items: center;
  gap: 10px;
}
.moodDistEmoji{
  font-size: 18px;
  width: 24px;
  text-align: center;
}
.moodDistLabel{
  font-size: 13px;
  font-weight: 700;
  width: 50px;
  color: var(--ink);
}
.moodDistBarTrack{
  flex: 1;
  height: 10px;
  background: var(--chip);
  border-radius: 999px;
  overflow: hidden;
}
.moodDistBarFill{
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.moodDistPct{
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  width: 32px;
  text-align: right;
}
.moodDistCount{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  width: 24px;
  text-align: right;
}

/* Weekly bars */
.moodWeeklyChart{
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 100px;
}
.moodWeeklyBar{
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.moodWeeklyBarTrack{
  width: 100%;
  height: 80px;
  background: var(--chip);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.moodWeeklyBarFill{
  width: 100%;
  border-radius: 6px;
  transition: height 0.4s ease;
}
.moodWeeklyLabel{
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}
.moodWeeklyVal{
  font-size: 10px;
  font-weight: 700;
  color: var(--ink);
}

/* Tag cloud */
.moodTagCloud{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.moodTagItem{
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--chip);
  border-radius: 999px;
}
.moodTagName{
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.moodTagCount{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

/* Recent list */
.moodRecentList{
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.moodRecentRow{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border-bottom: 1px solid var(--line2);
}
.moodRecentRow:last-child{
  border-bottom: none;
}
.moodRecentDate{
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  min-width: 110px;
}
.moodRecentMood{
  font-size: 13px;
  font-weight: 700;
  min-width: 80px;
}
.moodRecentEnergy{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.moodRecentTags{
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.moodRecentTag{
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  background: var(--chip);
  padding: 2px 8px;
  border-radius: 999px;
}
`;
