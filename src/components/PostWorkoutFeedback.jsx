import { useState } from "react";

const PUMP_LABELS    = ["None", "Low", "Solid", "Great", "Extreme"];
const SORENESS_LABELS = ["None", "Mild", "Moderate", "Hard", "Too Much"];
const DIFFICULTY_LABELS = ["Easy", "Mild", "Moderate", "Hard", "Too Much"];

const RPE_LABELS = {
  1: "Very Light", 2: "Light", 3: "Light+", 4: "Moderate−",
  5: "Moderate", 6: "Moderate+", 7: "Hard−", 8: "Hard",
  9: "Very Hard", 10: "Max Effort",
};

function ratingColor(type, value) {
  if (!value) return null;
  // Pump: higher = better (green scale)
  if (type === "pump") {
    const greens = ["#95a5a6", "#7dcea0", "#52be80", "#27ae60", "#1e8449"];
    return greens[value - 1];
  }
  // Soreness: higher = worse (red scale)
  if (type === "soreness") {
    const reds = ["#95a5a6", "#f5b041", "#eb984e", "#e74c3c", "#c0392b"];
    return reds[value - 1];
  }
  // Difficulty: neutral to warm
  const oranges = ["#95a5a6", "#82c4e2", "#5B7CF5", "#e67e22", "#e74c3c"];
  return oranges[value - 1];
}

function rpeColor(val) {
  if (val <= 3) return "#27ae60";
  if (val <= 5) return "#5B7CF5";
  if (val <= 7) return "#e67e22";
  return "#e74c3c";
}

