import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { ymd, addDays, parseYMD } from "../lib/dates.js";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "symptoms";
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ──────────────────── data ──────────────────── */

const PRESET_SYMPTOMS = [
  "Headache", "Fatigue", "Back Pain", "Neck Pain", "Stomach Ache",
  "Nausea", "Allergies", "Congestion", "Sore Throat", "Insomnia",
  "Anxiety", "Brain Fog", "Joint Pain", "Eye Strain",
];

const TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Night", "All Day"];

const SEVERITY_LABELS = ["", "Mild", "Moderate", "Noticeable", "Severe", "Extreme"];
const SEVERITY_COLORS = ["", "#4caf50", "#ff9800", "#f57c00", "#e53935", "#b71c1c"];

/* ──────────────────── helpers ──────────────────── */

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // shift to Mon start
  const daysInMonth = getDaysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

/* ──────────────────── component ──────────────────── */

export default function SymptomsTrackerPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("log"); // log | calendar | trends | patterns
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [confirmDel, setConfirmDel] = useState(null);
  const saveTimer = useRef({});

  // Add form
  const [addSymptom, setAddSymptom] = useState("");
  const [addSeverity, setAddSeverity] = useState(2);
  const [addTime, setAddTime] = useState("Morning");
  const [addNotes, setAddNotes] = useState("");
  const [customSymptoms, setCustomSymptoms] = useState([]);
  const [newCustom, setNewCustom] = useState("");
  const [filterSymptom, setFilterSymptom] = useState("All");

  // Calendar nav
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const refresh = useCallback(async () => {
    if (api) {
      const all = await api.list(COLLECTION) || [];
      setItems(all);
      // Extract custom symptom names
      const preset = new Set(PRESET_SYMPTOMS.map(s => s.toLowerCase()));
      const customs = [...new Set(all.filter(i => i.type === "entry").map(i => i.symptom).filter(s => s && !preset.has(s.toLowerCase())))];
      setCustomSymptoms(prev => {
        const merged = new Set([...prev, ...customs]);
        return [...merged];
      });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((id, data) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => { if (api) api.save(id, COLLECTION, data); }, 300);
  }, []);

  const deleteItem = async (id) => {
    if (api) await api.delete(id);
    setConfirmDel(null);
    refresh();
  };

  /* ── entries filtered ── */
  const entries = useMemo(() => items.filter(i => i.type === "entry").sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.createdAt || 0) - (a.createdAt || 0);
  }), [items]);

  const dayEntries = useMemo(() => entries.filter(e => e.date === selectedDate), [entries, selectedDate]);

  const filteredEntries = useMemo(() => {
    if (filterSymptom === "All") return dayEntries;
    return dayEntries.filter(e => e.symptom === filterSymptom);
  }, [dayEntries, filterSymptom]);

  const allSymptoms = useMemo(() => [...PRESET_SYMPTOMS, ...customSymptoms], [customSymptoms]);

  const uniqueLogged = useMemo(() => [...new Set(entries.map(e => e.symptom))], [entries]);

  /* ── add entry ── */
  const addEntry = async () => {
    if (!addSymptom) return;
    const id = genId();
    const data = {
      type: "entry",
      symptom: addSymptom,
      severity: addSeverity,
      timeOfDay: addTime,
      notes: addNotes.trim(),
      date: selectedDate,
      createdAt: Date.now(),
    };
    if (api) await api.save(id, COLLECTION, data);
    setAddSymptom("");
    setAddSeverity(2);
    setAddNotes("");
    refresh();
  };

  const addCustomSymptom = () => {
    const name = newCustom.trim();
    if (!name || allSymptoms.includes(name)) return;
    setCustomSymptoms(prev => [...prev, name]);
    setNewCustom("");
  };

  /* ── date nav ── */
  const goPrev = () => {
    const d = addDays(parseYMD(selectedDate), -1);
    setSelectedDate(ymd(d));
  };
  const goNext = () => {
    const d = addDays(parseYMD(selectedDate), 1);
    if (ymd(d) <= todayStr) setSelectedDate(ymd(d));
  };
  const goToday = () => setSelectedDate(todayStr);

  const formattedDate = useMemo(() => {
    if (selectedDate === todayStr) return "Today";
    const d = parseYMD(selectedDate);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }, [selectedDate, todayStr]);

  /* ── calendar heatmap data ── */
  const calData = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!map[e.date]) map[e.date] = { count: 0, maxSev: 0 };
      map[e.date].count++;
      if ((e.severity || 1) > map[e.date].maxSev) map[e.date].maxSev = e.severity || 1;
    });
    return map;
  }, [entries]);

  const calGrid = useMemo(() => getMonthGrid(calYear, calMonth), [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  function heatColor(dateStr) {
    const d = calData[dateStr];
    if (!d) return "#c8e6c9"; // green = symptom-free
    const sev = d.maxSev;
    if (sev <= 1) return "#fff9c4";
    if (sev <= 2) return "#ffcc80";
    if (sev <= 3) return "#ff8a65";
    if (sev <= 4) return "#ef5350";
    return "#c62828";
  }

  /* ── trend: last 30 days frequency ── */
  const trendData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = ymd(addDays(today, -i));
      const dayEntries = entries.filter(e => e.date === d && (filterSymptom === "All" || e.symptom === filterSymptom));
      days.push({ date: d, count: dayEntries.length, maxSev: dayEntries.reduce((m, e) => Math.max(m, e.severity || 1), 0) });
    }
    return days;
  }, [entries, today, filterSymptom]);

  const trendMax = useMemo(() => Math.max(1, ...trendData.map(d => d.count)), [trendData]);

  /* ── pattern detection ── */
  const patterns = useMemo(() => {
    // Group by date, find symptom co-occurrences
    const byDate = {};
    entries.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = new Set();
      byDate[e.date].add(e.symptom);
    });
    const pairCount = {};
    Object.values(byDate).forEach(symptoms => {
      const arr = [...symptoms];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const key = [arr[i], arr[j]].sort().join(" + ");
          pairCount[key] = (pairCount[key] || 0) + 1;
        }
      }
    });
    return Object.entries(pairCount)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [entries]);

  return (
    <div className="daysPage">
      <style>{`
        .syTopRow{display:flex;gap:16px;padding:0 24px 16px;flex-wrap:wrap;}
        .syStatCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:14px 20px;flex:1;min-width:130px;text-align:center;}
        .syStatVal{font-size:26px;font-weight:800;color:var(--accent);}
        .syStatLabel{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}

        .syDateNav{display:flex;align-items:center;gap:10px;padding:0 24px 14px;}
        .syDateBtn{background:none;border:1.5px solid var(--border);border-radius:8px;padding:4px 10px;font-size:13px;cursor:pointer;color:var(--text);transition:border-color .15s;}
        .syDateBtn:hover{border-color:var(--accent);}
        .syDateLabel{font-size:16px;font-weight:700;color:var(--text);min-width:120px;text-align:center;}

        .syAddForm{background:var(--paper);border:1.5px solid var(--border);border-radius:12px;padding:16px;margin:0 24px 16px;display:flex;flex-direction:column;gap:10px;}
        .syAddTitle{font-size:13px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.5px;}
        .syAddRow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
        .sySelect{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;flex:1;min-width:120px;}
        .sySelect:focus{border-color:var(--accent);}
        .syInput{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .syInput:focus{border-color:var(--accent);}
        .syInputFull{width:100%;}
        .sySevRow{display:flex;gap:6px;align-items:center;}
        .sySevBtn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:pointer;transition:all .12s;background:var(--bg);color:var(--text);}
        .sySevBtn:hover{border-color:var(--accent);}
        .sySevBtnActive{color:#fff;}
        .sySevLabel{font-size:12px;color:var(--muted);margin-left:6px;}

        .syEntries{padding:0 24px 20px;}
        .syEntry{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:var(--paper);border:1.5px solid var(--border);border-radius:10px;margin-bottom:8px;}
        .syEntrySev{width:8px;min-height:36px;border-radius:4px;flex-shrink:0;margin-top:2px;}
        .syEntryBody{flex:1;min-width:0;}
        .syEntryHead{display:flex;align-items:center;gap:8px;margin-bottom:2px;}
        .syEntryName{font-size:14px;font-weight:600;color:var(--text);}
        .syEntryBadge{font-size:11px;padding:1px 8px;border-radius:8px;font-weight:600;color:#fff;}
        .syEntryTime{font-size:12px;color:var(--muted);}
        .syEntryNotes{font-size:13px;color:var(--muted);margin-top:3px;line-height:1.4;}
        .syEntryDel{background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:2px 6px;border-radius:6px;flex-shrink:0;}
        .syEntryDel:hover{color:#e53935;background:#fce4ec;}
        .syEmpty{text-align:center;padding:40px 0;color:var(--muted);font-size:15px;}

        .syPresets{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;}
        .syPresetBtn{font-size:12px;padding:3px 10px;border-radius:16px;border:1.5px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer;transition:all .12s;}
        .syPresetBtn:hover{border-color:var(--accent);color:var(--accent);}
        .syPresetBtnActive{background:var(--accent);color:#fff;border-color:var(--accent);}

        .syCustomAdd{display:flex;gap:6px;align-items:center;margin-top:4px;}
        .syCustomInput{border:1.5px solid var(--border);border-radius:8px;padding:5px 8px;font-size:12px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;width:140px;}
        .syCustomInput:focus{border-color:var(--accent);}
        .syCustomAddBtn{font-size:12px;padding:4px 10px;border-radius:8px;border:1.5px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer;}

        .syCalendar{padding:0 24px 20px;max-width:600px;}
        .syCalNav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .syCalTitle{font-size:16px;font-weight:700;color:var(--text);}
        .syCalGrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
        .syCalHeader{font-size:11px;font-weight:600;color:var(--muted);text-align:center;padding:4px 0;text-transform:uppercase;}
        .syCalCell{aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;cursor:pointer;transition:all .12s;border:1.5px solid transparent;}
        .syCalCell:hover{border-color:var(--accent);}
        .syCalCellToday{border-color:var(--accent);box-shadow:0 0 0 2px rgba(91,124,245,.2);}
        .syCalCellSelected{border-color:var(--accent);border-width:2px;}
        .syCalEmpty{background:transparent;cursor:default;}
        .syCalEmpty:hover{border-color:transparent;}
        .syCalLegend{display:flex;gap:12px;margin-top:12px;font-size:11px;color:var(--muted);align-items:center;}
        .syCalLegendBox{width:16px;height:16px;border-radius:4px;display:inline-block;margin-right:4px;}

        .syTrend{padding:0 24px 20px;max-width:700px;}
        .syTrendTitle{font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;}
        .syTrendChart{display:flex;align-items:flex-end;gap:3px;height:120px;padding:8px 0;border-bottom:1.5px solid var(--border);}
        .syTrendBar{flex:1;min-width:0;border-radius:4px 4px 0 0;transition:height .3s;cursor:pointer;position:relative;}
        .syTrendBar:hover{opacity:.8;}
        .syTrendBar:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:var(--text);color:var(--paper);font-size:10px;padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:none;z-index:10;}
        .syTrendLabels{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:4px;}
        .syFilterRow{display:flex;align-items:center;gap:8px;padding:0 24px 12px;flex-wrap:wrap;}
        .syFilterLabel{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}

        .syPatterns{padding:0 24px 20px;max-width:600px;}
        .syPatternTitle{font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;}
        .syPatternRow{display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--paper);border:1.5px solid var(--border);border-radius:10px;margin-bottom:8px;}
        .syPatternPair{font-size:14px;font-weight:600;color:var(--text);flex:1;}
        .syPatternCount{font-size:13px;color:var(--accent);font-weight:700;}
        .syPatternLabel{font-size:11px;color:var(--muted);}
        .syPatternEmpty{text-align:center;padding:30px 0;color:var(--muted);font-size:14px;}
        .sySectionTitle{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;padding:0 24px 8px;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Symptoms Tracker</h1>
          <div className="weekBadge">{dayEntries.length} today</div>
        </div>
        <div className="nav">
          <div className="dsSortRow">
            {["log", "calendar", "trends", "patterns"].map(t => (
              <button key={t} className={`tabBtn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)} type="button">{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="dsBody">
        {/* Stats row */}
        <div className="syTopRow">
          <div className="syStatCard">
            <div className="syStatVal">{entries.filter(e => e.date === todayStr).length}</div>
            <div className="syStatLabel">Today</div>
          </div>
          <div className="syStatCard">
            <div className="syStatVal">{(() => {
              const last7 = new Set();
              for (let i = 0; i < 7; i++) last7.add(ymd(addDays(today, -i)));
              return entries.filter(e => last7.has(e.date)).length;
            })()}</div>
            <div className="syStatLabel">This Week</div>
          </div>
          <div className="syStatCard">
            <div className="syStatVal">{(() => {
              const last7 = new Set();
              for (let i = 0; i < 7; i++) last7.add(ymd(addDays(today, -i)));
              const daysWithSymptoms = new Set(entries.filter(e => last7.has(e.date)).map(e => e.date));
              return 7 - daysWithSymptoms.size;
            })()}</div>
            <div className="syStatLabel">Symptom-Free Days (7d)</div>
          </div>
          <div className="syStatCard">
            <div className="syStatVal">{uniqueLogged.length}</div>
            <div className="syStatLabel">Unique Symptoms</div>
          </div>
        </div>

        {/* ── Log tab ── */}
        {tab === "log" && (
          <>
            {/* Date navigator */}
            <div className="syDateNav">
              <button className="syDateBtn" onClick={goPrev} type="button">&larr;</button>
              <div className="syDateLabel">{formattedDate}</div>
              <button className="syDateBtn" onClick={goNext} type="button"
                disabled={selectedDate >= todayStr}>&rarr;</button>
              {selectedDate !== todayStr && (
                <button className="syDateBtn" onClick={goToday} type="button">Today</button>
              )}
            </div>

            {/* Add form */}
            <div className="syAddForm">
              <div className="syAddTitle">Log Symptom</div>
              <div className="syPresets">
                {allSymptoms.map(s => (
                  <button key={s}
                    className={`syPresetBtn ${addSymptom === s ? "syPresetBtnActive" : ""}`}
                    onClick={() => setAddSymptom(addSymptom === s ? "" : s)}
                    type="button">{s}</button>
                ))}
              </div>
              <div className="syCustomAdd">
                <input className="syCustomInput" placeholder="Custom symptom..."
                  value={newCustom} onChange={e => setNewCustom(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addCustomSymptom(); }} />
                <button className="syCustomAddBtn" onClick={addCustomSymptom} type="button">Add</button>
              </div>

              <div className="syAddRow">
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>SEVERITY</div>
                  <div className="sySevRow">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n}
                        className={`sySevBtn ${addSeverity === n ? "sySevBtnActive" : ""}`}
                        style={addSeverity === n ? { background: SEVERITY_COLORS[n], borderColor: SEVERITY_COLORS[n] } : {}}
                        onClick={() => setAddSeverity(n)} type="button">{n}</button>
                    ))}
                    <span className="sySevLabel">{SEVERITY_LABELS[addSeverity]}</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>TIME OF DAY</div>
                  <select className="sySelect" value={addTime} onChange={e => setAddTime(e.target.value)}>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <input className="syInput syInputFull" placeholder="Notes (optional)..."
                value={addNotes} onChange={e => setAddNotes(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addEntry(); }} />

              <button className="btn btnPrimary" onClick={addEntry} type="button"
                disabled={!addSymptom} style={{ alignSelf: "flex-start" }}>
                Log Symptom
              </button>
            </div>

            {/* Entries for selected date */}
            <div className="syEntries">
              {filteredEntries.length > 0 ? filteredEntries.map(e => (
                <div className="syEntry" key={e.id}>
                  <div className="syEntrySev" style={{ background: SEVERITY_COLORS[e.severity || 1] }} />
                  <div className="syEntryBody">
                    <div className="syEntryHead">
                      <span className="syEntryName">{e.symptom}</span>
                      <span className="syEntryBadge" style={{ background: SEVERITY_COLORS[e.severity || 1] }}>
                        {e.severity}/5
                      </span>
                      <span className="syEntryTime">{e.timeOfDay}</span>
                    </div>
                    {e.notes && <div className="syEntryNotes">{e.notes}</div>}
                  </div>
                  <button className="syEntryDel" onClick={() => setConfirmDel(e.id)} type="button">&times;</button>
                </div>
              )) : (
                <div className="syEmpty">
                  {selectedDate === todayStr
                    ? "No symptoms logged today. Feeling good?"
                    : "No symptoms logged for this date."}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Calendar tab ── */}
        {tab === "calendar" && (
          <div className="syCalendar">
            <div className="syCalNav">
              <button className="syDateBtn" onClick={prevMonth} type="button">&larr;</button>
              <div className="syCalTitle">
                {new Date(calYear, calMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </div>
              <button className="syDateBtn" onClick={nextMonth} type="button">&rarr;</button>
            </div>

            <div className="syCalGrid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div className="syCalHeader" key={d}>{d}</div>
              ))}
              {calGrid.map((day, i) => {
                if (day === null) return <div key={`e${i}`} className="syCalCell syCalEmpty" />;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;
                const isSel = dateStr === selectedDate;
                const bg = heatColor(dateStr);
                return (
                  <div key={dateStr}
                    className={`syCalCell ${isToday ? "syCalCellToday" : ""} ${isSel ? "syCalCellSelected" : ""}`}
                    style={{ background: bg, color: calData[dateStr]?.maxSev >= 4 ? "#fff" : "var(--text)" }}
                    onClick={() => { setSelectedDate(dateStr); setTab("log"); }}
                    title={calData[dateStr] ? `${calData[dateStr].count} symptom(s), max severity ${calData[dateStr].maxSev}` : "Symptom-free"}>
                    {day}
                  </div>
                );
              })}
            </div>

            <div className="syCalLegend">
              <span><span className="syCalLegendBox" style={{ background: "#c8e6c9" }} /> Clear</span>
              <span><span className="syCalLegendBox" style={{ background: "#fff9c4" }} /> Mild</span>
              <span><span className="syCalLegendBox" style={{ background: "#ffcc80" }} /> Moderate</span>
              <span><span className="syCalLegendBox" style={{ background: "#ff8a65" }} /> Noticeable</span>
              <span><span className="syCalLegendBox" style={{ background: "#ef5350" }} /> Severe</span>
              <span><span className="syCalLegendBox" style={{ background: "#c62828" }} /> Extreme</span>
            </div>
          </div>
        )}

        {/* ── Trends tab ── */}
        {tab === "trends" && (
          <>
            <div className="syFilterRow">
              <span className="syFilterLabel">Filter:</span>
              <button className={`syPresetBtn ${filterSymptom === "All" ? "syPresetBtnActive" : ""}`}
                onClick={() => setFilterSymptom("All")} type="button">All</button>
              {uniqueLogged.map(s => (
                <button key={s}
                  className={`syPresetBtn ${filterSymptom === s ? "syPresetBtnActive" : ""}`}
                  onClick={() => setFilterSymptom(filterSymptom === s ? "All" : s)}
                  type="button">{s}</button>
              ))}
            </div>
            <div className="syTrend">
              <div className="syTrendTitle">
                Symptom Frequency - Last 30 Days
                {filterSymptom !== "All" && ` (${filterSymptom})`}
              </div>
              <div className="syTrendChart">
                {trendData.map(d => (
                  <div key={d.date} className="syTrendBar"
                    data-tip={`${d.date}: ${d.count} symptom(s)`}
                    style={{
                      height: d.count > 0 ? `${Math.max(8, (d.count / trendMax) * 100)}%` : "4px",
                      background: d.count === 0 ? "var(--border)" : d.maxSev >= 4 ? "#ef5350" : d.maxSev >= 2 ? "#ff9800" : "#4caf50",
                    }} />
                ))}
              </div>
              <div className="syTrendLabels">
                <span>{trendData[0]?.date.slice(5)}</span>
                <span>{trendData[14]?.date.slice(5)}</span>
                <span>{trendData[29]?.date.slice(5)}</span>
              </div>
            </div>
          </>
        )}

        {/* ── Patterns tab ── */}
        {tab === "patterns" && (
          <div className="syPatterns">
            <div className="syPatternTitle">Symptom Co-occurrences</div>
            <div className="sySectionTitle" style={{ padding: "0 0 8px" }}>
              Symptoms that appeared on the same day at least twice
            </div>
            {patterns.length > 0 ? patterns.map(([pair, count]) => (
              <div className="syPatternRow" key={pair}>
                <div className="syPatternPair">{pair}</div>
                <div>
                  <div className="syPatternCount">{count}</div>
                  <div className="syPatternLabel">co-occurrences</div>
                </div>
              </div>
            )) : (
              <div className="syPatternEmpty">
                Not enough data yet. Log symptoms across multiple days to see patterns emerge.
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete Entry"
        message="Are you sure you want to delete this symptom entry?"
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteItem(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
