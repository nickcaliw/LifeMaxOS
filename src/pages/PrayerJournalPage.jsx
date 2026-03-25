import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "prayers";
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const CATEGORIES = ["Personal", "Family", "Church", "World", "Thanks"];
const STATUSES = ["active", "answered", "waiting"];
const STATUS_LABELS = { active: "Active", answered: "Answered", waiting: "Waiting" };
const STATUS_COLORS = { active: "#5B7CF5", answered: "#4caf50", waiting: "#ff9800" };
const CATEGORY_COLORS = {
  Personal: "#9c27b0", Family: "#e91e63", Church: "#5B7CF5",
  World: "#009688", Thanks: "#ff9800",
};

export default function PrayerJournalPage({ collection = "prayers", title = "Prayer Journal", categories }) {
  const CATS = categories || CATEGORIES;
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("active"); // "active" | "answered" | "all"
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const saveTimer = useRef({});

  const refresh = useCallback(async () => {
    if (api) setItems(await api.list(collection) || []);
  }, [collection]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((id, data) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => { if (api) api.save(id, collection, data); }, 400);
  }, [collection]);

  const addItem = async () => {
    const id = genId();
    const data = {
      request: "", status: "active", category: "Personal",
      answerNotes: "", dateAdded: new Date().toISOString().slice(0, 10),
    };
    if (api) await api.save(id, collection, data);
    await refresh();
    setEditingId(id);
  };

  const deleteItem = async () => {
    if (!confirmDelete) return;
    if (api) await api.delete(confirmDelete);
    if (editingId === confirmDelete) setEditingId(null);
    setConfirmDelete(null);
    refresh();
  };

  const filtered = items.filter(item => {
    if (filter === "active") return item.status === "active" || item.status === "waiting";
    if (filter === "answered") return item.status === "answered";
    return true;
  });

  const activeCount = items.filter(i => i.status === "active" || i.status === "waiting").length;
  const answeredCount = items.filter(i => i.status === "answered").length;

  return (
    <div className="daysPage">
      <style>{`
        .prayGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;padding:20px 24px;}
        .prayCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:16px;cursor:pointer;transition:box-shadow .15s,border-color .15s;}
        .prayCard:hover{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.1);}
        .prayCardActive{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.15);}
        .prayCardTop{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;}
        .prayRequest{font-size:14px;color:var(--text);flex:1;min-width:0;word-break:break-word;line-height:1.5;}
        .prayRequestEmpty{color:var(--muted);font-style:italic;}
        .prayMeta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;}
        .prayTag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--muted);border:1px solid var(--border);font-weight:500;}
        .prayStatusBadge{color:#fff;border:none;font-weight:600;}
        .prayCatDot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;}
        .prayDate{font-size:11px;color:var(--muted);margin-top:4px;}
        .prayAnswerPreview{font-size:12px;color:var(--muted);margin-top:6px;font-style:italic;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
        .prayEditPanel{margin-top:12px;border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:10px;}
        .prayEditRow{display:flex;flex-direction:column;gap:3px;}
        .prayEditLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
        .prayEditInput{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .prayEditInput:focus{border-color:var(--accent);}
        .prayEditTextarea{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;resize:vertical;min-height:60px;transition:border-color .15s;}
        .prayEditTextarea:focus{border-color:var(--accent);}
        .prayEditSelect{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .prayEditSelect:focus{border-color:var(--accent);}
        .praySelectRow{display:flex;gap:8px;}
        .prayDeleteBtn{background:none;border:1.5px solid #e53935;color:#e53935;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;margin-top:4px;transition:background .15s,color .15s;}
        .prayDeleteBtn:hover{background:#e53935;color:#fff;}
        .prayEmpty{grid-column:1/-1;text-align:center;padding:40px 0;color:var(--muted);font-size:15px;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">{title}</h1>
          <div className="weekBadge">{activeCount} active</div>
        </div>
        <div className="nav">
          <div className="dsSortRow">
            {[["active", `Active (${activeCount})`], ["answered", `Answered (${answeredCount})`], ["all", `All (${items.length})`]].map(([key, label]) => (
              <button key={key} className={`tabBtn ${filter === key ? "active" : ""}`}
                onClick={() => setFilter(key)} type="button">{label}</button>
            ))}
          </div>
          <button className="btn btnPrimary" onClick={addItem} type="button">+ New Prayer</button>
        </div>
      </div>

      <div className="dsBody">
        <div className="prayGrid">
          {filtered.length > 0 ? filtered.map(item => {
            const isEditing = editingId === item.id;
            return (
              <div className={`prayCard ${isEditing ? "prayCardActive" : ""}`} key={item.id}
                onClick={() => { if (!isEditing) setEditingId(item.id); }}>
                <div className="prayCardTop">
                  <div className="prayCatDot" style={{ background: CATEGORY_COLORS[item.category] || "#607d8b" }} />
                  <div className={`prayRequest ${!item.request ? "prayRequestEmpty" : ""}`}>
                    {item.request || "New prayer request..."}
                  </div>
                </div>
                <div className="prayMeta">
                  <span className="prayTag">{item.category || "Personal"}</span>
                  <span className="prayTag prayStatusBadge"
                    style={{ background: STATUS_COLORS[item.status] || STATUS_COLORS.active }}>
                    {STATUS_LABELS[item.status] || "Active"}
                  </span>
                </div>
                {item.answerNotes && !isEditing && (
                  <div className="prayAnswerPreview">{item.answerNotes}</div>
                )}
                <div className="prayDate">
                  {item.dateAdded ? new Date(item.dateAdded + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
                </div>

                {isEditing && (
                  <div className="prayEditPanel" onClick={e => e.stopPropagation()}>
                    <div className="prayEditRow">
                      <label className="prayEditLabel">Prayer Request</label>
                      <textarea className="prayEditTextarea" value={item.request || ""} rows={3}
                        placeholder="What would you like to pray for?"
                        onChange={e => save(item.id, { ...item, request: e.target.value })} autoFocus />
                    </div>
                    <div className="praySelectRow">
                      <div className="prayEditRow" style={{ flex: 1 }}>
                        <label className="prayEditLabel">Category</label>
                        <select className="prayEditSelect" value={item.category || "Personal"}
                          onChange={e => save(item.id, { ...item, category: e.target.value })}>
                          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="prayEditRow" style={{ flex: 1 }}>
                        <label className="prayEditLabel">Status</label>
                        <select className="prayEditSelect" value={item.status || "active"}
                          onChange={e => save(item.id, { ...item, status: e.target.value })}>
                          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="prayEditRow">
                      <label className="prayEditLabel">Date Added</label>
                      <input className="prayEditInput" type="date" value={item.dateAdded || ""}
                        onChange={e => save(item.id, { ...item, dateAdded: e.target.value })} />
                    </div>
                    <div className="prayEditRow">
                      <label className="prayEditLabel">Answer / Notes</label>
                      <textarea className="prayEditTextarea" value={item.answerNotes || ""} rows={2}
                        placeholder="How was this prayer answered?"
                        onChange={e => save(item.id, { ...item, answerNotes: e.target.value })} />
                    </div>
                    <button className="prayDeleteBtn" onClick={() => setConfirmDelete(item.id)} type="button">
                      Delete Prayer
                    </button>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="prayEmpty">
              No {filter !== "all" ? filter : ""} prayer requests yet. Click <strong>+ New Prayer</strong> to begin.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Prayer"
        message="Delete this prayer request? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={deleteItem}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
