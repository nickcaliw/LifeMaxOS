import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ymd, addDays } from "../lib/dates.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const ROUTINE_TYPES = [
  { id: "morning", label: "Morning", icon: "☀️", color: "#F59E0B" },
  { id: "evening", label: "Evening", icon: "🌙", color: "#7C3AED" },
  { id: "workout", label: "Pre-Workout", icon: "💪", color: "#EF4444" },
  { id: "wind-down", label: "Wind Down", icon: "🧘", color: "#3B82F6" },
  { id: "custom", label: "Custom", icon: "⚡", color: "#6B7280" },
];

function getToday() {
  return ymd(new Date());
}

export default function RoutinesPage() {
  const todayStr = useMemo(() => getToday(), []);

  const [routines, setRoutines] = useState([]);
  const [todayLogs, setTodayLogs] = useState({});
  const [weekLogs, setWeekLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const saveTimer = useRef(null);

  // Load routines (definitions)
  const loadRoutines = useCallback(async () => {
    if (!api) return;
    const items = await api.list("routines");
    setRoutines(items ?? []);
  }, []);

  // Load today's completion log
  const loadTodayLog = useCallback(async () => {
    if (!settingsApi) return;
    const raw = await settingsApi.get(`routine_log_${todayStr}`);
    if (raw) {
      try { setTodayLogs(JSON.parse(raw)); } catch { setTodayLogs({}); }
    } else {
      setTodayLogs({});
    }
  }, [todayStr]);

  // Load past 7 days for streak display
  const loadWeekLogs = useCallback(async () => {
    if (!settingsApi) return;
    const logs = {};
    for (let i = 0; i < 7; i++) {
      const d = ymd(addDays(new Date(), -i));
      const raw = await settingsApi.get(`routine_log_${d}`);
      if (raw) {
        try { logs[d] = JSON.parse(raw); } catch { /* skip */ }
      }
    }
    setWeekLogs(logs);
  }, []);

  useEffect(() => {
    Promise.all([loadRoutines(), loadTodayLog(), loadWeekLogs()]).then(() => setLoading(false));
  }, [loadRoutines, loadTodayLog, loadWeekLogs]);

  // Save today's log
  const saveTodayLog = useCallback((nextLogs) => {
    setTodayLogs(nextLogs);
    if (settingsApi) settingsApi.set(`routine_log_${todayStr}`, JSON.stringify(nextLogs));
  }, [todayStr]);

  // Toggle a step completion
  const toggleStep = (routineId, stepId) => {
    const key = `${routineId}_${stepId}`;
    const next = { ...todayLogs, [key]: !todayLogs[key] };
    saveTodayLog(next);
  };

  // Check if step is done today
  const isStepDone = (routineId, stepId) => !!todayLogs[`${routineId}_${stepId}`];

  // Get completion % for a routine today
  const getRoutineCompletion = (routine) => {
    const steps = routine.steps || [];
    if (steps.length === 0) return 0;
    const done = steps.filter(s => isStepDone(routine.id, s.id)).length;
    return Math.round((done / steps.length) * 100);
  };

  // Get streak for a routine (consecutive days all steps completed)
  const getStreak = (routine) => {
    let streak = 0;
    const steps = routine.steps || [];
    if (steps.length === 0) return 0;
    for (let i = 0; i < 7; i++) {
      const d = ymd(addDays(new Date(), -i));
      const dayLog = i === 0 ? todayLogs : (weekLogs[d] || {});
      const allDone = steps.every(s => dayLog[`${routine.id}_${s.id}`]);
      if (allDone) streak++;
      else break;
    }
    return streak;
  };

  // Save routine definition
  const saveRoutine = useCallback((id, data) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (api) api.save(id, "routines", data);
    }, 300);
  }, []);

  const addRoutine = async () => {
    const id = genId();
    const data = {
      name: "New Routine",
      type: "morning",
      steps: [
        { id: genId(), text: "", duration: "" },
      ],
    };
    if (api) await api.save(id, "routines", data);
    await loadRoutines();
    setEditingId(id);
  };

  const deleteRoutine = async (id) => {
    if (api) await api.delete(id);
    setConfirmDeleteId(null);
    if (editingId === id) setEditingId(null);
    loadRoutines();
  };

  const addStep = (routineId) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const steps = [...(routine.steps || []), { id: genId(), text: "", duration: "" }];
    saveRoutine(routineId, { ...routine, steps });
  };

  const updateStep = (routineId, stepId, patch) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const steps = (routine.steps || []).map(s => s.id === stepId ? { ...s, ...patch } : s);
    saveRoutine(routineId, { ...routine, steps });
  };

  const removeStep = (routineId, stepId) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const steps = (routine.steps || []).filter(s => s.id !== stepId);
    saveRoutine(routineId, { ...routine, steps });
  };

  // Step drag-to-reorder
  const stepDragIdx = useRef(null);
  const stepOverIdx = useRef(null);
  const stepDragRoutine = useRef(null);

  const onStepDragStart = (routineId, idx) => (e) => {
    stepDragIdx.current = idx;
    stepDragRoutine.current = routineId;
    e.dataTransfer.effectAllowed = "move";
  };
  const onStepDragOver = (idx) => (e) => {
    e.preventDefault();
    stepOverIdx.current = idx;
  };
  const onStepDragEnd = () => {
    const routineId = stepDragRoutine.current;
    if (stepDragIdx.current !== null && stepOverIdx.current !== null && stepDragIdx.current !== stepOverIdx.current && routineId) {
      const routine = routines.find(r => r.id === routineId);
      if (routine) {
        const next = [...(routine.steps || [])];
        const [moved] = next.splice(stepDragIdx.current, 1);
        next.splice(stepOverIdx.current, 0, moved);
        saveRoutine(routineId, { ...routine, steps: next });
      }
    }
    stepDragIdx.current = null;
    stepOverIdx.current = null;
    stepDragRoutine.current = null;
  };

  // Complete all steps in a routine
  const completeAll = (routine) => {
    const next = { ...todayLogs };
    for (const s of (routine.steps || [])) {
      next[`${routine.id}_${s.id}`] = true;
    }
    saveTodayLog(next);
  };

  // Reset all steps in a routine
  const resetAll = (routine) => {
    const next = { ...todayLogs };
    for (const s of (routine.steps || [])) {
      delete next[`${routine.id}_${s.id}`];
    }
    saveTodayLog(next);
  };

  const typeInfo = (typeId) => ROUTINE_TYPES.find(t => t.id === typeId) || ROUTINE_TYPES[4];

  if (loading) {
    return (
      <div className="routPage">
        <div className="topbar"><div className="topbarLeft"><h1 className="pageTitle">Routines</h1></div></div>
        <div className="loadingMsg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="routPage">
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Routines</h1>
          <div className="weekBadge">{routines.length} routines</div>
        </div>
        <div className="nav">
          <button className="btn btnPrimary" onClick={addRoutine} type="button">+ New Routine</button>
        </div>
      </div>

      <div className="routContent">
        {routines.length === 0 ? (
          <div className="routEmpty">
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>☀️</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No routines yet</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Create a morning or evening routine to build better habits.</div>
          </div>
        ) : (
          <div className="routGrid">
            {routines.map(routine => {
              const info = typeInfo(routine.type);
              const pct = getRoutineCompletion(routine);
              const streak = getStreak(routine);
              const isEditing = editingId === routine.id;
              const steps = routine.steps || [];

              return (
                <div className={`routCard ${isEditing ? "routCardEditing" : ""}`} key={routine.id}>
                  {/* Card header */}
                  <div className="routCardHeader">
                    <div className="routCardIcon" style={{ background: `${info.color}18`, color: info.color }}>
                      {info.icon}
                    </div>
                    <div className="routCardInfo">
                      {isEditing ? (
                        <input
                          className="routNameInput"
                          value={routine.name}
                          onChange={e => saveRoutine(routine.id, { ...routine, name: e.target.value })}
                          placeholder="Routine name..."
                        />
                      ) : (
                        <div className="routCardName">{routine.name}</div>
                      )}
                      <div className="routCardMeta">
                        {isEditing ? (
                          <select
                            className="routTypeSelect"
                            value={routine.type}
                            onChange={e => saveRoutine(routine.id, { ...routine, type: e.target.value })}
                          >
                            {ROUTINE_TYPES.map(t => (
                              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="routTypeBadge" style={{ background: `${info.color}14`, color: info.color }}>
                            {info.label}
                          </span>
                        )}
                        {streak > 0 && <span className="routStreak">🔥 {streak}d streak</span>}
                      </div>
                    </div>
                    <div className="routCardActions">
                      <button
                        className="routEditBtn"
                        onClick={() => setEditingId(isEditing ? null : routine.id)}
                        type="button"
                        title={isEditing ? "Done editing" : "Edit routine"}
                      >
                        {isEditing ? "✓ Done" : "Edit"}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {steps.length > 0 && (
                    <div className="routProgress">
                      <div className="routProgressBar">
                        <div
                          className="routProgressFill"
                          style={{ width: `${pct}%`, background: pct === 100 ? "#4caf50" : info.color }}
                        />
                      </div>
                      <span className="routProgressLabel">{pct}%</span>
                    </div>
                  )}

                  {/* Steps checklist */}
                  <div className="routSteps">
                    {steps.map((step, idx) => (
                      <div className={`routStep ${isStepDone(routine.id, step.id) ? "routStepDone" : ""}`} key={step.id}>
                        <button
                          className={`routCheck ${isStepDone(routine.id, step.id) ? "routCheckOn" : ""}`}
                          onClick={() => toggleStep(routine.id, step.id)}
                          type="button"
                        >
                          {isStepDone(routine.id, step.id) ? "✓" : ""}
                        </button>
                        {isEditing ? (
                          <div className="routStepEdit"
                            draggable
                            onDragStart={onStepDragStart(routine.id, idx)}
                            onDragOver={onStepDragOver(idx)}
                            onDragEnd={onStepDragEnd}
                          >
                            <div className="routStepGrip" title="Drag to reorder">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/>
                                <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
                                <circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/>
                              </svg>
                            </div>
                            <input
                              className="routStepInput"
                              value={step.text}
                              onChange={e => updateStep(routine.id, step.id, { text: e.target.value })}
                              placeholder={`Step ${idx + 1}...`}
                            />
                            <input
                              className="routDurationInput"
                              value={step.duration || ""}
                              onChange={e => updateStep(routine.id, step.id, { duration: e.target.value })}
                              placeholder="5 min"
                            />
                            <button className="routStepRemove" onClick={() => removeStep(routine.id, step.id)} type="button">×</button>
                          </div>
                        ) : (
                          <div className="routStepContent">
                            <span className="routStepText">{step.text || `Step ${idx + 1}`}</span>
                            {step.duration && <span className="routStepDuration">{step.duration}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer actions */}
                  <div className="routCardFooter">
                    {isEditing ? (
                      <>
                        <button className="btn" onClick={() => addStep(routine.id)} type="button">+ Add Step</button>
                        <button className="routDeleteBtn" onClick={() => setConfirmDeleteId(routine.id)} type="button">Delete</button>
                      </>
                    ) : steps.length > 0 ? (
                      <>
                        {pct < 100 ? (
                          <button className="btn" onClick={() => completeAll(routine)} type="button">Complete All</button>
                        ) : (
                          <button className="btn" onClick={() => resetAll(routine)} type="button">Reset</button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Routine"
        message={`Delete "${routines.find(r => r.id === confirmDeleteId)?.name || "this routine"}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteRoutine(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <style>{`
        .routPage { display: flex; flex-direction: column; height: 100%; }
        .routContent { flex: 1; overflow-y: auto; padding: 24px 32px; }
        .routEmpty { text-align: center; padding: 80px 20px; }
        .routGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
        .routCard {
          background: var(--paper);
          border: 1px solid var(--line2);
          border-radius: var(--radius);
          padding: 20px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .routCardEditing { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
        .routCardHeader { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .routCardIcon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .routCardInfo { flex: 1; min-width: 0; }
        .routCardName { font-size: 16px; font-weight: 600; color: var(--ink); }
        .routCardMeta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .routTypeBadge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
        .routStreak { font-size: 12px; color: var(--muted); }
        .routNameInput {
          font-size: 16px; font-weight: 600; color: var(--ink);
          border: 1px solid var(--line); border-radius: 6px;
          padding: 4px 8px; width: 100%; background: var(--bg);
          font-family: var(--font);
        }
        .routNameInput:focus { border-color: var(--accent); outline: none; }
        .routTypeSelect {
          font-size: 12px; padding: 2px 6px; border: 1px solid var(--line);
          border-radius: 6px; background: var(--bg); color: var(--ink);
        }
        .routCardActions { flex-shrink: 0; }
        .routEditBtn {
          font-size: 12px; padding: 4px 12px; border: 1px solid var(--line);
          border-radius: 6px; background: none; color: var(--ink);
          cursor: pointer; font-family: var(--font);
        }
        .routEditBtn:hover { background: var(--chip); }

        .routProgress { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .routProgressBar { flex: 1; height: 6px; background: var(--chip); border-radius: 3px; overflow: hidden; }
        .routProgressFill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
        .routProgressLabel { font-size: 12px; font-weight: 600; color: var(--muted); min-width: 32px; text-align: right; }

        .routSteps { display: flex; flex-direction: column; gap: 4px; }
        .routStep {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 0; transition: opacity 0.2s;
        }
        .routStepDone { opacity: 0.5; }
        .routCheck {
          width: 22px; height: 22px; border-radius: 6px;
          border: 2px solid var(--line); background: none;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; font-size: 12px; color: #fff;
          flex-shrink: 0; transition: all 0.15s;
        }
        .routCheckOn { background: #4caf50; border-color: #4caf50; animation: checkPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes checkPop{ 0%{ transform: scale(1); } 50%{ transform: scale(1.3); } 100%{ transform: scale(1); } }
        .routStepContent { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .routStepText { font-size: 14px; color: var(--ink); }
        .routStepDone .routStepText { text-decoration: line-through; }
        .routStepDuration { font-size: 11px; color: var(--muted); background: var(--chip); padding: 1px 6px; border-radius: 4px; }

        .routStepEdit { display: flex; align-items: center; gap: 6px; flex: 1; cursor: grab; }
        .routStepEdit:active { cursor: grabbing; }
        .routStepGrip { color: var(--muted); opacity: 0.4; flex-shrink: 0; cursor: grab; }
        .routStepInput {
          flex: 1; font-size: 13px; padding: 5px 8px;
          border: 1px solid var(--line); border-radius: 6px;
          background: var(--bg); color: var(--ink); font-family: var(--font);
        }
        .routStepInput:focus { border-color: var(--accent); outline: none; }
        .routDurationInput {
          width: 60px; font-size: 12px; padding: 5px 6px;
          border: 1px solid var(--line); border-radius: 6px;
          background: var(--bg); color: var(--ink); text-align: center;
        }
        .routDurationInput:focus { border-color: var(--accent); outline: none; }
        .routStepRemove {
          width: 22px; height: 22px; border: none; background: none;
          color: var(--muted); cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 4px;
        }
        .routStepRemove:hover { background: rgba(229,57,53,0.1); color: #e53935; }

        .routCardFooter { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line2); }
        .routDeleteBtn {
          font-size: 12px; color: #e53935; background: none;
          border: 1px solid rgba(229,57,53,0.2); border-radius: 6px;
          padding: 4px 12px; cursor: pointer; font-family: var(--font);
        }
        .routDeleteBtn:hover { background: rgba(229,57,53,0.08); }
      `}</style>
    </div>
  );
}
