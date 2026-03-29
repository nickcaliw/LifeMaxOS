import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "savingsgoals";
const genId = () => crypto.randomUUID();

const CATEGORIES = ["Emergency Fund", "Vacation", "Home", "Car", "Education", "Retirement", "Investment", "Other"];
const CATEGORY_EMOJIS = {
  "Emergency Fund": "🛡️", Vacation: "✈️", Home: "🏠", Car: "🚗",
  Education: "🎓", Retirement: "🏖️", Investment: "📈", Other: "🎯",
};
const CATEGORY_COLORS = {
  "Emergency Fund": "#4caf50", Vacation: "#00bcd4", Home: "#ff9800",
  Car: "#e91e63", Education: "#9c27b0", Retirement: "#5B7CF5",
  Investment: "#2196f3", Other: "#607d8b",
};
const QUICK_AMOUNTS = [50, 100, 500];

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(current, target) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function statusColor(goal) {
  if (!goal.deadline) return "#4caf50";
  const now = new Date();
  const deadline = new Date(goal.deadline + "T00:00:00");
  const remaining = (deadline - now) / 86400000;
  const progress = pct(goal.current, goal.target);
  if (remaining <= 0) return progress >= 100 ? "#4caf50" : "#e53935";
  const expectedProgress = Math.max(0, 100 - (remaining / 365) * 100);
  if (progress >= expectedProgress * 0.8) return "#4caf50";
  if (progress >= expectedProgress * 0.5) return "#ff9800";
  return "#e53935";
}

