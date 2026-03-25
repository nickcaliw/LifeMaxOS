import { useMemo } from "react";
import { getOverloadRecommendation } from "../lib/progressiveOverload.js";

export default function OverloadBadge({ equipment, previousSets, targetReps, targetRir }) {
  const rec = useMemo(() => {
    return getOverloadRecommendation({ equipment, previousSets, targetReps, targetRir });
  }, [equipment, previousSets, targetReps, targetRir]);

  if (!rec || rec.type === "baseline") return null;

  const colorMap = {
    increase_weight: { bg: "rgba(76,175,80,0.12)", color: "#4caf50" },
    increase_reps: { bg: "rgba(91,124,245,0.12)", color: "#5B7CF5" },
    hold: { bg: "rgba(255,152,0,0.12)", color: "#ff9800" },
  };
  const colors = colorMap[rec.type] || colorMap.hold;

  return (
    <div className="woOverloadBadge" style={{ background: colors.bg, color: colors.color }}>
      {rec.message}
    </div>
  );
}
