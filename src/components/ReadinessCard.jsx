import { useState } from "react";

const CATEGORIES = [
  { min: 80, label: "Peak", color: "#27ae60" },
  { min: 65, label: "Good", color: "#5B7CF5" },
  { min: 50, label: "Moderate", color: "#f1c40f" },
  { min: 35, label: "Low", color: "#e67e22" },
  { min: 0, label: "Very Low", color: "#e74c3c" },
];

function scoreColor(score) {
  for (const cat of CATEGORIES) {
    if (score >= cat.min) return cat.color;
  }
  return "#e74c3c";
}

const COMPONENT_LABELS = {
  sleep: "Sleep",
  mood: "Mood",
  energy: "Energy",
  workload: "Workload",
  soreness: "Soreness",
  consistency: "Consistency",
};

function ScoreGauge({ score, size = 72, stroke = 6 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - progress);
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--line, rgba(20,20,20,0.14))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 20, fontWeight: 700, fill: color }}
      >
        {score}
      </text>
    </svg>
  );
}

export default function ReadinessCard({ score, category, explanation, components }) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(score ?? 0);

  return (
    <div className="rc-card">
      <style>{`
        .rc-card {
          background: var(--paper, #fbf7f0);
          border: 1px solid var(--line, rgba(20,20,20,0.14));
          border-radius: var(--radius, 12px);
          padding: 16px 20px;
        }
        .rc-top {
          display: flex; align-items: center; gap: 16px;
        }
        .rc-info {
          flex: 1; min-width: 0;
        }
        .rc-category {
          font-size: 18px; font-weight: 700;
          margin: 0 0 2px;
        }
        .rc-label {
          font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted, #8a8780);
          margin: 0;
        }
        .rc-explanation {
          font-size: 13px; color: var(--muted, #8a8780);
          font-style: italic; margin: 8px 0 0;
          line-height: 1.4;
        }
        .rc-expand-btn {
          background: none; border: none; padding: 0;
          font-size: 12px; color: var(--accent, #5B7CF5);
          cursor: pointer; margin-top: 10px;
        }
        .rc-expand-btn:hover { text-decoration: underline; }
        .rc-components {
          margin-top: 12px; display: flex; flex-direction: column; gap: 6px;
        }
        .rc-comp-row {
          display: flex; align-items: center; gap: 10px;
        }
        .rc-comp-label {
          font-size: 12px; color: var(--muted, #8a8780);
          width: 80px; flex-shrink: 0;
        }
        .rc-comp-bar-bg {
          flex: 1; height: 6px; border-radius: 3px;
          background: var(--chip, rgba(20,20,20,0.05));
          overflow: hidden;
        }
        .rc-comp-bar-fill {
          height: 100%; border-radius: 3px;
          transition: width 0.4s ease;
        }
        .rc-comp-val {
          font-size: 11px; font-weight: 600;
          width: 28px; text-align: right;
        }
      `}</style>

      <div className="rc-top">
        <ScoreGauge score={score ?? 0} />
        <div className="rc-info">
          <p className="rc-category" style={{ color }}>
            {category || "—"}
          </p>
          <p className="rc-label">Readiness Score</p>
        </div>
      </div>

      {explanation && (
        <p className="rc-explanation">{explanation}</p>
      )}

      {components && Object.keys(components).length > 0 && (
        <>
          <button
            className="rc-expand-btn"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? "Hide breakdown" : "Show breakdown"}
          </button>

          {expanded && (
            <div className="rc-components">
              {Object.entries(components).map(([key, value]) => {
                const pct = Math.max(0, Math.min(100, value));
                return (
                  <div className="rc-comp-row" key={key}>
                    <span className="rc-comp-label">
                      {COMPONENT_LABELS[key] || key}
                    </span>
                    <div className="rc-comp-bar-bg">
                      <div
                        className="rc-comp-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: scoreColor(pct),
                        }}
                      />
                    </div>
                    <span className="rc-comp-val" style={{ color: scoreColor(pct) }}>
                      {pct}
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
