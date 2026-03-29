import { useCallback, useEffect, useRef, useState } from "react";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "contactreminders";

const RELATIONSHIPS = ["Friend", "Family", "Mentor", "Colleague", "Client", "Other"];
const RELATIONSHIP_COLORS = {
  Friend: "#5B7CF5", Family: "#e91e63", Mentor: "#9c27b0",
  Colleague: "#ff9800", Client: "#4caf50", Other: "#607d8b",
};
const FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly"];
const FREQUENCY_DAYS = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
const METHODS = ["Call", "Text", "In Person", "Email"];
const SORT_OPTIONS = ["overdue", "name", "relationship"];

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - then) / 86400000);
}

function daysUntilDue(dateStr, frequency) {
  const since = daysSince(dateStr);
  if (since === null) return null;
  const target = FREQUENCY_DAYS[frequency] || 30;
  return target - since;
}

function statusColor(daysLeft) {
  if (daysLeft === null) return "var(--muted)";
  if (daysLeft < 0) return "#e53935";
  if (daysLeft <= 3) return "#ff9800";
  return "#4caf50";
}

function statusLabel(daysLeft) {
  if (daysLeft === null) return "No contact logged";
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "Due today";
  return `${daysLeft}d left`;
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  return d >= weekStart && d <= now;
}

