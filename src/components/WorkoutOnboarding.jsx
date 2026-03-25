import { useState, useMemo } from "react";
import { generateProgram } from "../lib/programBuilder.js";

const GOALS = [
  { key: "hypertrophy", label: "Build Muscle", emoji: "\u{1F4AA}", desc: "Maximize muscle growth with progressive overload" },
  { key: "fat_loss", label: "Lose Fat", emoji: "\u{1F525}", desc: "Burn fat while preserving lean muscle mass" },
  { key: "recomp", label: "Recomp", emoji: "\u26A1", desc: "Build muscle and lose fat simultaneously" },
  { key: "strength", label: "Strength", emoji: "\u{1F3CB}\uFE0F", desc: "Get stronger on the big compound lifts" },
  { key: "athletic", label: "Athletic", emoji: "\u{1F3C3}", desc: "Improve performance, power, and conditioning" },
];

const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Beginner", desc: "Less than 1 year of consistent training" },
  { key: "intermediate", label: "Intermediate", desc: "1-3 years of structured training" },
  { key: "advanced", label: "Advanced", desc: "3+ years with periodization experience" },
];

const INJURY_OPTIONS = [
  { key: "lower_back", label: "Lower Back" },
  { key: "shoulder", label: "Shoulder" },
  { key: "knee", label: "Knee" },
  { key: "wrist", label: "Wrist" },
  { key: "neck", label: "Neck" },
  { key: "hip", label: "Hip" },
  { key: "none", label: "None" },
];

const WEEK_OPTIONS = [4, 8, 12];

