import { useCallback, useEffect, useRef, useState } from "react";
import { ymd, addDays } from "../lib/dates.js";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "timeblocks";

const CATEGORIES = ["Work", "Personal", "Health", "Learning", "Break", "Other"];
const CAT_COLORS = {
  Work: "#5B7CF5",
  Personal: "#e91e63",
  Health: "#4caf50",
  Learning: "#9c27b0",
  Break: "#ff9800",
  Other: "#607d8b",
};

const START_HOUR = 5;
const END_HOUR = 23;
const SLOT_HEIGHT = 48; // px per 30 min
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;

function timeToSlot(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return (h - START_HOUR) * 2 + (m >= 30 ? 1 : 0);
}

function slotToMinutes(slot) {
  return (slot + START_HOUR * 2) * 30;
}

function minutesToTime(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTimeLabel(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function buildTimeOptions() {
  const opts = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === END_HOUR && m > 0) break;
      const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      opts.push(val);
    }
  }
  return opts;
}

const TIME_OPTIONS = buildTimeOptions();

export default function TimeBlockingPage() {
  const [date, setDate] = useState(() => ymd(new Date()));
  const [blocks, setBlocks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", start: "09:00", end: "10:00", category: "Work" });
  const saveTimer = useRef({});

  const dateObj = new Date(date + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const isToday = date === ymd(new Date());

  const refresh = useCallback(async () => {
    if (!api) return;
    const all = await api.list(COLLECTION) || [];
    setBlocks(all.filter(b => b.date === date));
  }, [date]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveBlock = useCallback((id, data) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => { if (api) api.save(id, COLLECTION, data); }, 300);
  }, []);

  const addBlock = async () => {
    if (!form.title.trim()) return;
    const id = crypto.randomUUID();
    const data = { ...form, date };
    if (api) await api.save(id, COLLECTION, data);
    setShowAdd(false);
    setForm({ title: "", start: "09:00", end: "10:00", category: "Work" });
    refresh();
  };

  const deleteBlock = async (id) => {
    if (api) await api.delete(id);
    if (editingId === id) setEditingId(null);
    refresh();
  };

  const goDay = (offset) => setDate(ymd(addDays(dateObj, offset)));
  const goToday = () => setDate(ymd(new Date()));

  // Position blocks
  const positioned = blocks.map(b => {
    const startSlot = timeToSlot(b.start || "09:00");
    const endSlot = timeToSlot(b.end || "10:00");
    const top = startSlot * SLOT_HEIGHT;
    const height = Math.max((endSlot - startSlot) * SLOT_HEIGHT, SLOT_HEIGHT);
    return { ...b, top, height };
  });

  // Time labels
  const timeLabels = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    timeLabels.push({ label: `${h12} ${ampm}`, slot: (h - START_HOUR) * 2 });
  }

  const editing = blocks.find(b => b.id === editingId);

  return (
    <div className="daysPage">
      <style>{`
        .tbDateNav { display: flex; align-items: center; gap: 8px; }
        .tbDateLabel { font-size: 15px; font-weight: 600; color: var(--text); min-width: 240px; text-align: center; }
        .tbNavBtn { background: var(--paper); border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; color: var(--text); }
        .tbNavBtn:hover { background: var(--bg); }
        .tbTodayBadge { background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .tbLayout { display: flex; gap: 0; position: relative; }
        .tbTimeline { width: 64px; flex-shrink: 0; position: relative; }
        .tbTimeLabel { position: absolute; right: 8px; font-size: 11px; color: var(--muted); transform: translateY(-7px); white-space: nowrap; }
        .tbGrid { flex: 1; position: relative; border-left: 1px solid var(--border); min-height: ${TOTAL_SLOTS * SLOT_HEIGHT}px; }
        .tbGridLine { position: absolute; left: 0; right: 0; border-top: 1px solid var(--border); }
        .tbGridLineHalf { border-top: 1px dashed color-mix(in srgb, var(--border) 50%, transparent); }
        .tbBlock { position: absolute; left: 4px; right: 4px; border-radius: 8px; padding: 8px 10px; cursor: pointer; overflow: hidden; box-sizing: border-box; border: 2px solid transparent; transition: border-color 0.15s; }
        .tbBlock:hover { border-color: rgba(0,0,0,0.15); }
        .tbBlockTitle { font-size: 13px; font-weight: 600; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .tbBlockTime { font-size: 11px; color: rgba(255,255,255,0.85); margin-top: 2px; }
        .tbAddPanel { background: var(--paper); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .tbFormRow { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .tbFormLabel { font-size: 12px; color: var(--muted); width: 64px; flex-shrink: 0; }
        .tbFormInput { flex: 1; min-width: 120px; padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg); color: var(--text); outline: none; }
        .tbFormInput:focus { border-color: var(--accent); }
        .tbFormSelect { padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg); color: var(--text); }
        .tbCatDot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }
        .tbEditOverlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .tbEditModal { background: var(--paper); border-radius: 12px; padding: 24px; width: 360px; max-width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
        .tbEditTitle { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 16px; }
        .tbNowLine { position: absolute; left: 0; right: 0; height: 2px; background: #e53935; z-index: 5; pointer-events: none; }
        .tbNowDot { position: absolute; left: -5px; top: -4px; width: 10px; height: 10px; border-radius: 50%; background: #e53935; }
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Time Blocking</h1>
        </div>
        <div className="nav">
          <div className="tbDateNav">
            <button className="tbNavBtn" onClick={() => goDay(-1)} type="button">&larr;</button>
            <button className="tbTodayBadge" onClick={goToday} type="button">Today</button>
            <button className="tbNavBtn" onClick={() => goDay(1)} type="button">&rarr;</button>
          </div>
        </div>
      </div>

      <div className="dsBody">
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span className="tbDateLabel">{dateLabel}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{blocks.length} block{blocks.length !== 1 ? "s" : ""}</div>
          <button className="btn btnPrimary" onClick={() => setShowAdd(!showAdd)} type="button">
            {showAdd ? "Cancel" : "+ Add Block"}
          </button>
        </div>

        {showAdd && (
          <div className="tbAddPanel">
            <div className="tbFormRow">
              <span className="tbFormLabel">Title</span>
              <input className="tbFormInput" value={form.title} placeholder="Block title..."
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addBlock()} />
            </div>
            <div className="tbFormRow">
              <span className="tbFormLabel">Start</span>
              <select className="tbFormSelect" value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
              </select>
              <span className="tbFormLabel" style={{ width: "auto" }}>End</span>
              <select className="tbFormSelect" value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
              </select>
            </div>
            <div className="tbFormRow">
              <span className="tbFormLabel">Category</span>
              <select className="tbFormSelect" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="tbCatDot" style={{ background: CAT_COLORS[form.category] }} />
            </div>
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <button className="btn btnPrimary" onClick={addBlock} type="button">Add Block</button>
            </div>
          </div>
        )}

        <div className="tbLayout">
          <div className="tbTimeline">
            {timeLabels.map(t => (
              <div key={t.slot} className="tbTimeLabel" style={{ top: t.slot * SLOT_HEIGHT }}>
                {t.label}
              </div>
            ))}
          </div>
          <div className="tbGrid">
            {/* Grid lines */}
            {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => (
              <div key={i} className={`tbGridLine ${i % 2 !== 0 ? "tbGridLineHalf" : ""}`}
                style={{ top: i * SLOT_HEIGHT }} />
            ))}

            {/* Now line */}
            {isToday && (() => {
              const now = new Date();
              const nowMins = now.getHours() * 60 + now.getMinutes();
              const startMins = START_HOUR * 60;
              const endMins = END_HOUR * 60;
              if (nowMins >= startMins && nowMins <= endMins) {
                const top = ((nowMins - startMins) / 30) * SLOT_HEIGHT;
                return (
                  <div className="tbNowLine" style={{ top }}>
                    <div className="tbNowDot" />
                  </div>
                );
              }
              return null;
            })()}

            {/* Blocks */}
            {positioned.map(b => (
              <div key={b.id} className="tbBlock"
                style={{
                  top: b.top,
                  height: b.height,
                  background: CAT_COLORS[b.category] || CAT_COLORS.Other,
                }}
                onClick={() => setEditingId(b.id)}>
                <div className="tbBlockTitle">{b.title}</div>
                <div className="tbBlockTime">
                  {formatTimeLabel(b.start || "09:00")} - {formatTimeLabel(b.end || "10:00")}
                </div>
              </div>
            ))}

            {blocks.length === 0 && !showAdd && (
              <div style={{
                position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
                color: "var(--muted)", fontSize: 14, textAlign: "center",
              }}>
                No blocks for this day.<br />Click <strong>+ Add Block</strong> to start.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editingId && editing && (
        <div className="tbEditOverlay" onClick={e => { if (e.target === e.currentTarget) setEditingId(null); }}>
          <div className="tbEditModal">
            <div className="tbEditTitle">Edit Block</div>
            <div className="tbFormRow">
              <span className="tbFormLabel">Title</span>
              <input className="tbFormInput" value={editing.title || ""}
                onChange={e => saveBlock(editing.id, { ...editing, title: e.target.value })} />
            </div>
            <div className="tbFormRow">
              <span className="tbFormLabel">Start</span>
              <select className="tbFormSelect" value={editing.start || "09:00"}
                onChange={e => saveBlock(editing.id, { ...editing, start: e.target.value })}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
              </select>
            </div>
            <div className="tbFormRow">
              <span className="tbFormLabel">End</span>
              <select className="tbFormSelect" value={editing.end || "10:00"}
                onChange={e => saveBlock(editing.id, { ...editing, end: e.target.value })}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
              </select>
            </div>
            <div className="tbFormRow">
              <span className="tbFormLabel">Category</span>
              <select className="tbFormSelect" value={editing.category || "Work"}
                onChange={e => saveBlock(editing.id, { ...editing, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button className="btn" style={{ color: "#e53935" }} onClick={() => deleteBlock(editing.id)} type="button">
                Delete
              </button>
              <button className="btn btnPrimary" onClick={() => setEditingId(null)} type="button">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
