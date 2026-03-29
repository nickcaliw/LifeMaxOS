import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const api = typeof window !== "undefined" ? window.collectionApi : null;
const COLLECTION = "investments";
const genId = () => crypto.randomUUID();

const CATEGORIES = ["Stocks", "ETFs", "Bonds", "Crypto", "Real Estate", "Cash", "Other"];
const CATEGORY_COLORS = {
  Stocks: "#5B7CF5",
  ETFs: "#4caf50",
  Bonds: "#ff9800",
  Crypto: "#9c27b0",
  "Real Estate": "#e91e63",
  Cash: "#00bcd4",
  Other: "#607d8b",
};

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  const v = Number(n || 0);
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

function gainColor(gain) {
  if (gain > 0) return "#4caf50";
  if (gain < 0) return "#e53935";
  return "var(--muted)";
}

export default function InvestmentPortfolioPage() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState("value"); // "value" | "gain" | "name"
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

  const addHolding = async () => {
    const id = genId();
    const data = {
      name: "New Holding",
      ticker: "",
      category: "Stocks",
      shares: 0,
      costBasis: 0,
      currentValue: 0,
      notes: "",
    };
    if (api) await api.save(id, COLLECTION, data);
    await refresh();
    setExpandedId(id);
  };

  const deleteHolding = async (id) => {
    if (api) await api.delete(id);
    if (expandedId === id) setExpandedId(null);
    refresh();
  };

  // Computed summaries
  const totalValue = useMemo(() => items.reduce((s, i) => s + Number(i.currentValue || 0), 0), [items]);
  const totalCost = useMemo(() => items.reduce((s, i) => s + Number(i.costBasis || 0), 0), [items]);
  const totalGain = useMemo(() => totalValue - totalCost, [totalValue, totalCost]);
  const totalGainPct = useMemo(() => totalCost > 0 ? ((totalGain / totalCost) * 100) : 0, [totalGain, totalCost]);

  // Allocation by category
  const allocation = useMemo(() => {
    const map = {};
    for (const item of items) {
      const cat = item.category || "Other";
      map[cat] = (map[cat] || 0) + Number(item.currentValue || 0);
    }
    return Object.entries(map)
      .map(([cat, val]) => ({ cat, val, pct: totalValue > 0 ? (val / totalValue) * 100 : 0 }))
      .sort((a, b) => b.val - a.val);
  }, [items, totalValue]);

  // Sorted items
  const sorted = useMemo(() => {
    const copy = [...items];
    if (sortBy === "value") return copy.sort((a, b) => Number(b.currentValue || 0) - Number(a.currentValue || 0));
    if (sortBy === "gain") {
      return copy.sort((a, b) => {
        const ga = Number(a.currentValue || 0) - Number(a.costBasis || 0);
        const gb = Number(b.currentValue || 0) - Number(b.costBasis || 0);
        return gb - ga;
      });
    }
    if (sortBy === "name") return copy.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return copy;
  }, [items, sortBy]);

  return (
    <div className="daysPage">
      <style>{`
        .ipBody{flex:1;overflow-y:auto;padding:0 24px 40px;}
        .ipSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
        .ipSumCard{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:18px 20px;text-align:center;}
        .ipSumLabel{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
        .ipSumValue{font-size:22px;font-weight:700;color:var(--text);}
        .ipSumAccent{color:var(--accent);}

        .ipAllocSection{background:var(--paper);border-radius:12px;border:1.5px solid var(--border);padding:20px 24px;margin-bottom:24px;}
        .ipAllocTitle{font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px;}
        .ipAllocBar{display:flex;height:32px;border-radius:8px;overflow:hidden;margin-bottom:12px;}
        .ipAllocSeg{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;transition:width .3s ease;}
        .ipAllocLegend{display:flex;flex-wrap:wrap;gap:14px;}
        .ipLegendItem{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text);}
        .ipLegendDot{width:12px;height:12px;border-radius:4px;flex-shrink:0;}
        .ipLegendPct{color:var(--muted);font-weight:600;}

        .ipSortRow{display:flex;gap:4px;}

        .ipTable{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:28px;}
        .ipTable th{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left;border-bottom:1.5px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:1;}
        .ipTable td{padding:10px;border-bottom:1px solid var(--border);vertical-align:middle;font-size:13px;}
        .ipTable tr:last-child td{border-bottom:none;}
        .ipTableRow{transition:background .1s;cursor:pointer;}
        .ipTableRow:hover{background:rgba(91,124,245,.04);}

        .ipCatBadge{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:600;color:#fff;}
        .ipTicker{font-weight:700;color:var(--text);font-size:12px;background:var(--bg);padding:2px 6px;border-radius:4px;margin-left:4px;}
        .ipName{font-weight:600;color:var(--text);}

        .ipGain{font-weight:700;font-size:13px;}
        .ipGainPct{font-size:11px;font-weight:600;margin-left:4px;}

        .ipExpandArea{background:var(--bg);border-top:1px solid var(--border);padding:14px 10px;}
        .ipEditRow{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;}
        .ipFieldLabel{font-size:12px;color:var(--muted);width:90px;flex-shrink:0;}
        .ipInput{border:1.5px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;transition:border-color .15s;}
        .ipInput:focus{border-color:var(--accent);}
        .ipInputSm{width:120px;}
        .ipSelect{border:1.5px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;cursor:pointer;}
        .ipTextarea{border:1.5px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px;background:var(--paper);color:var(--text);font-family:inherit;outline:none;resize:vertical;min-height:40px;width:100%;}
        .ipTextarea:focus{border-color:var(--accent);}

        .ipDeleteBtn{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:6px;font-size:16px;transition:color .15s,background .15s;}
        .ipDeleteBtn:hover{color:#e53935;background:rgba(229,57,53,.08);}

        .ipEmpty{text-align:center;padding:60px 0;color:var(--muted);font-size:15px;}

        .ipAllocation{font-size:12px;color:var(--muted);}
      `}</style>

      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Investment Portfolio</h1>
          <div className="weekBadge">{fmt(totalValue)}</div>
        </div>
        <div className="nav">
          <div className="ipSortRow">
            {[["value", "Value"], ["gain", "Gain/Loss"], ["name", "Name"]].map(([key, label]) => (
              <button key={key} className={`tabBtn ${sortBy === key ? "active" : ""}`}
                onClick={() => setSortBy(key)} type="button">{label}</button>
            ))}
          </div>
          <button className="btn btnPrimary" onClick={addHolding} type="button">+ Add Holding</button>
        </div>
      </div>

      <div className="ipBody">
        {/* Summary cards */}
        <div className="ipSummary">
          <div className="ipSumCard">
            <div className="ipSumLabel">Total Value</div>
            <div className="ipSumValue ipSumAccent">{fmt(totalValue)}</div>
          </div>
          <div className="ipSumCard">
            <div className="ipSumLabel">Cost Basis</div>
            <div className="ipSumValue">{fmt(totalCost)}</div>
          </div>
          <div className="ipSumCard">
            <div className="ipSumLabel">Total Gain/Loss</div>
            <div className="ipSumValue" style={{ color: gainColor(totalGain) }}>{fmt(totalGain)}</div>
          </div>
          <div className="ipSumCard">
            <div className="ipSumLabel">Return %</div>
            <div className="ipSumValue" style={{ color: gainColor(totalGain) }}>{fmtPct(totalGainPct)}</div>
          </div>
        </div>

        {/* Asset allocation */}
        {allocation.length > 0 && (
          <div className="ipAllocSection">
            <div className="ipAllocTitle">Asset Allocation</div>
            <div className="ipAllocBar">
              {allocation.map(a => (
                <div key={a.cat} className="ipAllocSeg"
                  style={{ width: `${a.pct}%`, background: CATEGORY_COLORS[a.cat] || "#607d8b", minWidth: a.pct > 0 ? 2 : 0 }}>
                  {a.pct > 8 ? `${Math.round(a.pct)}%` : ""}
                </div>
              ))}
            </div>
            <div className="ipAllocLegend">
              {allocation.map(a => (
                <div key={a.cat} className="ipLegendItem">
                  <div className="ipLegendDot" style={{ background: CATEGORY_COLORS[a.cat] || "#607d8b" }} />
                  {a.cat}
                  <span className="ipLegendPct">{fmt(a.val)} ({Math.round(a.pct)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holdings table */}
        {items.length === 0 ? (
          <div className="ipEmpty">No holdings yet. Click <strong>+ Add Holding</strong> to start tracking.</div>
        ) : (
          <table className="ipTable">
            <thead>
              <tr>
                <th>Holding</th>
                <th>Category</th>
                <th>Shares</th>
                <th>Cost Basis</th>
                <th>Current Value</th>
                <th>Gain/Loss</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(h => {
                const gain = Number(h.currentValue || 0) - Number(h.costBasis || 0);
                const gainPctVal = Number(h.costBasis || 0) > 0 ? (gain / Number(h.costBasis)) * 100 : 0;
                const isExpanded = expandedId === h.id;
                const allocPct = totalValue > 0 ? ((Number(h.currentValue || 0) / totalValue) * 100).toFixed(1) : "0.0";

                return (
                  <tr key={h.id} className="ipTableRow" onClick={() => setExpandedId(isExpanded ? null : h.id)}>
                    {isExpanded ? (
                      <td colSpan={7}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span className="ipName">{h.name || "Untitled"}</span>
                          {h.ticker && <span className="ipTicker">{h.ticker}</span>}
                          <span className="ipCatBadge" style={{ background: CATEGORY_COLORS[h.category] || "#607d8b" }}>{h.category}</span>
                          <span style={{ flex: 1 }} />
                          <button className="ipDeleteBtn" onClick={e => { e.stopPropagation(); deleteHolding(h.id); }} title="Delete">✕</button>
                        </div>
                        <div className="ipExpandArea" onClick={e => e.stopPropagation()}>
                          <div className="ipEditRow">
                            <span className="ipFieldLabel">Name</span>
                            <input className="ipInput" style={{ flex: 1 }} value={h.name || ""}
                              onChange={e => save(h.id, { ...h, name: e.target.value })} />
                          </div>
                          <div className="ipEditRow">
                            <span className="ipFieldLabel">Ticker</span>
                            <input className="ipInput ipInputSm" value={h.ticker || ""}
                              onChange={e => save(h.id, { ...h, ticker: e.target.value.toUpperCase() })} placeholder="e.g. AAPL" />
                          </div>
                          <div className="ipEditRow">
                            <span className="ipFieldLabel">Category</span>
                            <select className="ipSelect" value={h.category || "Stocks"}
                              onChange={e => save(h.id, { ...h, category: e.target.value })}>
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="ipEditRow">
                            <span className="ipFieldLabel">Shares/Units</span>
                            <input className="ipInput ipInputSm" type="number" step="0.0001" value={h.shares || ""}
                              onChange={e => save(h.id, { ...h, shares: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="ipEditRow">
                            <span className="ipFieldLabel">Cost Basis ($)</span>
                            <input className="ipInput ipInputSm" type="number" step="0.01" value={h.costBasis || ""}
                              onChange={e => save(h.id, { ...h, costBasis: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="ipEditRow">
                            <span className="ipFieldLabel">Current Val ($)</span>
                            <input className="ipInput ipInputSm" type="number" step="0.01" value={h.currentValue || ""}
                              onChange={e => save(h.id, { ...h, currentValue: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="ipEditRow">
                            <span className="ipFieldLabel">Notes</span>
                            <textarea className="ipTextarea" value={h.notes || ""} rows={2}
                              onChange={e => save(h.id, { ...h, notes: e.target.value })} placeholder="Optional notes..." />
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td>
                          <span className="ipName">{h.name || "Untitled"}</span>
                          {h.ticker && <span className="ipTicker">{h.ticker}</span>}
                          <div className="ipAllocation">{allocPct}% of portfolio</div>
                        </td>
                        <td>
                          <span className="ipCatBadge" style={{ background: CATEGORY_COLORS[h.category] || "#607d8b" }}>
                            {h.category || "Other"}
                          </span>
                        </td>
                        <td>{Number(h.shares || 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
                        <td>{fmt(h.costBasis)}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(h.currentValue)}</td>
                        <td>
                          <span className="ipGain" style={{ color: gainColor(gain) }}>{fmt(gain)}</span>
                          <span className="ipGainPct" style={{ color: gainColor(gain) }}>{fmtPct(gainPctVal)}</span>
                        </td>
                        <td>
                          <button className="ipDeleteBtn" onClick={e => { e.stopPropagation(); deleteHolding(h.id); }} title="Delete">✕</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