export default function WorkoutOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  // Step 1
  const [goal, setGoal] = useState("");

  // Step 2
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [bodyFat, setBodyFat] = useState(null);
  const [experience, setExperience] = useState("");

  // Step 3
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [injuries, setInjuries] = useState(new Set());

  // Step 4
  const [program, setProgram] = useState(null);

  // Step 5
  const [weekCount, setWeekCount] = useState(8);

  const totalSteps = 5;
  const progressPct = Math.round((step / (totalSteps - 1)) * 100);

  const toggleInjury = (key) => {
    setInjuries(prev => {
      const next = new Set(prev);
      if (key === "none") {
        return next.has("none") ? new Set() : new Set(["none"]);
      }
      next.delete("none");
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildProgram = () => {
    const bw = weight ? parseFloat(weight) : null;
    const prog = generateProgram({
      goal,
      daysPerWeek,
      experienceLevel: experience || "intermediate",
      bodyWeight: bw ? (weightUnit === "kg" ? bw : Math.round(bw * 0.4536)) : null,
      bodyFat: bodyFat || null,
      injuries: [...injuries],
      weekCount,
    });
    setProgram(prog);
    return prog;
  };

  const handleGoToPreview = () => {
    buildProgram();
    setStep(3);
  };

  const handleRegenerate = () => {
    buildProgram();
  };

  const handleGoToTimeline = () => {
    setStep(4);
  };

  const handleStart = () => {
    // Rebuild with final weekCount
    const finalProg = generateProgram({
      goal,
      daysPerWeek,
      experienceLevel: experience || "intermediate",
      bodyWeight: weight ? (weightUnit === "kg" ? parseFloat(weight) : Math.round(parseFloat(weight) * 0.4536)) : null,
      bodyFat: bodyFat || null,
      injuries: [...injuries],
      weekCount,
    });
    onComplete(finalProg);
  };

  // Compute phases for timeline preview
  const timelinePhases = useMemo(() => {
    if (!program) return [];
    // Re-generate phases for current weekCount
    const generatePhases = (wc) => {
      const range = (s, e) => { const r = []; for (let i = s; i <= e; i++) r.push(i); return r; };
      if (wc <= 4) return [{ name: "Training Block", weeks: range(1, wc), volumeMultiplier: 1.0 }];
      if (wc <= 8) return [
        { name: "Accumulation", weeks: range(1, 3), volumeMultiplier: 1.0 },
        { name: "Intensification", weeks: range(4, 6), volumeMultiplier: 1.1 },
        { name: "Peak", weeks: range(7, wc - 1), volumeMultiplier: 1.15 },
        { name: "Deload", weeks: [wc], volumeMultiplier: 0.6 },
      ];
      return [
        { name: "Accumulation", weeks: range(1, 4), volumeMultiplier: 1.0 },
        { name: "Intensification", weeks: range(5, 8), volumeMultiplier: 1.1 },
        { name: "Peak", weeks: range(9, wc - 1), volumeMultiplier: 1.15 },
        { name: "Deload", weeks: [wc], volumeMultiplier: 0.6 },
      ];
    };
    return generatePhases(weekCount);
  }, [program, weekCount]);

  // Volume summary for preview
  const volumeSummary = useMemo(() => {
    if (!program) return {};
    const summary = {};
    for (const day of program.days) {
      for (const ex of day.exercises || []) {
        // Derive muscle from the exercise pool mapping
        const muscle = deriveMuscle(ex.name);
        summary[muscle] = (summary[muscle] || 0) + ex.sets;
      }
    }
    return summary;
  }, [program]);

  return (
    <div className="woObOverlay">
      <style>{STYLES}</style>
      <div className="woObCard">
        {/* Progress bar */}
        {step > 0 && step < totalSteps - 1 && (
          <div className="woObProgress">
            <div className="woObProgressFill" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {/* Step 0: Goal Selection */}
        {step === 0 && (
          <div className="woObStep">
            <div className="woObStepNum">1 of {totalSteps}</div>
            <h1 className="woObTitle">What's your training goal?</h1>
            <p className="woObDesc">This determines your rep ranges, volume, and exercise selection.</p>
            <div className="woObGoalGrid">
              {GOALS.map(g => (
                <button
                  key={g.key}
                  className={`woObGoalCard ${goal === g.key ? "woObGoalCardActive" : ""}`}
                  onClick={() => setGoal(g.key)}
                  type="button"
                >
                  <div className="woObGoalEmoji">{g.emoji}</div>
                  <div className="woObGoalLabel">{g.label}</div>
                  <div className="woObGoalDesc">{g.desc}</div>
                </button>
              ))}
            </div>
            <div className="woObActions">
              <div />
              <button
                className="btn btnPrimary woObBtn"
                onClick={() => setStep(1)}
                disabled={!goal}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Your Stats */}
        {step === 1 && (
          <div className="woObStep">
            <div className="woObStepNum">2 of {totalSteps}</div>
            <h1 className="woObTitle">Your Stats</h1>
            <p className="woObDesc">Helps us calibrate volume and intensity for your level.</p>

            <div className="woObFormGroup">
              <label className="woObLabel">Body Weight</label>
              <div className="woObWeightRow">
                <input
                  className="woObInput"
                  type="number"
                  placeholder={weightUnit === "lbs" ? "185" : "84"}
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                />
                <div className="woObUnitToggle">
                  <button
                    className={`woObUnitBtn ${weightUnit === "lbs" ? "woObUnitBtnActive" : ""}`}
                    onClick={() => setWeightUnit("lbs")}
                    type="button"
                  >lbs</button>
                  <button
                    className={`woObUnitBtn ${weightUnit === "kg" ? "woObUnitBtnActive" : ""}`}
                    onClick={() => setWeightUnit("kg")}
                    type="button"
                  >kg</button>
                </div>
              </div>
            </div>

            <div className="woObFormGroup">
              <label className="woObLabel">Body Fat % <span className="woObOptional">(optional)</span></label>
              <div className="woObSliderRow">
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={bodyFat || 20}
                  onChange={e => setBodyFat(parseInt(e.target.value))}
                  className="woObSlider"
                />
                <span className="woObSliderVal">{bodyFat ? `${bodyFat}%` : "--"}</span>
              </div>
            </div>

            <div className="woObFormGroup">
              <label className="woObLabel">Experience Level</label>
              <div className="woObExpGrid">
                {EXPERIENCE_LEVELS.map(lvl => (
                  <button
                    key={lvl.key}
                    className={`woObExpCard ${experience === lvl.key ? "woObExpCardActive" : ""}`}
                    onClick={() => setExperience(lvl.key)}
                    type="button"
                  >
                    <div className="woObExpLabel">{lvl.label}</div>
                    <div className="woObExpDesc">{lvl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="woObActions">
              <button className="btn" onClick={() => setStep(0)} type="button">Back</button>
              <button
                className="btn btnPrimary woObBtn"
                onClick={() => setStep(2)}
                disabled={!experience}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Training Setup */}
        {step === 2 && (
          <div className="woObStep">
            <div className="woObStepNum">3 of {totalSteps}</div>
            <h1 className="woObTitle">Training Setup</h1>
            <p className="woObDesc">How often can you train, and any limitations?</p>

            <div className="woObFormGroup">
              <label className="woObLabel">Days Per Week</label>
              <div className="woObDaySelector">
                {[3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    className={`woObDayBtn ${daysPerWeek === d ? "woObDayBtnActive" : ""}`}
                    onClick={() => setDaysPerWeek(d)}
                    type="button"
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="woObSplitPreview">
                {daysPerWeek === 3 && "Full Body (A/B/C)"}
                {daysPerWeek === 4 && "Upper / Lower"}
                {daysPerWeek === 5 && "Upper / Lower / Push / Pull / Legs"}
                {daysPerWeek === 6 && "Push / Pull / Legs x2"}
              </div>
            </div>

            <div className="woObFormGroup">
              <label className="woObLabel">Injuries / Limitations</label>
              <div className="woObInjuryGrid">
                {INJURY_OPTIONS.map(inj => (
                  <button
                    key={inj.key}
                    className={`woObInjuryChip ${injuries.has(inj.key) ? "woObInjuryChipActive" : ""}`}
                    onClick={() => toggleInjury(inj.key)}
                    type="button"
                  >
                    {injuries.has(inj.key) ? "\u2713 " : ""}{inj.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="woObActions">
              <button className="btn" onClick={() => setStep(1)} type="button">Back</button>
              <button className="btn btnPrimary woObBtn" onClick={handleGoToPreview} type="button">
                Generate Program
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Program Preview */}
        {step === 3 && program && (
          <div className="woObStep">
            <div className="woObStepNum">4 of {totalSteps}</div>
            <h1 className="woObTitle">Your Program</h1>
            <p className="woObDesc">{program.split} &mdash; {GOALS.find(g => g.key === goal)?.label || goal}</p>

            <div className="woObScheduleScroll">
              <div className="woObSchedule">
                {program.days.map((day, i) => (
                  <div key={i} className={`woObDayCard ${day.exercises.length === 0 ? "woObDayCardRest" : ""}`}>
                    <div className="woObDayHeader">
                      <span className="woObDayTitle">{day.title}</span>
                      <span className="woObDaySubtitle">{day.subtitle}</span>
                    </div>
                    {day.exercises.length > 0 && (
                      <div className="woObExList">
                        {day.exercises.map((ex, j) => (
                          <div key={j} className="woObExRow">
                            <span className="woObExName">{ex.name}</span>
                            <span className="woObExDetail">{ex.sets} x {ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="woObVolumeSection">
              <div className="woObVolTitle">Weekly Volume (sets per muscle)</div>
              <div className="woObVolGrid">
                {Object.entries(volumeSummary).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([muscle, sets]) => (
                  <div key={muscle} className="woObVolItem">
                    <span className="woObVolMuscle">{formatMuscle(muscle)}</span>
                    <div className="woObVolBar">
                      <div className="woObVolBarFill" style={{ width: `${Math.min(100, (sets / 20) * 100)}%` }} />
                    </div>
                    <span className="woObVolSets">{sets}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="woObActions">
              <button className="btn" onClick={() => setStep(2)} type="button">Back</button>
              <button className="btn woObBtnSecondary" onClick={handleRegenerate} type="button">
                Regenerate
              </button>
              <button className="btn btnPrimary woObBtn" onClick={handleGoToTimeline} type="button">
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Timeline */}
        {step === 4 && (
          <div className="woObStep">
            <div className="woObStepNum">5 of {totalSteps}</div>
            <h1 className="woObTitle">Program Timeline</h1>
            <p className="woObDesc">Choose your program length and see the training phases.</p>

            <div className="woObFormGroup">
              <label className="woObLabel">Program Length</label>
              <div className="woObWeekSelector">
                {WEEK_OPTIONS.map(w => (
                  <button
                    key={w}
                    className={`woObWeekBtn ${weekCount === w ? "woObWeekBtnActive" : ""}`}
                    onClick={() => setWeekCount(w)}
                    type="button"
                  >
                    {w} weeks
                  </button>
                ))}
              </div>
            </div>

            <div className="woObPhaseViz">
              {timelinePhases.map((phase, i) => {
                const widthPct = (phase.weeks.length / weekCount) * 100;
                return (
                  <div key={i} className="woObPhaseBlock" style={{ width: `${widthPct}%` }}>
                    <div className={`woObPhaseBar woObPhaseBar${i}`}>
                      <span className="woObPhaseName">{phase.name}</span>
                    </div>
                    <div className="woObPhaseWeeks">
                      {phase.weeks.length === 1 ? `Week ${phase.weeks[0]}` : `Weeks ${phase.weeks[0]}-${phase.weeks[phase.weeks.length - 1]}`}
                    </div>
                    <div className="woObPhaseMult">
                      {phase.volumeMultiplier === 0.6 ? "60% volume" : phase.volumeMultiplier === 1.0 ? "Base volume" : `${Math.round(phase.volumeMultiplier * 100)}% volume`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="woObTimelineSummary">
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Split</span>
                <span className="woObSummaryVal">{program?.split}</span>
              </div>
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Goal</span>
                <span className="woObSummaryVal">{GOALS.find(g => g.key === goal)?.label}</span>
              </div>
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Duration</span>
                <span className="woObSummaryVal">{weekCount} weeks</span>
              </div>
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Frequency</span>
                <span className="woObSummaryVal">{daysPerWeek}x / week</span>
              </div>
            </div>

            <div className="woObActions">
              <button className="btn" onClick={() => setStep(3)} type="button">Back</button>
              <button className="btn btnPrimary woObBtn woObBtnLarge" onClick={handleStart} type="button">
                Start Program
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatMuscle(key) {
  const map = {
    chest: "Chest", back: "Back", quads: "Quads", hamstrings: "Hamstrings",
    glutes: "Glutes", lateral_delts: "Lateral Delts", biceps: "Biceps",
    triceps: "Triceps", abs: "Abs", calves: "Calves", shoulders: "Shoulders",
    unknown: "Other",
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function deriveMuscle(exerciseName) {
  const n = exerciseName.toLowerCase();
  if (n.includes("bench") || n.includes("chest") || n.includes("fly") || n.includes("pec")) return "chest";
  if (n.includes("pull up") || n.includes("pulldown") || n.includes("row") || n.includes("lat ")) return "back";
  if (n.includes("squat") || n.includes("leg press") || n.includes("leg extension") || n.includes("lunge")) return "quads";
  if (n.includes("deadlift") || n.includes("leg curl") || n.includes("hamstring") || n.includes("nordic")) return "hamstrings";
  if (n.includes("hip thrust") || n.includes("glute") || n.includes("pull through")) return "glutes";
  if (n.includes("lateral raise") || n.includes("overhead press") || n.includes("upright row")) return "lateral_delts";
  if (n.includes("curl") && !n.includes("leg curl") && !n.includes("nordic")) return "biceps";
  if (n.includes("tricep") || n.includes("pushdown") || n.includes("skull") || n.includes("dip") || n.includes("close grip")) return "triceps";
  if (n.includes("crunch") || n.includes("ab ") || n.includes("leg raise") || n.includes("plank")) return "abs";
  if (n.includes("calf")) return "calves";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Styles (scoped with woOb prefix)
// ---------------------------------------------------------------------------
const STYLES = `
.woObOverlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #f6f1e8 0%, #ede6d8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  overflow-y: auto;
}
[data-theme="dark"] .woObOverlay {
  background: linear-gradient(135deg, #0b0b10 0%, #0f0f16 100%);
}

.woObCard {
  background: #fbf7f0;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
  max-width: 680px;
  width: 100%;
  padding: 40px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}
[data-theme="dark"] .woObCard {
  background: #16161e;
  box-shadow: 0 8px 40px rgba(0,0,0,0.3);
}

.woObProgress {
  height: 3px;
  background: #e8e0d4;
  border-radius: 3px;
  margin-bottom: 28px;
  overflow: hidden;
}
[data-theme="dark"] .woObProgress {
  background: #2a2a36;
}
.woObProgressFill {
  height: 100%;
  background: #5B7CF5;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.woObStep {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.woObStepNum {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #9a9080;
  margin-bottom: 8px;
  font-weight: 600;
}

.woObTitle {
  font-size: 24px;
  font-weight: 700;
  color: #2d2a26;
  margin: 0 0 8px;
}
[data-theme="dark"] .woObTitle {
  color: #e8e0d4;
}

.woObDesc {
  font-size: 14px;
  color: #7a7060;
  margin: 0 0 24px;
  max-width: 440px;
  line-height: 1.5;
}
[data-theme="dark"] .woObDesc {
  color: #9a9080;
}

/* Goal cards */
.woObGoalGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 24px;
}
.woObGoalGrid > :nth-child(4),
.woObGoalGrid > :nth-child(5) {
  /* Center last row of 2 items */
}
.woObGoalCard {
  background: #fff;
  border: 2px solid #e8e0d4;
  border-radius: 14px;
  padding: 20px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
[data-theme="dark"] .woObGoalCard {
  background: #1e1e28;
  border-color: #2a2a36;
}
.woObGoalCard:hover {
  border-color: #5B7CF5;
  transform: translateY(-1px);
}
.woObGoalCardActive {
  border-color: #5B7CF5;
  background: #f0f4ff;
  box-shadow: 0 0 0 3px rgba(91, 124, 245, 0.15);
}
[data-theme="dark"] .woObGoalCardActive {
  background: #1a1f36;
}
.woObGoalEmoji { font-size: 32px; margin-bottom: 8px; }
.woObGoalLabel { font-size: 14px; font-weight: 600; color: #2d2a26; margin-bottom: 4px; }
[data-theme="dark"] .woObGoalLabel { color: #e8e0d4; }
.woObGoalDesc { font-size: 11px; color: #9a9080; line-height: 1.4; }

/* Actions */
.woObActions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
  margin-top: 8px;
}
.woObBtn {
  padding: 12px 32px;
  font-size: 15px;
}
.woObBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.woObBtnSecondary {
  background: #e8e0d4;
  color: #5a5040;
}
[data-theme="dark"] .woObBtnSecondary {
  background: #2a2a36;
  color: #c0b8a8;
}
.woObBtnLarge {
  padding: 14px 40px;
  font-size: 16px;
}

/* Form elements */
.woObFormGroup {
  width: 100%;
  text-align: left;
  margin-bottom: 20px;
}
.woObLabel {
  font-size: 13px;
  font-weight: 600;
  color: #5a5040;
  margin-bottom: 8px;
  display: block;
}
[data-theme="dark"] .woObLabel {
  color: #c0b8a8;
}
.woObOptional {
  font-weight: 400;
  color: #b0a890;
  font-size: 12px;
}
.woObInput {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e8e0d4;
  border-radius: 10px;
  background: #fff;
  font-size: 15px;
  color: #2d2a26;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
[data-theme="dark"] .woObInput {
  background: #1e1e28;
  border-color: #2a2a36;
  color: #e8e0d4;
}
.woObInput:focus {
  border-color: #5B7CF5;
}
.woObWeightRow {
  display: flex;
  gap: 10px;
  align-items: center;
}
.woObWeightRow .woObInput { flex: 1; }
.woObUnitToggle {
  display: flex;
  border: 2px solid #e8e0d4;
  border-radius: 10px;
  overflow: hidden;
}
[data-theme="dark"] .woObUnitToggle { border-color: #2a2a36; }
.woObUnitBtn {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
  border: none;
  color: #7a7060;
  transition: all 0.15s;
}
[data-theme="dark"] .woObUnitBtn { background: #1e1e28; color: #9a9080; }
.woObUnitBtnActive {
  background: #5B7CF5;
  color: #fff;
}

/* Slider */
.woObSliderRow {
  display: flex;
  align-items: center;
  gap: 12px;
}
.woObSlider {
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #e8e0d4;
  outline: none;
}
[data-theme="dark"] .woObSlider { background: #2a2a36; }
.woObSlider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #5B7CF5;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(91,124,245,0.3);
}
.woObSliderVal {
  font-size: 15px;
  font-weight: 600;
  color: #5B7CF5;
  min-width: 36px;
  text-align: center;
}

/* Experience cards */
.woObExpGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.woObExpCard {
  background: #fff;
  border: 2px solid #e8e0d4;
  border-radius: 12px;
  padding: 16px 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
[data-theme="dark"] .woObExpCard { background: #1e1e28; border-color: #2a2a36; }
.woObExpCard:hover { border-color: #5B7CF5; }
.woObExpCardActive {
  border-color: #5B7CF5;
  background: #f0f4ff;
  box-shadow: 0 0 0 3px rgba(91,124,245,0.15);
}
[data-theme="dark"] .woObExpCardActive { background: #1a1f36; }
.woObExpLabel { font-size: 14px; font-weight: 600; color: #2d2a26; margin-bottom: 4px; }
[data-theme="dark"] .woObExpLabel { color: #e8e0d4; }
.woObExpDesc { font-size: 11px; color: #9a9080; line-height: 1.3; }

/* Day selector */
.woObDaySelector {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.woObDayBtn {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  border: 2px solid #e8e0d4;
  background: #fff;
  font-size: 18px;
  font-weight: 700;
  color: #2d2a26;
  cursor: pointer;
  transition: all 0.15s;
}
[data-theme="dark"] .woObDayBtn { background: #1e1e28; border-color: #2a2a36; color: #e8e0d4; }
.woObDayBtn:hover { border-color: #5B7CF5; }
.woObDayBtnActive {
  background: #5B7CF5;
  border-color: #5B7CF5;
  color: #fff;
}
.woObSplitPreview {
  font-size: 13px;
  color: #5B7CF5;
  font-weight: 600;
}

/* Injuries */
.woObInjuryGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.woObInjuryChip {
  padding: 8px 16px;
  border-radius: 20px;
  border: 2px solid #e8e0d4;
  background: #fff;
  font-size: 13px;
  color: #5a5040;
  cursor: pointer;
  transition: all 0.15s;
}
[data-theme="dark"] .woObInjuryChip { background: #1e1e28; border-color: #2a2a36; color: #c0b8a8; }
.woObInjuryChip:hover { border-color: #5B7CF5; }
.woObInjuryChipActive {
  border-color: #5B7CF5;
  background: #f0f4ff;
  color: #5B7CF5;
  font-weight: 600;
}
[data-theme="dark"] .woObInjuryChipActive { background: #1a1f36; }

/* Program preview */
.woObScheduleScroll {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 4px;
}
.woObSchedule {
  display: flex;
  gap: 10px;
  min-width: max-content;
}
.woObDayCard {
  background: #fff;
  border: 1px solid #e8e0d4;
  border-radius: 12px;
  padding: 14px;
  min-width: 160px;
  max-width: 180px;
  text-align: left;
}
[data-theme="dark"] .woObDayCard { background: #1e1e28; border-color: #2a2a36; }
.woObDayCardRest {
  opacity: 0.5;
  min-width: 100px;
}
.woObDayHeader {
  margin-bottom: 10px;
}
.woObDayTitle {
  font-size: 14px;
  font-weight: 700;
  color: #2d2a26;
  display: block;
}
[data-theme="dark"] .woObDayTitle { color: #e8e0d4; }
.woObDaySubtitle {
  font-size: 11px;
  color: #9a9080;
}
.woObExList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.woObExRow {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.woObExName {
  font-size: 11px;
  color: #5a5040;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-theme="dark"] .woObExName { color: #b0a890; }
.woObExDetail {
  font-size: 11px;
  color: #5B7CF5;
  font-weight: 600;
  white-space: nowrap;
}

/* Volume summary */
.woObVolumeSection {
  width: 100%;
  margin-bottom: 16px;
}
.woObVolTitle {
  font-size: 13px;
  font-weight: 600;
  color: #5a5040;
  margin-bottom: 10px;
  text-align: left;
}
[data-theme="dark"] .woObVolTitle { color: #c0b8a8; }
.woObVolGrid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.woObVolItem {
  display: flex;
  align-items: center;
  gap: 10px;
}
.woObVolMuscle {
  font-size: 12px;
  color: #5a5040;
  width: 90px;
  text-align: right;
  flex-shrink: 0;
}
[data-theme="dark"] .woObVolMuscle { color: #b0a890; }
.woObVolBar {
  flex: 1;
  height: 8px;
  background: #e8e0d4;
  border-radius: 4px;
  overflow: hidden;
}
[data-theme="dark"] .woObVolBar { background: #2a2a36; }
.woObVolBarFill {
  height: 100%;
  background: linear-gradient(90deg, #5B7CF5, #7B9CFF);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.woObVolSets {
  font-size: 12px;
  font-weight: 700;
  color: #5B7CF5;
  min-width: 24px;
}

/* Timeline / Phases */
.woObWeekSelector {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.woObWeekBtn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid #e8e0d4;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: #2d2a26;
  cursor: pointer;
  transition: all 0.15s;
}
[data-theme="dark"] .woObWeekBtn { background: #1e1e28; border-color: #2a2a36; color: #e8e0d4; }
.woObWeekBtn:hover { border-color: #5B7CF5; }
.woObWeekBtnActive {
  background: #5B7CF5;
  border-color: #5B7CF5;
  color: #fff;
}

.woObPhaseViz {
  display: flex;
  gap: 4px;
  width: 100%;
  margin-bottom: 24px;
}
.woObPhaseBlock {
  text-align: center;
  min-width: 0;
}
.woObPhaseBar {
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}
.woObPhaseBar0 { background: linear-gradient(135deg, #5B7CF5, #7B9CFF); }
.woObPhaseBar1 { background: linear-gradient(135deg, #F59B5B, #F5B87B); }
.woObPhaseBar2 { background: linear-gradient(135deg, #E55B7C, #F57B9C); }
.woObPhaseBar3 { background: linear-gradient(135deg, #5BC57C, #7BD5A0); }
.woObPhaseName {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.15);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 6px;
}
.woObPhaseWeeks {
  font-size: 10px;
  color: #9a9080;
  font-weight: 600;
}
.woObPhaseMult {
  font-size: 10px;
  color: #b0a890;
}

/* Timeline summary */
.woObTimelineSummary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  margin-bottom: 20px;
}
.woObSummaryItem {
  background: #fff;
  border: 1px solid #e8e0d4;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
}
[data-theme="dark"] .woObSummaryItem { background: #1e1e28; border-color: #2a2a36; }
.woObSummaryLabel {
  font-size: 11px;
  color: #9a9080;
  display: block;
  margin-bottom: 2px;
}
.woObSummaryVal {
  font-size: 14px;
  font-weight: 700;
  color: #2d2a26;
}
[data-theme="dark"] .woObSummaryVal { color: #e8e0d4; }
`;
