import { useState } from "react";

const MAX_VISIBLE = 5;

const PRIORITY_COLORS = {
  high: "#e74c3c",
  medium: "#e67e22",
  low: "#95a5a6",
};

const CATEGORY_ICONS = {
  training: "\uD83C\uDFCB\uFE0F",
  nutrition: "\uD83C\uDF4E",
  recovery: "\uD83C\uDF19",
  hydration: "\uD83D\uDCA7",
  wellbeing: "\u2764\uFE0F",
};

export default function HealthRecommendations({ recommendations = [], onDismiss }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...recommendations].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  });

  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;
  const empty = sorted.length === 0;

  return (
    <div className="hr-card">
      <style>{`
        .hr-card {
          background: var(--paper, #fbf7f0);
          border: 1px solid var(--line, rgba(20,20,20,0.14));
          border-radius: var(--radius, 12px);
          padding: 16px 20px;
        }
        .hr-title {
          font-size: 15px; font-weight: 700;
          color: var(--ink, #141414);
          margin: 0 0 12px;
        }
        .hr-empty {
          font-size: 14px; color: var(--muted, #8a8780);
          padding: 12px 0;
        }
        .hr-list {
          display: flex; flex-direction: column; gap: 2px;
        }
        .hr-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 8px 8px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .hr-row:hover {
          background: var(--chip, rgba(20,20,20,0.05));
        }
        .hr-dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0; margin-top: 5px;
        }
        .hr-icon {
          font-size: 16px; flex-shrink: 0;
          line-height: 1.4;
        }
        .hr-content {
          flex: 1; min-width: 0;
        }
        .hr-message {
          font-size: 13px; color: var(--ink, #141414);
          line-height: 1.4; margin: 0;
        }
        .hr-action {
          font-size: 11px; color: var(--muted, #8a8780);
          margin: 2px 0 0; line-height: 1.3;
        }
        .hr-dismiss {
          background: none; border: none; padding: 2px 6px;
          font-size: 14px; color: var(--muted, #8a8780);
          cursor: pointer; flex-shrink: 0;
          border-radius: 4px; line-height: 1;
          opacity: 0; transition: opacity 0.15s;
        }
        .hr-row:hover .hr-dismiss { opacity: 1; }
        .hr-dismiss:hover { color: var(--ink, #141414); background: var(--chip, rgba(20,20,20,0.05)); }
        .hr-toggle {
          background: none; border: none; padding: 0;
          font-size: 12px; color: var(--accent, #5B7CF5);
          cursor: pointer; margin-top: 8px;
        }
        .hr-toggle:hover { text-decoration: underline; }
      `}</style>

      <h3 className="hr-title">Health Recommendations</h3>

      {empty ? (
        <p className="hr-empty">All good. Keep it up.</p>
      ) : (
        <>
          <div className="hr-list">
            {visible.map((rec) => (
              <div className="hr-row" key={rec.id}>
                <span
                  className="hr-dot"
                  style={{ background: PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.low }}
                />
                <span className="hr-icon">
                  {CATEGORY_ICONS[rec.category] || "\u2139\uFE0F"}
                </span>
                <div className="hr-content">
                  <p className="hr-message">{rec.message}</p>
                  {rec.action && <p className="hr-action">{rec.action}</p>}
                </div>
                {onDismiss && (
                  <button
                    className="hr-dismiss"
                    onClick={() => onDismiss(rec.id)}
                    type="button"
                    title="Dismiss"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              className="hr-toggle"
              onClick={() => setShowAll(!showAll)}
              type="button"
            >
              {showAll ? "Show less" : `Show ${sorted.length - MAX_VISIBLE} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
