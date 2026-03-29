import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { ymd, addDays, startOfWeekMonday } from "../lib/dates.js";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "stretching";
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ──────────────────── data ──────────────────── */

const MUSCLE_GROUPS = [
  "Neck", "Shoulders", "Upper Back", "Lower Back", "Hips",
  "Hamstrings", "Quads", "Calves", "Full Body",
];

const TEMPLATES = [
  {
    name: "Morning Stretch",
    duration: 10,
    stretches: [
      { name: "Cat-Cow", seconds: 60, muscle: "Lower Back" },
      { name: "Standing Forward Fold", seconds: 45, muscle: "Hamstrings" },
      { name: "Neck Rolls", seconds: 40, muscle: "Neck" },
      { name: "Shoulder Circles", seconds: 40, muscle: "Shoulders" },
      { name: "Standing Quad Stretch", seconds: 45, muscle: "Quads" },
      { name: "Side Stretch", seconds: 45, muscle: "Full Body" },
      { name: "Hip Circles", seconds: 40, muscle: "Hips" },
      { name: "Calf Raises & Stretch", seconds: 40, muscle: "Calves" },
      { name: "Chest Opener", seconds: 40, muscle: "Upper Back" },
      { name: "Deep Breathing Reach", seconds: 45, muscle: "Full Body" },
    ],
  },
  {
    name: "Post-Workout",
    duration: 15,
    stretches: [
      { name: "Pigeon Pose", seconds: 60, muscle: "Hips" },
      { name: "Seated Forward Fold", seconds: 60, muscle: "Hamstrings" },
      { name: "Lying Quad Stretch", seconds: 50, muscle: "Quads" },
      { name: "Child's Pose", seconds: 60, muscle: "Lower Back" },
      { name: "Thread the Needle", seconds: 50, muscle: "Upper Back" },
      { name: "Figure Four Stretch", seconds: 60, muscle: "Hips" },
      { name: "Calf Stretch on Wall", seconds: 45, muscle: "Calves" },
      { name: "Doorway Chest Stretch", seconds: 50, muscle: "Shoulders" },
      { name: "Neck Side Stretch", seconds: 40, muscle: "Neck" },
      { name: "Standing IT Band Stretch", seconds: 50, muscle: "Hips" },
      { name: "Supine Spinal Twist", seconds: 60, muscle: "Lower Back" },
      { name: "Cobra Stretch", seconds: 50, muscle: "Upper Back" },
    ],
  },
  {
    name: "Desk Break",
    duration: 5,
    stretches: [
      { name: "Neck Tilts", seconds: 30, muscle: "Neck" },
      { name: "Shoulder Shrugs", seconds: 30, muscle: "Shoulders" },
      { name: "Seated Spinal Twist", seconds: 40, muscle: "Upper Back" },
      { name: "Wrist Circles", seconds: 30, muscle: "Full Body" },
      { name: "Standing Hip Flexor", seconds: 40, muscle: "Hips" },
      { name: "Calf Raises", seconds: 30, muscle: "Calves" },
      { name: "Chest Opener Arms", seconds: 30, muscle: "Shoulders" },
      { name: "Hamstring Doorframe", seconds: 40, muscle: "Hamstrings" },
    ],
  },
  {
    name: "Full Body",
    duration: 20,
    stretches: [
      { name: "Neck Rolls", seconds: 50, muscle: "Neck" },
      { name: "Shoulder Pass-Throughs", seconds: 60, muscle: "Shoulders" },
      { name: "Cat-Cow", seconds: 60, muscle: "Lower Back" },
      { name: "Thread the Needle", seconds: 60, muscle: "Upper Back" },
      { name: "World's Greatest Stretch", seconds: 70, muscle: "Full Body" },
      { name: "Pigeon Pose", seconds: 70, muscle: "Hips" },
      { name: "Standing Forward Fold", seconds: 60, muscle: "Hamstrings" },
      { name: "Couch Stretch", seconds: 60, muscle: "Quads" },
      { name: "Wall Calf Stretch", seconds: 50, muscle: "Calves" },
      { name: "Supine Spinal Twist", seconds: 60, muscle: "Lower Back" },
      { name: "Frog Stretch", seconds: 60, muscle: "Hips" },
      { name: "Cobra Stretch", seconds: 50, muscle: "Upper Back" },
      { name: "Lying Hamstring Stretch", seconds: 60, muscle: "Hamstrings" },
      { name: "Butterfly Stretch", seconds: 60, muscle: "Hips" },
      { name: "Child's Pose", seconds: 50, muscle: "Full Body" },
    ],
  },
  {
    name: "Lower Back Relief",
    duration: 10,
    stretches: [
      { name: "Pelvic Tilts", seconds: 50, muscle: "Lower Back" },
      { name: "Knee to Chest", seconds: 60, muscle: "Lower Back" },
      { name: "Cat-Cow", seconds: 60, muscle: "Lower Back" },
      { name: "Child's Pose", seconds: 60, muscle: "Lower Back" },
      { name: "Supine Spinal Twist", seconds: 60, muscle: "Lower Back" },
      { name: "Pigeon Pose", seconds: 60, muscle: "Hips" },
      { name: "Seated Forward Fold", seconds: 50, muscle: "Hamstrings" },
      { name: "Hip Flexor Lunge", seconds: 50, muscle: "Hips" },
      { name: "Figure Four Stretch", seconds: 50, muscle: "Hips" },
      { name: "Cobra Stretch", seconds: 50, muscle: "Upper Back" },
    ],
  },
];

