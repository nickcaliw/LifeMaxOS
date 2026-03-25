import { calculateTotalVolume } from "../lib/progressiveOverload.js";

export default function WorkoutSummary({ workout, startedAt, onSave }) {
  const duration = startedAt
    ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
    : 0;

  const totalVolume = calculateTotalVolume(workout?.exercises || []);

  const exercisesCompleted = (workout?.exercises || []).filter(ex =>
    ex.sets?.some(s => Number(s.weight) > 0 && Number(s.reps) > 0)
  ).length;

  const totalSets = (workout?.exercises || []).reduce((sum, ex) =>
    sum + (ex.sets || []).filter(s => s.setType !== "warmup" && Number(s.weight) > 0).length, 0
  );

  const prs = workout?.prsHit || [];

  return (
    <div className="woSummaryOverlay">
      <div className="woSummaryCard">
        <div className="woSummaryEmoji">🏆</div>
        <h2 className="woSummaryTitle">Workout Complete!</h2>

        <div className="woSummaryStats">
          <div className="woSummaryStat">
            <div className="woSummaryStatValue">{duration}</div>
            <div className="woSummaryStatLabel">minutes</div>
          </div>
          <div className="woSummaryStat">
            <div className="woSummaryStatValue">{exercisesCompleted}</div>
            <div className="woSummaryStatLabel">exercises</div>
          </div>
          <div className="woSummaryStat">
            <div className="woSummaryStatValue">{totalSets}</div>
            <div className="woSummaryStatLabel">sets</div>
          </div>
          <div className="woSummaryStat">
            <div className="woSummaryStatValue">{totalVolume.toLocaleString()}</div>
            <div className="woSummaryStatLabel">lbs volume</div>
          </div>
        </div>

        {prs.length > 0 && (
          <div className="woSummaryPrs">
            <div className="woSummaryPrsTitle">🎉 New Personal Records!</div>
            {prs.map((pr, i) => (
              <div className="woSummaryPr" key={i}>
                {pr.type === "weight" && `New weight PR: ${pr.value} lbs × ${pr.reps}`}
                {pr.type === "e1rm" && `New estimated 1RM: ${pr.value} lbs`}
                {pr.type === "maxReps" && `New rep PR: ${pr.value} reps @ ${pr.weight} lbs`}
              </div>
            ))}
          </div>
        )}

        <button className="btn btnPrimary woSummarySaveBtn" onClick={onSave} type="button">
          Save & Exit
        </button>
      </div>
    </div>
  );
}
