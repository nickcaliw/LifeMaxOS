import { useMemo } from "react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function generateInsights(weekData) {
  const wins = [];
  const improve = [];

  // Habit completion
  if (weekData.habitCompletion >= 0.8) {
    wins.push(`Habit completion at ${Math.round(weekData.habitCompletion * 100)}% — great consistency!`);
  } else if (weekData.habitCompletion < 0.5) {
    improve.push(`Habit completion was ${Math.round(weekData.habitCompletion * 100)}% — aim for at least 70% next week`);
  }

  // Workouts
  if (weekData.workoutsCompleted >= weekData.workoutsScheduled && weekData.workoutsScheduled > 0) {
    wins.push(`Completed all ${weekData.workoutsCompleted} scheduled workouts`);
  } else if (weekData.workoutsScheduled > 0 && weekData.workoutsCompleted < weekData.workoutsScheduled) {
    improve.push(`Missed ${weekData.workoutsScheduled - weekData.workoutsCompleted} of ${weekData.workoutsScheduled} scheduled workouts`);
  }

  // Sleep
  if (weekData.avgSleep >= 7) {
    wins.push(`Averaged ${weekData.avgSleep.toFixed(1)}h sleep — well rested`);
  } else if (weekData.avgSleep > 0) {
    improve.push(`Sleep averaged ${weekData.avgSleep.toFixed(1)}h — below 7h target`);
  }

  // Readiness
  if (weekData.avgReadiness >= 75) {
    wins.push(`Readiness score averaged ${Math.round(weekData.avgReadiness)} — feeling strong`);
  } else if (weekData.avgReadiness > 0 && weekData.avgReadiness < 60) {
    improve.push(`Readiness averaged ${Math.round(weekData.avgReadiness)}/100 — focus on recovery`);
  }

  // Protein
  if (weekData.proteinTarget > 0 && weekData.avgProtein > 0) {
    const proteinPct = weekData.avgProtein / weekData.proteinTarget;
    if (proteinPct >= 0.9) {
      wins.push(`Hit protein target most days (avg ${Math.round(weekData.avgProtein)}g)`);
    } else if (proteinPct < 0.7) {
      improve.push(`Protein averaged ${Math.round(weekData.avgProtein)}g — ${Math.round(weekData.proteinTarget - weekData.avgProtein)}g short of target`);
    }
  }

  // Calories
  if (weekData.calorieTarget > 0 && weekData.avgCalories > 0) {
    const calDiff = weekData.avgCalories - weekData.calorieTarget;
    if (Math.abs(calDiff) <= 100) {
      wins.push("Calories right on target");
    } else if (calDiff > 200) {
      improve.push(`Averaged ${Math.round(calDiff)} cal over daily target`);
    }
  }

  // Mood
  if (weekData.moodTrend === "improving") {
    wins.push("Mood trend improved throughout the week");
  } else if (weekData.moodTrend === "declining") {
    improve.push("Mood declined over the week — consider stress management");
  }

  // Daily scores consistency
  const scores = weekData.dailyScores || [];
  const validScores = scores.filter(s => s > 0);
  if (validScores.length >= 5) {
    const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    if (avgScore >= 80) {
      wins.push(`Strong daily scores — averaged ${Math.round(avgScore)}`);
    }
  }

  return { wins, improve };
}