/* ──────────────────── helpers ──────────────────── */

function fmtSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
}

function getWeekStart() {
  return startOfWeekMonday(new Date());
}

/* ──────────────────── component ──────────────────── */

export default function StretchingPage() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("routines"); // routines | timer | log | custom
  const [confirmDel, setConfirmDel] = useState(null);
  const saveTimer = useRef({});

  // Timer state
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [stretchIdx, setStretchIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const intervalRef = useRef(null);

  // Custom routine builder
  const [customName, setCustomName] = useState("");
  const [customStretches, setCustomStretches] = useState([]);
  const [editingCustomId, setEditingCustomId] = useState(null);

  const refresh = useCallback(async () => {
    if (api) setItems(await api.list(COLLECTION) || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((id, data) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => { if (api) api.save(id, COLLECTION, data); }, 300);
  }, []);

  const deleteItem = async (id) => {
    if (api) await api.delete(id);
    setConfirmDel(null);
    refresh();
  };

  /* ── sessions = items with type "session", customs = type "custom" ── */
  const sessions = useMemo(() => items.filter(i => i.type === "session").sort((a, b) => (b.date || "").localeCompare(a.date || "")), [items]);
  const customRoutines = useMemo(() => items.filter(i => i.type === "custom"), [items]);

  /* ── stats ── */
  const weekStart = useMemo(() => ymd(getWeekStart()), []);
  const stats = useMemo(() => {
    const weekSessions = sessions.filter(s => s.date >= weekStart);
    const totalMins = weekSessions.reduce((sum, s) => sum + (s.durationMins || 0), 0);
    // Streak: consecutive days with at least one session
    const daySet = new Set(sessions.map(s => s.date));
    let streak = 0;
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    while (daySet.has(ymd(d))) {
      streak++;
      d = addDays(d, -1);
    }
    return { weekCount: weekSessions.length, weekMins: totalMins, streak };
  }, [sessions, weekStart]);

  /* ── timer logic ── */
  useEffect(() => {
    if (timerRunning && !timerPaused && countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning, timerPaused, countdown]);

  // When countdown hits 0, advance to next stretch
  useEffect(() => {
    if (!timerRunning || timerPaused || countdown > 0 || !activeRoutine) return;
    const stretches = activeRoutine.stretches || [];
    if (stretchIdx < stretches.length - 1) {
      const nextIdx = stretchIdx + 1;
      setStretchIdx(nextIdx);
      setCountdown(stretches[nextIdx].seconds);
    } else {
      // Routine complete - log session
      finishSession();
    }
  }, [countdown, timerRunning, timerPaused]);

  const startRoutine = (routine) => {
    const stretches = routine.stretches || [];
    if (stretches.length === 0) return;
    setActiveRoutine(routine);
    setStretchIdx(0);
    setCountdown(stretches[0].seconds);
    setTimerRunning(true);
    setTimerPaused(false);
    setSessionStart(Date.now());
    setTab("timer");
  };

  const pauseTimer = () => setTimerPaused(p => !p);

  const skipStretch = () => {
    if (!activeRoutine) return;
    const stretches = activeRoutine.stretches || [];
    if (stretchIdx < stretches.length - 1) {
      const nextIdx = stretchIdx + 1;
      setStretchIdx(nextIdx);
      setCountdown(stretches[nextIdx].seconds);
    } else {
      finishSession();
    }
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setTimerPaused(false);
    setActiveRoutine(null);
    setStretchIdx(0);
    setCountdown(0);
    setTab("routines");
  };

  const finishSession = async () => {
    clearInterval(intervalRef.current);
    const elapsed = sessionStart ? Math.round((Date.now() - sessionStart) / 60000) : (activeRoutine?.duration || 0);
    const id = genId();
    const data = {
      type: "session",
      date: ymd(new Date()),
      routineName: activeRoutine?.name || "Custom",
      durationMins: elapsed || activeRoutine?.duration || 0,
      stretchCount: (activeRoutine?.stretches || []).length,
    };
    if (api) await api.save(id, COLLECTION, data);
    setTimerRunning(false);
    setTimerPaused(false);
    setActiveRoutine(null);
    setStretchIdx(0);
    setCountdown(0);
    setTab("log");
    refresh();
  };

  /* ── custom routine builder ── */
  const addCustomStretch = () => {
    setCustomStretches(prev => [...prev, { id: genId(), name: "", seconds: 30, muscle: "Full Body" }]);
  };

  const updateCustomStretch = (idx, field, val) => {
    setCustomStretches(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const removeCustomStretch = (idx) => {
    setCustomStretches(prev => prev.filter((_, i) => i !== idx));
  };

  const saveCustomRoutine = async () => {
    if (!customName.trim() || customStretches.length === 0) return;
    const id = editingCustomId || genId();
    const totalSec = customStretches.reduce((sum, s) => sum + (s.seconds || 30), 0);
    const data = {
      type: "custom",
      name: customName.trim(),
      duration: Math.ceil(totalSec / 60),
      stretches: customStretches.map(s => ({ name: s.name, seconds: s.seconds, muscle: s.muscle })),
    };
    if (api) await api.save(id, COLLECTION, data);
    setCustomName("");
    setCustomStretches([]);
    setEditingCustomId(null);
    refresh();
  };

  const editCustomRoutine = (item) => {
    setEditingCustomId(item.id);
    setCustomName(item.name || "");
    setCustomStretches((item.stretches || []).map(s => ({ ...s, id: genId() })));
    setTab("custom");
  };

  const allRoutines = [...TEMPLATES, ...customRoutines];

  /* ── timer progress ── */
  const timerProgress = useMemo(() => {
    if (!activeRoutine) return 0;
    const total = (activeRoutine.stretches || []).length;
    return total ? Math.round(((stretchIdx + 1) / total) * 100) : 0;
  }, [activeRoutine, stretchIdx]);

  return (
    <div className="daysPage">
      <style>{`
        .stGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:20px 24px;}
        .stCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:18px;transition:box-shadow .15s,border-color .15s;cursor:pointer;}
        .stCard:hover{border-color:var(--accent);box-shadow:0 2px 12px rgba(91,124,245,.1);}
        .stCardName{font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .stCardMeta{font-size:13px;color:var(--muted);display:flex;gap:12px;margin-bottom:10px;}
        .stCardStretches{display:flex;flex-wrap:wrap;gap:5px;}
        .stMuscleTag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--muted);border:1px solid var(--border);}
        .stCardActions{display:flex;gap:8px;margin-top:12px;}

        .stTimer{display:flex;flex-direction:column;align-items:center;padding:40px 24px;gap:20px;max-width:600px;margin:0 auto;}
        .stTimerRoutineName{font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:600;}
        .stTimerStretchName{font-size:28px;font-weight:800;color:var(--text);text-align:center;}
        .stTimerMuscle{font-size:14px;color:var(--accent);font-weight:600;}
        .stTimerCountdown{font-size:72px;font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums;line-height:1;}
        .stTimerProgress{width:100%;height:8px;background:var(--bg);border-radius:6px;overflow:hidden;}
        .stTimerProgressFill{height:100%;background:var(--accent);border-radius:6px;transition:width .3s;}
        .stTimerNext{font-size:13px;color:var(--muted);}
        .stTimerNext strong{color:var(--text);}
        .stTimerBtns{display:flex;gap:12px;}
        .stTimerBtn{padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;border:1.5px solid var(--border);background:var(--paper);color:var(--text);cursor:pointer;transition:all .15s;}
        .stTimerBtn:hover{border-color:var(--accent);color:var(--accent);}
        .stTimerBtnPrimary{background:var(--accent);color:#fff;border-color:var(--accent);}
        .stTimerBtnPrimary:hover{opacity:.9;}
        .stTimerBtnDanger{border-color:#e53935;color:#e53935;}
        .stTimerBtnDanger:hover{background:#e53935;color:#fff;}
        .stTimerStepInfo{font-size:13px;color:var(--muted);}
        .stTimerCircle{width:200px;height:200px;border-radius:50%;border:8px solid var(--bg);position:relative;display:flex;align-items:center;justify-content:center;}
        .stTimerCircleRing{position:absolute;inset:-8px;border-radius:50%;border:8px solid transparent;border-top-color:var(--accent);transition:transform .3s linear;}

        .stStats{display:flex;gap:16px;padding:0 24px 16px;flex-wrap:wrap;}
        .stStatCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:14px 20px;flex:1;min-width:140px;text-align:center;}
        .stStatVal{font-size:28px;font-weight:800;color:var(--accent);}
        .stStatLabel{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}

        .stLog{padding:0 24px 20px;}
        .stLogRow{display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--paper);border:1.5px solid var(--border);border-radius:10px;margin-bottom:8px;}
        .stLogDate{font-size:13px;font-weight:600;color:var(--text);min-width:90px;}
        .stLogName{font-size:14px;color:var(--text);flex:1;}
        .stLogDur{font-size:13px;color:var(--muted);min-width:60px;text-align:right;}
        .stLogDel{background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:2px 6px;border-radius:6px;}
        .stLogDel:hover{color:#e53935;background:#fce4ec;}
        .stLogEmpty{text-align:center;padding:40px 0;color:var(--muted);font-size:15px;}

        .stCustom{padding:0 24px 20px;max-width:700px;}
        .stCustomRow{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;}
        .stCustomInput{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .stCustomInput:focus{border-color:var(--accent);}
        .stCustomInputName{flex:1;min-width:120px;}
        .stCustomInputSec{width:70px;}
        .stCustomSelect{border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;}
        .stCustomRemove{background:none;border:1.5px solid #e53935;color:#e53935;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;transition:all .15s;}
        .stCustomRemove:hover{background:#e53935;color:#fff;}
        .stCustomTitle{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
        .stCustomNameInput{border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:15px;background:var(--bg);color:var(--text);font-family:inherit;outline:none;width:100%;margin-bottom:14px;font-weight:600;}
        .stCustomNameInput:focus{border-color:var(--accent);}
        .stCustomSaveBtns{display:flex;gap:8px;margin-top:14px;}

        .stPaused{animation:stPulse 1.2s ease-in-out infinite;}
        @keyframes stPulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        .stSectionTitle{font-size:14px;font-weight:700;color:var(--text);padding:16px 24px 8px;text-transform:uppercase;letter-spacing:.5px;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Stretching</h1>
          <div className="weekBadge">{stats.weekCount} this week</div>
        </div>
        <div className="nav">
          <div className="dsSortRow">
            {["routines", "log", "custom"].map(t => (
              <button key={t} className={`tabBtn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)} type="button">{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="dsBody">
        {/* Stats row */}
        <div className="stStats">
          <div className="stStatCard">
            <div className="stStatVal">{stats.weekCount}</div>
            <div className="stStatLabel">Sessions This Week</div>
          </div>
          <div className="stStatCard">
            <div className="stStatVal">{stats.weekMins}</div>
            <div className="stStatLabel">Minutes This Week</div>
          </div>
          <div className="stStatCard">
            <div className="stStatVal">{stats.streak}</div>
            <div className="stStatLabel">Day Streak</div>
          </div>
        </div>

        {/* ── Routines tab ── */}
        {tab === "routines" && (
          <>
            <div className="stSectionTitle">Built-in Routines</div>
            <div className="stGrid">
              {TEMPLATES.map(t => {
                const muscles = [...new Set(t.stretches.map(s => s.muscle))];
                return (
                  <div className="stCard" key={t.name} onClick={() => startRoutine(t)}>
                    <div className="stCardName">{t.name}</div>
                    <div className="stCardMeta">
                      <span>{t.duration} min</span>
                      <span>{t.stretches.length} stretches</span>
                    </div>
                    <div className="stCardStretches">
                      {muscles.map(m => <span key={m} className="stMuscleTag">{m}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
            {customRoutines.length > 0 && (
              <>
                <div className="stSectionTitle">Custom Routines</div>
                <div className="stGrid">
                  {customRoutines.map(r => {
                    const muscles = [...new Set((r.stretches || []).map(s => s.muscle))];
                    return (
                      <div className="stCard" key={r.id} onClick={() => startRoutine(r)}>
                        <div className="stCardName">{r.name || "Untitled"}</div>
                        <div className="stCardMeta">
                          <span>{r.duration || 0} min</span>
                          <span>{(r.stretches || []).length} stretches</span>
                        </div>
                        <div className="stCardStretches">
                          {muscles.map(m => <span key={m} className="stMuscleTag">{m}</span>)}
                        </div>
                        <div className="stCardActions" onClick={e => e.stopPropagation()}>
                          <button className="btn" onClick={() => editCustomRoutine(r)} type="button">Edit</button>
                          <button className="stCustomRemove" onClick={() => setConfirmDel(r.id)} type="button">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Timer tab ── */}
        {tab === "timer" && activeRoutine && (
          <div className="stTimer">
            <div className="stTimerRoutineName">{activeRoutine.name}</div>
            <div className="stTimerStepInfo">
              Stretch {stretchIdx + 1} of {(activeRoutine.stretches || []).length}
            </div>
            <div className="stTimerStretchName">
              {(activeRoutine.stretches || [])[stretchIdx]?.name}
            </div>
            <div className="stTimerMuscle">
              {(activeRoutine.stretches || [])[stretchIdx]?.muscle}
            </div>
            <div className={`stTimerCountdown ${timerPaused ? "stPaused" : ""}`}>
              {fmtSeconds(countdown)}
            </div>
            <div className="stTimerProgress">
              <div className="stTimerProgressFill" style={{ width: `${timerProgress}%` }} />
            </div>
            {stretchIdx < (activeRoutine.stretches || []).length - 1 && (
              <div className="stTimerNext">
                Next up: <strong>{(activeRoutine.stretches || [])[stretchIdx + 1]?.name}</strong>
              </div>
            )}
            <div className="stTimerBtns">
              <button className={`stTimerBtn ${timerPaused ? "stTimerBtnPrimary" : ""}`}
                onClick={pauseTimer} type="button">
                {timerPaused ? "Resume" : "Pause"}
              </button>
              <button className="stTimerBtn" onClick={skipStretch} type="button">Skip</button>
              <button className="stTimerBtn stTimerBtnDanger" onClick={stopTimer} type="button">Stop</button>
            </div>
          </div>
        )}

        {tab === "timer" && !activeRoutine && (
          <div className="stLogEmpty">
            No routine active. Go to <strong>Routines</strong> and pick one to start.
          </div>
        )}

        {/* ── Log tab ── */}
        {tab === "log" && (
          <div className="stLog">
            {sessions.length > 0 ? sessions.map(s => (
              <div className="stLogRow" key={s.id}>
                <div className="stLogDate">
                  {new Date(s.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
                <div className="stLogName">{s.routineName}</div>
                <div className="stLogDur">{s.durationMins} min</div>
                <button className="stLogDel" onClick={() => setConfirmDel(s.id)} type="button" title="Delete">&times;</button>
              </div>
            )) : (
              <div className="stLogEmpty">No sessions logged yet. Complete a routine to see it here.</div>
            )}
          </div>
        )}

        {/* ── Custom routine builder ── */}
        {tab === "custom" && (
          <div className="stCustom">
            <div className="stCustomTitle">
              {editingCustomId ? "Edit Routine" : "New Custom Routine"}
            </div>
            <input className="stCustomNameInput" placeholder="Routine name..."
              value={customName} onChange={e => setCustomName(e.target.value)} />

            {customStretches.map((s, i) => (
              <div className="stCustomRow" key={s.id}>
                <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 20 }}>{i + 1}.</span>
                <input className="stCustomInput stCustomInputName" placeholder="Stretch name"
                  value={s.name} onChange={e => updateCustomStretch(i, "name", e.target.value)} />
                <input className="stCustomInput stCustomInputSec" type="number" min={5} step={5}
                  value={s.seconds} onChange={e => updateCustomStretch(i, "seconds", Number(e.target.value) || 30)} />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>sec</span>
                <select className="stCustomSelect" value={s.muscle}
                  onChange={e => updateCustomStretch(i, "muscle", e.target.value)}>
                  {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button className="stCustomRemove" onClick={() => removeCustomStretch(i)} type="button">&times;</button>
              </div>
            ))}

            <div className="stCustomSaveBtns">
              <button className="btn" onClick={addCustomStretch} type="button">+ Add Stretch</button>
              <button className="btn btnPrimary" onClick={saveCustomRoutine} type="button"
                disabled={!customName.trim() || customStretches.length === 0}>
                {editingCustomId ? "Update Routine" : "Save Routine"}
              </button>
              {editingCustomId && (
                <button className="btn" onClick={() => { setEditingCustomId(null); setCustomName(""); setCustomStretches([]); }}
                  type="button">Cancel</button>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete"
        message="Are you sure you want to delete this?"
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteItem(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
