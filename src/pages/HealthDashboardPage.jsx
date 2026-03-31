import { useEffect, useMemo, useState } from "react";
import { ymd, addDays } from "../lib/dates.js";

const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const sleepApi = typeof window !== "undefined" ? window.sleepApi : null;
const bodyApi = typeof window !== "undefined" ? window.bodyApi : null;

const RANGES = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return "--";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function delta(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function deltaArrow(d) {
  if (d == null) return "";
  if (d > 1) return "\u2191";
  if (d < -1) return "\u2193";
  return "\u2192";
}

function deltaColor(d) {
  if (d == null) return "var(--muted)";
  if (d > 1) return "#34a853";
  if (d < -1) return "#ea4335";
  return "var(--muted)";
}

function stepsColor(v) {
  if (v >= 10000) return "#34a853";
  if (v >= 8000) return "var(--accent)";
  if (v >= 5000) return "#f5a623";
  return "#ea4335";
}

function sleepColor(h) {
  if (h >= 8) return "#34a853";
  if (h >= 7) return "var(--accent)";
  if (h >= 6) return "#f5a623";
  return "#ea4335";
}

function hrColor(avg) {
  if (avg < 60) return "var(--accent)";
  if (avg <= 80) return "#34a853";
  return "#f5a623";
}

function calColor(v) {
  if (v >= 600) return "#34a853";
  if (v >= 400) return "var(--accent)";
  if (v >= 200) return "#f5a623";
  return "#ea4335";
}

function shortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime12(t) {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

export default function HealthDashboardPage() {
  const today = useMemo(() => new Date(), []);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);

  // Data
  const [stepsData, setStepsData] = useState([]);
  const [hrData, setHrData] = useState([]);
  const [calData, setCalData] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [bodyData, setBodyData] = useState([]);

  // Previous period data for deltas
  const [prevSteps, setPrevSteps] = useState([]);
  const [prevCal, setPrevCal] = useState([]);
  const [prevHr, setPrevHr] = useState([]);
  const [prevSleep, setPrevSleep] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      const endDate = today;
      const startDate = addDays(endDate, -(rangeDays - 1));
      const prevStart = addDays(startDate, -rangeDays);
      const prevEnd = addDays(startDate, -1);

      // Build date lists
      const dates = [];
      for (let i = 0; i < rangeDays; i++) {
        dates.push(ymd(addDays(startDate, i)));
      }
      const prevDates = [];
      for (let i = 0; i < rangeDays; i++) {
        prevDates.push(ymd(addDays(prevStart, i)));
      }

      // Fetch steps, HR, calories in parallel for current + previous periods
      const allDates = [...dates, ...prevDates];
      const [stepsResults, hrResults, calResults, sleepResult, prevSleepResult, bodyResult] =
        await Promise.all([
          // Steps
          Promise.all(
            allDates.map((d) =>
              settingsApi
                ? settingsApi.get(`steps_${d}`).then((raw) => {
                    const parsed = raw ? JSON.parse(raw) : null;
                    return { date: d, count: parsed?.count ?? null };
                  }).catch(() => ({ date: d, count: null }))
                : Promise.resolve({ date: d, count: null })
            )
          ),
          // Heart rate
          Promise.all(
            allDates.map((d) =>
              settingsApi
                ? settingsApi.get(`heartrate_${d}`).then((raw) => {
                    const parsed = raw ? JSON.parse(raw) : null;
                    return {
                      date: d,
                      avg: parsed?.avg ?? null,
                      min: parsed?.min ?? null,
                      max: parsed?.max ?? null,
                    };
                  }).catch(() => ({ date: d, avg: null, min: null, max: null }))
                : Promise.resolve({ date: d, avg: null, min: null, max: null })
            )
          ),
          // Active calories
          Promise.all(
            allDates.map((d) =>
              settingsApi
                ? settingsApi.get(`activecal_${d}`).then((raw) => {
                    const parsed = raw ? JSON.parse(raw) : null;
                    return { date: d, total: parsed?.total ?? null };
                  }).catch(() => ({ date: d, total: null }))
                : Promise.resolve({ date: d, total: null })
            )
          ),
          // Sleep current
          sleepApi
            ? sleepApi.range(ymd(startDate), ymd(endDate)).catch(() => [])
            : Promise.resolve([]),
          // Sleep previous
          sleepApi
            ? sleepApi.range(ymd(prevStart), ymd(prevEnd)).catch(() => [])
            : Promise.resolve([]),
          // Body stats
          bodyApi
            ? bodyApi.all().catch(() => [])
            : Promise.resolve([]),
        ]);

      if (cancelled) return;

      // Split current vs previous
      const currentSteps = stepsResults.filter((r) => dates.includes(r.date));
      const previousSteps = stepsResults.filter((r) => prevDates.includes(r.date));
      const currentHr = hrResults.filter((r) => dates.includes(r.date));
      const previousHr = hrResults.filter((r) => prevDates.includes(r.date));
      const currentCal = calResults.filter((r) => dates.includes(r.date));
      const previousCal = calResults.filter((r) => prevDates.includes(r.date));

      setStepsData(currentSteps);
      setPrevSteps(previousSteps);
      setHrData(currentHr);
      setPrevHr(previousHr);
      setCalData(currentCal);
      setPrevCal(previousCal);
      setSleepData(sleepResult || []);
      setPrevSleep(prevSleepResult || []);
      setBodyData((bodyResult || []).sort((a, b) => (a.date > b.date ? -1 : 1)));
      setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [today, rangeDays]);

  // Computed averages
  const avgSteps = useMemo(() => {
    const valid = stepsData.filter((d) => d.count != null);
    return valid.length ? valid.reduce((s, d) => s + d.count, 0) / valid.length : null;
  }, [stepsData]);

  const prevAvgSteps = useMemo(() => {
    const valid = prevSteps.filter((d) => d.count != null);
    return valid.length ? valid.reduce((s, d) => s + d.count, 0) / valid.length : null;
  }, [prevSteps]);

  const avgSleep = useMemo(() => {
    const valid = sleepData.filter((d) => d.hours != null && Number(d.hours) > 0);
    return valid.length ? valid.reduce((s, d) => s + Number(d.hours), 0) / valid.length : null;
  }, [sleepData]);

  const prevAvgSleep = useMemo(() => {
    const valid = prevSleep.filter((d) => d.hours != null && Number(d.hours) > 0);
    return valid.length ? valid.reduce((s, d) => s + Number(d.hours), 0) / valid.length : null;
  }, [prevSleep]);

  const avgHr = useMemo(() => {
    const valid = hrData.filter((d) => d.avg != null);
    return valid.length ? valid.reduce((s, d) => s + d.avg, 0) / valid.length : null;
  }, [hrData]);

  const prevAvgHr = useMemo(() => {
    const valid = prevHr.filter((d) => d.avg != null);
    return valid.length ? valid.reduce((s, d) => s + d.avg, 0) / valid.length : null;
  }, [prevHr]);

  const avgCal = useMemo(() => {
    const valid = calData.filter((d) => d.total != null);
    return valid.length ? valid.reduce((s, d) => s + d.total, 0) / valid.length : null;
  }, [calData]);

  const prevAvgCal = useMemo(() => {
    const valid = prevCal.filter((d) => d.total != null);
    return valid.length ? valid.reduce((s, d) => s + d.total, 0) / valid.length : null;
  }, [prevCal]);

  const latestWeight = useMemo(() => {
    const withWeight = bodyData.filter((d) => d.weightAm != null && d.weightAm > 0);
    return withWeight.length ? withWeight[0] : null;
  }, [bodyData]);

  const weightTrend = useMemo(() => {
    const sorted = bodyData
      .filter((d) => d.weightAm != null && d.weightAm > 0)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
    return sorted;
  }, [bodyData]);

  const weightDirection = useMemo(() => {
    if (weightTrend.length < 2) return "stable";
    const recent = weightTrend.slice(-7);
    if (recent.length < 2) return "stable";
    const first = recent[0].weightAm;
    const last = recent[recent.length - 1].weightAm;
    const diff = last - first;
    if (diff > 0.5) return "up";
    if (diff < -0.5) return "down";
    return "stable";
  }, [weightTrend]);

  // Chart maxes
  const maxSteps = useMemo(
    () => Math.max(10000, ...stepsData.map((d) => d.count || 0)),
    [stepsData]
  );
  const maxSleepHrs = useMemo(
    () => Math.max(10, ...sleepData.map((d) => Number(d.hours) || 0)),
    [sleepData]
  );
  const maxCal = useMemo(
    () => Math.max(600, ...calData.map((d) => d.total || 0)),
    [calData]
  );
  const hrBounds = useMemo(() => {
    const mins = hrData.filter((d) => d.min != null).map((d) => d.min);
    const maxs = hrData.filter((d) => d.max != null).map((d) => d.max);
    return {
      min: mins.length ? Math.min(...mins) : 40,
      max: maxs.length ? Math.max(...maxs) : 180,
    };
  }, [hrData]);

  // Merge data for table
  const tableData = useMemo(() => {
    const map = {};
    stepsData.forEach((d) => { map[d.date] = { ...map[d.date], date: d.date, steps: d.count }; });
    hrData.forEach((d) => { map[d.date] = { ...map[d.date], date: d.date, hrAvg: d.avg, hrMin: d.min, hrMax: d.max }; });
    calData.forEach((d) => { map[d.date] = { ...map[d.date], date: d.date, activeCal: d.total }; });
    sleepData.forEach((d) => { map[d.date] = { ...map[d.date], date: d.date, sleepHrs: d.hours, bedtime: d.bedtime, waketime: d.waketime }; });
    const weightMap = {};
    bodyData.forEach((d) => { if (d.weightAm) weightMap[d.date] = d.weightAm; });
    Object.keys(weightMap).forEach((date) => {
      map[date] = { ...map[date], date, weight: weightMap[date] };
    });
    return Object.values(map).sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [stepsData, hrData, calData, sleepData, bodyData]);

  const stepsDelta = delta(avgSteps, prevAvgSteps);
  const sleepDelta = delta(avgSleep, prevAvgSleep);
  const hrDelta = delta(avgHr, prevAvgHr);
  const calDelta = delta(avgCal, prevAvgCal);

  return (
    <div className="daysPage">
      <style>{`
        .hdTopbar { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid var(--border); }
        .hdTopbar h1 { font-size:1.4rem; font-weight:800; color:var(--text); margin:0; letter-spacing:-0.02em; }
        .hdRangeTabs { display:flex; gap:3px; background:var(--bg); padding:3px; border-radius:10px; }
        .hdRangeTab { padding:6px 16px; border-radius:8px; border:none; background:transparent; cursor:pointer; font-size:0.82rem; font-weight:600; color:var(--muted); transition:all .2s; font-family:inherit; }
        .hdRangeTab:hover { color:var(--text); }
        .hdRangeTab.active { background:var(--paper); color:var(--accent); box-shadow:0 1px 4px rgba(0,0,0,.08); }

        .hdBody { padding:24px; overflow-y:auto; max-height:calc(100vh - 60px); }
        .hdLoading { display:flex; align-items:center; justify-content:center; height:300px; color:var(--muted); font-size:0.95rem; }
        .hdSpinner { width:24px; height:24px; border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:hdSpin .7s linear infinite; margin-right:10px; }
        @keyframes hdSpin { to { transform:rotate(360deg); } }

        .hdCards { display:grid; grid-template-columns:repeat(5, 1fr); gap:14px; margin-bottom:30px; }
        .hdCard { background:var(--paper); border:1px solid var(--border); border-radius:14px; padding:18px 20px; transition:border-color .15s, box-shadow .15s; }
        .hdCard:hover { border-color:color-mix(in srgb, var(--accent) 30%, var(--border)); box-shadow:0 2px 12px rgba(91,124,245,.06); }
        .hdCardLabel { font-size:0.7rem; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; font-weight:600; margin-bottom:8px; }
        .hdCardValue { font-size:1.5rem; font-weight:800; color:var(--text); letter-spacing:-0.02em; }
        .hdCardDelta { font-size:0.78rem; margin-top:6px; font-weight:600; display:flex; align-items:center; gap:3px; }

        .hdSection { background:var(--paper); border:1px solid var(--border); border-radius:14px; padding:20px 22px; margin-bottom:20px; }
        .hdSectionTitle { font-size:0.8rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:16px; display:flex; align-items:center; gap:6px; }

        /* Bar charts */
        .hdBarChart { display:flex; align-items:flex-end; gap:${rangeDays <= 7 ? 8 : rangeDays <= 30 ? 3 : 1}px; height:220px; padding:0 0 28px; position:relative; }
        .hdBarWrap { flex:1; min-width:${rangeDays <= 7 ? 60 : rangeDays <= 30 ? 16 : 6}px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; position:relative; }
        .hdBar { width:100%; min-width:${rangeDays <= 7 ? 44 : rangeDays <= 30 ? 12 : 5}px; border-radius:6px 6px 2px 2px; transition:all .2s; cursor:default; position:relative; opacity:0.85; flex-shrink:0; }
        .hdBar:hover { opacity:1; transform:scaleY(1.02); transform-origin:bottom; }
        .hdBarLabel { font-size:${rangeDays <= 7 ? '0.7rem' : '0.58rem'}; color:var(--muted); margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; text-align:center; font-weight:500; }
        .hdBarVal { position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:0.68rem; font-weight:700; color:var(--text); white-space:nowrap; opacity:0; transition:opacity .2s; pointer-events:none; background:var(--paper); padding:1px 6px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,.1); }
        .hdBarWrap:hover .hdBarVal { opacity:1; }
        .hdBarSub { font-size:0.55rem; color:var(--muted); text-align:center; margin-top:2px; font-weight:500; }

        /* HR range chart */
        .hdHrChart { display:flex; flex-direction:column; gap:6px; max-height:500px; overflow-y:auto; }
        .hdHrRow { display:flex; align-items:center; gap:12px; padding:4px 0; }
        .hdHrDate { font-size:0.72rem; font-weight:600; color:var(--muted); width:65px; text-align:right; flex-shrink:0; }
        .hdHrTrack { flex:1; height:14px; background:var(--bg); border-radius:7px; position:relative; overflow:hidden; }
        .hdHrRange { position:absolute; height:100%; border-radius:7px; transition:all .2s; }
        .hdHrAvg { position:absolute; width:10px; height:10px; border-radius:50%; background:#fff; border:2.5px solid var(--text); top:50%; transform:translate(-50%, -50%); z-index:1; box-shadow:0 1px 3px rgba(0,0,0,.15); }
        .hdHrVals { font-size:0.72rem; color:var(--muted); width:110px; flex-shrink:0; font-weight:500; font-variant-numeric:tabular-nums; }
        .hdHrVals strong { color:var(--text); }

        /* Weight trend */
        .hdWeightLine { display:flex; align-items:flex-end; gap:0; height:140px; position:relative; padding:20px 0; overflow-x:auto; }
        .hdWeightCol { display:flex; flex-direction:column; align-items:center; justify-content:flex-end; position:relative; flex:1; min-width:44px; }
        .hdWeightDot { width:10px; height:10px; border-radius:50%; background:var(--accent); position:relative; z-index:2; box-shadow:0 0 0 3px rgba(91,124,245,.2); transition:transform .15s; }
        .hdWeightDot:hover { transform:scale(1.4); }
        .hdWeightVal { font-size:0.65rem; font-weight:700; color:var(--text); margin-bottom:4px; white-space:nowrap; }
        .hdWeightDate { font-size:0.58rem; color:var(--muted); margin-top:6px; font-weight:500; }
        .hdWeightSvg { position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; pointer-events:none; }
        .hdWeightWrap { position:relative; overflow-x:auto; }
        .hdTrendArrow { font-size:1rem; margin-left:6px; font-weight:700; }

        /* Table */
        .hdTable { width:100%; border-collapse:separate; border-spacing:0; font-size:0.78rem; }
        .hdTableWrap { max-height:400px; overflow:auto; border-radius:10px; }
        .hdTable thead { position:sticky; top:0; z-index:2; }
        .hdTable th { background:var(--accent); color:#fff; padding:10px 12px; text-align:left; font-weight:600; white-space:nowrap; font-size:0.72rem; text-transform:uppercase; letter-spacing:.3px; }
        .hdTable th:first-child { border-radius:10px 0 0 0; }
        .hdTable th:last-child { border-radius:0 10px 0 0; }
        .hdTable td { padding:9px 12px; border-bottom:1px solid var(--border); white-space:nowrap; color:var(--text); font-variant-numeric:tabular-nums; }
        .hdTable tbody tr:nth-child(even) { background:var(--bg); }
        .hdTable tbody tr:nth-child(odd) { background:var(--paper); }
        .hdTable tbody tr:hover { background:color-mix(in srgb, var(--accent) 6%, var(--paper)); }
        .hdTable tbody tr:last-child td:first-child { border-radius:0 0 0 10px; }
        .hdTable tbody tr:last-child td:last-child { border-radius:0 0 10px 0; }

        .hdNoData { color:var(--muted); font-style:italic; font-size:0.85rem; padding:24px 0; text-align:center; }
      `}</style>

      <div className="hdTopbar topbar">
        <h1>Health Dashboard</h1>
        <div className="hdRangeTabs">
          {RANGES.map((r) => (
            <button
              key={r.days}
              className={`hdRangeTab${rangeDays === r.days ? " active" : ""}`}
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hdBody dsBody">
        {loading ? (
          <div className="hdLoading">
            <div className="hdSpinner" />
            Loading health data...
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="hdCards">
              <div className="hdCard">
                <div className="hdCardLabel">Avg Daily Steps</div>
                <div className="hdCardValue">{fmt(avgSteps, 0)}</div>
                {stepsDelta != null && (
                  <div className="hdCardDelta" style={{ color: deltaColor(stepsDelta) }}>
                    {deltaArrow(stepsDelta)} {fmt(Math.abs(stepsDelta), 1)}% vs prev
                  </div>
                )}
              </div>
              <div className="hdCard">
                <div className="hdCardLabel">Avg Sleep</div>
                <div className="hdCardValue">{avgSleep != null ? `${fmt(avgSleep, 1)}h` : "--"}</div>
                {sleepDelta != null && (
                  <div className="hdCardDelta" style={{ color: deltaColor(sleepDelta) }}>
                    {deltaArrow(sleepDelta)} {fmt(Math.abs(sleepDelta), 1)}% vs prev
                  </div>
                )}
              </div>
              <div className="hdCard">
                <div className="hdCardLabel">Avg Resting HR</div>
                <div className="hdCardValue">{avgHr != null ? `${fmt(avgHr, 0)} bpm` : "--"}</div>
                {hrDelta != null && (
                  <div className="hdCardDelta" style={{ color: deltaColor(-hrDelta) }}>
                    {deltaArrow(hrDelta)} {fmt(Math.abs(hrDelta), 1)}% vs prev
                  </div>
                )}
              </div>
              <div className="hdCard">
                <div className="hdCardLabel">Avg Active Cal</div>
                <div className="hdCardValue">{avgCal != null ? fmt(avgCal, 0) : "--"}</div>
                {calDelta != null && (
                  <div className="hdCardDelta" style={{ color: deltaColor(calDelta) }}>
                    {deltaArrow(calDelta)} {fmt(Math.abs(calDelta), 1)}% vs prev
                  </div>
                )}
              </div>
              <div className="hdCard">
                <div className="hdCardLabel">Latest Weight</div>
                <div className="hdCardValue">
                  {latestWeight ? `${fmt(latestWeight.weightAm, 1)} lbs` : "--"}
                </div>
                {latestWeight && (
                  <div className="hdCardDelta" style={{ color: "var(--muted)" }}>
                    {shortDate(latestWeight.date)}
                  </div>
                )}
              </div>
            </div>

            {/* Steps Section */}
            <div className="hdSection">
              <div className="hdSectionTitle">Steps</div>
              {stepsData.some((d) => d.count != null) ? (
                <div className="hdBarChart">
                  {stepsData.map((d) => {
                    const val = d.count || 0;
                    const pct = (val / maxSteps) * 100;
                    return (
                      <div className="hdBarWrap" key={d.date}>
                        <div className="hdBarVal">{fmt(val)}</div>
                        <div
                          className="hdBar"
                          style={{
                            height: `${Math.max(pct * 1.8, 2)}px`,
                            background: stepsColor(val),
                          }}
                        />
                        <div className="hdBarLabel">{shortDate(d.date)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="hdNoData">No step data for this period.</div>
              )}
            </div>

            {/* Sleep Section */}
            <div className="hdSection">
              <div className="hdSectionTitle">Sleep</div>
              {sleepData.length > 0 ? (
                <div className="hdBarChart">
                  {sleepData
                    .sort((a, b) => (a.date > b.date ? 1 : -1))
                    .map((d) => {
                      const hrs = Number(d.hours) || 0;
                      const pct = (hrs / maxSleepHrs) * 100;
                      return (
                        <div className="hdBarWrap" key={d.date}>
                          <div className="hdBarVal">{hrs > 0 ? `${hrs.toFixed(1)}h` : "--"}</div>
                          <div
                            className="hdBar"
                            style={{
                              height: `${Math.max(pct * 1.8, 2)}px`,
                              background: sleepColor(hrs),
                            }}
                          />
                          <div className="hdBarLabel">{shortDate(d.date)}</div>
                          {d.bedtime && (
                            <div className="hdBarSub">{formatTime12(d.bedtime)}</div>
                          )}
                          {d.waketime && (
                            <div className="hdBarSub">{formatTime12(d.waketime)}</div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="hdNoData">No sleep data for this period.</div>
              )}
            </div>

            {/* Heart Rate Section */}
            <div className="hdSection">
              <div className="hdSectionTitle">Heart Rate</div>
              {hrData.some((d) => d.avg != null) ? (
                <div className="hdHrChart">
                  {hrData
                    .filter((d) => d.avg != null)
                    .sort((a, b) => (a.date > b.date ? 1 : -1))
                    .map((d) => {
                      const rangeSpan = hrBounds.max - hrBounds.min + 20;
                      const lo = hrBounds.min - 10;
                      const leftPct = ((d.min - lo) / rangeSpan) * 100;
                      const widthPct = (((d.max || d.avg) - (d.min || d.avg)) / rangeSpan) * 100;
                      const avgPct = ((d.avg - lo) / rangeSpan) * 100;
                      return (
                        <div className="hdHrRow" key={d.date}>
                          <div className="hdHrDate">{shortDate(d.date)}</div>
                          <div className="hdHrTrack">
                            <div
                              className="hdHrRange"
                              style={{
                                left: `${leftPct}%`,
                                width: `${Math.max(widthPct, 1)}%`,
                                background: hrColor(d.avg),
                                opacity: 0.6,
                              }}
                            />
                            <div
                              className="hdHrAvg"
                              style={{ left: `${avgPct}%` }}
                              title={`Avg: ${d.avg}`}
                            />
                          </div>
                          <div className="hdHrVals">
                            {d.min ?? "--"} / <strong>{d.avg}</strong> / {d.max ?? "--"}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="hdNoData">No heart rate data for this period.</div>
              )}
            </div>

            {/* Active Calories Section */}
            <div className="hdSection">
              <div className="hdSectionTitle">Active Calories</div>
              {calData.some((d) => d.total != null) ? (
                <div className="hdBarChart">
                  {calData.map((d) => {
                    const val = d.total || 0;
                    const pct = (val / maxCal) * 100;
                    return (
                      <div className="hdBarWrap" key={d.date}>
                        <div className="hdBarVal">{fmt(val)}</div>
                        <div
                          className="hdBar"
                          style={{
                            height: `${Math.max(pct * 1.8, 2)}px`,
                            background: calColor(val),
                          }}
                        />
                        <div className="hdBarLabel">{shortDate(d.date)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="hdNoData">No calorie data for this period.</div>
              )}
            </div>

            {/* Weight Trend */}
            <div className="hdSection">
              <div className="hdSectionTitle">
                Weight Trend
                <span className="hdTrendArrow" style={{ color: weightDirection === "down" ? "#34a853" : weightDirection === "up" ? "#ea4335" : "var(--muted)" }}>
                  {weightDirection === "up" ? "\u2191" : weightDirection === "down" ? "\u2193" : "\u2192"}
                </span>
              </div>
              {weightTrend.length > 0 ? (() => {
                const weights = weightTrend.map((d) => d.weightAm);
                const wMin = Math.min(...weights) - 2;
                const wMax = Math.max(...weights) + 2;
                const wRange = wMax - wMin || 1;
                return (
                  <div className="hdWeightWrap">
                    <svg
                      className="hdWeightSvg"
                      viewBox={`0 0 ${weightTrend.length * 60} 140`}
                      preserveAspectRatio="none"
                      style={{ width: `${Math.max(weightTrend.length * 60, 300)}px`, height: "140px" }}
                    >
                      <polyline
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        points={weightTrend
                          .map((d, i) => {
                            const x = i * 60 + 30;
                            const y = 120 - ((d.weightAm - wMin) / wRange) * 100;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                    </svg>
                    <div className="hdWeightLine" style={{ width: `${Math.max(weightTrend.length * 60, 300)}px` }}>
                      {weightTrend.map((d, i) => {
                        const pct = ((d.weightAm - wMin) / wRange) * 100;
                        return (
                          <div
                            className="hdWeightCol"
                            key={d.date}
                            style={{ height: "120px", justifyContent: "flex-start", paddingTop: `${100 - pct}px` }}
                          >
                            <div className="hdWeightVal">{d.weightAm.toFixed(1)}</div>
                            <div className="hdWeightDot" />
                            <div className="hdWeightDate">{shortDate(d.date)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : (
                <div className="hdNoData">No weight data available.</div>
              )}
            </div>

            {/* Day-by-day Table */}
            <div className="hdSection">
              <div className="hdSectionTitle">Day-by-Day Breakdown</div>
              {tableData.length > 0 ? (
                <div className="hdTableWrap">
                  <table className="hdTable">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Steps</th>
                        <th>Sleep</th>
                        <th>Bedtime</th>
                        <th>Wake</th>
                        <th>Avg HR</th>
                        <th>Min HR</th>
                        <th>Max HR</th>
                        <th>Active Cal</th>
                        <th>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.date}>
                          <td>{shortDate(row.date)}</td>
                          <td>{row.steps != null ? fmt(row.steps) : "--"}</td>
                          <td>{row.sleepHrs != null ? `${row.sleepHrs.toFixed(1)}h` : "--"}</td>
                          <td>{formatTime12(row.bedtime)}</td>
                          <td>{formatTime12(row.waketime)}</td>
                          <td>{row.hrAvg != null ? row.hrAvg : "--"}</td>
                          <td>{row.hrMin != null ? row.hrMin : "--"}</td>
                          <td>{row.hrMax != null ? row.hrMax : "--"}</td>
                          <td>{row.activeCal != null ? fmt(row.activeCal) : "--"}</td>
                          <td>{row.weight != null ? row.weight.toFixed(1) : "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="hdNoData">No data for this period.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
