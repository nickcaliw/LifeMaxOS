import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "debts";
const genId = () => crypto.randomUUID();

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(paid, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round(((total - paid) / total) * 100));
}

function monthsToPayoff(balance, rate, payment) {
  if (payment <= 0 || balance <= 0) return Infinity;
  const monthlyRate = (rate / 100) / 12;
  if (monthlyRate === 0) return Math.ceil(balance / payment);
  if (payment <= balance * monthlyRate) return Infinity;
  return Math.ceil(-Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate));
}

function payoffDate(months) {
  if (!isFinite(months)) return "Never";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function totalInterest(balance, rate, payment) {
  if (payment <= 0 || balance <= 0) return 0;
  const monthlyRate = (rate / 100) / 12;
  let b = balance;
  let interest = 0;
  let months = 0;
  while (b > 0 && months < 600) {
    const monthInterest = b * monthlyRate;
    interest += monthInterest;
    b = b + monthInterest - Math.min(payment, b + monthInterest);
    months++;
  }
  return interest;
}

export default function DebtPayoffPage() {
  const [items, setItems] = useState([]);
  const [strategy, setStrategy] = useState("avalanche");
  const [extraPayment, setExtraPayment] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
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

  const addDebt = async () => {
    const id = genId();
    const data = {
      name: "New Debt",
      totalBalance: 0,
      currentBalance: 0,
      minPayment: 0,
      apr: 0,
      dueDate: "",
    };
    if (api) await api.save(id, COLLECTION, data);
    await refresh();
    setExpandedId(id);
  };

  const deleteDebt = async (id) => {
    if (api) await api.delete(id);
    if (expandedId === id) setExpandedId(null);
    refresh();
  };

  const totalDebt = useMemo(() => items.reduce((s, i) => s + Number(i.currentBalance || 0), 0), [items]);
  const totalMinPayments = useMemo(() => items.reduce((s, i) => s + Number(i.minPayment || 0), 0), [items]);
  const totalOriginal = useMemo(() => items.reduce((s, i) => s + Number(i.totalBalance || 0), 0), [items]);
  const totalPaidOff = useMemo(() => totalOriginal - totalDebt, [totalOriginal, totalDebt]);

  // Strategy-ordered debts
  const ordered = useMemo(() => {
    const copy = items.filter(i => Number(i.currentBalance || 0) > 0);
    if (strategy === "snowball") {
      return [...copy].sort((a, b) => Number(a.currentBalance || 0) - Number(b.currentBalance || 0));
    }
    return [...copy].sort((a, b) => Number(b.apr || 0) - Number(a.apr || 0));
  }, [items, strategy]);

  // Snowball/Avalanche payoff simulation
  const payoffPlan = useMemo(() => {
    const plan = [];
    let extra = Number(extraPayment || 0);
    let rolledOver = 0;

    for (let i = 0; i < ordered.length; i++) {
      const debt = ordered[i];
      const bal = Number(debt.currentBalance || 0);
      const rate = Number(debt.apr || 0);
      const min = Number(debt.minPayment || 0);
      const payment = min + (i === 0 ? extra : 0) + rolledOver;
      const months = monthsToPayoff(bal, rate, payment);
      const interest = totalInterest(bal, rate, payment);

      plan.push({
        ...debt,
        order: i + 1,
        effectivePayment: payment,
        months,
        payoffDateStr: payoffDate(months),
        interestPaid: interest,
      });

      if (isFinite(months)) {
        rolledOver += min;
      }
    }
    return plan;
  }, [ordered, extraPayment]);

  const projectedDebtFreeMonths = useMemo(() => {
    if (payoffPlan.length === 0) return 0;
    return Math.max(...payoffPlan.map(p => isFinite(p.months) ? p.months : 0));
  }, [payoffPlan]);

  const projectedDebtFreeDate = useMemo(() => payoffDate(projectedDebtFreeMonths), [projectedDebtFreeMonths]);

  // Payment breakdown for simple CSS bar
  const paymentBreakdown = useMemo(() => {
    const total = totalMinPayments + Number(extraPayment || 0);
    if (total <= 0) return [];
    const colors = ["#5B7CF5", "#4caf50", "#ff9800", "#e91e63", "#9c27b0", "#00bcd4", "#795548", "#607d8b", "#f44336", "#2196f3"];
    return items.map((d, i) => ({
      name: d.name,
      amount: Number(d.minPayment || 0),
      pct: Math.round((Number(d.minPayment || 0) / total) * 100),
      color: colors[i % colors.length],
    })).filter(d => d.amount > 0);
  }, [items, totalMinPayments, extraPayment]);

  return (
    <div className="daysPage">
      <style>{`
        .dpBody{flex:1;overflow-y:auto;padding:0 24px 40px;}
        .dpSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
        .dpSumCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:18px 20px;text-align:center;}
        .dpSumLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
        .dpSumValue{font-size:22px;font-weight:700;color:var(--text);}
        .dpSumAccent{color:var(--accent);}
        .dpSumRed{color:#e53935;}
        .dpSumGreen{color:#4caf50;}

        .dpStrategyBar{display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap;}
        .dpStratBtn{border:1.5px solid var(--border);border-radius:8px;padding:8px 16px;background:var(--paper);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;}
        .dpStratBtn:hover{border-color:var(--accent);}
        .dpStratBtnActive{border-color:var(--accent);background:rgba(91,124,245,.08);color:var(--accent);}
        .dpExtraLabel{font-size:13px;color:var(--muted);font-weight:600;margin-left:16px;}
        .dpExtraInput{border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-size:13px;width:100px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;margin-left:6px;}
        .dpExtraInput:focus{border-color:var(--accent);}

        .dpSection{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:20px 24px;margin-bottom:20px;}
        .dpSectionTitle{font-size:14px;font-weight:700;color:var(--text);margin-bottom:16px;}

        .dpOrderList{display:flex;flex-direction:column;gap:12px;}
        .dpOrderItem{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg);border-radius:10px;border:1px solid var(--border);}
        .dpOrderNum{width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .dpOrderInfo{flex:1;min-width:0;}
        .dpOrderName{font-size:14px;font-weight:700;color:var(--text);}
        .dpOrderMeta{font-size:11px;color:var(--muted);margin-top:2px;}
        .dpOrderRight{text-align:right;flex-shrink:0;}
        .dpOrderBal{font-size:15px;font-weight:700;color:var(--text);}
        .dpOrderPayoff{font-size:11px;color:var(--muted);margin-top:2px;}

        .dpDebtList{display:flex;flex-direction:column;gap:12px;}
        .dpDebtCard{background:var(--bg);border-radius:10px;border:1px solid var(--border);padding:16px;cursor:pointer;transition:box-shadow .15s;}
        .dpDebtCard:hover{box-shadow:0 2px 8px rgba(0,0,0,.04);}
        .dpDebtHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
        .dpDebtName{font-size:15px;font-weight:700;color:var(--text);}
        .dpDebtApr{font-size:12px;color:var(--muted);font-weight:600;background:var(--paper);padding:2px 8px;border-radius:6px;}
        .dpDebtAmounts{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;}
        .dpDebtPaid{color:#4caf50;font-weight:600;}
        .dpDebtRemaining{color:var(--muted);font-weight:600;}

        .dpBarTrack{width:100%;height:20px;background:var(--paper);border-radius:6px;overflow:hidden;margin-bottom:8px;}
        .dpBarFill{height:100%;border-radius:6px;transition:width .3s ease;min-width:2px;}

        .dpDebtMeta{display:flex;gap:16px;font-size:11px;color:var(--muted);}
        .dpDeleteBtn{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:6px;font-size:16px;transition:color .15s;}
        .dpDeleteBtn:hover{color:#e53935;}

        .dpEditArea{margin-top:12px;border-top:1px solid var(--border);padding-top:12px;}
        .dpEditRow{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;}
        .dpInput{border:1.5px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .dpInput:focus{border-color:var(--accent);}
        .dpInputSm{width:120px;}
        .dpFieldLabel{font-size:12px;color:var(--muted);width:90px;flex-shrink:0;}

        .dpPaymentBar{display:flex;height:28px;border-radius:8px;overflow:hidden;margin-top:10px;}
        .dpPaymentSeg{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;}
        .dpPaymentLegend{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;}
        .dpLegendItem{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text);}
        .dpLegendDot{width:10px;height:10px;border-radius:3px;flex-shrink:0;}

        .dpEmpty{text-align:center;padding:60px 0;color:var(--muted);font-size:15px;}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Debt Payoff</h1>
          <div className="weekBadge">{fmt(totalDebt)} remaining</div>
        </div>
        <div className="nav">
          <button className="btn btnPrimary" onClick={addDebt} type="button">+ Add Debt</button>
        </div>
      </div>

      <div className="dpBody">
        {/* Summary cards */}
        <div className="dpSummary">
          <div className="dpSumCard">
            <div className="dpSumLabel">Total Debt</div>
            <div className="dpSumValue dpSumRed">{fmt(totalDebt)}</div>
          </div>
          <div className="dpSumCard">
            <div className="dpSumLabel">Total Paid Off</div>
            <div className="dpSumValue dpSumGreen">{fmt(totalPaidOff)}</div>
          </div>
          <div className="dpSumCard">
            <div className="dpSumLabel">Min Payments/mo</div>
            <div className="dpSumValue">{fmt(totalMinPayments)}</div>
          </div>
          <div className="dpSumCard">
            <div className="dpSumLabel">Debt-Free Date</div>
            <div className="dpSumValue dpSumAccent" style={{ fontSize: 16 }}>{items.length > 0 ? projectedDebtFreeDate : "---"}</div>
          </div>
        </div>

        {/* Strategy selector + extra payment */}
        <div className="dpStrategyBar">
          <button className={`dpStratBtn ${strategy === "avalanche" ? "dpStratBtnActive" : ""}`}
            onClick={() => setStrategy("avalanche")} type="button">
            Avalanche (Highest APR)
          </button>
          <button className={`dpStratBtn ${strategy === "snowball" ? "dpStratBtnActive" : ""}`}
            onClick={() => setStrategy("snowball")} type="button">
            Snowball (Lowest Balance)
          </button>
          <span className="dpExtraLabel">Extra/mo:</span>
          <input className="dpExtraInput" type="number" value={extraPayment || ""}
            onChange={e => setExtraPayment(Number(e.target.value) || 0)} placeholder="$0" />
        </div>

        {items.length === 0 ? (
          <div className="dpEmpty">No debts tracked yet. Click <strong>+ Add Debt</strong> to begin.</div>
        ) : (
          <>
            {/* Payoff order */}
            {payoffPlan.length > 0 && (
              <div className="dpSection">
                <div className="dpSectionTitle">
                  Recommended Payoff Order ({strategy === "avalanche" ? "Avalanche" : "Snowball"})
                </div>
                <div className="dpOrderList">
                  {payoffPlan.map(p => (
                    <div key={p.id} className="dpOrderItem">
                      <div className="dpOrderNum">{p.order}</div>
                      <div className="dpOrderInfo">
                        <div className="dpOrderName">{p.name || "Untitled"}</div>
                        <div className="dpOrderMeta">
                          {p.apr}% APR &middot; {fmt(p.effectivePayment)}/mo &middot;
                          {isFinite(p.interestPaid) ? ` ${fmt(p.interestPaid)} interest` : " ---"}
                        </div>
                      </div>
                      <div className="dpOrderRight">
                        <div className="dpOrderBal">{fmt(p.currentBalance)}</div>
                        <div className="dpOrderPayoff">{isFinite(p.months) ? `${p.months} mo - ${p.payoffDateStr}` : "Increase payment"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly payment breakdown */}
            {paymentBreakdown.length > 0 && (
              <div className="dpSection">
                <div className="dpSectionTitle">Monthly Payment Breakdown ({fmt(totalMinPayments + Number(extraPayment || 0))}/mo)</div>
                <div className="dpPaymentBar">
                  {paymentBreakdown.map((seg, i) => (
                    <div key={i} className="dpPaymentSeg"
                      style={{ width: `${seg.pct}%`, background: seg.color, minWidth: seg.pct > 0 ? 2 : 0 }}>
                      {seg.pct > 10 ? `${seg.pct}%` : ""}
                    </div>
                  ))}
                  {Number(extraPayment || 0) > 0 && (
                    <div className="dpPaymentSeg" style={{
                      width: `${Math.round((Number(extraPayment) / (totalMinPayments + Number(extraPayment))) * 100)}%`,
                      background: "#ff5722", minWidth: 2
                    }}>Extra</div>
                  )}
                </div>
                <div className="dpPaymentLegend">
                  {paymentBreakdown.map((seg, i) => (
                    <div key={i} className="dpLegendItem">
                      <div className="dpLegendDot" style={{ background: seg.color }} />
                      {seg.name}: {fmt(seg.amount)}
                    </div>
                  ))}
                  {Number(extraPayment || 0) > 0 && (
                    <div className="dpLegendItem">
                      <div className="dpLegendDot" style={{ background: "#ff5722" }} />
                      Extra: {fmt(extraPayment)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Debt cards */}
            <div className="dpSection">
              <div className="dpSectionTitle">All Debts</div>
              <div className="dpDebtList">
                {items.map(debt => {
                  const total = Number(debt.totalBalance || 0);
                  const current = Number(debt.currentBalance || 0);
                  const paid = total - current;
                  const p = total > 0 ? Math.round((paid / total) * 100) : 0;
                  const isExpanded = expandedId === debt.id;

                  return (
                    <div key={debt.id} className="dpDebtCard" onClick={() => setExpandedId(isExpanded ? null : debt.id)}>
                      <div className="dpDebtHead">
                        <span className="dpDebtName">{debt.name || "Untitled"}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className="dpDebtApr">{debt.apr || 0}% APR</span>
                          <button className="dpDeleteBtn" onClick={e => { e.stopPropagation(); deleteDebt(debt.id); }} title="Delete">✕</button>
                        </div>
                      </div>

                      <div className="dpDebtAmounts">
                        <span className="dpDebtPaid">{fmt(paid)} paid</span>
                        <span className="dpDebtRemaining">{fmt(current)} remaining</span>
                      </div>
                      <div className="dpBarTrack">
                        <div className="dpBarFill" style={{ width: `${p}%`, background: p >= 100 ? "#4caf50" : "var(--accent)" }} />
                      </div>
                      <div className="dpDebtMeta">
                        <span>Min: {fmt(debt.minPayment)}/mo</span>
                        {debt.dueDate && <span>Due: {debt.dueDate}</span>}
                        <span>{p}% paid off</span>
                      </div>

                      {isExpanded && (
                        <div className="dpEditArea" onClick={e => e.stopPropagation()}>
                          <div className="dpEditRow">
                            <span className="dpFieldLabel">Name</span>
                            <input className="dpInput" style={{ flex: 1 }} value={debt.name || ""}
                              onChange={e => save(debt.id, { ...debt, name: e.target.value })} />
                          </div>
                          <div className="dpEditRow">
                            <span className="dpFieldLabel">Original Bal</span>
                            <input className="dpInput dpInputSm" type="number" value={debt.totalBalance || ""}
                              onChange={e => save(debt.id, { ...debt, totalBalance: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="dpEditRow">
                            <span className="dpFieldLabel">Current Bal</span>
                            <input className="dpInput dpInputSm" type="number" value={debt.currentBalance || ""}
                              onChange={e => save(debt.id, { ...debt, currentBalance: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="dpEditRow">
                            <span className="dpFieldLabel">Min Payment</span>
                            <input className="dpInput dpInputSm" type="number" value={debt.minPayment || ""}
                              onChange={e => save(debt.id, { ...debt, minPayment: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="dpEditRow">
                            <span className="dpFieldLabel">APR (%)</span>
                            <input className="dpInput dpInputSm" type="number" step="0.01" value={debt.apr || ""}
                              onChange={e => save(debt.id, { ...debt, apr: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="dpEditRow">
                            <span className="dpFieldLabel">Due Date</span>
                            <input className="dpInput dpInputSm" type="date" value={debt.dueDate || ""}
                              onChange={e => save(debt.id, { ...debt, dueDate: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