export default function ContactRemindersPage() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [sortBy, setSortBy] = useState("overdue");
  const [filterRel, setFilterRel] = useState("all");
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
      name: "", relationship: "Friend", frequency: "monthly",
      lastContact: "", method: "Text", notes: "",
    };
    if (api) await api.save(id, COLLECTION, data);
    await refresh();
    setEditingId(id);
  };

  const deleteItem = async (id) => {
    if (api) await api.delete(id);
    if (editingId === id) setEditingId(null);
    refresh();
  };

  const logContact = (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const today = new Date().toISOString().split("T")[0];
    save(id, { ...item, lastContact: today });
  };

  const filtered = items.filter(item => {
    if (filterRel !== "all" && item.relationship !== filterRel) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "overdue") {
      const da = daysUntilDue(a.lastContact, a.frequency) ?? 999;
      const db2 = daysUntilDue(b.lastContact, b.frequency) ?? 999;
      return da - db2;
    }
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "relationship") return (a.relationship || "").localeCompare(b.relationship || "");
    return 0;
  });

  const overdueCount = items.filter(i => {
    const dl = daysUntilDue(i.lastContact, i.frequency);
    return dl !== null && dl < 0;
  }).length;
  const contactedThisWeek = items.filter(i => isThisWeek(i.lastContact)).length;

  return (
    <div className="daysPage">
      <style>{`
        .crStats{display:flex;gap:12px;padding:16px 24px 0;flex-wrap:wrap;}
        .crStat{background:var(--paper);border:1.5px solid var(--border);border-radius:10px;padding:10px 16px;min-width:120px;text-align:center;}
        .crStatNum{font-size:22px;font-weight:700;color:var(--text);}
        .crStatLabel{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}
        .crGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;padding:20px 24px;}
        .crCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:16px;cursor:pointer;transition:box-shadow .15s,border-color .15s;}
        .crCard:hover{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.1);}
        .crCardActive{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.15);}
        .crCardHead{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
        .crAvatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;text-transform:uppercase;}
        .crNameBlock{flex:1;min-width:0;}
        .crName{font-size:15px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .crNameEmpty{color:var(--muted);font-style:italic;font-weight:400;}
        .crRelTag{font-size:11px;padding:2px 8px;border-radius:10px;color:#fff;display:inline-block;margin-top:2px;}
        .crStatusRow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
        .crStatusBadge{font-size:12px;font-weight:600;padding:3px 10px;border-radius:10px;background:var(--bg);border:1px solid var(--border);}
        .crDaysSince{font-size:12px;color:var(--muted);}
        .crMeta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
        .crTag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--muted);border:1px solid var(--border);}
        .crLogBtn{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .15s;}
        .crLogBtn:hover{opacity:.85;}
        .crEditPanel{margin-top:12px;border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:10px;}
        .crEditRow{display:flex;flex-direction:column;gap:3px;}
        .crEditLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
        .crEditInput{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .crEditInput:focus{border-color:var(--accent);}
        .crEditSelect{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .crEditSelect:focus{border-color:var(--accent);}
        .crEditTextarea{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;resize:vertical;min-height:50px;transition:border-color .15s;}
        .crEditTextarea:focus{border-color:var(--accent);}
        .crSelectRow{display:flex;gap:6px;}
        .crDeleteBtn{background:none;border:1.5px solid #e53935;color:#e53935;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;margin-top:4px;transition:background .15s,color .15s;}
        .crDeleteBtn:hover{background:#e53935;color:#fff;}
        .crEmpty{grid-column:1/-1;text-align:center;padding:40px 0;color:var(--muted);font-size:15px;}
        .crFilterRow{display:flex;gap:4px;flex-wrap:wrap;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Contact Reminders</h1>
          <div className="weekBadge">{items.length} contacts</div>
        </div>
        <div className="nav">
          <div className="crFilterRow">
            <button className={`tabBtn ${filterRel === "all" ? "active" : ""}`}
              onClick={() => setFilterRel("all")} type="button">All</button>
            {RELATIONSHIPS.map(r => (
              <button key={r} className={`tabBtn ${filterRel === r ? "active" : ""}`}
                onClick={() => setFilterRel(r)} type="button">{r}</button>
            ))}
          </div>
          <div className="dsSortRow">
            {SORT_OPTIONS.map(s => (
              <button key={s} className={`tabBtn ${sortBy === s ? "active" : ""}`}
                onClick={() => setSortBy(s)} type="button">{s}</button>
            ))}
          </div>
          <button className="btn btnPrimary" onClick={addItem} type="button">+ Add</button>
        </div>
      </div>

      <div className="dsBody">
        <div className="crStats">
          <div className="crStat">
            <div className="crStatNum">{items.length}</div>
            <div className="crStatLabel">Total Contacts</div>
          </div>
          <div className="crStat">
            <div className="crStatNum" style={{ color: overdueCount > 0 ? "#e53935" : "var(--text)" }}>
              {overdueCount}
            </div>
            <div className="crStatLabel">Overdue</div>
          </div>
          <div className="crStat">
            <div className="crStatNum" style={{ color: "#4caf50" }}>{contactedThisWeek}</div>
            <div className="crStatLabel">This Week</div>
          </div>
        </div>

        <div className="crGrid">
          {sorted.map(item => {
            const isEditing = editingId === item.id;
            const since = daysSince(item.lastContact);
            const due = daysUntilDue(item.lastContact, item.frequency);
            const color = statusColor(due);
            const relColor = RELATIONSHIP_COLORS[item.relationship] || "#607d8b";
            const initial = (item.name || "?")[0];

            return (
              <div className={`crCard ${isEditing ? "crCardActive" : ""}`} key={item.id}
                onClick={() => { if (!isEditing) setEditingId(item.id); }}>
                <div className="crCardHead">
                  <div className="crAvatar" style={{ background: relColor }}>{initial}</div>
                  <div className="crNameBlock">
                    <div className={`crName ${!item.name ? "crNameEmpty" : ""}`}>
                      {item.name || "New Contact"}
                    </div>
                    <span className="crRelTag" style={{ background: relColor }}>{item.relationship}</span>
                  </div>
                </div>

                <div className="crStatusRow">
                  <span className="crStatusBadge" style={{ color, borderColor: color }}>
                    {statusLabel(due)}
                  </span>
                  <span className="crDaysSince">
                    {since !== null ? `${since}d since last contact` : "No contact logged"}
                  </span>
                </div>

                <div className="crMeta">
                  <span className="crTag">{item.frequency || "monthly"}</span>
                  <span className="crTag">{item.method || "Text"}</span>
                </div>

                <button className="crLogBtn" type="button"
                  onClick={e => { e.stopPropagation(); logContact(item.id); }}>
                  Log Contact Today
                </button>

                {isEditing && (
                  <div className="crEditPanel" onClick={e => e.stopPropagation()}>
                    <div className="crEditRow">
                      <label className="crEditLabel">Name</label>
                      <input className="crEditInput" value={item.name || ""}
                        placeholder="Contact name"
                        onChange={e => save(item.id, { ...item, name: e.target.value })} />
                    </div>
                    <div className="crSelectRow">
                      <div className="crEditRow" style={{ flex: 1 }}>
                        <label className="crEditLabel">Relationship</label>
                        <select className="crEditSelect" value={item.relationship || "Friend"}
                          onChange={e => save(item.id, { ...item, relationship: e.target.value })}>
                          {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="crEditRow" style={{ flex: 1 }}>
                        <label className="crEditLabel">Frequency</label>
                        <select className="crEditSelect" value={item.frequency || "monthly"}
                          onChange={e => save(item.id, { ...item, frequency: e.target.value })}>
                          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="crSelectRow">
                      <div className="crEditRow" style={{ flex: 1 }}>
                        <label className="crEditLabel">Preferred Method</label>
                        <select className="crEditSelect" value={item.method || "Text"}
                          onChange={e => save(item.id, { ...item, method: e.target.value })}>
                          {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="crEditRow" style={{ flex: 1 }}>
                        <label className="crEditLabel">Last Contact</label>
                        <input type="date" className="crEditInput" value={item.lastContact || ""}
                          onChange={e => save(item.id, { ...item, lastContact: e.target.value })} />
                      </div>
                    </div>
                    <div className="crEditRow">
                      <label className="crEditLabel">Notes</label>
                      <textarea className="crEditTextarea" value={item.notes || ""} rows={2}
                        placeholder="Optional notes..."
                        onChange={e => save(item.id, { ...item, notes: e.target.value })} />
                    </div>
                    <button className="crDeleteBtn" onClick={() => deleteItem(item.id)} type="button">
                      Delete Contact
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="crEmpty">
              No contacts yet. Click <strong>+ Add</strong> to start tracking your relationships.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