export default function PostWorkoutFeedback({ exercises, onSave, onCancel }) {
  const [feedback, setFeedback] = useState(() =>
    exercises.map((ex) => ({
      exerciseId: ex.id,
      pump: 0,
      soreness: 0,
      difficulty: 0,
    }))
  );
  const [sessionRpe, setSessionRpe] = useState(0);

  function setRating(index, field, value) {
    setFeedback((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: next[index][field] === value ? 0 : value };
      return next;
    });
  }

  function handleSave() {
    onSave({
      exerciseFeedback: feedback.filter(
        (f) => f.pump || f.soreness || f.difficulty
      ),
      sessionRpe: sessionRpe || null,
    });
  }

  const allRated = feedback.every((f) => f.pump && f.soreness && f.difficulty) && sessionRpe > 0;

  return (
    <div className="pwf-overlay">
      <style>{`
        .pwf-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .pwf-modal {
          background: var(--paper, #fbf7f0);
          border-radius: var(--radius, 12px);
          box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06));
          width: 540px; max-width: 94vw;
          max-height: 88vh; overflow-y: auto;
          padding: 28px 28px 24px;
        }
        .pwf-title {
          font-size: 20px; font-weight: 700;
          color: var(--ink, #141414);
          margin: 0 0 20px;
        }
        .pwf-exercise {
          border: 1px solid var(--line, rgba(20,20,20,0.14));
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 12px;
          background: var(--chip, rgba(20,20,20,0.05));
        }
        .pwf-ex-name {
          font-size: 14px; font-weight: 600;
          color: var(--ink, #141414);
          margin: 0 0 4px;
        }
        .pwf-ex-muscle {
          font-size: 11px; color: var(--muted, #8a8780);
          margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pwf-rating-row {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 6px;
        }
        .pwf-rating-label {
          font-size: 12px; color: var(--muted, #8a8780);
          width: 72px; flex-shrink: 0;
        }
        .pwf-rating-buttons {
          display: flex; gap: 4px; flex: 1;
        }
        .pwf-rbtn {
          flex: 1; padding: 5px 2px; border: 1px solid var(--line, rgba(20,20,20,0.14));
          border-radius: 6px; background: var(--paper, #fbf7f0);
          font-size: 11px; color: var(--muted, #8a8780);
          cursor: pointer; transition: all 0.15s;
          text-align: center; line-height: 1.2;
        }
        .pwf-rbtn:hover {
          border-color: var(--accent, #5B7CF5);
          background: var(--accent-soft, rgba(91,124,245,0.10));
        }
        .pwf-rbtn.active {
          color: #fff; border-color: transparent;
        }
        .pwf-rpe-section {
          margin-top: 20px; padding-top: 16px;
          border-top: 1px solid var(--line, rgba(20,20,20,0.14));
        }
        .pwf-rpe-title {
          font-size: 14px; font-weight: 600;
          color: var(--ink, #141414);
          margin: 0 0 10px;
        }
        .pwf-rpe-grid {
          display: flex; gap: 4px; flex-wrap: wrap;
        }
        .pwf-rpe-btn {
          width: 44px; height: 40px; border: 1px solid var(--line, rgba(20,20,20,0.14));
          border-radius: 8px; background: var(--paper, #fbf7f0);
          font-size: 14px; font-weight: 600;
          color: var(--ink, #141414);
          cursor: pointer; transition: all 0.15s;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .pwf-rpe-btn:hover {
          border-color: var(--accent, #5B7CF5);
          background: var(--accent-soft, rgba(91,124,245,0.10));
        }
        .pwf-rpe-btn.active {
          color: #fff; border-color: transparent;
        }
        .pwf-rpe-hint {
          font-size: 11px; color: var(--muted, #8a8780);
          margin-top: 6px; min-height: 16px;
        }
        .pwf-actions {
          display: flex; gap: 10px; margin-top: 20px;
          justify-content: flex-end;
        }
        .pwf-btn-cancel {
          padding: 10px 20px; border-radius: 8px;
          border: 1px solid var(--line, rgba(20,20,20,0.14));
          background: var(--paper, #fbf7f0);
          color: var(--muted, #8a8780);
          font-size: 14px; cursor: pointer;
        }
        .pwf-btn-cancel:hover { background: var(--chip, rgba(20,20,20,0.05)); }
        .pwf-btn-save {
          padding: 10px 24px; border-radius: 8px;
          border: none; background: var(--accent, #5B7CF5);
          color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: opacity 0.15s;
        }
        .pwf-btn-save:hover { opacity: 0.9; }
        .pwf-btn-save:disabled {
          opacity: 0.45; cursor: not-allowed;
        }
      `}</style>

      <div className="pwf-modal">
        <h2 className="pwf-title">How was your session?</h2>

        {exercises.map((ex, i) => (
          <div className="pwf-exercise" key={ex.id}>
            <p className="pwf-ex-name">{ex.exercise_name}</p>
            <p className="pwf-ex-muscle">{ex.muscle_group}</p>

            {[
              { key: "pump", label: "Pump", labels: PUMP_LABELS },
              { key: "soreness", label: "Soreness", labels: SORENESS_LABELS },
              { key: "difficulty", label: "Difficulty", labels: DIFFICULTY_LABELS },
            ].map(({ key, label, labels }) => (
              <div className="pwf-rating-row" key={key}>
                <span className="pwf-rating-label">{label}</span>
                <div className="pwf-rating-buttons">
                  {labels.map((lbl, vi) => {
                    const val = vi + 1;
                    const active = feedback[i][key] === val;
                    return (
                      <button
                        key={val}
                        className={`pwf-rbtn${active ? " active" : ""}`}
                        style={active ? { background: ratingColor(key, val) } : undefined}
                        onClick={() => setRating(i, key, val)}
                        type="button"
                      >
                        {val}<br />{lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="pwf-rpe-section">
          <p className="pwf-rpe-title">Session RPE</p>
          <div className="pwf-rpe-grid">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => {
              const active = sessionRpe === val;
              return (
                <button
                  key={val}
                  className={`pwf-rpe-btn${active ? " active" : ""}`}
                  style={active ? { background: rpeColor(val) } : undefined}
                  onClick={() => setSessionRpe(sessionRpe === val ? 0 : val)}
                  type="button"
                >
                  {val}
                </button>
              );
            })}
          </div>
          <p className="pwf-rpe-hint">
            {sessionRpe > 0 ? RPE_LABELS[sessionRpe] : "Rate overall session difficulty (1-10)"}
          </p>
        </div>

        <div className="pwf-actions">
          <button className="pwf-btn-cancel" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="pwf-btn-save"
            onClick={handleSave}
            disabled={!allRated}
            type="button"
          >
            Save Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
