import { useCallback, useEffect, useRef, useState } from "react";
import { ymd, addDays, startOfWeekMonday, isoWeekYear } from "../lib/dates.js";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "weeklyplanner";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekKey(monday) {
  const { weekYear, weekNumber } = isoWeekYear(monday);
  return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
}

function defaultWeekData() {
  return {
    goals: ["", "", ""],
    days: DAY_NAMES.reduce((acc, _, i) => {
      acc[i] = { focus: ["", "", ""], events: "", notes: "" };
      return acc;
    }, {}),
  };
}

export default function WeeklyPlannerPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState(defaultWeekData());
  const [docId, setDocId] = useState(null);
  const saveTimer = useRef(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);

  const monday = addDays(startOfWeekMonday(today), weekOffset * 7);
  const wk = weekKey(monday);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return { date: d, dateStr: ymd(d), dayName: DAY_NAMES[i], dayNum: d.getDate(), month: d.toLocaleDateString(undefined, { month: "short" }) };
  });

  const weekLabel = (() => {
    const sun = addDays(monday, 6);
    const left = monday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const right = sun.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${left} - ${right}`;
  })();

  const load = useCallback(async () => {
    if (!api) return;
    const all = await api.list(COLLECTION) || [];
    const found = all.find(item => item.weekKey === wk);
    if (found) {
      setDocId(found.id);
      setData({
        goals: found.goals || ["", "", ""],
        days: found.days || defaultWeekData().days,
      });
    } else {
      setDocId(null);
      setData(defaultWeekData());
    }
  }, [wk]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback((newData) => {
    setData(newData);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!api) return;
      const id = docId || crypto.randomUUID();
      const payload = { weekKey: wk, goals: newData.goals, days: newData.days };
      await api.save(id, COLLECTION, payload);
      if (!docId) {
        setDocId(id);
      }
    }, 300);
  }, [wk, docId]);

  const updateGoal = (idx, val) => {
    const next = { ...data, goals: [...data.goals] };
    next.goals[idx] = val;
    persist(next);
  };

  const updateDay = (dayIdx, field, val) => {
    const next = { ...data, days: { ...data.days } };
    next.days[dayIdx] = { ...next.days[dayIdx], [field]: val };
    persist(next);
  };

  const updateFocus = (dayIdx, focusIdx, val) => {
    const next = { ...data, days: { ...data.days } };
    const dayData = { ...next.days[dayIdx] };
    dayData.focus = [...(dayData.focus || ["", "", ""])];
    dayData.focus[focusIdx] = val;
    next.days[dayIdx] = dayData;
    persist(next);
  };

  return (
    <div className="daysPage">
      <style>{`
        .wpGoalsBar { background: var(--paper); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; }
        .wpGoalsTitle { font-size: 13px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .wpGoalsRow { display: flex; gap: 10px; }
        .wpGoalInput { flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg); color: var(--text); outline: none; }
        .wpGoalInput:focus { border-color: var(--accent); }
        .wpGoalInput::placeholder { color: var(--muted); }
        .wpGrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .wpCol { background: var(--paper); border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; min-height: 340px; overflow: hidden; }
        .wpColToday { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .wpColHeader { padding: 10px 10px 8px; text-align: center; border-bottom: 1px solid var(--border); }
        .wpDayName { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .wpDayNum { font-size: 18px; font-weight: 700; color: var(--text); margin-top: 2px; }
        .wpDayMonth { font-size: 10px; color: var(--muted); }
        .wpTodayDot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); margin-left: 4px; vertical-align: middle; }
        .wpSection { padding: 8px 8px 4px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .wpSection:last-child { border-bottom: none; flex: 1; }
        .wpSectionLabel { font-size: 10px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .wpFocusRow { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
        .wpFocusNum { font-size: 10px; color: var(--muted); width: 12px; flex-shrink: 0; }
        .wpFocusInput { flex: 1; padding: 3px 6px; border: 1px solid transparent; border-radius: 4px; font-size: 12px; background: transparent; color: var(--text); outline: none; }
        .wpFocusInput:hover { border-color: var(--border); }
        .wpFocusInput:focus { border-color: var(--accent); background: var(--bg); }
        .wpTextarea { width: 100%; padding: 4px 6px; border: 1px solid transparent; border-radius: 4px; font-size: 12px; background: transparent; color: var(--text); outline: none; resize: none; font-family: inherit; min-height: 36px; box-sizing: border-box; }
        .wpTextarea:hover { border-color: var(--border); }
        .wpTextarea:focus { border-color: var(--accent); background: var(--bg); }
        .wpNavRow { display: flex; align-items: center; gap: 8px; }
        .wpNavBtn { background: var(--paper); border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; color: var(--text); }
        .wpNavBtn:hover { background: var(--bg); }
        .wpThisWeek { background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .wpWeekLabel { font-size: 14px; font-weight: 600; color: var(--text); min-width: 200px; text-align: center; }
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Weekly Planner</h1>
          <div className="weekBadge">{wk}</div>
        </div>
        <div className="nav">
          <div className="wpNavRow">
            <button className="wpNavBtn" onClick={() => setWeekOffset(w => w - 1)} type="button">&larr;</button>
            <button className="wpThisWeek" onClick={() => setWeekOffset(0)} type="button">This Week</button>
            <button className="wpNavBtn" onClick={() => setWeekOffset(w => w + 1)} type="button">&rarr;</button>
          </div>
        </div>
      </div>

      <div className="dsBody">
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span className="wpWeekLabel">{weekLabel}</span>
        </div>

        <div className="wpGoalsBar">
          <div className="wpGoalsTitle">Weekly Goals</div>
          <div className="wpGoalsRow">
            {[0, 1, 2].map(i => (
              <input key={i} className="wpGoalInput" value={data.goals[i] || ""}
                placeholder={`Goal ${i + 1}`}
                onChange={e => updateGoal(i, e.target.value)} />
            ))}
          </div>
        </div>

        <div className="wpGrid">
          {weekDates.map((wd, dayIdx) => {
            const dayData = data.days[dayIdx] || { focus: ["", "", ""], events: "", notes: "" };
            const isToday = wd.dateStr === todayStr;
            return (
              <div key={dayIdx} className={`wpCol ${isToday ? "wpColToday" : ""}`}>
                <div className="wpColHeader">
                  <div className="wpDayName">
                    {wd.dayName}
                    {isToday && <span className="wpTodayDot" />}
                  </div>
                  <div className="wpDayNum">{wd.dayNum}</div>
                  <div className="wpDayMonth">{wd.month}</div>
                </div>

                <div className="wpSection">
                  <div className="wpSectionLabel">Focus</div>
                  {[0, 1, 2].map(fi => (
                    <div key={fi} className="wpFocusRow">
                      <span className="wpFocusNum">{fi + 1}</span>
                      <input className="wpFocusInput" value={(dayData.focus || [])[fi] || ""}
                        placeholder="Priority..."
                        onChange={e => updateFocus(dayIdx, fi, e.target.value)} />
                    </div>
                  ))}
                </div>

                <div className="wpSection">
                  <div className="wpSectionLabel">Events</div>
                  <textarea className="wpTextarea" value={dayData.events || ""} rows={2}
                    placeholder="Events..."
                    onChange={e => updateDay(dayIdx, "events", e.target.value)} />
                </div>

                <div className="wpSection">
                  <div className="wpSectionLabel">Notes</div>
                  <textarea className="wpTextarea" value={dayData.notes || ""} rows={2}
                    placeholder="Notes..."
                    onChange={e => updateDay(dayIdx, "notes", e.target.value)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
