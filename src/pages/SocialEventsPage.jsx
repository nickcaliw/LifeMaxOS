import { useCallback, useEffect, useRef, useState } from "react";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "socialevents";

const TYPES = ["Dinner", "Party", "Meetup", "Coffee", "Sports", "Game Night", "Trip", "Call", "Other"];
const TYPE_COLORS = {
  Dinner: "#ff9800", Party: "#e91e63", Meetup: "#5B7CF5", Coffee: "#795548",
  Sports: "#4caf50", "Game Night": "#9c27b0", Trip: "#00bcd4", Call: "#607d8b", Other: "#9e9e9e",
};
const ENERGY_LABELS = ["", "Drained", "Low", "Neutral", "Good", "Energized"];
const DATE_FILTERS = ["all", "this week", "this month"];

function todayStr() { return new Date().toISOString().split("T")[0]; }

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = new Date(now); start.setDate(now.getDate() - now.getDay());
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return d >= start && d <= end;
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isLast30Days(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const ago = new Date(now); ago.setDate(now.getDate() - 30);
  return d >= ago && d <= now;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

function groupByDate(items) {
  const groups = {};
  for (const item of items) {
    const key = item.date || "No Date";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups).sort((a, b) => {
    if (a[0] === "No Date") return 1;
    if (b[0] === "No Date") return -1;
    return b[0].localeCompare(a[0]);
  });
}

export default function SocialEventsPage() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const saveTimer = useRef({});

  const refresh = useCallback(async () => {
    if (api) setItems(await api.list(COLLECTION) || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((id, data) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => { if (api) api.save(id, COLLECTION, data); }, 300);
  }, []);

  const addItem = async () => {
    const id = crypto.randomUUID();
    const data = {
      title: "", date: todayStr(), time: "", location: "",
      people: "", type: "Dinner", energy: 3, rating: 0, notes: "",
    };
    if (api) await api.save(id, COLLECTION, data);
    await refresh();
    setEditingId(id);
    setShowForm(false);
  };

  const deleteItem = async (id) => {
    if (api) await api.delete(id);
    if (editingId === id) setEditingId(null);
    refresh();
  };

  // Filtering
  const filtered = items.filter(item => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterDate === "this week" && !isThisWeek(item.date)) return false;
    if (filterDate === "this month" && !isThisMonth(item.date)) return false;
    return true;
  });

  const dateGroups = groupByDate(filtered);

  // Stats
  const monthEvents = items.filter(i => isThisMonth(i.date));
  const avgEnergy = monthEvents.length > 0
    ? (monthEvents.reduce((s, i) => s + (i.energy || 0), 0) / monthEvents.length).toFixed(1)
    : "---";
  const typeCounts = {};
  for (const i of monthEvents) {
    typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
  }
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "---";

  // Energy trend (last 30 days)
  const last30 = items.filter(i => isLast30Days(i.date) && i.energy)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const trendAvg = last30.length > 0
    ? (last30.reduce((s, i) => s + i.energy, 0) / last30.length).toFixed(1)
    : null;
  const trendDirection = last30.length >= 2
    ? (last30[last30.length - 1].energy > last30[0].energy ? "up" : last30[last30.length - 1].energy < last30[0].energy ? "down" : "flat")
    : "flat";

  return (
    <div className="daysPage">
      <style>{`
        .seStats{display:flex;gap:12px;padding:16px 24px 0;flex-wrap:wrap;}
        .seStat{background:var(--paper);border:1.5px solid var(--border);border-radius:10px;padding:10px 16px;min-width:120px;text-align:center;}
        .seStatNum{font-size:22px;font-weight:700;color:var(--text);}
        .seStatLabel{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}
        .seTrend{display:flex;align-items:center;gap:6px;justify-content:center;margin-top:4px;font-size:12px;}
        .seTrendUp{color:#4caf50;}
        .seTrendDown{color:#e53935;}
        .seTrendFlat{color:var(--muted);}
        .seDateHeader{font-size:13px;font-weight:700;color:var(--text);padding:18px 24px 6px;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:8px;}
        .seDateCount{font-size:11px;font-weight:500;color:var(--muted);background:var(--bg);border-radius:10px;padding:1px 8px;}
        .seGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;padding:8px 24px 20px;}
        .seCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:16px;cursor:pointer;transition:box-shadow .15s,border-color .15s;}
        .seCard:hover{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.1);}
        .seCardActive{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.15);}
        .seCardHead{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;}
        .seTypeDot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:5px;}
        .seTitle{font-size:15px;font-weight:600;color:var(--text);flex:1;min-width:0;word-break:break-word;}
        .seTitleEmpty{color:var(--muted);font-style:italic;font-weight:400;}
        .seMeta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
        .seTag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--muted);border:1px solid var(--border);}
        .seTypeTag{color:#fff;border:none;}
        .seEnergyRow{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
        .seEnergyLabel{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px;font-weight:600;}
        .seEnergyBar{display:flex;gap:3px;}
        .seEnergyDot{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--border);transition:background .15s;}
        .seEnergyDotFill{border-color:transparent;}
        .seRatingRow{display:flex;align-items:center;gap:2px;margin-bottom:6px;}
        .seStar{font-size:16px;cursor:default;color:var(--border);}
        .seStarFill{color:#ffc107;}
        .sePeople{font-size:12px;color:var(--muted);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .seLocation{font-size:12px;color:var(--muted);}
        .seNotes{font-size:12px;color:var(--muted);margin-top:4px;white-space:pre-wrap;word-break:break-word;}
        .seEditPanel{margin-top:12px;border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:10px;}
        .seEditRow{display:flex;flex-direction:column;gap:3px;}
        .seEditLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
        .seEditInput{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .seEditInput:focus{border-color:var(--accent);}
        .seEditSelect{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .seEditSelect:focus{border-color:var(--accent);}
        .seEditTextarea{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;resize:vertical;min-height:50px;transition:border-color .15s;}
        .seEditTextarea:focus{border-color:var(--accent);}
        .seSelectRow{display:flex;gap:6px;}
        .seDeleteBtn{background:none;border:1.5px solid #e53935;color:#e53935;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;margin-top:4px;transition:background .15s,color .15s;}
        .seDeleteBtn:hover{background:#e53935;color:#fff;}
        .seEmpty{grid-column:1/-1;text-align:center;padding:40px 0;color:var(--muted);font-size:15px;}
        .seFilterRow{display:flex;gap:4px;flex-wrap:wrap;}
        .seEnergyEdit{display:flex;gap:4px;}
        .seEnergyEditDot{width:24px;height:24px;border-radius:50%;border:2px solid var(--border);cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--muted);}
        .seEnergyEditDot:hover{border-color:var(--accent);}
        .seEnergyEditDotFill{border-color:transparent;color:#fff;}
        .seStarEdit{font-size:20px;cursor:pointer;color:var(--border);transition:color .1s;}
        .seStarEdit:hover{color:#ffc107;}
        .seStarEditFill{color:#ffc107;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Social Events</h1>
          <div className="weekBadge">{items.length} events</div>
        </div>
        <div className="nav">
          <div className="seFilterRow">
            <button className={`tabBtn ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")} type="button">All</button>
            {TYPES.map(t => (
              <button key={t} className={`tabBtn ${filterType === t ? "active" : ""}`}
                onClick={() => setFilterType(t)} type="button">{t}</button>
            ))}
          </div>
          <div className="dsSortRow">
            {DATE_FILTERS.map(d => (
              <button key={d} className={`tabBtn ${filterDate === d ? "active" : ""}`}
                onClick={() => setFilterDate(d)} type="button">{d}</button>
            ))}
          </div>
          <button className="btn btnPrimary" onClick={addItem} type="button">+ Add</button>
        </div>
      </div>

      <div className="dsBody">
        <div className="seStats">
          <div className="seStat">
            <div className="seStatNum">{monthEvents.length}</div>
            <div className="seStatLabel">This Month</div>
          </div>
          <div className="seStat">
            <div className="seStatNum">{avgEnergy}</div>
            <div className="seStatLabel">Avg Energy</div>
          </div>
          <div className="seStat">
            <div className="seStatNum" style={{ fontSize: 16 }}>{mostCommonType}</div>
            <div className="seStatLabel">Most Common</div>
          </div>
          <div className="seStat">
            <div className="seStatNum">{trendAvg || "---"}</div>
            <div className="seStatLabel">30d Energy</div>
            {trendAvg && (
              <div className={`seTrend ${trendDirection === "up" ? "seTrendUp" : trendDirection === "down" ? "seTrendDown" : "seTrendFlat"}`}>
                {trendDirection === "up" ? "Trending up" : trendDirection === "down" ? "Trending down" : "Steady"}
              </div>
            )}
          </div>
        </div>

        {dateGroups.length > 0 ? dateGroups.map(([date, dateItems]) => (
          <div key={date}>
            <div className="seDateHeader">
              {date === "No Date" ? "No Date" : formatDate(date)}
              <span className="seDateCount">{dateItems.length}</span>
            </div>
            <div className="seGrid">
              {dateItems.map(item => {
                const isEditing = editingId === item.id;
                const typeColor = TYPE_COLORS[item.type] || "#9e9e9e";

                return (
                  <div className={`seCard ${isEditing ? "seCardActive" : ""}`} key={item.id}
                    onClick={() => { if (!isEditing) setEditingId(item.id); }}>
                    <div className="seCardHead">
                      <div className="seTypeDot" style={{ background: typeColor }} />
                      <div className={`seTitle ${!item.title ? "seTitleEmpty" : ""}`}>
                        {item.title || "Untitled Event"}
                      </div>
                    </div>

                    <div className="seMeta">
                      <span className="seTag seTypeTag" style={{ background: typeColor }}>{item.type}</span>
                      {item.time && <span className="seTag">{item.time}</span>}
                      {item.location && <span className="seTag">{item.location}</span>}
                    </div>

                    {item.energy > 0 && (
                      <div className="seEnergyRow">
                        <span className="seEnergyLabel">Energy:</span>
                        <div className="seEnergyBar">
                          {[1, 2, 3, 4, 5].map(n => {
                            const colors = ["#e53935", "#ff9800", "#ffc107", "#8bc34a", "#4caf50"];
                            return (
                              <div key={n}
                                className={`seEnergyDot ${n <= item.energy ? "seEnergyDotFill" : ""}`}
                                style={n <= item.energy ? { background: colors[n - 1] } : {}} />
                            );
                          })}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{ENERGY_LABELS[item.energy]}</span>
                      </div>
                    )}

                    {item.rating > 0 && (
                      <div className="seRatingRow">
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} className={`seStar ${n <= item.rating ? "seStarFill" : ""}`}>
                            {n <= item.rating ? "\u2605" : "\u2606"}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.people && !isEditing && (
                      <div className="sePeople">With: {item.people}</div>
                    )}

                    {item.notes && !isEditing && (
                      <div className="seNotes">{item.notes}</div>
                    )}

                    {isEditing && (
                      <div className="seEditPanel" onClick={e => e.stopPropagation()}>
                        <div className="seEditRow">
                          <label className="seEditLabel">Title</label>
                          <input className="seEditInput" value={item.title || ""}
                            placeholder="Event name"
                            onChange={e => save(item.id, { ...item, title: e.target.value })} />
                        </div>
                        <div className="seSelectRow">
                          <div className="seEditRow" style={{ flex: 1 }}>
                            <label className="seEditLabel">Date</label>
                            <input type="date" className="seEditInput" value={item.date || ""}
                              onChange={e => save(item.id, { ...item, date: e.target.value })} />
                          </div>
                          <div className="seEditRow" style={{ flex: 1 }}>
                            <label className="seEditLabel">Time</label>
                            <input type="time" className="seEditInput" value={item.time || ""}
                              onChange={e => save(item.id, { ...item, time: e.target.value })} />
                          </div>
                        </div>
                        <div className="seSelectRow">
                          <div className="seEditRow" style={{ flex: 1 }}>
                            <label className="seEditLabel">Type</label>
                            <select className="seEditSelect" value={item.type || "Dinner"}
                              onChange={e => save(item.id, { ...item, type: e.target.value })}>
                              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="seEditRow" style={{ flex: 1 }}>
                            <label className="seEditLabel">Location</label>
                            <input className="seEditInput" value={item.location || ""}
                              placeholder="Where?"
                              onChange={e => save(item.id, { ...item, location: e.target.value })} />
                          </div>
                        </div>
                        <div className="seEditRow">
                          <label className="seEditLabel">People</label>
                          <input className="seEditInput" value={item.people || ""}
                            placeholder="John, Sarah, Mike..."
                            onChange={e => save(item.id, { ...item, people: e.target.value })} />
                        </div>
                        <div className="seEditRow">
                          <label className="seEditLabel">Energy Level ({ENERGY_LABELS[item.energy || 0] || "Not set"})</label>
                          <div className="seEnergyEdit">
                            {[1, 2, 3, 4, 5].map(n => {
                              const colors = ["#e53935", "#ff9800", "#ffc107", "#8bc34a", "#4caf50"];
                              const active = n <= (item.energy || 0);
                              return (
                                <div key={n}
                                  className={`seEnergyEditDot ${active ? "seEnergyEditDotFill" : ""}`}
                                  style={active ? { background: colors[n - 1] } : {}}
                                  onClick={() => save(item.id, { ...item, energy: item.energy === n ? 0 : n })}>
                                  {n}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="seEditRow">
                          <label className="seEditLabel">Rating</label>
                          <div style={{ display: "flex", gap: 2 }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <span key={n}
                                className={`seStarEdit ${n <= (item.rating || 0) ? "seStarEditFill" : ""}`}
                                onClick={() => save(item.id, { ...item, rating: item.rating === n ? 0 : n })}>
                                {n <= (item.rating || 0) ? "\u2605" : "\u2606"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="seEditRow">
                          <label className="seEditLabel">Notes</label>
                          <textarea className="seEditTextarea" value={item.notes || ""} rows={2}
                            placeholder="How did it go?"
                            onChange={e => save(item.id, { ...item, notes: e.target.value })} />
                        </div>
                        <button className="seDeleteBtn" onClick={() => deleteItem(item.id)} type="button">
                          Delete Event
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )) : (
          <div className="seGrid" style={{ padding: "20px 24px" }}>
            <div className="seEmpty">
              No events found. Click <strong>+ Add</strong> to log a social event.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
