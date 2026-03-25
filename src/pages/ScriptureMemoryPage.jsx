import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "scripturememory";
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const CATEGORIES = ["Promises", "Wisdom", "Comfort", "Strength", "Love"];
const CATEGORY_COLORS = {
  Promises: "#5B7CF5", Wisdom: "#9c27b0", Comfort: "#009688",
  Strength: "#e91e63", Love: "#ff5722",
};

export default function ScriptureMemoryPage({ collection = "scripturememory", title = "Scripture Memory", categories }) {
  const CATS = categories || CATEGORIES;
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all"); // "all" | "memorized" | "learning"
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
      reference: "", text: "", category: "Promises",
      memorized: false, lastReviewed: "",
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

  const markReviewed = (item) => {
    save(item.id, { ...item, lastReviewed: new Date().toISOString().slice(0, 10) });
  };

  const filtered = items.filter(item => {
    if (filter === "memorized") return !!item.memorized;
    if (filter === "learning") return !item.memorized;
    return true;
  });

  // Sort: unreviewed first, then oldest reviewed first
  const sorted = [...filtered].sort((a, b) => {
    if (!a.lastReviewed && b.lastReviewed) return -1;
    if (a.lastReviewed && !b.lastReviewed) return 1;
    if (a.lastReviewed && b.lastReviewed) return a.lastReviewed.localeCompare(b.lastReviewed);
    return 0;
  });

  const memorizedCount = items.filter(i => i.memorized).length;
  const learningCount = items.filter(i => !i.memorized).length;

  return (
    <div className="daysPage">
      <style>{`
        .smGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;padding:20px 24px;}
        .smCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:16px;cursor:pointer;transition:box-shadow .15s,border-color .15s;}
        .smCard:hover{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.1);}
        .smCardActive{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.15);}
        .smCardTop{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
        .smCatDot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
        .smRef{font-size:15px;font-weight:700;color:var(--text);flex:1;}
        .smRefEmpty{color:var(--muted);font-style:italic;font-weight:400;}
        .smMemBadge{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;color:#fff;background:#4caf50;}
        .smLearningBadge{background:#ff9800;}
        .smVerseText{font-size:13px;color:var(--text);line-height:1.55;margin-bottom:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;font-style:italic;}
        .smMeta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
        .smTag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--muted);border:1px solid var(--border);font-weight:500;}
        .smReviewDate{font-size:11px;color:var(--muted);}
        .smReviewBtn{font-size:11px;padding:3px 10px;border-radius:8px;border:1.5px solid var(--accent);background:none;color:var(--accent);cursor:pointer;font-weight:600;transition:background .15s,color .15s;}
        .smReviewBtn:hover{background:var(--accent);color:#fff;}
        .smEditPanel{margin-top:12px;border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:10px;}
        .smEditRow{display:flex;flex-direction:column;gap:3px;}
        .smEditLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
        .smEditInput{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .smEditInput:focus{border-color:var(--accent);}
        .smEditTextarea{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;resize:vertical;min-height:80px;transition:border-color .15s;}
        .smEditTextarea:focus{border-color:var(--accent);}
        .smEditSelect{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .smEditSelect:focus{border-color:var(--accent);}
        .smSelectRow{display:flex;gap:8px;}
        .smCheckRow{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);}
        .smCheckRow input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);}
        .smDeleteBtn{background:none;border:1.5px solid #e53935;color:#e53935;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;margin-top:4px;transition:background .15s,color .15s;}
        .smDeleteBtn:hover{background:#e53935;color:#fff;}
        .smEmpty{grid-column:1/-1;text-align:center;padding:40px 0;color:var(--muted);font-size:15px;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">{title}</h1>
          <div className="weekBadge">{items.length} verses</div>
        </div>
        <div className="nav">
          <div className="dsSortRow">
            {[["all", `All (${items.length})`], ["memorized", `Memorized (${memorizedCount})`], ["learning", `Learning (${learningCount})`]].map(([key, label]) => (
              <button key={key} className={`tabBtn ${filter === key ? "active" : ""}`}
                onClick={() => setFilter(key)} type="button">{label}</button>
            ))}
          </div>
          <button className="btn btnPrimary" onClick={addItem} type="button">+ Add Verse</button>
        </div>
      </div>

      <div className="dsBody">
        <div className="smGrid">
          {sorted.length > 0 ? sorted.map(item => {
            const isEditing = editingId === item.id;
            return (
              <div className={`smCard ${isEditing ? "smCardActive" : ""}`} key={item.id}
                onClick={() => { if (!isEditing) setEditingId(item.id); }}>
                <div className="smCardTop">
                  <div className="smCatDot" style={{ background: CATEGORY_COLORS[item.category] || "#607d8b" }} />
                  <div className={`smRef ${!item.reference ? "smRefEmpty" : ""}`}>
                    {item.reference || "New verse..."}
                  </div>
                  <span className={`smMemBadge ${item.memorized ? "" : "smLearningBadge"}`}>
                    {item.memorized ? "Memorized" : "Learning"}
                  </span>
                </div>
                {item.text && !isEditing && (
                  <div className="smVerseText">{item.text}</div>
                )}
                <div className="smMeta">
                  <span className="smTag">{item.category || "Promises"}</span>
                  {item.lastReviewed && (
                    <span className="smReviewDate">
                      Reviewed {new Date(item.lastReviewed + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {!isEditing && (
                    <button className="smReviewBtn" onClick={e => { e.stopPropagation(); markReviewed(item); }} type="button">
                      Mark Reviewed
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="smEditPanel" onClick={e => e.stopPropagation()}>
                    <div className="smEditRow">
                      <label className="smEditLabel">Reference</label>
                      <input className="smEditInput" value={item.reference || ""}
                        placeholder="e.g. John 3:16"
                        onChange={e => save(item.id, { ...item, reference: e.target.value })} autoFocus />
                    </div>
                    <div className="smEditRow">
                      <label className="smEditLabel">Verse Text</label>
                      <textarea className="smEditTextarea" value={item.text || ""} rows={3}
                        placeholder="For God so loved the world..."
                        onChange={e => save(item.id, { ...item, text: e.target.value })} />
                    </div>
                    <div className="smSelectRow">
                      <div className="smEditRow" style={{ flex: 1 }}>
                        <label className="smEditLabel">Category</label>
                        <select className="smEditSelect" value={item.category || "Promises"}
                          onChange={e => save(item.id, { ...item, category: e.target.value })}>
                          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="smEditRow" style={{ flex: 1 }}>
                        <label className="smEditLabel">Last Reviewed</label>
                        <input className="smEditInput" type="date" value={item.lastReviewed || ""}
                          onChange={e => save(item.id, { ...item, lastReviewed: e.target.value })} />
                      </div>
                    </div>
                    <div className="smCheckRow">
                      <input type="checkbox" checked={!!item.memorized}
                        onChange={e => save(item.id, { ...item, memorized: e.target.checked })} />
                      <span>Memorized</span>
                    </div>
                    <button className="smDeleteBtn" onClick={() => setConfirmDelete(item.id)} type="button">
                      Delete Verse
                    </button>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="smEmpty">
              No {filter !== "all" ? filter : ""} verses yet. Click <strong>+ Add Verse</strong> to start memorizing.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Verse"
        message="Delete this verse? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={deleteItem}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
