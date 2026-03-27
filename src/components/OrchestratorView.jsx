import { useMemo, useState } from "react";

const DAY_TYPE_CONFIG = {
  peak:     { emoji: "\u26A1", label: "Peak Day",     color: "#27ae60", bg: "#27ae6012" },
  standard: { emoji: "\u2600\uFE0F", label: "Standard Day", color: "#5B7CF5", bg: "#5B7CF512" },
  light:    { emoji: "\u{1F324}\uFE0F", label: "Light Day",    color: "#f1c40f", bg: "#f1c40f12" },
  recovery: { emoji: "\u{1F9D8}", label: "Recovery Day", color: "#e67e22", bg: "#e67e2212" },
  reset:    { emoji: "\u{1F4A4}", label: "Reset Day",    color: "#e74c3c", bg: "#e74c3c12" },
};

const BLOCK_COLORS = {
  focus: "#5B7CF5",
  workout: "#27ae60",
  meal: "#e67e22",
  recovery: "#9b59b6",
  habit: "#3498db",
  social: "#e74c3c",
  routine: "#8e44ad",
  free: "var(--muted)",
};

function AlertIcon({ priority }) {
  if (priority === "high") return <span style={{ color: "#e74c3c" }}>!</span>;
  if (priority === "medium") return <span style={{ color: "#e67e22" }}>i</span>;
  return <span style={{ color: "var(--muted)" }}>&bull;</span>;
}

export default function OrchestratorView({ plan, score, onNavigate }) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  if (!plan) return null;

  const dtConfig = DAY_TYPE_CONFIG[plan.readiness?.dayType] || DAY_TYPE_CONFIG.standard;
  const scheduleItems = plan.schedule || [];
  const visibleSchedule = showFullSchedule ? scheduleItems : scheduleItems.slice(0, 8);
  const hasMore = scheduleItems.length > 8;
  const alerts = (plan.alerts || []).filter(a => a.message);
  const habits = plan.habits || [];
  const priorities = plan.topPriorities || [];

  return (
    <div className="orchView">
      <style>{STYLES}</style>

      {/* ── Readiness + Coaching ── */}
      <div className="orchReadinessRow">
        <div className="orchReadinessBadge" style={{ background: dtConfig.bg, color: dtConfig.color, borderColor: dtConfig.color + "30" }}>
          <span className="orchReadinessEmoji">{dtConfig.emoji}</span>
          <span className="orchReadinessLabel">{dtConfig.label}</span>
          <span className="orchReadinessScore">{plan.readiness?.score || 0}</span>
        </div>
        {plan.coachingMessage && (
          <div className="orchCoaching">{plan.coachingMessage}</div>
        )}
      </div>

      {/* ── Top 3 Priorities ── */}
      {priorities.length > 0 && (
        <div className="orchSection">
          <div className="orchSectionTitle">Top Priorities</div>
          <div className="orchPriorities">
            {priorities.slice(0, 3).map((p, i) => (
              <div key={p.id || i} className="orchPriorityItem">
                <div className="orchPriorityNum">{i + 1}</div>
                <div className="orchPriorityContent">
                  <div className="orchPriorityTitle">{p.title}</div>
                  {p.goalConnection && (
                    <div className="orchPriorityGoal">{p.goalConnection}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Today's Schedule ── */}
      {scheduleItems.length > 0 && (
        <div className="orchSection">
          <div className="orchSectionTitle">Today's Schedule</div>
          <div className="orchSchedule">
            {visibleSchedule.map((item, i) => (
              <div key={i} className="orchScheduleItem">
                <div className="orchScheduleTime">{item.time}</div>
                <div className="orchScheduleDot" style={{ background: BLOCK_COLORS[item.type] || "var(--muted)" }} />
                <div className="orchScheduleContent">
                  <div className="orchScheduleLabel">{item.label}</div>
                  {item.duration && <span className="orchScheduleDur">{item.duration}</span>}
                </div>
              </div>
            ))}
            {hasMore && !showFullSchedule && (
              <button className="orchScheduleMore" onClick={() => setShowFullSchedule(true)} type="button">
                Show {scheduleItems.length - 8} more...
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Habits for Today ── */}
      {habits.length > 0 && (
        <div className="orchSection">
          <div className="orchSectionTitle">
            Today's Habits
            <span className="orchHabitCount">{habits.length} of {plan.totalHabits || habits.length}</span>
          </div>
          <div className="orchHabits">
            {habits.map((h, i) => (
              <div key={i} className="orchHabitChip">{h}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="orchSection">
          <div className="orchSectionTitle">Alerts</div>
          <div className="orchAlerts">
            {alerts.map((a, i) => (
              <div key={i} className={`orchAlertItem orchAlert-${a.priority || "low"}`}>
                <AlertIcon priority={a.priority} />
                <span className="orchAlertMsg">{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Yesterday's Score ── */}
      {score && (
        <div className="orchSection">
          <div className="orchSectionTitle">Yesterday's Score</div>
          <div className="orchScoreRow">
            <div className="orchScoreNum">{score.score}</div>
            <div className="orchScoreExplanation">
              {score.explanation?.gains?.slice(0, 2).map((g, i) => (
                <div key={i} className="orchScoreGain">+ {g}</div>
              ))}
              {score.explanation?.gaps?.slice(0, 2).map((g, i) => (
                <div key={i} className="orchScoreGap">- {g}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const STYLES = `
.orchView{
  margin-bottom: 20px;
}

/* Readiness row */
.orchReadinessRow{
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.orchReadinessBadge{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid;
  font-weight: 700;
  font-size: 14px;
}
.orchReadinessEmoji{ font-size: 18px; }
.orchReadinessLabel{ }
.orchReadinessScore{
  font-size: 12px;
  opacity: 0.7;
}
.orchCoaching{
  font-size: 13px;
  font-weight: 600;
  font-style: italic;
  color: var(--muted);
  flex: 1;
}

/* Section */
.orchSection{
  background: var(--paper);
  border: 1px solid var(--line2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.orchSectionTitle{
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Priorities */
.orchPriorities{
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.orchPriorityItem{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.orchPriorityNum{
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.orchPriorityContent{ flex: 1; }
.orchPriorityTitle{
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.orchPriorityGoal{
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  margin-top: 2px;
}

/* Schedule */
.orchSchedule{
  display: flex;
  flex-direction: column;
  gap: 0;
}
.orchScheduleItem{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--line2);
}
.orchScheduleItem:last-child{ border-bottom: none; }
.orchScheduleTime{
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  min-width: 48px;
  font-variant-numeric: tabular-nums;
}
.orchScheduleDot{
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.orchScheduleContent{
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.orchScheduleLabel{
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.orchScheduleDur{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.orchScheduleMore{
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 0;
  font-family: inherit;
  text-align: left;
}

/* Habits */
.orchHabitCount{
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0;
}
.orchHabits{
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.orchHabitChip{
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  padding: 5px 12px;
  background: var(--chip);
  border-radius: 999px;
}

/* Alerts */
.orchAlerts{
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.orchAlertItem{
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--chip);
}
.orchAlert-high{ background: rgba(231,76,60,0.08); color: #c0392b; }
.orchAlert-medium{ background: rgba(230,126,34,0.08); color: #d35400; }
.orchAlertMsg{ flex: 1; }

/* Score */
.orchScoreRow{
  display: flex;
  align-items: center;
  gap: 16px;
}
.orchScoreNum{
  font-size: 36px;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -0.03em;
}
.orchScoreExplanation{
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.orchScoreGain{
  font-size: 12px;
  font-weight: 600;
  color: #27ae60;
}
.orchScoreGap{
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
`;
