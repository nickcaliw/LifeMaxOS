import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "quotes";

const CATEGORIES = [
  "Motivation", "Wisdom", "Humor", "Love", "Success",
  "Faith", "Health", "Business", "Creativity", "Other",
];

const CAT_COLORS = {
  Motivation: "#ff9800", Wisdom: "#5B7CF5", Humor: "#4caf50",
  Love: "#e91e63", Success: "#795548", Faith: "#9c27b0",
  Health: "#00bcd4", Business: "#607d8b", Creativity: "#ff5722",
  Other: "#9e9e9e",
};

export default function QuotesPage() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [randomQuote, setRandomQuote] = useState(null);
  const saveTimer = useRef({});

  const refresh = useCallback(async () => {
    if (api) setItems(await api.list(COLLECTION) || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((id, data) => {
    setItems(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => {
      if (api) api.save(id, COLLECTION, data);
    }, 300);
  }, []);

  const addQuote = async () => {
    const id = crypto.randomUUID();
    const data = {
      text: "",
      author: "",
      category: "Motivation",
      favorite: false,
      dateAdded: new Date().toISOString().split("T")[0],
    };
    if (api) await api.save(id, COLLECTION, data);
    await refresh();
    setEditingId(id);
  };

  const deleteQuote = async (id) => {
    if (api) await api.delete(id);
    if (editingId === id) setEditingId(null);
    refresh();
  };

  const showRandom = () => {
    const pool = filtered.length > 0 ? filtered : items;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setRandomQuote(pick);
  };

  const filtered = useMemo(() => {
    let list = items;
    if (filterCat !== "all") list = list.filter(q => q.category === filterCat);
    if (favOnly) list = list.filter(q => q.favorite);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(q =>
        (q.text || "").toLowerCase().includes(s) ||
        (q.author || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [items, filterCat, favOnly, search]);

  return (
    <div className="daysPage">
      <style>{`
        .qtBody { flex: 1; overflow-y: auto; padding: 24px; }
        .qtControls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .qtSearch {
          padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--border, #ddd);
          background: var(--paper, #fbf7f0); font-size: 13px; width: 200px;
          outline: none; transition: border-color .15s;
        }
        .qtSearch:focus { border-color: var(--accent, #5B7CF5); }
        .qtSelect {
          padding: 6px 10px; border-radius: 6px; border: 1.5px solid var(--border, #ddd);
          background: var(--paper, #fbf7f0); font-size: 13px; color: var(--text, #333);
          outline: none; cursor: pointer;
        }
        .qtFavBtn {
          padding: 6px 12px; border-radius: 6px; border: 1.5px solid var(--border, #ddd);
          background: var(--paper, #fbf7f0); cursor: pointer; font-size: 13px;
          color: var(--text, #333); transition: all .15s;
        }
        .qtFavBtn.qtFavActive { border-color: #ff9800; background: rgba(255,152,0,.1); color: #ff9800; }
        .qtRandomBtn {
          padding: 6px 12px; border-radius: 6px; border: 1.5px solid var(--accent, #5B7CF5);
          background: rgba(91,124,245,.08); cursor: pointer; font-size: 13px;
          color: var(--accent, #5B7CF5); font-weight: 600; transition: all .15s;
        }
        .qtRandomBtn:hover { background: rgba(91,124,245,.15); }
        .qtGrid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px; margin-top: 20px;
        }
        .qtCard {
          background: var(--paper, #fbf7f0); border-radius: 14px;
          border: 1.5px solid var(--border, #ddd); padding: 20px;
          position: relative; cursor: pointer; transition: all .15s;
          min-height: 120px; display: flex; flex-direction: column;
        }
        .qtCard:hover { border-color: var(--accent, #5B7CF5); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.06); }
        .qtCard.qtEditing { border-color: var(--accent, #5B7CF5); box-shadow: 0 0 0 3px rgba(91,124,245,.1); }
        .qtQuoteMark {
          position: absolute; top: 10px; left: 16px; font-size: 48px; line-height: 1;
          color: var(--accent, #5B7CF5); opacity: .12; font-family: Georgia, serif; pointer-events: none;
        }
        .qtText {
          font-size: 15px; line-height: 1.6; color: var(--text, #333);
          font-style: italic; margin-top: 16px; flex: 1;
        }
        .qtAuthor { font-size: 13px; color: var(--muted, #888); margin-top: 12px; font-weight: 600; }
        .qtCardFooter { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
        .qtCatBadge {
          font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px;
          color: #fff;
        }
        .qtStar {
          font-size: 20px; cursor: pointer; background: none; border: none; padding: 0;
          color: var(--muted, #ccc); transition: color .15s; line-height: 1;
        }
        .qtStar.qtStarActive { color: #ff9800; }
        .qtInput {
          width: 100%; padding: 6px 10px; border-radius: 6px; border: 1.5px solid var(--border, #ddd);
          background: var(--bg, #f6f1e8); font-size: 13px; color: var(--text, #333);
          outline: none; transition: border-color .15s; font-family: inherit; box-sizing: border-box;
        }
        .qtInput:focus { border-color: var(--accent, #5B7CF5); }
        .qtTextarea { resize: vertical; min-height: 80px; font-style: italic; }
        .qtLabel { font-size: 11px; font-weight: 600; color: var(--muted, #888); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
        .qtEditActions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
        .qtDeleteBtn {
          background: none; border: none; color: var(--muted, #888); cursor: pointer;
          font-size: 12px; padding: 4px 8px; border-radius: 4px;
        }
        .qtDeleteBtn:hover { color: #e53935; background: rgba(229,57,53,.08); }

        .qtFeatured {
          background: linear-gradient(135deg, var(--paper, #fbf7f0) 0%, var(--bg, #f6f1e8) 100%);
          border-radius: 16px; border: 2px solid var(--accent, #5B7CF5);
          padding: 32px 40px; margin-bottom: 24px; position: relative;
          text-align: center; box-shadow: 0 4px 20px rgba(91,124,245,.1);
        }
        .qtFeaturedMark {
          font-size: 64px; line-height: 1; color: var(--accent, #5B7CF5); opacity: .2;
          font-family: Georgia, serif; margin-bottom: 8px;
        }
        .qtFeaturedText { font-size: 20px; line-height: 1.6; font-style: italic; color: var(--text, #333); }
        .qtFeaturedAuthor { font-size: 15px; color: var(--muted, #888); font-weight: 600; margin-top: 16px; }
        .qtFeaturedClose {
          position: absolute; top: 12px; right: 16px; background: none; border: none;
          font-size: 18px; color: var(--muted, #888); cursor: pointer;
        }
        .qtEmpty { text-align: center; color: var(--muted, #888); padding: 60px 20px; font-size: 14px; }
        .qtEmptyIcon { font-size: 48px; margin-bottom: 12px; opacity: .4; }
        .qtFieldRow { margin-bottom: 8px; }
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Quotes</h1>
          <div className="weekBadge">{items.length} quotes</div>
        </div>
        <div className="nav">
          <button className="btn btnPrimary" onClick={addQuote} type="button">+ Add Quote</button>
        </div>
      </div>

      <div className="qtBody dsBody">
        <div className="qtControls">
          <input className="qtSearch" placeholder="Search quotes..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <select className="qtSelect" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className={`qtFavBtn ${favOnly ? "qtFavActive" : ""}`}
            onClick={() => setFavOnly(p => !p)} type="button">
            {favOnly ? "★ Favorites" : "☆ Favorites"}
          </button>
          <button className="qtRandomBtn" onClick={showRandom} type="button">
            Random Quote
          </button>
        </div>

        {randomQuote && (
          <div className="qtFeatured">
            <button className="qtFeaturedClose" onClick={() => setRandomQuote(null)} type="button">
              &times;
            </button>
            <div className="qtFeaturedMark">&ldquo;</div>
            <div className="qtFeaturedText">{randomQuote.text || "..."}</div>
            {randomQuote.author && (
              <div className="qtFeaturedAuthor">&mdash; {randomQuote.author}</div>
            )}
          </div>
        )}

        <div className="qtGrid">
          {filtered.length === 0 && !randomQuote && (
            <div className="qtEmpty" style={{ gridColumn: "1 / -1" }}>
              <div className="qtEmptyIcon">💬</div>
              <div>No quotes found.</div>
              <div style={{ marginTop: 8 }}>Click "+ Add Quote" to start your collection.</div>
            </div>
          )}
          {filtered.map(q => {
            const isEditing = editingId === q.id;
            return (
              <div key={q.id} className={`qtCard ${isEditing ? "qtEditing" : ""}`}
                onClick={() => { if (!isEditing) setEditingId(q.id); }}>
                <div className="qtQuoteMark">&ldquo;</div>
                {isEditing ? (
                  <>
                    <div className="qtFieldRow" style={{ marginTop: 16 }}>
                      <div className="qtLabel">Quote</div>
                      <textarea className="qtInput qtTextarea" value={q.text || ""}
                        onClick={e => e.stopPropagation()}
                        onChange={e => save(q.id, { ...q, text: e.target.value })}
                        placeholder="Enter the quote..." />
                    </div>
                    <div className="qtFieldRow">
                      <div className="qtLabel">Author / Source</div>
                      <input className="qtInput" value={q.author || ""}
                        onClick={e => e.stopPropagation()}
                        onChange={e => save(q.id, { ...q, author: e.target.value })}
                        placeholder="Who said it?" />
                    </div>
                    <div className="qtFieldRow">
                      <div className="qtLabel">Category</div>
                      <select className="qtSelect" value={q.category || "Other"}
                        onClick={e => e.stopPropagation()}
                        onChange={e => save(q.id, { ...q, category: e.target.value })}>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="qtEditActions">
                      <button className="qtDeleteBtn" onClick={e => { e.stopPropagation(); deleteQuote(q.id); }}
                        type="button">Delete</button>
                      <button className="btn btnSmall" onClick={e => { e.stopPropagation(); setEditingId(null); }}
                        type="button">Done</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="qtText">{q.text || "Empty quote..."}</div>
                    {q.author && <div className="qtAuthor">&mdash; {q.author}</div>}
                    <div className="qtCardFooter">
                      {q.category && (
                        <span className="qtCatBadge" style={{ background: CAT_COLORS[q.category] || "#9e9e9e" }}>
                          {q.category}
                        </span>
                      )}
                      <button className={`qtStar ${q.favorite ? "qtStarActive" : ""}`}
                        onClick={e => { e.stopPropagation(); save(q.id, { ...q, favorite: !q.favorite }); }}
                        type="button">
                        {q.favorite ? "★" : "☆"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
