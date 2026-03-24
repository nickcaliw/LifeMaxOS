import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { ymd, startOfWeekMonday, addDays } from "../lib/dates.js";

const supplementsApi = typeof window !== "undefined" ? window.supplementsApi : null;
const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Bedtime"];
const EMPTY_FORM = { name: "", dosage: "", timeOfDay: "Morning", active: true };

export default function SupplementsPage() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateStr = useMemo(() => ymd(selectedDate), [selectedDate]);
  const todayStr = useMemo(() => ymd(today), [today]);

  const [supplements, setSupplements] = useState([]);
  const [log, setLog] = useState({});
  const [rangeData, setRangeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Chart
  const [chartView, setChartView] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const isToday = selectedDateStr === todayStr;

  // Drag-to-reorder
  const dragIdx = useRef(null);
  const overIdx = useRef(null);

  const onDragStart = (idx) => (e) => { dragIdx.current = idx; e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (idx) => (e) => { e.preventDefault(); overIdx.current = idx; };
  const onDragEnd = async () => {
    if (dragIdx.current !== null && overIdx.current !== null && dragIdx.current !== overIdx.current) {
      const next = [...supplements];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx.current, 0, moved);
      setSupplements(next);
      // Save new order — update each supplement with an order field
      if (supplementsApi) {
        for (let i = 0; i < next.length; i++) {
          await supplementsApi.save(next[i].id, { ...next[i], order: i });
        }
      }
    }
    dragIdx.current = null;
    overIdx.current = null;
  };

  const loadSupplements = useCallback(async () => {
    if (!supplementsApi) return;
    const list = await supplementsApi.list();
    // Sort by order field if present, otherwise by original order
    const sorted = (list ?? []).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setSupplements(sorted);
  }, []);

  const loadLog = useCallback(async () => {
    if (!supplementsApi) return;
    const data = await supplementsApi.getLog(selectedDateStr);
    setLog(data ?? {});
  }, [selectedDateStr]);

  // Load range data for charts
  const loadRangeData = useCallback(async () => {
    if (!supplementsApi || !supplementsApi.logRange) return;
    const sixtyAgo = addDays(today, -60);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const earliest = monthStart < sixtyAgo ? monthStart : sixtyAgo;
    const weekStart = addDays(startOfWeekMonday(today), weekOffset * 7);
    const finalEarliest = weekStart < earliest ? weekStart : earliest;
    const data = await supplementsApi.logRange(ymd(finalEarliest), todayStr);
    setRangeData(data || []);
  }, [today, todayStr, monthDate, weekOffset]);

  useEffect(() => {
    loadSupplements().then(() => setLoading(false));
  }, [loadSupplements]);

  useEffect(() => { loadLog(); }, [loadLog]);
  useEffect(() => { loadRangeData(); }, [loadRangeData, log]);

  const goPrev = () => setSelectedDate(d => addDays(d, -1));
  const goNext = () => { const next = addDays(selectedDate, 1); if (next <= today) setSelectedDate(next); };
  const goToday = () => setSelectedDate(new Date());

  const toggleTaken = useCallback(async (suppId) => {
    const updated = { ...log, [suppId]: !log[suppId] };
    setLog(updated);
    if (supplementsApi) await supplementsApi.saveLog(selectedDateStr, updated);
  }, [log, selectedDateStr]);

  const grouped = useMemo(() => {
    const active = supplements.filter(s => s.active);
    const groups = {};
    for (const slot of TIME_SLOTS) {
      const items = active.filter(s => s.timeOfDay === slot);
      if (items.length > 0) groups[slot] = items;
    }
    return groups;
  }, [supplements]);

  const activeSupps = useMemo(() => supplements.filter(s => s.active), [supplements]);

  const stats = useMemo(() => {
    const taken = activeSupps.filter(s => !!log[s.id]).length;
    return { taken, total: activeSupps.length };
  }, [activeSupps, log]);

  const dateLabel = useMemo(() =>
    isToday ? "Today" : selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    [selectedDate, isToday]
  );

  // Build data lookup: date -> { suppId: true/false }
  const byDate = useMemo(() => {
    const map = {};
    for (const entry of rangeData) {
      if (entry.date) {
        const { date, ...rest } = entry;
        map[date] = rest;
      }
    }
    map[selectedDateStr] = log;
    return map;
  }, [rangeData, selectedDateStr, log]);

  // Adherence calculation helper
  const calcAdherence = useCallback((dayLog) => {
    if (!dayLog || activeSupps.length === 0) return { taken: 0, total: activeSupps.length, pct: 0 };
    const taken = activeSupps.filter(s => !!dayLog[s.id]).length;
    return { taken, total: activeSupps.length, pct: Math.round((taken / activeSupps.length) * 100) };
  }, [activeSupps]);

  // --- WEEK CHART ---
  const weekChartMonday = useMemo(() => addDays(startOfWeekMonday(today), weekOffset * 7), [today, weekOffset]);

  const weekBars = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekChartMonday, i);
      const key = ymd(d);
      const dayLog = byDate[key];
      const { taken, total, pct } = calcAdherence(dayLog);
      const isFuture = d > today;
      return {
        key, label: d.toLocaleDateString(undefined, { weekday: "short" }),
        dayNum: d.getDate(), taken, total, pct,
        metGoal: pct === 100 && total > 0,
        isSelected: key === selectedDateStr, isFuture,
      };
    });
  }, [byDate, weekChartMonday, today, selectedDateStr, calcAdherence]);

  const weekLabel = useMemo(() => {
    const sun = addDays(weekChartMonday, 6);
    return `${weekChartMonday.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${sun.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }, [weekChartMonday]);

  const weekAdherence = useMemo(() => {
    let possible = 0, done = 0;
    for (const bar of weekBars) {
      if (!bar.isFuture) { possible += bar.total; done += bar.taken; }
    }
    return { pct: possible > 0 ? Math.round((done / possible) * 100) : 0 };
  }, [weekBars]);

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
      const dayLog = byDate[key];
      const { taken, total, pct } = calcAdherence(dayLog);
      const isFuture = date > today;
      const hasData = taken > 0;
      days.push({
        key, day: d, taken, total, pct,
        metGoal: pct === 100 && total > 0,
        hasData, isFuture,
        isSelected: key === selectedDateStr,
        isToday: key === todayStr,
      });
    }
    return days;
  }, [monthDate, byDate, today, todayStr, selectedDateStr, calcAdherence]);

  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const canNextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) <= today;

  const monthStats = useMemo(() => {
    const valid = monthDays.filter(d => d && !d.isFuture);
    const tracked = valid.filter(d => d.hasData);
    const met = valid.filter(d => d.metGoal);
    return { tracked: tracked.length, metGoal: met.length, total: valid.length };
  }, [monthDays]);

  const goToDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    setSelectedDate(new Date(y, m - 1, d));
  };

  const openAddForm = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEditForm = (s) => { setEditingId(s.id); setForm({ name: s.name, dosage: s.dosage, timeOfDay: s.timeOfDay, active: s.active }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const id = editingId ?? crypto.randomUUID();
    if (supplementsApi) await supplementsApi.save(id, { id, name: form.name.trim(), dosage: form.dosage.trim(), timeOfDay: form.timeOfDay, active: form.active });
    await loadSupplements();
    closeForm();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (id) => {
    if (supplementsApi) await supplementsApi.delete(id);
    setConfirmDeleteId(null);
    await loadSupplements();
  };

  if (loading) {
    return (
      <div className="suppPage">
        <div className="topbar"><div className="topbarLeft"><h1 className="pageTitle">Supplements</h1></div></div>
        <div className="loadingMsg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="suppPage">
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Supplements</h1>
          <div className="weekBadge">{stats.taken}/{stats.total} taken</div>
        </div>
        <div className="nav">
          <button className="btn" onClick={goPrev} aria-label="Previous day">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="range">{dateLabel}</div>
          <button className="btn" onClick={goNext} disabled={isToday} aria-label="Next day">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
          </button>
          {!isToday && <button className="btn btnPrimary" onClick={goToday}>Today</button>}
        </div>
      </div>

      <div className="suppContent">
        {/* Stats */}
        <div className="suppStats">
          <div className="suppStatCard">
            <div className="suppStatValue">{stats.taken}/{stats.total}</div>
            <div className="suppStatLabel">Taken Today</div>
          </div>
          <div className="suppStatCard">
            <div className="suppStatValue">{weekAdherence.pct}%</div>
            <div className="suppStatLabel">Weekly Adherence</div>
          </div>
        </div>

        {/* Actions */}
        <div className="suppActions">
          <button className="btn btnPrimary" onClick={openAddForm} type="button">+ Add Supplement</button>
          <button className="btn" onClick={() => setEditMode(e => !e)} type="button">
            {editMode ? "Done" : "Edit"}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="suppForm">
            <div className="suppFormRow">
              <input className="suppFormInput" type="text" placeholder="Name (e.g. Vitamin D)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className="suppFormInput" type="text" placeholder="Dosage (e.g. 5000 IU)" value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} />
            </div>
            <div className="suppFormRow">
              <select className="suppFormSelect" value={form.timeOfDay} onChange={e => setForm(f => ({ ...f, timeOfDay: e.target.value }))}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="btn btnPrimary" onClick={handleSave} type="button">{editingId ? "Update" : "Add"}</button>
              <button className="btn" onClick={closeForm} type="button">Cancel</button>
            </div>
          </div>
        )}

        {/* Daily Checklist */}
        <div className="suppChecklist">
          {editMode ? (
            /* Flat reorder list in edit mode */
            <div className="suppReorderList">
              <div className="suppReorderHint">Drag to reorder. Changes apply to all views.</div>
              {supplements.filter(s => s.active !== false).map((supp, idx) => (
                <div
                  className="suppReorderRow"
                  key={supp.id}
                  draggable
                  onDragStart={onDragStart(idx)}
                  onDragOver={onDragOver(idx)}
                  onDragEnd={onDragEnd}
                >
                  <div className="suppReorderGrip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/>
                      <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
                      <circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/>
                    </svg>
                  </div>
                  <div className="suppReorderInfo">
                    <div className="suppReorderName">{supp.name}</div>
                    {supp.dosage && <div className="suppReorderDosage">{supp.dosage}</div>}
                  </div>
                  <div className="suppReorderTime">{supp.timeOfDay}</div>
                  <button className="btn suppEditBtn" onClick={e => { e.stopPropagation(); openEditForm(supp); }} type="button">Edit</button>
                  <button className="suppDeleteBtn" onClick={e => { e.stopPropagation(); setConfirmDeleteId(supp.id); }} type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Normal grouped checklist */
            Object.entries(grouped).map(([timeSlot, items]) => (
              <div className="suppTimeGroup" key={timeSlot}>
                <div className="suppTimeLabel">{timeSlot}</div>
                {items.map(supp => {
                  const taken = !!log[supp.id];
                  return (
                    <div
                      className={`suppItem ${taken ? "suppItemChecked" : ""}`}
                      key={supp.id}
                      onClick={() => toggleTaken(supp.id)}
                    >
                      <div className="suppCheck">{taken ? "\u2713" : ""}</div>
                      <div className="suppItemName">{supp.name}</div>
                      {supp.dosage && <div className="suppItemDosage">{supp.dosage}</div>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
          {!editMode && Object.keys(grouped).length === 0 && (
            <div className="suppEmpty">No active supplements. Add one to get started.</div>
          )}
        </div>

        {/* Chart Toggle */}
        {activeSupps.length > 0 && (
          <>
            <div className="waterChartToggle">
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
                      className={`waterWeekBarWrap ${bar.isSelected ? "waterWeekBarSelected" : ""} ${bar.isFuture ? "waterWeekBarFuture" : ""}`}
                      key={bar.key}
                      onClick={() => !bar.isFuture && goToDate(bar.key)}
                      style={{ cursor: bar.isFuture ? "default" : "pointer" }}
                    >
                      <div className="waterWeekValue">{bar.isFuture ? "" : `${bar.pct}%`}</div>
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
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendGoal" /> All taken</span>
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendPartial" /> Partial</span>
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
                    <div className="waterMonthStatLabel">Days tracked</div>
                  </div>
                  <div className="waterMonthStat">
                    <div className="waterMonthStatNum waterMonthStatGoal">{monthStats.metGoal}</div>
                    <div className="waterMonthStatLabel">100% days</div>
                  </div>
                  <div className="waterMonthStat">
                    <div className="waterMonthStatNum waterMonthStatMissed">{monthStats.tracked - monthStats.metGoal}</div>
                    <div className="waterMonthStatLabel">Partial</div>
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
                          day.metGoal ? "waterMonthCellGoal" : "",
                          day.hasData && !day.metGoal ? "waterMonthCellPartial" : "",
                          !day.hasData && !day.isFuture ? "waterMonthCellMissed" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => !day.isFuture && goToDate(day.key)}
                        style={{ cursor: day.isFuture ? "default" : "pointer" }}
                      >
                        <div className="waterMonthCellDay">{day.day}</div>
                        {!day.isFuture && day.hasData && (
                          <div className="waterMonthCellGlasses">{day.taken}/{day.total}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="waterChartLegend">
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendGoal" /> All taken</span>
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendPartial" /> Partial</span>
                  <span className="waterLegendItem"><span className="waterLegendDot waterLegendMissed" /> No data</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Supplement"
        message={`Delete "${supplements.find(s => s.id === confirmDeleteId)?.name || "this supplement"}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
