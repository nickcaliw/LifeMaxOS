import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "sermonnotes";
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function SermonNotesPage({ collection = "sermonnotes", title = "Sermon Notes" }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef(null);

  const refresh = useCallback(async () => {
    if (api) {
      const list = await api.list(collection) || [];
      // Sort newest first
      list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setItems(list);
    }
  }, [collection]);

  useEffect(() => {
    setLoading(true);
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const selected = items.find(i => i.id === selectedId) || null;

  const save = useCallback((id, data) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { if (api) api.save(id, collection, data); }, 400);
  }, [collection]);

  const update = (field, value) => {
    if (!selected) return;
    save(selected.id, { ...selected, [field]: value });
  };

  const addItem = async () => {
    const id = genId();
    const data = {
      date: new Date().toISOString().slice(0, 10),
      speaker: "", title: "", scriptureRef: "",
      notes: "", keyTakeaways: "", actionItems: "",
    };
    if (api) await api.save(id, collection, data);
    await refresh();
    setSelectedId(id);
  };

  const deleteItem = async () => {
    if (!selectedId) return;
    if (api) await api.delete(selectedId);
    setSelectedId(null);
    setConfirmDelete(false);
    refresh();
  };

  return (
    <div className="daysPage">
      <style>{`
        .snBody{display:flex;flex:1;overflow:hidden;height:calc(100vh - 60px);}
        .snList{width:280px;min-width:280px;border-right:1.5px solid var(--border);display:flex;flex-direction:column;overflow:hidden;background:var(--bg);}
        .snListHeader{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;padding:16px 16px 8px;}
        .snEntries{flex:1;overflow-y:auto;padding:0 8px 8px;}
        .snNoteBtn{display:block;width:100%;text-align:left;background:none;border:none;border-radius:10px;padding:10px 12px;cursor:pointer;margin-bottom:2px;transition:background .12s;}
        .snNoteBtn:hover{background:var(--paper);}
        .snNoteActive{background:var(--paper);box-shadow:0 1px 4px rgba(0,0,0,.06);}
        .snNoteTitle{font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .snNoteSub{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
        .snNoteDate{font-size:11px;color:var(--muted);margin-top:2px;}
        .snEditor{flex:1;overflow-y:auto;padding:24px 32px;display:flex;flex-direction:column;gap:16px;}
        .snEditorHeader{display:flex;align-items:center;gap:12px;margin-bottom:4px;}
        .snTitleInput{flex:1;border:none;background:none;font-size:22px;font-weight:700;color:var(--text);font-family:inherit;outline:none;padding:0;}
        .snTitleInput::placeholder{color:var(--muted);font-weight:400;}
        .snDeleteBtn{background:none;border:none;cursor:pointer;color:var(--muted);padding:6px;border-radius:8px;transition:color .15s,background .15s;}
        .snDeleteBtn:hover{color:#e53935;background:rgba(229,57,53,.08);}
        .snFieldRow{display:flex;gap:12px;}
        .snField{display:flex;flex-direction:column;gap:3px;flex:1;}
        .snFieldLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
        .snFieldInput{border:1.5px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .snFieldInput:focus{border-color:var(--accent);}
        .snTextarea{border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;resize:vertical;min-height:120px;line-height:1.6;transition:border-color .15s;}
        .snTextarea:focus{border-color:var(--accent);}
        .snSmallTextarea{min-height:70px;}
        .snPlaceholder{flex:1;display:flex;align-items:center;justify-content:center;}
        .snEmpty{text-align:center;padding:40px 16px;color:var(--muted);font-size:14px;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">{title}</h1>
          <div className="weekBadge">{items.length} sermons</div>
        </div>
        <div className="nav">
          <button className="btn btnPrimary" onClick={addItem} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Sermon
          </button>
        </div>
      </div>

      <div className="snBody">
        {/* Sidebar list */}
        <div className="snList">
          <div className="snListHeader">All Sermons</div>
          {loading ? (
            <div className="snEmpty">Loading...</div>
          ) : items.length === 0 ? (
            <div className="snEmpty">
              <div className="emptyState">
                <div className="emptyStateIcon">&#x1f4d6;</div>
                <div className="emptyStateTitle">No sermon notes yet</div>
                <div className="emptyStateSub">Click "+ New Sermon" to capture your first sermon.</div>
              </div>
            </div>
          ) : (
            <div className="snEntries">
              {items.map(item => (
                <button
                  key={item.id}
                  className={`snNoteBtn ${item.id === selectedId ? "snNoteActive" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                  type="button"
                >
                  <div className="snNoteTitle">{item.title || "Untitled Sermon"}</div>
                  <div className="snNoteSub">{item.speaker || "Unknown speaker"}</div>
                  <div className="snNoteDate">
                    {item.date ? new Date(item.date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    }) : "No date"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="snEditor">
          {selected ? (
            <>
              <div className="snEditorHeader">
                <input
                  className="snTitleInput"
                  value={selected.title || ""}
                  onChange={e => update("title", e.target.value)}
                  placeholder="Sermon title..."
                />
                <button className="snDeleteBtn" onClick={() => setConfirmDelete(true)} title="Delete sermon" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              <div className="snFieldRow">
                <div className="snField">
                  <label className="snFieldLabel">Date</label>
                  <input className="snFieldInput" type="date" value={selected.date || ""}
                    onChange={e => update("date", e.target.value)} />
                </div>
                <div className="snField">
                  <label className="snFieldLabel">Speaker</label>
                  <input className="snFieldInput" value={selected.speaker || ""}
                    placeholder="Pastor name..."
                    onChange={e => update("speaker", e.target.value)} />
                </div>
                <div className="snField">
                  <label className="snFieldLabel">Scripture Reference</label>
                  <input className="snFieldInput" value={selected.scriptureRef || ""}
                    placeholder="e.g. Romans 8:28"
                    onChange={e => update("scriptureRef", e.target.value)} />
                </div>
              </div>

              <div className="snField">
                <label className="snFieldLabel">Notes</label>
                <textarea className="snTextarea" value={selected.notes || ""} rows={6}
                  placeholder="Sermon notes..."
                  onChange={e => update("notes", e.target.value)} />
              </div>

              <div className="snField">
                <label className="snFieldLabel">Key Takeaways</label>
                <textarea className="snTextarea snSmallTextarea" value={selected.keyTakeaways || ""} rows={3}
                  placeholder="What stood out to you?"
                  onChange={e => update("keyTakeaways", e.target.value)} />
              </div>

              <div className="snField">
                <label className="snFieldLabel">Action Items</label>
                <textarea className="snTextarea snSmallTextarea" value={selected.actionItems || ""} rows={3}
                  placeholder="What will you do differently this week?"
                  onChange={e => update("actionItems", e.target.value)} />
              </div>
            </>
          ) : (
            <div className="snPlaceholder">
              <div className="emptyState">
                <div className="emptyStateIcon">&#x1f4d6;</div>
                <div className="emptyStateTitle">Select a sermon to view notes</div>
                <div className="emptyStateSub">Pick from the sidebar or create a new entry to capture sermon insights.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Sermon"
        message={`Delete "${selected?.title || "this sermon"}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={deleteItem}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