function projectedDate(goal) {
  const contributions = goal.contributions || [];
  if (contributions.length < 2) return null;
  const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(sorted[0].date);
  const last = new Date(sorted[sorted.length - 1].date);
  const months = Math.max(1, (last - first) / (30 * 86400000));
  const totalContributed = sorted.reduce((s, c) => s + Number(c.amount || 0), 0);
  const monthlyRate = totalContributed / months;
  if (monthlyRate <= 0) return null;
  const remaining = Math.max(0, (goal.target || 0) - (goal.current || 0));
  const monthsNeeded = remaining / monthlyRate;
  const projected = new Date();
  projected.setMonth(projected.getMonth() + Math.ceil(monthsNeeded));
  return projected.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function SavingsGoalsPage() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [contribId, setContribId] = useState(null);
  const [customAmt, setCustomAmt] = useState("");
  const [showHistory, setShowHistory] = useState(null);
  const saveTimer = useRef({});

  const refresh = useCallback(async () => {
    if (api) setItems(await api.list(COLLECTION) || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((id, data) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    if (saveTimer.current[id]) clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(() => { if (api) api.save(id, COLLECTION, data); }, 300);
  }, []);

  const addGoal = async () => {
    const id = genId();
    const data = {
      name: "New Goal",
      target: 0,
      current: 0,
      deadline: "",
      category: "Other",
      emoji: "🎯",
      contributions: [],
    };
    if (api) await api.save(id, COLLECTION, data);
    await refresh();
    setExpandedId(id);
  };

  const deleteGoal = async (id) => {
    if (api) await api.delete(id);
    if (expandedId === id) setExpandedId(null);
    refresh();
  };

  const addContribution = (id, amount) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const amt = Number(amount) || 0;
    if (amt <= 0) return;
    const entry = { date: new Date().toISOString().split("T")[0], amount: amt };
    const contributions = [...(item.contributions || []), entry];
    const newCurrent = (item.current || 0) + amt;
    save(id, { ...item, current: newCurrent, contributions });
    setContribId(null);
    setCustomAmt("");
  };

  const totalSaved = useMemo(() => items.reduce((s, i) => s + Number(i.current || 0), 0), [items]);
  const totalTarget = useMemo(() => items.reduce((s, i) => s + Number(i.target || 0), 0), [items]);

  return (
    <div className="daysPage">
      <style>{`
        .sgBody{flex:1;overflow-y:auto;padding:0 24px 40px;}
        .sgSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
        .sgSumCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:18px 20px;text-align:center;}
        .sgSumLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
        .sgSumValue{font-size:24px;font-weight:700;color:var(--text);}
        .sgSumAccent{color:var(--accent);}

        .sgGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;}
        .sgCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:20px;transition:box-shadow .15s;}
        .sgCard:hover{box-shadow:0 2px 12px rgba(0,0,0,.06);}
        .sgCardHead{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
        .sgEmoji{font-size:28px;line-height:1;}
        .sgCardTitle{flex:1;min-width:0;}
        .sgCardName{font-size:15px;font-weight:700;color:var(--text);margin:0;}
        .sgCardCat{font-size:11px;color:var(--muted);margin-top:2px;}
        .sgDeleteBtn{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:6px;font-size:16px;transition:color .15s,background .15s;}
        .sgDeleteBtn:hover{color:#e53935;background:rgba(229,57,53,.08);}

        .sgAmounts{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;font-weight:600;}
        .sgAmountCurr{color:var(--accent);}
        .sgAmountTarget{color:var(--muted);}

        .sgBarTrack{width:100%;height:24px;background:var(--bg);border-radius:8px;overflow:hidden;position:relative;margin-bottom:6px;}
        .sgBarFill{height:100%;border-radius:8px;transition:width .3s ease;min-width:2px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;}
        .sgBarPct{font-size:10px;font-weight:700;color:#fff;}

        .sgDeadline{font-size:11px;color:var(--muted);margin-bottom:4px;}
        .sgProjected{font-size:11px;color:var(--muted);margin-bottom:10px;}
        .sgStatusDot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;}

        .sgContribRow{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
        .sgQuickBtn{border:1.5px solid var(--border);border-radius:8px;padding:5px 12px;background:var(--paper);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s;}
        .sgQuickBtn:hover{border-color:var(--accent);background:rgba(91,124,245,.05);}
        .sgCustomInput{border:1.5px solid var(--border);border-radius:8px;padding:5px 10px;font-size:12px;width:80px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;}
        .sgCustomInput:focus{border-color:var(--accent);}
        .sgAddContribBtn{border:none;background:var(--accent);color:#fff;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;}
        .sgAddContribBtn:hover{opacity:.9;}
        .sgToggleContrib{background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;font-weight:600;padding:4px 0;margin-top:6px;}

        .sgExpandBtn{background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;font-weight:600;padding:4px 0;margin-top:4px;}
        .sgEditRow{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;}
        .sgInput{border:1.5px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .sgInput:focus{border-color:var(--accent);}
        .sgInputSm{width:110px;}
        .sgSelect{border:1.5px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;cursor:pointer;}

        .sgHistory{margin-top:10px;max-height:160px;overflow-y:auto;}
        .sgHistRow{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border);}
        .sgHistDate{color:var(--muted);}
        .sgHistAmt{color:#4caf50;font-weight:600;}

        .sgEmpty{text-align:center;padding:60px 0;color:var(--muted);font-size:15px;}
        .sgOverallBar{margin-bottom:24px;background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:16px 20px;}
        .sgOverallLabel{font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;display:flex;justify-content:space-between;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Savings Goals</h1>
          <div className="weekBadge">{fmt(totalSaved)} saved</div>
        </div>
        <div className="nav">
          <button className="btn btnPrimary" onClick={addGoal} type="button">+ New Goal</button>
        </div>
      </div>

      <div className="sgBody">
        {/* Overall progress */}
        {items.length > 0 && (
          <div className="sgOverallBar">
            <div className="sgOverallLabel">
              <span>Total Progress</span>
              <span>{fmt(totalSaved)} / {fmt(totalTarget)} ({totalTarget > 0 ? pct(totalSaved, totalTarget) : 0}%)</span>
            </div>
            <div className="sgBarTrack">
              <div className="sgBarFill" style={{ width: `${pct(totalSaved, totalTarget)}%`, background: "var(--accent)" }}>
                {pct(totalSaved, totalTarget) > 12 && <span className="sgBarPct">{pct(totalSaved, totalTarget)}%</span>}
              </div>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="sgSummary">
          <div className="sgSumCard">
            <div className="sgSumLabel">Total Saved</div>
            <div className="sgSumValue sgSumAccent">{fmt(totalSaved)}</div>
          </div>
          <div className="sgSumCard">
            <div className="sgSumLabel">Total Target</div>
            <div className="sgSumValue">{fmt(totalTarget)}</div>
          </div>
          <div className="sgSumCard">
            <div className="sgSumLabel">Active Goals</div>
            <div className="sgSumValue">{items.length}</div>
          </div>
        </div>

        {/* Goal cards */}
        {items.length === 0 ? (
          <div className="sgEmpty">No savings goals yet. Click <strong>+ New Goal</strong> to start.</div>
        ) : (
          <div className="sgGrid">
            {items.map(goal => {
              const p = pct(goal.current, goal.target);
              const color = statusColor(goal);
              const catColor = CATEGORY_COLORS[goal.category] || "#607d8b";
              const proj = projectedDate(goal);
              const isExpanded = expandedId === goal.id;
              const isContrib = contribId === goal.id;
              const isHistory = showHistory === goal.id;

              return (
                <div className="sgCard" key={goal.id}>
                  <div className="sgCardHead">
                    <span className="sgEmoji">{goal.emoji || CATEGORY_EMOJIS[goal.category] || "🎯"}</span>
                    <div className="sgCardTitle">
                      {isExpanded ? (
                        <input className="sgInput" value={goal.name || ""} placeholder="Goal name"
                          onChange={e => save(goal.id, { ...goal, name: e.target.value })} autoFocus />
                      ) : (
                        <div className="sgCardName">{goal.name || "Untitled"}</div>
                      )}
                      <div className="sgCardCat" style={{ color: catColor }}>
                        <span className="sgStatusDot" style={{ background: color }} />
                        {goal.category || "Other"}
                      </div>
                    </div>
                    <button className="sgDeleteBtn" onClick={() => deleteGoal(goal.id)} title="Delete">✕</button>
                  </div>

                  {/* Progress bar */}
                  <div className="sgAmounts">
                    <span className="sgAmountCurr">{fmt(goal.current)}</span>
                    <span className="sgAmountTarget">{fmt(goal.target)}</span>
                  </div>
                  <div className="sgBarTrack">
                    <div className="sgBarFill" style={{ width: `${p}%`, background: catColor }}>
                      {p > 15 && <span className="sgBarPct">{p}%</span>}
                    </div>
                  </div>

                  {goal.deadline && (
                    <div className="sgDeadline">Deadline: {new Date(goal.deadline + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                  )}
                  {proj && <div className="sgProjected">Projected completion: {proj}</div>}

                  {/* Contribute */}
                  {isContrib ? (
                    <div className="sgContribRow">
                      {QUICK_AMOUNTS.map(amt => (
                        <button key={amt} className="sgQuickBtn" onClick={() => addContribution(goal.id, amt)}>+${amt}</button>
                      ))}
                      <input className="sgCustomInput" type="number" placeholder="Custom" value={customAmt}
                        onChange={e => setCustomAmt(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { addContribution(goal.id, customAmt); } }} />
                      <button className="sgAddContribBtn" onClick={() => addContribution(goal.id, customAmt)}>Add</button>
                      <button className="sgQuickBtn" onClick={() => { setContribId(null); setCustomAmt(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <button className="sgToggleContrib" onClick={() => { setContribId(goal.id); setCustomAmt(""); }}>+ Add Contribution</button>
                  )}

                  {/* History toggle */}
                  {(goal.contributions || []).length > 0 && (
                    <>
                      <button className="sgExpandBtn" onClick={() => setShowHistory(isHistory ? null : goal.id)}>
                        {isHistory ? "Hide History" : `History (${goal.contributions.length})`}
                      </button>
                      {isHistory && (
                        <div className="sgHistory">
                          {[...goal.contributions].reverse().map((c, i) => (
                            <div key={i} className="sgHistRow">
                              <span className="sgHistDate">{c.date}</span>
                              <span className="sgHistAmt">+{fmt(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Expand / edit */}
                  <button className="sgExpandBtn" onClick={() => setExpandedId(isExpanded ? null : goal.id)}>
                    {isExpanded ? "Done Editing" : "Edit"}
                  </button>
                  {isExpanded && (
                    <div style={{ marginTop: 8 }}>
                      <div className="sgEditRow">
                        <label style={{ fontSize: 12, color: "var(--muted)", width: 60 }}>Target</label>
                        <input className="sgInput sgInputSm" type="number" value={goal.target || ""}
                          onChange={e => save(goal.id, { ...goal, target: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="sgEditRow">
                        <label style={{ fontSize: 12, color: "var(--muted)", width: 60 }}>Current</label>
                        <input className="sgInput sgInputSm" type="number" value={goal.current || ""}
                          onChange={e => save(goal.id, { ...goal, current: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="sgEditRow">
                        <label style={{ fontSize: 12, color: "var(--muted)", width: 60 }}>Deadline</label>
                        <input className="sgInput sgInputSm" type="date" value={goal.deadline || ""}
                          onChange={e => save(goal.id, { ...goal, deadline: e.target.value })} />
                      </div>
                      <div className="sgEditRow">
                        <label style={{ fontSize: 12, color: "var(--muted)", width: 60 }}>Category</label>
                        <select className="sgSelect" value={goal.category || "Other"}
                          onChange={e => save(goal.id, { ...goal, category: e.target.value, emoji: CATEGORY_EMOJIS[e.target.value] || goal.emoji })}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="sgEditRow">
                        <label style={{ fontSize: 12, color: "var(--muted)", width: 60 }}>Emoji</label>
                        <input className="sgInput" style={{ width: 60 }} value={goal.emoji || ""}
                          onChange={e => save(goal.id, { ...goal, emoji: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
