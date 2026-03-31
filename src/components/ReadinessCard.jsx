import { useState } from "react";

const CATEGORIES = [
  { min: 80, label: "Peak", color: "#27ae60", bg: "rgba(39,174,96,.08)" },
  { min: 65, label: "Good", color: "#5B7CF5", bg: "rgba(91,124,245,.08)" },
  { min: 50, label: "Moderate", color: "#f1c40f", bg: "rgba(241,196,15,.08)" },
  { min: 35, label: "Low", color: "#e67e22", bg: "rgba(230,126,34,.08)" },
  { min: 0, label: "Very Low", color: "#e74c3c", bg: "rgba(231,76,60,.08)" },
];

function getCat(score) {
  for (const cat of CATEGORIES) {
    if (score >= cat.min) return cat;
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

const COMP_CONFIG = {
  sleep:            { label: "Sleep",       max: 30, icon: "🌙" },
  sleepConsistency: { label: "Sleep Consistency", max: 10, icon: "🕐" },
  mood:             { label: "Mood",        max: 15, icon: "😊" },
  energy:           { label: "Energy",      max: 15, icon: "⚡" },
  workload:         { label: "Recovery",    max: 15, icon: "💪" },
  soreness:         { label: "Soreness",    max: 10, icon: "🦴" },
  consistency:      { label: "Consistency", max: 5,  icon: "📅" },
};

function ScoreRing({ score, size = 80, stroke = 7 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - progress);
  const cat = getCat(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="rc-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={cat.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={cat.color} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="url(#rc-ring-grad)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={cat.color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x={size / 2} y={size / 2 - 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 22, fontWeight: 800, fill: cat.color, fontFamily: "inherit" }}
      >
        {score}
      </text>
      <text
        x={size / 2} y={size / 2 + 14}
        textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 8, fontWeight: 600, fill: "var(--muted, #8a8780)", textTransform: "uppercase", letterSpacing: "0.5px" }}
      >
        / 100
      </text>
    </svg>
  );
}

export default function ReadinessCard({ score, category, explanation, components }) {
  const [expanded, setExpanded] = useState(false);
  const cat = getCat(score ?? 0);

  return (
    <div className="rc-card">
      <style>{`
        .rc-card {
          background: var(--paper, #fbf7f0);
          border: 1px solid var(--line, rgba(20,20,20,0.14));
          border-radius: 14px;
          padding: 18px 22px;
          transition: box-shadow 0.2s;
        }
        .rc-top {
          display: flex; align-items: center; gap: 18px;
        }
        .rc-info { flex: 1; min-width: 0; }
        .rc-cat-badge {
          display: inline-block;
          font-size: 13px; font-weight: 700;
          padding: 3px 12px;
          border-radius: 20px;
          letter-spacing: 0.3px;
        }
        .rc-label {
          font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.6px; color: var(--muted, #8a8780);
          margin: 6px 0 0; font-weight: 600;
        }
        .rc-explanation {
          font-size: 13px; color: var(--muted, #8a8780);
          margin: 12px 0 0; line-height: 1.5;
        }
        .rc-toggle {
          background: none; border: none; padding: 0;
          font-size: 12px; font-weight: 600; color: var(--accent, #5B7CF5);
          cursor: pointer; margin-top: 12px;
          display: flex; align-items: center; gap: 4px;
        }
        .rc-toggle:hover { text-decoration: underline; }
        .rc-toggle svg {
          transition: transform 0.2s;
        }
        .rc-toggle[data-open="true"] svg {
          transform: rotate(180deg);
        }
        .rc-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .rc-comp {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px;
          border-radius: 10px;
          background: var(--bg, #f6f1e8);
          border: 1px solid var(--line2, rgba(20,20,20,0.06));
        }
        .rc-comp-icon {
          font-size: 16px; flex-shrink: 0;
        }
        .rc-comp-body {
          flex: 1; min-width: 0;
        }
        .rc-comp-name {
          font-size: 11px; font-weight: 600; color: var(--muted, #8a8780);
          margin-bottom: 4px;
        }
        .rc-comp-track {
          height: 5px; border-radius: 3px;
          background: var(--line2, rgba(20,20,20,0.06));
          overflow: hidden;
        }
        .rc-comp-fill {
          height: 100%; border-radius: 3px;
          transition: width 0.5s ease;
        }
        .rc-comp-pct {
          font-size: 12px; font-weight: 700;
          width: 36px; text-align: right; flex-shrink: 0;
        }
      `}</style>

      <div className="rc-top">
        <ScoreRing score={score ?? 0} />
        <div className="rc-info">
          <span className="rc-cat-badge" style={{ color: cat.color, background: cat.bg }}>
            {cat.label}
          </span>
          <p className="rc-label">Readiness Score</p>
        </div>
      </div>

      {explanation && (
        <p className="rc-explanation">{explanation}</p>
      )}

      {components && Object.keys(components).length > 0 && (
        <>
          <button
            className="rc-toggle"
            data-open={expanded}
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? "Hide" : "Show"} breakdown
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {expanded && (
            <div className="rc-grid">
              {Object.entries(components).map(([key, value]) => {
                const cfg = COMP_CONFIG[key] || { label: key, max: 15, icon: "📊" };
                const pct = Math.round((value / cfg.max) * 100);
                const barCat = getCat(pct);
                return (
                  <div className="rc-comp" key={key}>
                    <span className="rc-comp-icon">{cfg.icon}</span>
                    <div className="rc-comp-body">
                      <div className="rc-comp-name">{cfg.label}</div>
                      <div className="rc-comp-track">
                        <div
                          className="rc-comp-fill"
                          style={{ width: `${pct}%`, background: barCat.color }}
                        />
                      </div>
                    </div>
                    <span className="rc-comp-pct" style={{ color: barCat.color }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
