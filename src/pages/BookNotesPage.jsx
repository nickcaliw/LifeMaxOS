import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const booksApi = typeof window !== "undefined" ? window.booksApi : null;
const COLLECTION = "booknotes";

const TAGS = [
  { label: "Key Insight", color: "#ff9800" },
  { label: "Quote", color: "#5B7CF5" },
  { label: "Action Item", color: "#4caf50" },
  { label: "Question", color: "#e91e63" },
  { label: "Summary", color: "#9c27b0" },
];

const TAG_MAP = Object.fromEntries(TAGS.map(t => [t.label, t.color]));

export default function BookNotesPage() {
  const [books, setBooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterBookId, setFilterBookId] = useState("all");
  const saveTimer = useRef({});

  const refresh = useCallback(async () => {
    if (booksApi) setBooks(await booksApi.list() || []);
    if (api) setNotes(await api.list(COLLECTION) || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedBook = books.find(b => b.id === selectedBookId) || null;

  const bookNotes = useMemo(() => {
    let filtered = notes;
    if (selectedBookId) {
      filtered = filtered.filter(n => n.bookId === selectedBookId);
    } else if (filterBookId !== "all") {
      filtered = filtered.filter(n => n.bookId === filterBookId);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n =>
        (n.highlight || "").toLowerCase().includes(q) ||
        (n.personalNotes || "").toLowerCase().includes(q) ||
        (n.chapter || "").toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [notes, selectedBookId, filterBookId, search]);

  const save = useCallback((id, data) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => {
      if (api) api.save(id, COLLECTION, data);
    }, 300);
  }, []);

  const addNote = async () => {
    if (!selectedBookId) return;
    const id = crypto.randomUUID();
    const data = {
      bookId: selectedBookId,
      chapter: "",
      highlight: "",
      personalNotes: "",
      pageNumber: "",
      tags: [],
      createdAt: new Date().toISOString(),
    };
    if (api) await api.save(id, COLLECTION, data);
    await refresh();
    setEditingNoteId(id);
  };

  const deleteNote = async (id) => {
    if (api) await api.delete(id);
    if (editingNoteId === id) setEditingNoteId(null);
    refresh();
  };

  const toggleTag = (noteId, tag) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const tags = note.tags || [];
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    save(noteId, { ...note, tags: next });
  };

  const exportBookNotes = () => {
    if (!selectedBook) return;
    const bn = notes.filter(n => n.bookId === selectedBookId);
    let text = `# Notes: ${selectedBook.title}\n`;
    if (selectedBook.author) text += `by ${selectedBook.author}\n`;
    text += `\n`;
    bn.forEach((n, i) => {
      text += `--- Note ${i + 1} ---\n`;
      if (n.chapter) text += `Chapter/Section: ${n.chapter}\n`;
      if (n.pageNumber) text += `Page: ${n.pageNumber}\n`;
      if (n.highlight) text += `Highlight: "${n.highlight}"\n`;
      if (n.personalNotes) text += `Notes: ${n.personalNotes}\n`;
      if (n.tags?.length) text += `Tags: ${n.tags.join(", ")}\n`;
      text += `\n`;
    });
    navigator.clipboard.writeText(text);
  };

  const bookMap = useMemo(() => Object.fromEntries(books.map(b => [b.id, b])), [books]);
  const noteCountMap = useMemo(() => {
    const m = {};
    notes.forEach(n => { m[n.bookId] = (m[n.bookId] || 0) + 1; });
    return m;
  }, [notes]);

  return (
    <div className="daysPage">
      <style>{`
        .bnBody { flex: 1; display: flex; overflow: hidden; }
        .bnLeft {
          width: 280px; min-width: 280px; border-right: 1.5px solid var(--border, #ddd);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .bnLeftHeader { padding: 16px; border-bottom: 1px solid var(--border, #ddd); }
        .bnLeftHeader h3 { margin: 0 0 8px; font-size: 14px; color: var(--muted, #888); text-transform: uppercase; letter-spacing: .5px; }
        .bnBookList { flex: 1; overflow-y: auto; padding: 8px; }
        .bnBookItem {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px; border-radius: 8px; cursor: pointer;
          border: 1.5px solid transparent; margin-bottom: 4px; transition: all .15s;
          background: transparent;
          text-align: left; width: 100%; font: inherit;
        }
        .bnBookItem:hover { background: var(--bg, #f6f1e8); }
        .bnBookItem.bnActive { border-color: var(--accent, #5B7CF5); background: var(--bg, #f6f1e8); }
        .bnBookTitle { font-weight: 600; font-size: 14px; color: var(--text, #333); }
        .bnBookAuthor { font-size: 12px; color: var(--muted, #888); margin-top: 2px; }
        .bnBookCount {
          min-width: 24px; height: 24px; border-radius: 12px;
          background: var(--accent, #5B7CF5); color: #fff; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .bnRight { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .bnRightHeader {
          padding: 16px 20px; border-bottom: 1px solid var(--border, #ddd);
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .bnRightTitle { font-size: 18px; font-weight: 700; color: var(--text, #333); }
        .bnRightSub { font-size: 13px; color: var(--muted, #888); }
        .bnRightActions { display: flex; gap: 8px; align-items: center; }
        .bnNotesList { flex: 1; overflow-y: auto; padding: 20px; }
        .bnNoteCard {
          background: var(--paper, #fbf7f0); border-radius: 12px;
          border: 1.5px solid var(--border, #ddd); padding: 16px; margin-bottom: 12px;
          transition: border-color .15s;
        }
        .bnNoteCard:hover { border-color: var(--accent, #5B7CF5); }
        .bnNoteCard.bnEditing { border-color: var(--accent, #5B7CF5); box-shadow: 0 0 0 3px rgba(91,124,245,.1); }
        .bnNoteRow { display: flex; gap: 12px; margin-bottom: 8px; }
        .bnNoteField { flex: 1; }
        .bnLabel { font-size: 11px; font-weight: 600; color: var(--muted, #888); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
        .bnInput {
          width: 100%; padding: 6px 10px; border-radius: 6px; border: 1.5px solid var(--border, #ddd);
          background: var(--bg, #f6f1e8); font-size: 13px; color: var(--text, #333);
          outline: none; transition: border-color .15s; font-family: inherit; box-sizing: border-box;
        }
        .bnInput:focus { border-color: var(--accent, #5B7CF5); }
        .bnTextarea { resize: vertical; min-height: 60px; }
        .bnHighlight {
          font-style: italic; font-size: 14px; color: var(--text, #333);
          border-left: 3px solid var(--accent, #5B7CF5); padding-left: 12px; margin: 8px 0;
        }
        .bnTagRow { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .bnTag {
          padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
          cursor: pointer; border: 1.5px solid transparent; transition: all .15s;
          color: #fff;
        }
        .bnTagInactive { opacity: .35; }
        .bnTagInactive:hover { opacity: .7; }
        .bnNoteActions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
        .bnDeleteBtn {
          background: none; border: none; color: var(--muted, #888); cursor: pointer;
          font-size: 12px; padding: 4px 8px; border-radius: 4px;
        }
        .bnDeleteBtn:hover { color: #e53935; background: rgba(229,57,53,.08); }
        .bnEmpty {
          text-align: center; color: var(--muted, #888); padding: 60px 20px; font-size: 14px;
        }
        .bnEmptyIcon { font-size: 48px; margin-bottom: 12px; opacity: .4; }
        .bnSearch {
          padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--border, #ddd);
          background: var(--paper, #fbf7f0); font-size: 13px; width: 200px;
          outline: none; transition: border-color .15s;
        }
        .bnSearch:focus { border-color: var(--accent, #5B7CF5); }
        .bnFilterSelect {
          padding: 6px 10px; border-radius: 6px; border: 1.5px solid var(--border, #ddd);
          background: var(--paper, #fbf7f0); font-size: 13px; color: var(--text, #333);
          outline: none; cursor: pointer;
        }
        .bnNoteBookLabel {
          font-size: 11px; color: var(--muted, #888); font-weight: 600; margin-bottom: 4px;
        }
        .bnPageBadge {
          font-size: 11px; color: var(--muted, #888); background: var(--bg, #f6f1e8);
          padding: 2px 8px; border-radius: 8px;
        }
        .bnNoteHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Book Notes</h1>
          <div className="weekBadge">{notes.length} notes</div>
        </div>
        <div className="nav" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!selectedBookId && (
            <>
              <select className="bnFilterSelect" value={filterBookId} onChange={e => setFilterBookId(e.target.value)}>
                <option value="all">All Books</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
              <input className="bnSearch" placeholder="Search notes..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </>
          )}
        </div>
      </div>

      <div className="bnBody dsBody">
        <div className="bnLeft">
          <div className="bnLeftHeader">
            <h3>Books</h3>
            {selectedBookId && (
              <button className="btn btnSmall" onClick={() => { setSelectedBookId(null); setEditingNoteId(null); }}
                type="button" style={{ fontSize: 12 }}>
                &larr; All Notes
              </button>
            )}
          </div>
          <div className="bnBookList">
            {books.length === 0 && (
              <div className="bnEmpty" style={{ padding: 20 }}>
                <div style={{ fontSize: 13 }}>No books yet. Add books in the Reading page.</div>
              </div>
            )}
            {books.map(b => (
              <button key={b.id} className={`bnBookItem ${b.id === selectedBookId ? "bnActive" : ""}`}
                onClick={() => { setSelectedBookId(b.id); setEditingNoteId(null); setSearch(""); setFilterBookId("all"); }}
                type="button">
                <div>
                  <div className="bnBookTitle">{b.title || "Untitled"}</div>
                  {b.author && <div className="bnBookAuthor">by {b.author}</div>}
                </div>
                {(noteCountMap[b.id] || 0) > 0 && (
                  <div className="bnBookCount">{noteCountMap[b.id]}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bnRight">
          {selectedBook ? (
            <>
              <div className="bnRightHeader">
                <div>
                  <div className="bnRightTitle">{selectedBook.title}</div>
                  {selectedBook.author && <div className="bnRightSub">by {selectedBook.author}</div>}
                </div>
                <div className="bnRightActions">
                  <input className="bnSearch" placeholder="Search..." value={search}
                    onChange={e => setSearch(e.target.value)} />
                  <button className="btn btnSmall" onClick={exportBookNotes} type="button"
                    title="Copy notes to clipboard">
                    Export
                  </button>
                  <button className="btn btnPrimary" onClick={addNote} type="button">+ Add Note</button>
                </div>
              </div>
              <div className="bnNotesList">
                {bookNotes.length === 0 && (
                  <div className="bnEmpty">
                    <div className="bnEmptyIcon">📝</div>
                    <div>No notes for this book yet.</div>
                    <div style={{ marginTop: 8 }}>Click "+ Add Note" to get started.</div>
                  </div>
                )}
                {bookNotes.map(n => {
                  const isEditing = editingNoteId === n.id;
                  return (
                    <div key={n.id} className={`bnNoteCard ${isEditing ? "bnEditing" : ""}`}
                      onClick={() => { if (!isEditing) setEditingNoteId(n.id); }}>
                      {isEditing ? (
                        <>
                          <div className="bnNoteRow">
                            <div className="bnNoteField">
                              <div className="bnLabel">Chapter / Section</div>
                              <input className="bnInput" value={n.chapter || ""}
                                onChange={e => save(n.id, { ...n, chapter: e.target.value })}
                                placeholder="e.g. Chapter 3, Introduction..." />
                            </div>
                            <div className="bnNoteField" style={{ maxWidth: 100 }}>
                              <div className="bnLabel">Page #</div>
                              <input className="bnInput" value={n.pageNumber || ""}
                                onChange={e => save(n.id, { ...n, pageNumber: e.target.value })}
                                placeholder="42" />
                            </div>
                          </div>
                          <div className="bnNoteField" style={{ marginBottom: 8 }}>
                            <div className="bnLabel">Highlight / Quote</div>
                            <textarea className="bnInput bnTextarea" value={n.highlight || ""}
                              onChange={e => save(n.id, { ...n, highlight: e.target.value })}
                              placeholder="Paste a highlight or quote..." />
                          </div>
                          <div className="bnNoteField" style={{ marginBottom: 8 }}>
                            <div className="bnLabel">Personal Notes</div>
                            <textarea className="bnInput bnTextarea" value={n.personalNotes || ""}
                              onChange={e => save(n.id, { ...n, personalNotes: e.target.value })}
                              placeholder="Your thoughts..." />
                          </div>
                          <div className="bnLabel">Tags</div>
                          <div className="bnTagRow">
                            {TAGS.map(t => (
                              <span key={t.label}
                                className={`bnTag ${(n.tags || []).includes(t.label) ? "" : "bnTagInactive"}`}
                                style={{ background: t.color }}
                                onClick={e => { e.stopPropagation(); toggleTag(n.id, t.label); }}>
                                {t.label}
                              </span>
                            ))}
                          </div>
                          <div className="bnNoteActions">
                            <button className="bnDeleteBtn" onClick={e => { e.stopPropagation(); deleteNote(n.id); }}
                              type="button">Delete</button>
                            <button className="btn btnSmall" onClick={e => { e.stopPropagation(); setEditingNoteId(null); }}
                              type="button">Done</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bnNoteHeader">
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {n.chapter && <span style={{ fontWeight: 600, fontSize: 13 }}>{n.chapter}</span>}
                              {n.pageNumber && <span className="bnPageBadge">p. {n.pageNumber}</span>}
                            </div>
                            <button className="bnDeleteBtn" onClick={e => { e.stopPropagation(); deleteNote(n.id); }}
                              type="button">Delete</button>
                          </div>
                          {n.highlight && <div className="bnHighlight">"{n.highlight}"</div>}
                          {n.personalNotes && (
                            <div style={{ fontSize: 13, color: "var(--text, #333)", marginTop: 4 }}>
                              {n.personalNotes}
                            </div>
                          )}
                          {(n.tags || []).length > 0 && (
                            <div className="bnTagRow">
                              {n.tags.map(t => (
                                <span key={t} className="bnTag" style={{ background: TAG_MAP[t] || "#607d8b", cursor: "default" }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="bnRightHeader">
                <div className="bnRightTitle">All Notes</div>
                <div className="bnRightActions">
                  <select className="bnFilterSelect" value={filterBookId} onChange={e => setFilterBookId(e.target.value)}>
                    <option value="all">All Books</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                  <input className="bnSearch" placeholder="Search notes..." value={search}
                    onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="bnNotesList">
                {bookNotes.length === 0 && (
                  <div className="bnEmpty">
                    <div className="bnEmptyIcon">📚</div>
                    <div>No notes found.</div>
                    <div style={{ marginTop: 8 }}>Select a book to start adding notes.</div>
                  </div>
                )}
                {bookNotes.map(n => {
                  const book = bookMap[n.bookId];
                  return (
                    <div key={n.id} className="bnNoteCard" style={{ cursor: "pointer" }}
                      onClick={() => { setSelectedBookId(n.bookId); setEditingNoteId(n.id); }}>
                      <div className="bnNoteHeader">
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {book && <span className="bnNoteBookLabel">{book.title}</span>}
                          {n.chapter && <span style={{ fontWeight: 600, fontSize: 13 }}>{n.chapter}</span>}
                          {n.pageNumber && <span className="bnPageBadge">p. {n.pageNumber}</span>}
                        </div>
                      </div>
                      {n.highlight && <div className="bnHighlight">"{n.highlight}"</div>}
                      {n.personalNotes && (
                        <div style={{ fontSize: 13, color: "var(--text, #333)", marginTop: 4 }}>
                          {n.personalNotes}
                        </div>
                      )}
                      {(n.tags || []).length > 0 && (
                        <div className="bnTagRow">
                          {n.tags.map(t => (
                            <span key={t} className="bnTag" style={{ background: TAG_MAP[t] || "#607d8b", cursor: "default" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
