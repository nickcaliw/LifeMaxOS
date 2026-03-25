export default function RestTimer({ timeRemaining, isRunning, formattedTime, progress, onSkip, onAddTime }) {
  if (!isRunning && timeRemaining === 0) return null;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="woRestTimer">
      <div className="woRestTimerCircle">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--line2)" strokeWidth="6" />
          <circle cx="50" cy="50" r={radius} fill="none"
            stroke={timeRemaining <= 10 ? "#ff9800" : "var(--accent)"}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="woRestTimerText">{formattedTime}</div>
      </div>
      <div className="woRestTimerLabel">Rest Timer</div>
      <div className="woRestTimerActions">
        <button className="btn woRestBtn" onClick={onSkip} type="button">Skip</button>
        <button className="btn woRestBtn" onClick={() => onAddTime(30)} type="button">+30s</button>
      </div>
    </div>
  );
}
