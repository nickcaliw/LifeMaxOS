import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "biblestudy";
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const TAG_OPTIONS = [
  "Faith", "Love", "Wisdom", "Prayer", "Grace", "Hope", "Peace", "Patience",
  "Forgiveness", "Joy", "Courage", "Obedience", "Humility", "Salvation",
  "Trust", "Worship", "Mercy", "Righteousness",
];

const BOOKS_OF_BIBLE = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
  "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

function emptyEntry() {
  return {
    date: new Date().toISOString().split("T")[0],
    reference: "",
    scripture: "",
    observations: "",
    application: "",
    prayer: "",
    tags: [],
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BibleStudyPage({ collection = "biblestudy", title = "Bible Study", tagOptions }) {
  const TAGS = tagOptions || TAG_OPTIONS;
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(emptyEntry());
  const [search, setSearch] = useState("");
  const [showReadingPlan, setShowReadingPlan] = useState(false);
  const [readBooks, setReadBooks] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const saveTimer = useRef({});
  const readingPlanTimer = useRef(null);

  // Load entries
  const refresh = useCallback(async () => {
    if (api) {
      const list = (await api.list(collection)) || [];
      list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setEntries(list);
    }
  }, [collection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load reading plan progress
  useEffect(() => {
    async function loadReadingPlan() {
      if (api) {
        const list = (await api.list("biblestudy_reading")) || [];
        const item = list.find((i) => i.id === "reading_plan");
        if (item?.books) setReadBooks(item.books);
      }
    }
    loadReadingPlan();
  }, []);

  // Save reading plan
  const saveReadingPlan = useCallback((books) => {
    setReadBooks(books);
    if (readingPlanTimer.current) clearTimeout(readingPlanTimer.current);
    readingPlanTimer.current = setTimeout(() => {
      if (api) api.save("reading_plan", "biblestudy_reading", { books });
    }, 300);
  }, []);

  const toggleBook = (book) => {
    const next = readBooks.includes(book)
      ? readBooks.filter((b) => b !== book)
      : [...readBooks, book];
    saveReadingPlan(next);
  };

  // Open entry for editing
  const openEntry = (item) => {
    setSelectedId(item.id);
    setDraft({
      date: item.date || "",
      reference: item.reference || "",
      scripture: item.scripture || "",
      observations: item.observations || "",
      application: item.application || "",
      prayer: item.prayer || "",
      tags: item.tags || [],
    });
  };

  // Debounced save
  const saveDraft = useCallback(
    (id, data) => {
      setDraft(data);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data } : e))
      );
      if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
      saveTimer.current[id] = setTimeout(() => {
        if (api) api.save(id, collection, data);
      }, 300);
    },
    [collection]
  );

  const updateField = (field, value) => {
    if (!selectedId) return;
    const next = { ...draft, [field]: value };
    saveDraft(selectedId, next);
  };

  const toggleTag = (tag) => {
    const tags = draft.tags || [];
    const next = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    updateField("tags", next);
  };

  const addEntry = async () => {
    const id = genId();
    const data = emptyEntry();
    if (api) await api.save(id, collection, data);
    await refresh();
    openEntry({ id, ...data });
  };

  const deleteEntry = async (id) => {
    if (api) await api.delete(id);
    if (selectedId === id) {
      setSelectedId(null);
      setDraft(emptyEntry());
    }
    refresh();
  };

  // Filter entries by search
  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        (e.reference || "").toLowerCase().includes(q) ||
        (e.scripture || "").toLowerCase().includes(q) ||
        (e.observations || "").toLowerCase().includes(q) ||
        (e.application || "").toLowerCase().includes(q) ||
        (e.prayer || "").toLowerCase().includes(q) ||
        (e.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [entries, search]);

  const readingProgress = BOOKS_OF_BIBLE.length > 0
    ? Math.round((readBooks.length / BOOKS_OF_BIBLE.length) * 100)
    : 0;

  const otIndex = BOOKS_OF_BIBLE.indexOf("Matthew");
  const otBooks = BOOKS_OF_BIBLE.slice(0, otIndex);
  const ntBooks = BOOKS_OF_BIBLE.slice(otIndex);

  return (
    <div className="biblePage">
      <style>{`
        .biblePage {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .bibleTopbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px 14px;
          border-bottom: 1px solid #e8e0d4;
          flex-shrink: 0;
        }
        .bibleTopbar h1 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #3a3226;
          margin: 0;
        }
        .bibleTopbarActions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .bibleBody {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        /* Sidebar list */
        .bibleSidebar {
          width: 280px;
          min-width: 280px;
          border-right: 1px solid #e8e0d4;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #faf6ef;
        }
        .bibleSearchWrap {
          padding: 12px 14px;
          border-bottom: 1px solid #e8e0d4;
        }
        .bibleSearchInput {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid #ddd5c8;
          border-radius: 6px;
          background: #fff;
          font-size: 0.85rem;
          outline: none;
          color: #3a3226;
          box-sizing: border-box;
        }
        .bibleSearchInput:focus {
          border-color: #5B7CF5;
        }
        .bibleEntryList {
          flex: 1;
          overflow-y: auto;
          padding: 6px 0;
        }
        .bibleEntryBtn {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 1px solid #eee8dd;
          transition: background 0.15s;
        }
        .bibleEntryBtn:hover {
          background: #f0ebe2;
        }
        .bibleEntryBtn.bibleEntryActive {
          background: #e8e2f8;
          border-left: 3px solid #5B7CF5;
        }
        .bibleEntryDate {
          font-size: 0.75rem;
          color: #8a7e6e;
          margin-bottom: 3px;
        }
        .bibleEntryRef {
          font-size: 0.9rem;
          font-weight: 600;
          color: #3a3226;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bibleEntryTags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .bibleEntryTag {
          font-size: 0.65rem;
          background: #e6e0d5;
          color: #6b6050;
          padding: 1px 6px;
          border-radius: 8px;
        }
        .bibleEmptyList {
          padding: 40px 20px;
          text-align: center;
          color: #a09080;
          font-size: 0.9rem;
        }
        /* Editor */
        .bibleEditor {
          flex: 1;
          overflow-y: auto;
          padding: 24px 32px 40px;
        }
        .bibleEditorEmpty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #b0a090;
          font-size: 1rem;
        }
        .bibleFormRow {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }
        .bibleFormGroup {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .bibleFormGroup.bibleFormSmall {
          flex: 0 0 160px;
        }
        .bibleFormLabel {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #8a7e6e;
          margin-bottom: 5px;
        }
        .bibleInput {
          padding: 8px 10px;
          border: 1px solid #ddd5c8;
          border-radius: 6px;
          background: #fff;
          font-size: 0.9rem;
          outline: none;
          color: #3a3226;
          font-family: inherit;
        }
        .bibleInput:focus {
          border-color: #5B7CF5;
          box-shadow: 0 0 0 2px rgba(91, 124, 245, 0.12);
        }
        .bibleTextarea {
          padding: 10px 12px;
          border: 1px solid #ddd5c8;
          border-radius: 6px;
          background: #fff;
          font-size: 0.9rem;
          outline: none;
          color: #3a3226;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          line-height: 1.55;
        }
        .bibleTextarea:focus {
          border-color: #5B7CF5;
          box-shadow: 0 0 0 2px rgba(91, 124, 245, 0.12);
        }
        .bibleTextarea.bibleScripture {
          min-height: 60px;
          font-style: italic;
          color: #4a4030;
        }
        .bibleSection {
          margin-bottom: 20px;
        }
        .bibleSectionTitle {
          font-size: 0.8rem;
          font-weight: 700;
          color: #5B7CF5;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bibleTagsWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .bibleTagChip {
          padding: 4px 12px;
          border-radius: 14px;
          border: 1px solid #ddd5c8;
          background: #faf6ef;
          font-size: 0.8rem;
          color: #6b6050;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
        }
        .bibleTagChip:hover {
          background: #ede7dc;
        }
        .bibleTagChip.bibleTagActive {
          background: #5B7CF5;
          color: #fff;
          border-color: #5B7CF5;
        }
        .bibleDeleteBtn {
          margin-top: 24px;
          padding: 6px 16px;
          border: 1px solid #e0c8c8;
          border-radius: 6px;
          background: none;
          color: #c0392b;
          font-size: 0.82rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .bibleDeleteBtn:hover {
          background: #fdf0ef;
        }
        /* Reading plan */
        .bibleReadingPlan {
          border-top: 1px solid #e8e0d4;
          padding: 16px 32px 24px;
          flex-shrink: 0;
        }
        .bibleReadingHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          margin-bottom: 4px;
        }
        .bibleReadingTitle {
          font-size: 0.85rem;
          font-weight: 700;
          color: #3a3226;
        }
        .bibleReadingProgress {
          font-size: 0.75rem;
          color: #8a7e6e;
        }
        .bibleReadingToggle {
          font-size: 0.75rem;
          color: #5B7CF5;
          cursor: pointer;
          background: none;
          border: none;
          padding: 2px 6px;
        }
        .bibleProgressBar {
          height: 6px;
          background: #e8e0d4;
          border-radius: 3px;
          overflow: hidden;
          margin: 8px 0 12px;
        }
        .bibleProgressFill {
          height: 100%;
          background: #5B7CF5;
          border-radius: 3px;
          transition: width 0.3s;
        }
        .bibleReadingBody {
          max-height: 220px;
          overflow-y: auto;
        }
        .bibleTestament {
          margin-bottom: 10px;
        }
        .bibleTestamentLabel {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8a7e6e;
          margin-bottom: 6px;
        }
        .bibleBooksGrid {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .bibleBookChip {
          font-size: 0.68rem;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid #ddd5c8;
          background: #faf6ef;
          color: #6b6050;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
          white-space: nowrap;
        }
        .bibleBookChip:hover {
          background: #ede7dc;
        }
        .bibleBookChip.bibleBookRead {
          background: #5B7CF5;
          color: #fff;
          border-color: #5B7CF5;
        }
      `}</style>

      {/* Top bar */}
      <div className="bibleTopbar topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">{title}</h1>
        </div>
        <div className="bibleTopbarActions nav">
          <button className="btn btnPrimary" onClick={addEntry}>
            + New Entry
          </button>
        </div>
      </div>

      <div className="bibleBody">
        {/* Entry list sidebar */}
        <div className="bibleSidebar">
          <div className="bibleSearchWrap">
            <input
              className="bibleSearchInput"
              type="text"
              placeholder="Search entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bibleEntryList">
            {filtered.length === 0 ? (
              <div className="bibleEmptyList">
                {entries.length === 0
                  ? "No entries yet. Tap \"+ New Entry\" to begin."
                  : "No entries match your search."}
              </div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  className={`bibleEntryBtn${selectedId === e.id ? " bibleEntryActive" : ""}`}
                  onClick={() => openEntry(e)}
                  type="button"
                >
                  <div className="bibleEntryDate">{formatDate(e.date)}</div>
                  <div className="bibleEntryRef">
                    {e.reference || "Untitled"}
                  </div>
                  {(e.tags || []).length > 0 && (
                    <div className="bibleEntryTags">
                      {e.tags.slice(0, 3).map((t) => (
                        <span key={t} className="bibleEntryTag">{t}</span>
                      ))}
                      {e.tags.length > 3 && (
                        <span className="bibleEntryTag">+{e.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor area */}
        {selectedId ? (
          <div className="bibleEditor">
            <div className="bibleFormRow">
              <div className="bibleFormGroup bibleFormSmall">
                <label className="bibleFormLabel">Date</label>
                <input
                  className="bibleInput"
                  type="date"
                  value={draft.date}
                  onChange={(e) => updateField("date", e.target.value)}
                />
              </div>
              <div className="bibleFormGroup">
                <label className="bibleFormLabel">Book / Chapter / Verse</label>
                <input
                  className="bibleInput"
                  type="text"
                  placeholder="e.g. Romans 8:28-30"
                  value={draft.reference}
                  onChange={(e) => updateField("reference", e.target.value)}
                />
              </div>
            </div>

            <div className="bibleSection">
              <div className="bibleSectionTitle">Scripture Text</div>
              <textarea
                className="bibleTextarea bibleScripture"
                placeholder="Paste or type the scripture passage here..."
                value={draft.scripture}
                onChange={(e) => updateField("scripture", e.target.value)}
              />
            </div>

            <div className="bibleSection">
              <div className="bibleSectionTitle">Observations &mdash; What does this passage say?</div>
              <textarea
                className="bibleTextarea"
                placeholder="What stands out? What is the context? What is the author communicating?"
                value={draft.observations}
                onChange={(e) => updateField("observations", e.target.value)}
              />
            </div>

            <div className="bibleSection">
              <div className="bibleSectionTitle">Application &mdash; How does this apply to my life?</div>
              <textarea
                className="bibleTextarea"
                placeholder="What changes should I make? How does this challenge or encourage me?"
                value={draft.application}
                onChange={(e) => updateField("application", e.target.value)}
              />
            </div>

            <div className="bibleSection">
              <div className="bibleSectionTitle">Prayer &mdash; What should I pray about?</div>
              <textarea
                className="bibleTextarea"
                placeholder="Turn your reflections into prayer..."
                value={draft.prayer}
                onChange={(e) => updateField("prayer", e.target.value)}
              />
            </div>

            <div className="bibleSection">
              <div className="bibleSectionTitle">Tags / Topics</div>
              <div className="bibleTagsWrap">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`bibleTagChip${(draft.tags || []).includes(tag) ? " bibleTagActive" : ""}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="bibleDeleteBtn"
              type="button"
              onClick={() => setConfirmDelete(selectedId)}
            >
              Delete Entry
            </button>
          </div>
        ) : (
          <div className="bibleEditor">
            <div className="bibleEditorEmpty">
              Select an entry or create a new one to get started.
            </div>
          </div>
        )}
      </div>

      {/* Reading plan */}
      <div className="bibleReadingPlan">
        <div className="bibleReadingHeader" onClick={() => setShowReadingPlan((v) => !v)}>
          <div>
            <span className="bibleReadingTitle">Reading Plan Progress</span>{" "}
            <span className="bibleReadingProgress">
              {readBooks.length}/{BOOKS_OF_BIBLE.length} books ({readingProgress}%)
            </span>
          </div>
          <button className="bibleReadingToggle" type="button">
            {showReadingPlan ? "Hide" : "Show"}
          </button>
        </div>
        <div className="bibleProgressBar">
          <div
            className="bibleProgressFill"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
        {showReadingPlan && (
          <div className="bibleReadingBody">
            <div className="bibleTestament">
              <div className="bibleTestamentLabel">Old Testament</div>
              <div className="bibleBooksGrid">
                {otBooks.map((book) => (
                  <button
                    key={book}
                    type="button"
                    className={`bibleBookChip${readBooks.includes(book) ? " bibleBookRead" : ""}`}
                    onClick={() => toggleBook(book)}
                    title={book}
                  >
                    {book}
                  </button>
                ))}
              </div>
            </div>
            <div className="bibleTestament">
              <div className="bibleTestamentLabel">New Testament</div>
              <div className="bibleBooksGrid">
                {ntBooks.map((book) => (
                  <button
                    key={book}
                    type="button"
                    className={`bibleBookChip${readBooks.includes(book) ? " bibleBookRead" : ""}`}
                    onClick={() => toggleBook(book)}
                    title={book}
                  >
                    {book}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Entry"
        message="This will permanently remove this Bible study entry."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          deleteEntry(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