export default function WeeklyReview({ weekData, onClose }) {
  const insights = useMemo(() => generateInsights(weekData), [weekData]);

  const maxScore = Math.max(...(weekData.dailyScores || []).map(s => s || 0), 1);

  const weightChange = (weekData.weightStart != null && weekData.weightEnd != null)
    ? weekData.weightEnd - weekData.weightStart
    : null;

  const moodLabel = weekData.moodTrend === "improving" ? "Improving" :
    weekData.moodTrend === "declining" ? "Declining" : "Stable";
  const moodColor = weekData.moodTrend === "improving" ? "var(--wr-green)" :
    weekData.moodTrend === "declining" ? "var(--wr-amber)" : "var(--wr-blue)";
  const moodIcon = weekData.moodTrend === "improving" ? "\u2191" :
    weekData.moodTrend === "declining" ? "\u2193" : "\u2192";

  return (
    <div className="wrOverlay">
      <div className="wrContainer">
        <button className="wrClose" onClick={onClose} type="button">{"\u2715"}</button>

        <h1 className="wrTitle">Weekly Review</h1>

        {/* Stats Grid */}
        <div className="wrStatsGrid">
          <div className="wrStatCard">
            <div className="wrStatValue">{Math.round(weekData.habitCompletion * 100)}%</div>
            <div className="wrStatLabel">Habit Completion</div>
          </div>
          <div className="wrStatCard">
            <div className="wrStatValue">{weekData.workoutsCompleted}/{weekData.workoutsScheduled}</div>
            <div className="wrStatLabel">Workouts</div>
          </div>
          <div className="wrStatCard">
            <div className="wrStatValue">{weekData.avgSleep > 0 ? `${weekData.avgSleep.toFixed(1)}h` : "\u2014"}</div>
            <div className="wrStatLabel">Avg Sleep</div>
          </div>
          <div className="wrStatCard">
            <div className="wrStatValue">{weekData.avgReadiness > 0 ? Math.round(weekData.avgReadiness) : "\u2014"}</div>
            <div className="wrStatLabel">Avg Readiness</div>
          </div>
        </div>

        {/* Nutrition Row */}
        <div className="wrNutritionRow">
          <div className="wrNutritionItem">
            <div className="wrNutritionLabel">Avg Calories</div>
            <div className="wrNutritionValue">
              {weekData.avgCalories > 0 ? Math.round(weekData.avgCalories) : "\u2014"}
              {weekData.calorieTarget > 0 && <span className="wrNutritionTarget"> / {weekData.calorieTarget}</span>}
            </div>
            {weekData.calorieTarget > 0 && weekData.avgCalories > 0 && (
              <div className="wrNutritionBar">
                <div className="wrNutritionFill" style={{
                  width: `${Math.min(100, (weekData.avgCalories / weekData.calorieTarget) * 100)}%`,
                  background: Math.abs(weekData.avgCalories - weekData.calorieTarget) <= 100 ? "var(--wr-green)" : "var(--wr-amber)",
                }} />
              </div>
            )}
          </div>
          <div className="wrNutritionItem">
            <div className="wrNutritionLabel">Avg Protein</div>
            <div className="wrNutritionValue">
              {weekData.avgProtein > 0 ? `${Math.round(weekData.avgProtein)}g` : "\u2014"}
              {weekData.proteinTarget > 0 && <span className="wrNutritionTarget"> / {weekData.proteinTarget}g</span>}
            </div>
            {weekData.proteinTarget > 0 && weekData.avgProtein > 0 && (
              <div className="wrNutritionBar">
                <div className="wrNutritionFill" style={{
                  width: `${Math.min(100, (weekData.avgProtein / weekData.proteinTarget) * 100)}%`,
                  background: (weekData.avgProtein / weekData.proteinTarget) >= 0.9 ? "var(--wr-green)" : "var(--wr-amber)",
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Weight Change */}
        {weightChange !== null && (
          <div className="wrWeightChange">
            <span className="wrWeightLabel">Weight Change</span>
            <span className={`wrWeightValue ${weightChange > 0 ? "wrWeightUp" : weightChange < 0 ? "wrWeightDown" : ""}`}>
              {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} lbs
            </span>
          </div>
        )}

        {/* Daily Scores Bar Chart */}
        <div className="wrDailyScores">
          <div className="wrSectionTitle">Daily Scores</div>
          <div className="wrBarChart">
            {(weekData.dailyScores || []).map((score, i) => (
              <div key={i} className="wrBarCol">
                <div className="wrBarValue">{score > 0 ? score : ""}</div>
                <div className="wrBarTrack">
                  <div className="wrBar" style={{
                    height: `${score > 0 ? (score / maxScore) * 100 : 0}%`,
                    background: score >= 80 ? "var(--wr-green)" : score >= 50 ? "var(--wr-blue)" : "var(--wr-amber)",
                  }} />
                </div>
                <div className="wrBarLabel">{DAY_LABELS[i] || ""}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Trend */}
        <div className="wrMoodTrend">
          <span className="wrMoodLabel">Mood Trend</span>
          <span className="wrMoodIndicator" style={{ color: moodColor }}>
            {moodIcon} {moodLabel}
          </span>
        </div>

        {/* Insights */}
        <div className="wrInsights">
          {insights.wins.length > 0 && (
            <div className="wrInsightGroup">
              <div className="wrInsightGroupTitle wrInsightWins">Wins</div>
              {insights.wins.map((w, i) => (
                <div key={i} className="wrInsightItem wrInsightWinItem">
                  <span className="wrInsightIcon">{"\u2713"}</span> {w}
                </div>
              ))}
            </div>
          )}
          {insights.improve.length > 0 && (
            <div className="wrInsightGroup">
              <div className="wrInsightGroupTitle wrInsightImprove">Areas to Improve</div>
              {insights.improve.map((w, i) => (
                <div key={i} className="wrInsightItem wrInsightImproveItem">
                  <span className="wrInsightIcon">{"!"}</span> {w}
                </div>
              ))}
            </div>
          )}
          {insights.wins.length === 0 && insights.improve.length === 0 && (
            <div className="wrNoInsights">Not enough data to generate insights yet.</div>
          )}
        </div>

        {/* Start Next Week Button */}
        <button className="wrStartBtn" onClick={onClose} type="button">Start Next Week</button>
      </div>

      <style>{`
        .wrOverlay {
          --wr-green: #4caf50;
          --wr-amber: #f59e0b;
          --wr-blue: #5B7CF5;
          --wr-bg: #1a1a2e;
          --wr-card: rgba(255,255,255,0.06);
          --wr-text: #f0f0f0;
          --wr-muted: #9ca3af;
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: var(--wr-bg);
          overflow-y: auto;
          display: flex;
          justify-content: center;
          padding: 40px 20px;
          -webkit-app-region: no-drag;
        }
        .wrContainer {
          max-width: 640px;
          width: 100%;
          position: relative;
        }
        .wrClose {
          position: fixed;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: var(--wr-muted);
          font-size: 22px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .wrClose:hover {
          background: rgba(255,255,255,0.08);
          color: var(--wr-text);
        }
        .wrTitle {
          font-size: 28px;
          font-weight: 700;
          color: var(--wr-text);
          margin: 0 0 28px 0;
          text-align: center;
        }

        /* Stats Grid */
        .wrStatsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .wrStatCard {
          background: var(--wr-card);
          border-radius: 12px;
          padding: 16px 12px;
          text-align: center;
        }
        .wrStatValue {
          font-size: 24px;
          font-weight: 700;
          color: var(--wr-text);
        }
        .wrStatLabel {
          font-size: 11px;
          color: var(--wr-muted);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Nutrition Row */
        .wrNutritionRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        .wrNutritionItem {
          background: var(--wr-card);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .wrNutritionLabel {
          font-size: 11px;
          color: var(--wr-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .wrNutritionValue {
          font-size: 18px;
          font-weight: 600;
          color: var(--wr-text);
        }
        .wrNutritionTarget {
          font-size: 14px;
          color: var(--wr-muted);
          font-weight: 400;
        }
        .wrNutritionBar {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        .wrNutritionFill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        /* Weight Change */
        .wrWeightChange {
          background: var(--wr-card);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .wrWeightLabel {
          font-size: 13px;
          color: var(--wr-muted);
        }
        .wrWeightValue {
          font-size: 18px;
          font-weight: 600;
          color: var(--wr-text);
        }
        .wrWeightUp { color: var(--wr-amber); }
        .wrWeightDown { color: var(--wr-green); }

        /* Daily Scores */
        .wrDailyScores {
          background: var(--wr-card);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .wrSectionTitle {
          font-size: 13px;
          font-weight: 600;
          color: var(--wr-text);
          margin-bottom: 12px;
        }
        .wrBarChart {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          height: 120px;
        }
        .wrBarCol {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        .wrBarValue {
          font-size: 10px;
          color: var(--wr-muted);
          margin-bottom: 4px;
          min-height: 14px;
        }
        .wrBarTrack {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
        }
        .wrBar {
          width: 100%;
          border-radius: 4px 4px 0 0;
          min-height: 2px;
          transition: height 0.5s ease;
        }
        .wrBarLabel {
          font-size: 10px;
          color: var(--wr-muted);
          margin-top: 6px;
        }

        /* Mood Trend */
        .wrMoodTrend {
          background: var(--wr-card);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .wrMoodLabel {
          font-size: 13px;
          color: var(--wr-muted);
        }
        .wrMoodIndicator {
          font-size: 16px;
          font-weight: 600;
        }

        /* Insights */
        .wrInsights {
          margin-bottom: 28px;
        }
        .wrInsightGroup {
          margin-bottom: 16px;
        }
        .wrInsightGroupTitle {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          padding-left: 2px;
        }
        .wrInsightWins { color: var(--wr-green); }
        .wrInsightImprove { color: var(--wr-amber); }
        .wrInsightItem {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          color: var(--wr-text);
          margin-bottom: 6px;
          line-height: 1.4;
        }
        .wrInsightWinItem {
          background: rgba(76, 175, 80, 0.1);
          border-left: 3px solid var(--wr-green);
        }
        .wrInsightImproveItem {
          background: rgba(245, 158, 11, 0.1);
          border-left: 3px solid var(--wr-amber);
        }
        .wrInsightIcon {
          font-weight: 700;
          margin-right: 6px;
        }
        .wrNoInsights {
          text-align: center;
          color: var(--wr-muted);
          font-size: 14px;
          padding: 20px;
        }

        /* Start Button */
        .wrStartBtn {
          display: block;
          width: 100%;
          padding: 14px;
          background: var(--wr-blue);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          margin-bottom: 40px;
        }
        .wrStartBtn:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
