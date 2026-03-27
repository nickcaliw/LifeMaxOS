import { useState, useMemo, useEffect, useCallback } from "react";
import { generateProgram } from "../lib/programBuilder.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GOALS = [
  { key: "hypertrophy", label: "Build Muscle", emoji: "\u{1F4AA}", desc: "Maximize muscle growth with progressive overload" },
  { key: "fat_loss", label: "Lose Fat", emoji: "\u{1F525}", desc: "Burn fat while preserving lean muscle mass" },
  { key: "recomp", label: "Recomp", emoji: "\u26A1", desc: "Build muscle and lose fat simultaneously" },
  { key: "strength", label: "Build Strength", emoji: "\u{1F3CB}\uFE0F", desc: "Get stronger on the big compound lifts" },
  { key: "athletic", label: "Athletic Performance", emoji: "\u{1F3C3}", desc: "Improve power, speed, and conditioning" },
  { key: "general", label: "General Fitness", emoji: "\u2764\uFE0F", desc: "Stay healthy, move well, look and feel good" },
];

const TARGET_OPTIONS = {
  hypertrophy: [
    "Gain lean muscle overall",
    "Focus on upper body",
    "Focus on shoulders & arms",
    "Focus on chest & back",
    "Focus on legs & glutes",
  ],
  fat_loss: [
    "Lose 5-10 lbs",
    "Lose 10-20 lbs",
    "Lose 20+ lbs",
    "Get leaner / more defined",
  ],
  strength: [
    "Improve squat",
    "Improve bench",
    "Improve deadlift",
    "Improve all compounds",
  ],
  recomp: [
    "Look better",
    "Feel stronger",
    "Improve endurance",
  ],
  athletic: [
    "Look better",
    "Feel stronger",
    "Improve endurance",
  ],
  general: [
    "Look better",
    "Feel stronger",
    "Improve endurance",
  ],
};

const TIMELINE_OPTIONS = [
  { weeks: 4, label: "4 weeks", sub: "Quick block" },
  { weeks: 8, label: "8 weeks", sub: "Standard cycle" },
  { weeks: 12, label: "12 weeks", sub: "Full transformation", recommended: true },
  { weeks: 16, label: "16 weeks", sub: "Deep build" },
  { weeks: 0, label: "Ongoing", sub: "No end date" },
];

const PHASE_PREVIEW = {
  4: "A focused training block. Great for a quick cut or strength peaking cycle.",
  8: "Two mesocycles with a deload. The classic approach for steady progress.",
  12: "Three mesocycles with progressive overload and strategic deloads. Enough time for real change.",
  16: "Four mesocycles for deep adaptation. Best for ambitious transformations.",
  0: "Open-ended training with auto-regulated deloads every 4-6 weeks.",
};

const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Beginner", desc: "Less than 1 year of consistent training", emoji: "\u{1F331}" },
  { key: "intermediate", label: "Intermediate", desc: "1-3 years of structured training", emoji: "\u{1F4AA}" },
  { key: "advanced", label: "Advanced", desc: "3+ years with periodization experience", emoji: "\u{1F3C6}" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SESSION_DURATIONS = [30, 45, 60, 75, 90];

const TIME_PREFS = ["Morning", "Afternoon", "Evening", "No preference"];

const EQUIPMENT_OPTIONS = [
  { key: "full_gym", label: "Full Gym", emoji: "\u{1F3CB}\uFE0F" },
  { key: "home_gym", label: "Home Gym", emoji: "\u{1F3E0}" },
  { key: "dumbbells", label: "Dumbbells Only", emoji: "\u{1F4AA}" },
  { key: "machines", label: "Machines Only", emoji: "\u2699\uFE0F" },
  { key: "bodyweight", label: "Bodyweight Only", emoji: "\u{1F9D8}" },
  { key: "bands", label: "Resistance Bands", emoji: "\u{1F4CF}" },
  { key: "kettlebells", label: "Kettlebells", emoji: "\u{1F514}" },
];

const INJURY_AREAS = [
  { key: "lower_back", label: "Lower Back" },
  { key: "shoulder", label: "Shoulder" },
  { key: "knee", label: "Knee" },
  { key: "wrist", label: "Wrist" },
  { key: "neck", label: "Neck" },
  { key: "hip", label: "Hip" },
  { key: "elbow", label: "Elbow" },
  { key: "ankle", label: "Ankle" },
];

const SEVERITY_LEVELS = ["Mild", "Moderate", "Severe"];

const STRESS_LABELS = ["Very Low", "Low", "Moderate", "High", "Very High"];

const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary", desc: "Desk job, minimal movement" },
  { key: "light", label: "Lightly Active", desc: "Some walking, light activity" },
  { key: "moderate", label: "Moderately Active", desc: "Regular activity, on your feet" },
  { key: "very", label: "Very Active", desc: "Physical job or very active lifestyle" },
];

const LOADING_STEPS = [
  { text: "Selecting your training split...", delay: 500 },
  { text: "Choosing exercises...", delay: 800 },
  { text: "Setting volume targets...", delay: 500 },
  { text: "Building your weekly schedule...", delay: 700 },
  { text: "Mapping your timeline...", delay: 600 },
];

const TOTAL_SCREENS = 9;

// Default preferred days based on count
function defaultDays(count) {
  const maps = {
    2: [0, 3],           // Mon, Thu
    3: [0, 2, 4],        // Mon, Wed, Fri
    4: [0, 1, 3, 4],     // Mon, Tue, Thu, Fri
    5: [0, 1, 2, 3, 4],  // Mon-Fri
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return new Set(maps[count] || maps[4]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WorkoutOnboarding({ onComplete, onCancel }) {
  const [screen, setScreen] = useState(0);

  // Screen 1: Goal
  const [goal, setGoal] = useState("");

  // Screen 2: Target
  const [target, setTarget] = useState("");
  const [customTarget, setCustomTarget] = useState("");

  // Screen 3: Timeline
  const [timelineWeeks, setTimelineWeeks] = useState(12);

  // Screen 3: About You (body stats + experience)
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");
  const [experience, setExperience] = useState("");
  const [previousProgram, setPreviousProgram] = useState("");

  // Screen 4: Schedule
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [preferredDays, setPreferredDays] = useState(defaultDays(4));
  const [sessionDuration, setSessionDuration] = useState(60);
  const [preferredTime, setPreferredTime] = useState("No preference");
  const [exercisesPerSession, setExercisesPerSession] = useState(6);

  // Screen 6: Equipment & Limitations
  const [equipment, setEquipment] = useState(new Set(["full_gym"]));
  const [injuries, setInjuries] = useState([]); // [{area, severity}]
  const [showLimitations, setShowLimitations] = useState(false);
  const [avoidExercises, setAvoidExercises] = useState([]);
  const [avoidInput, setAvoidInput] = useState("");
  const [movementPrefs, setMovementPrefs] = useState([]);
  const [movementInput, setMovementInput] = useState("");

  // Screen 7: Recovery
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState(3);
  const [activityLevel, setActivityLevel] = useState("moderate");

  // Screen 8: Loading
  const [loadingStep, setLoadingStep] = useState(0);
  const [program, setProgram] = useState(null);

  // Progress
  const progressPct = Math.round((screen / (TOTAL_SCREENS - 1)) * 100);

  // Resolved target value
  const resolvedTarget = target === "__custom__" ? customTarget : target;

  // Sync preferred days when daysPerWeek changes
  const handleDaysPerWeekChange = useCallback((val) => {
    setDaysPerWeek(val);
    setPreferredDays(defaultDays(val));
  }, []);

  // Toggle a preferred day
  const toggleDay = useCallback((dayIdx) => {
    setPreferredDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIdx)) {
        next.delete(dayIdx);
      } else {
        next.add(dayIdx);
      }
      return next;
    });
  }, []);

  // Toggle equipment
  const toggleEquipment = useCallback((key) => {
    setEquipment(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Injury management
  const addInjury = useCallback((area) => {
    setInjuries(prev => {
      if (prev.find(i => i.area === area)) {
        return prev.filter(i => i.area !== area);
      }
      return [...prev, { area, severity: "Mild" }];
    });
  }, []);

  const updateInjurySeverity = useCallback((area, severity) => {
    setInjuries(prev => prev.map(i => i.area === area ? { ...i, severity } : i));
  }, []);

  // Tag input handlers
  const handleAvoidKeyDown = useCallback((e) => {
    if (e.key === "Enter" && avoidInput.trim()) {
      e.preventDefault();
      setAvoidExercises(prev => [...prev, avoidInput.trim()]);
      setAvoidInput("");
    }
  }, [avoidInput]);

  const removeAvoid = useCallback((idx) => {
    setAvoidExercises(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleMovementKeyDown = useCallback((e) => {
    if (e.key === "Enter" && movementInput.trim()) {
      e.preventDefault();
      setMovementPrefs(prev => [...prev, movementInput.trim()]);
      setMovementInput("");
    }
  }, [movementInput]);

  const removeMovementPref = useCallback((idx) => {
    setMovementPrefs(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Reset target when goal changes
  useEffect(() => {
    setTarget("");
    setCustomTarget("");
  }, [goal]);

  // Loading screen animation
  useEffect(() => {
    if (screen !== 7) return;
    setLoadingStep(0);
    let currentStep = 0;
    let totalDelay = 0;

    const timeouts = LOADING_STEPS.map((s, i) => {
      totalDelay += s.delay;
      return setTimeout(() => {
        setLoadingStep(i + 1);
      }, totalDelay);
    });

    // Generate program after all loading steps
    const finalTimeout = setTimeout(() => {
      const goalKey = goal === "general" ? "hypertrophy" : goal;
      const injuryKeys = injuries.map(i => i.area);
      const heightInches = (Number(heightFt) || 0) * 12 + (Number(heightIn) || 0);
      const prog = generateProgram({
        goal: goalKey,
        daysPerWeek,
        experienceLevel: experience || "intermediate",
        bodyWeight: Number(bodyWeight) || null,
        bodyFat: null,
        injuries: injuryKeys,
        weekCount: timelineWeeks || 12,
        age: Number(age) || null,
        sex: sex || "male",
        heightInches: heightInches || null,
        maxExercisesPerSession: exercisesPerSession,
        sessionDurationTarget: sessionDuration,
        equipment: [...equipment],
      });
      setProgram(prog);
      setTimeout(() => setScreen(8), 400);
    }, totalDelay + 400);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finalTimeout);
    };
  }, [screen, goal, daysPerWeek, experience, injuries, timelineWeeks, age, sex, heightFt, heightIn, bodyWeight, exercisesPerSession, sessionDuration, equipment]);

  // Navigation
  const goNext = useCallback(() => setScreen(s => s + 1), []);
  const goBack = useCallback(() => setScreen(s => s - 1), []);

  // Can advance from each screen?
  const canAdvance = useMemo(() => {
    switch (screen) {
      case 0: return !!goal;
      case 1: return !!(target === "__custom__" ? customTarget.trim() : target);
      case 2: return timelineWeeks !== null && timelineWeeks !== undefined;
      case 3: return !!experience;
      case 4: return daysPerWeek >= 2 && daysPerWeek <= 7;
      case 5: return equipment.size > 0;
      case 6: return true;
      default: return true;
    }
  }, [screen, goal, target, customTarget, timelineWeeks, experience, daysPerWeek, equipment]);

  // Split preview text
  const splitPreview = useMemo(() => {
    if (daysPerWeek === 2) return "Full Body (2x)";
    if (daysPerWeek === 3) return "Full Body (A/B/C)";
    if (daysPerWeek === 4) return "Upper / Lower";
    if (daysPerWeek === 5) return "Upper / Lower / Push / Pull / Legs";
    if (daysPerWeek === 6) return "Push / Pull / Legs x2";
    if (daysPerWeek === 7) return "Full Body + Specialization";
    return "";
  }, [daysPerWeek]);

  // Volume summary for plan summary screen
  const volumeSummary = useMemo(() => {
    if (!program) return {};
    const summary = {};
    for (const day of program.days) {
      for (const ex of day.exercises || []) {
        const muscle = deriveMuscle(ex.name);
        summary[muscle] = (summary[muscle] || 0) + ex.sets;
      }
    }
    return summary;
  }, [program]);

  // Timeline phases for summary
  const timelinePhases = useMemo(() => {
    const wc = timelineWeeks || 12;
    if (wc === 0) return [{ name: "Ongoing", weeks: [1, 2, 3, 4], volumeMultiplier: 1.0 }];
    return generatePhases(wc);
  }, [timelineWeeks]);

  // Handle final start
  const handleStart = useCallback(() => {
    onComplete({
      goal,
      target: resolvedTarget,
      timelineWeeks,
      experience,
      previousProgram,
      bodyStats: {
        age: Number(age) || null,
        sex,
        heightFt: Number(heightFt) || null,
        heightIn: Number(heightIn) || null,
        weight: Number(bodyWeight) || null,
      },
      schedule: {
        daysPerWeek,
        preferredDays: [...preferredDays].sort(),
        sessionDuration,
        preferredTime,
        exercisesPerSession,
      },
      equipment: [...equipment],
      limitations: {
        injuries,
        avoidExercises,
        movementPrefs,
      },
      recovery: {
        sleepHours,
        stressLevel,
        activityLevel,
      },
      program,
    });
  }, [goal, resolvedTarget, timelineWeeks, experience, previousProgram, daysPerWeek, preferredDays, sessionDuration, preferredTime, equipment, injuries, avoidExercises, movementPrefs, sleepHours, stressLevel, activityLevel, program, onComplete]);

  // Handle customize (go back to screen 0 with values preserved)
  const handleCustomize = useCallback(() => {
    setScreen(0);
  }, []);

  // Target options for current goal
  const currentTargetOptions = TARGET_OPTIONS[goal] || TARGET_OPTIONS.general;

  return (
    <div className="woObOverlay">
      <style>{STYLES}</style>
      <div className="woObCard">
        {/* Close button */}
        {onCancel && (
          <button className="woObClose" onClick={onCancel} type="button" title="Cancel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
        {/* Progress bar - show on screens 0-6 */}
        {screen <= 6 && (
          <div className="woObProgress">
            <div className="woObProgressFill" style={{ width: `${Math.round((screen / 6) * 100)}%` }} />
          </div>
        )}

        {/* ============================================================
           Screen 0: Goal Selection
           ============================================================ */}
        {screen === 0 && (
          <div className="woObStep">
            <div className="woObStepNum">1 of 7</div>
            <h1 className="woObTitle">What are you training for?</h1>
            <p className="woObDesc">This shapes your entire program -- rep ranges, volume, exercise selection, and periodization.</p>
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
                className="woObBtnPrimary"
                onClick={goNext}
                disabled={!canAdvance}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 1: Target Outcome
           ============================================================ */}
        {screen === 1 && (
          <div className="woObStep">
            <div className="woObStepNum">2 of 7</div>
            <h1 className="woObTitle">What does success look like?</h1>
            <p className="woObDesc">Define your ideal outcome so we can tailor the plan to get you there.</p>
            <div className="woObTargetList">
              {currentTargetOptions.map(opt => (
                <button
                  key={opt}
                  className={`woObTargetCard ${target === opt ? "woObTargetCardActive" : ""}`}
                  onClick={() => { setTarget(opt); setCustomTarget(""); }}
                  type="button"
                >
                  <span className="woObTargetCheck">{target === opt ? "\u2713" : ""}</span>
                  <span>{opt}</span>
                </button>
              ))}
              <button
                className={`woObTargetCard ${target === "__custom__" ? "woObTargetCardActive" : ""}`}
                onClick={() => setTarget("__custom__")}
                type="button"
              >
                <span className="woObTargetCheck">{target === "__custom__" ? "\u2713" : ""}</span>
                <span>Custom</span>
              </button>
            </div>
            {target === "__custom__" && (
              <input
                className="woObInput woObCustomInput"
                type="text"
                placeholder="Describe your goal..."
                value={customTarget}
                onChange={e => setCustomTarget(e.target.value)}
                autoFocus
              />
            )}
            <div className="woObActions">
              <button className="woObBtnBack" onClick={goBack} type="button">Back</button>
              <button
                className="woObBtnPrimary"
                onClick={goNext}
                disabled={!canAdvance}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 2: Timeline
           ============================================================ */}
        {screen === 2 && (
          <div className="woObStep">
            <div className="woObStepNum">3 of 7</div>
            <h1 className="woObTitle">How long do you want this plan to run?</h1>
            <p className="woObDesc">Choose a timeline that fits your commitment level.</p>
            <div className="woObTimelinePills">
              {TIMELINE_OPTIONS.map(opt => (
                <button
                  key={opt.weeks}
                  className={`woObTimelinePill ${timelineWeeks === opt.weeks ? "woObTimelinePillActive" : ""}`}
                  onClick={() => setTimelineWeeks(opt.weeks)}
                  type="button"
                >
                  <span className="woObTimelinePillLabel">{opt.label}</span>
                  <span className="woObTimelinePillSub">{opt.sub}</span>
                  {opt.recommended && <span className="woObBadge">Recommended</span>}
                </button>
              ))}
            </div>
            {PHASE_PREVIEW[timelineWeeks] != null && (
              <div className="woObPhasePreviewText">{PHASE_PREVIEW[timelineWeeks]}</div>
            )}
            <div className="woObActions">
              <button className="woObBtnBack" onClick={goBack} type="button">Back</button>
              <button
                className="woObBtnPrimary"
                onClick={goNext}
                disabled={!canAdvance}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 3: Experience & History
           ============================================================ */}
        {screen === 3 && (
          <div className="woObStep woObStepLeft">
            <div className="woObStepNum">4 of 7</div>
            <h1 className="woObTitle">Tell us about you</h1>
            <p className="woObDesc">Your program is built around your body and experience level.</p>

            {/* Body stats row */}
            <div className="woObBodyGrid">
              <div className="woObFormGroup">
                <label className="woObLabel">Age</label>
                <input className="woObInput" type="number" placeholder="25" min="13" max="99"
                  value={age} onChange={e => setAge(e.target.value)} />
              </div>
              <div className="woObFormGroup">
                <label className="woObLabel">Sex</label>
                <div className="woObSexBtns">
                  <button className={`woObSexBtn ${sex === "male" ? "woObSexBtnActive" : ""}`}
                    onClick={() => setSex("male")} type="button">Male</button>
                  <button className={`woObSexBtn ${sex === "female" ? "woObSexBtnActive" : ""}`}
                    onClick={() => setSex("female")} type="button">Female</button>
                </div>
              </div>
              <div className="woObFormGroup">
                <label className="woObLabel">Height</label>
                <div className="woObHeightRow">
                  <input className="woObInput woObInputSmall" type="number" placeholder="5" min="3" max="8"
                    value={heightFt} onChange={e => setHeightFt(e.target.value)} />
                  <span className="woObUnit">ft</span>
                  <input className="woObInput woObInputSmall" type="number" placeholder="10" min="0" max="11"
                    value={heightIn} onChange={e => setHeightIn(e.target.value)} />
                  <span className="woObUnit">in</span>
                </div>
              </div>
              <div className="woObFormGroup">
                <label className="woObLabel">Weight (lbs)</label>
                <input className="woObInput" type="number" placeholder="170" min="60" max="500"
                  value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} />
              </div>
            </div>

            {/* Experience level */}
            <div className="woObFormGroup">
              <label className="woObLabel">Training experience</label>
              <div className="woObExpGrid">
                {EXPERIENCE_LEVELS.map(lvl => (
                  <button
                    key={lvl.key}
                    className={`woObExpCard ${experience === lvl.key ? "woObExpCardActive" : ""}`}
                    onClick={() => setExperience(lvl.key)}
                    type="button"
                  >
                    <div className="woObExpEmoji">{lvl.emoji}</div>
                    <div className="woObExpLabel">{lvl.label}</div>
                    <div className="woObExpDesc">{lvl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="woObFormGroup">
              <label className="woObLabel">
                What program have you been running recently?
                <span className="woObOptional"> (optional)</span>
              </label>
              <input
                className="woObInput"
                type="text"
                placeholder="e.g. Starting Strength, PPL, 5/3/1..."
                value={previousProgram}
                onChange={e => setPreviousProgram(e.target.value)}
              />
            </div>
            <div className="woObActions">
              <button className="woObBtnBack" onClick={goBack} type="button">Back</button>
              <button
                className="woObBtnPrimary"
                onClick={goNext}
                disabled={!canAdvance}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 4: Schedule & Availability
           ============================================================ */}
        {screen === 4 && (
          <div className="woObStep woObStepLeft">
            <div className="woObStepNum">5 of 7</div>
            <h1 className="woObTitle">When can you train?</h1>
            <p className="woObDesc">We'll build a schedule that fits your life.</p>

            {/* Part A: Days per week */}
            <div className="woObFormGroup">
              <label className="woObLabel">Days per week</label>
              <div className="woObStepperRow">
                <button
                  className="woObStepperBtn"
                  onClick={() => handleDaysPerWeekChange(Math.max(2, daysPerWeek - 1))}
                  disabled={daysPerWeek <= 2}
                  type="button"
                >-</button>
                <span className="woObStepperVal">{daysPerWeek}</span>
                <button
                  className="woObStepperBtn"
                  onClick={() => handleDaysPerWeekChange(Math.min(7, daysPerWeek + 1))}
                  disabled={daysPerWeek >= 7}
                  type="button"
                >+</button>
              </div>
              <div className="woObSplitPreview">{splitPreview}</div>
            </div>

            {/* Part B: Preferred days */}
            <div className="woObFormGroup">
              <label className="woObLabel">Preferred days</label>
              <div className="woObDayRow">
                {DAY_LABELS.map((day, i) => (
                  <button
                    key={i}
                    className={`woObDayToggle ${preferredDays.has(i) ? "woObDayToggleActive" : ""}`}
                    onClick={() => toggleDay(i)}
                    type="button"
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Part C: Session duration */}
            <div className="woObFormGroup">
              <label className="woObLabel">Session duration</label>
              <div className="woObDurationPills">
                {SESSION_DURATIONS.map(d => (
                  <button
                    key={d}
                    className={`woObDurationPill ${sessionDuration === d ? "woObDurationPillActive" : ""}`}
                    onClick={() => setSessionDuration(d)}
                    type="button"
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Part D: Exercises per session */}
            <div className="woObFormGroup">
              <label className="woObLabel">Exercises per session</label>
              <div className="woObStepperRow">
                <button
                  className="woObStepperBtn"
                  onClick={() => setExercisesPerSession(Math.max(3, exercisesPerSession - 1))}
                  disabled={exercisesPerSession <= 3}
                  type="button"
                >-</button>
                <span className="woObStepperVal">{exercisesPerSession}</span>
                <button
                  className="woObStepperBtn"
                  onClick={() => setExercisesPerSession(Math.min(10, exercisesPerSession + 1))}
                  disabled={exercisesPerSession >= 10}
                  type="button"
                >+</button>
              </div>
              <div className="woObSplitPreview">
                {exercisesPerSession <= 4 ? "Focused — compounds only, minimal accessories" :
                 exercisesPerSession <= 6 ? "Balanced — compounds + key isolation work" :
                 exercisesPerSession <= 8 ? "Thorough — full volume coverage" :
                 "High volume — advanced bodybuilding style"}
              </div>
            </div>

            {/* Part E: Preferred time */}
            <div className="woObFormGroup">
              <label className="woObLabel">Preferred time <span className="woObOptional">(optional)</span></label>
              <div className="woObDurationPills">
                {TIME_PREFS.map(t => (
                  <button
                    key={t}
                    className={`woObDurationPill ${preferredTime === t ? "woObDurationPillActive" : ""}`}
                    onClick={() => setPreferredTime(t)}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="woObActions">
              <button className="woObBtnBack" onClick={goBack} type="button">Back</button>
              <button
                className="woObBtnPrimary"
                onClick={goNext}
                disabled={!canAdvance}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 5: Equipment & Limitations
           ============================================================ */}
        {screen === 5 && (
          <div className="woObStep woObStepLeft">
            <div className="woObStepNum">6 of 7</div>
            <h1 className="woObTitle">What do you have access to?</h1>
            <p className="woObDesc">Select all equipment available to you.</p>

            {/* Part A: Equipment */}
            <div className="woObEquipGrid">
              {EQUIPMENT_OPTIONS.map(eq => (
                <button
                  key={eq.key}
                  className={`woObEquipCard ${equipment.has(eq.key) ? "woObEquipCardActive" : ""}`}
                  onClick={() => toggleEquipment(eq.key)}
                  type="button"
                >
                  <span className="woObEquipEmoji">{eq.emoji}</span>
                  <span className="woObEquipLabel">{eq.label}</span>
                </button>
              ))}
            </div>

            {/* Part B: Expandable limitations */}
            <button
              className="woObExpandBtn"
              onClick={() => setShowLimitations(!showLimitations)}
              type="button"
            >
              {showLimitations ? "\u25B2" : "\u25BC"} Injuries & Limitations
            </button>

            {showLimitations && (
              <div className="woObLimitationsPanel">
                {/* Injuries with severity */}
                <div className="woObFormGroup">
                  <label className="woObLabel">Injuries</label>
                  <div className="woObInjuryGrid">
                    {INJURY_AREAS.map(inj => {
                      const active = injuries.find(i => i.area === inj.key);
                      return (
                        <div key={inj.key} className="woObInjuryItem">
                          <button
                            className={`woObInjuryChip ${active ? "woObInjuryChipActive" : ""}`}
                            onClick={() => addInjury(inj.key)}
                            type="button"
                          >
                            {active ? "\u2713 " : ""}{inj.label}
                          </button>
                          {active && (
                            <div className="woObSeverityRow">
                              {SEVERITY_LEVELS.map(sev => (
                                <button
                                  key={sev}
                                  className={`woObSeverityBtn ${active.severity === sev ? "woObSeverityBtnActive" : ""}`}
                                  onClick={() => updateInjurySeverity(inj.key, sev)}
                                  type="button"
                                >
                                  {sev}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exercises to avoid */}
                <div className="woObFormGroup">
                  <label className="woObLabel">Exercises to avoid</label>
                  <div className="woObTagWrap">
                    {avoidExercises.map((tag, i) => (
                      <span key={i} className="woObTag">
                        {tag}
                        <button className="woObTagX" onClick={() => removeAvoid(i)} type="button">&times;</button>
                      </span>
                    ))}
                    <input
                      className="woObTagInput"
                      type="text"
                      placeholder="Type and press Enter..."
                      value={avoidInput}
                      onChange={e => setAvoidInput(e.target.value)}
                      onKeyDown={handleAvoidKeyDown}
                    />
                  </div>
                </div>

                {/* Movement preferences */}
                <div className="woObFormGroup">
                  <label className="woObLabel">Movement preferences</label>
                  <div className="woObTagWrap">
                    {movementPrefs.map((tag, i) => (
                      <span key={i} className="woObTag">
                        {tag}
                        <button className="woObTagX" onClick={() => removeMovementPref(i)} type="button">&times;</button>
                      </span>
                    ))}
                    <input
                      className="woObTagInput"
                      type="text"
                      placeholder="e.g. prefer dumbbells, like supersets..."
                      value={movementInput}
                      onChange={e => setMovementInput(e.target.value)}
                      onKeyDown={handleMovementKeyDown}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="woObActions">
              <button className="woObBtnBack" onClick={goBack} type="button">Back</button>
              <button
                className="woObBtnPrimary"
                onClick={goNext}
                disabled={!canAdvance}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 6: Recovery Baseline
           ============================================================ */}
        {screen === 6 && (
          <div className="woObStep woObStepLeft">
            <div className="woObStepNum">7 of 7</div>
            <h1 className="woObTitle">Help us calibrate your recovery.</h1>
            <p className="woObDesc">Recovery capacity determines how much training volume you can handle.</p>

            {/* Part A: Sleep */}
            <div className="woObFormGroup">
              <label className="woObLabel">Average sleep per night</label>
              <div className="woObStepperRow">
                <button
                  className="woObStepperBtn"
                  onClick={() => setSleepHours(Math.max(4, sleepHours - 0.5))}
                  disabled={sleepHours <= 4}
                  type="button"
                >-</button>
                <span className="woObStepperVal">{sleepHours}h</span>
                <button
                  className="woObStepperBtn"
                  onClick={() => setSleepHours(Math.min(10, sleepHours + 0.5))}
                  disabled={sleepHours >= 10}
                  type="button"
                >+</button>
              </div>
            </div>

            {/* Part B: Stress */}
            <div className="woObFormGroup">
              <label className="woObLabel">Stress level</label>
              <div className="woObStressRow">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    className={`woObStressBtn ${stressLevel === level ? "woObStressBtnActive" : ""}`}
                    onClick={() => setStressLevel(level)}
                    type="button"
                  >
                    <span className="woObStressNum">{level}</span>
                    <span className="woObStressLabel">{STRESS_LABELS[level - 1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Part C: Activity level */}
            <div className="woObFormGroup">
              <label className="woObLabel">Daily activity level</label>
              <div className="woObActivityGrid">
                {ACTIVITY_LEVELS.map(a => (
                  <button
                    key={a.key}
                    className={`woObActivityCard ${activityLevel === a.key ? "woObActivityCardActive" : ""}`}
                    onClick={() => setActivityLevel(a.key)}
                    type="button"
                  >
                    <div className="woObActivityLabel">{a.label}</div>
                    <div className="woObActivityDesc">{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="woObActions">
              <button className="woObBtnBack" onClick={goBack} type="button">Back</button>
              <button
                className="woObBtnPrimary"
                onClick={goNext}
                type="button"
              >
                Build My Plan
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 7: Plan Generation (loading)
           ============================================================ */}
        {screen === 7 && (
          <div className="woObStep woObLoadingScreen">
            <h1 className="woObTitle">Building your plan...</h1>
            <div className="woObLoadingSteps">
              {LOADING_STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`woObLoadingItem ${loadingStep > i ? "woObLoadingItemDone" : loadingStep === i ? "woObLoadingItemActive" : ""}`}
                >
                  <span className="woObLoadingIcon">
                    {loadingStep > i ? "\u2713" : loadingStep === i ? "\u25CF" : "\u25CB"}
                  </span>
                  <span className="woObLoadingText">{s.text}</span>
                </div>
              ))}
            </div>
            <div className="woObLoadingBar">
              <div
                className="woObLoadingBarFill"
                style={{ width: `${Math.round((loadingStep / LOADING_STEPS.length) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ============================================================
           Screen 8: Plan Summary
           ============================================================ */}
        {screen === 8 && program && (
          <div className="woObStep woObStepLeft woObSummaryScreen">
            <h1 className="woObTitle">Your Training Plan</h1>
            <p className="woObDesc">Here's what we've built for you based on your goals and preferences.</p>

            {/* Summary cards */}
            <div className="woObSummaryGrid">
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Goal</span>
                <span className="woObSummaryVal">{GOALS.find(g => g.key === goal)?.label || goal}</span>
              </div>
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Timeline</span>
                <span className="woObSummaryVal">{timelineWeeks === 0 ? "Ongoing" : `${timelineWeeks} weeks`}</span>
              </div>
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Split</span>
                <span className="woObSummaryVal">{program.split}</span>
              </div>
              <div className="woObSummaryItem">
                <span className="woObSummaryLabel">Frequency</span>
                <span className="woObSummaryVal">{daysPerWeek}x / week</span>
              </div>
            </div>

            {/* Weekly preview strip */}
            <div className="woObFormGroup">
              <label className="woObLabel">Weekly Schedule</label>
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
                          {day.exercises.slice(0, 5).map((ex, j) => (
                            <div key={j} className="woObExRow">
                              <span className="woObExName">{ex.name}</span>
                              <span className="woObExDetail">{ex.sets}x{ex.reps}</span>
                            </div>
                          ))}
                          {day.exercises.length > 5 && (
                            <div className="woObExMore">+{day.exercises.length - 5} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Phase timeline bar */}
            <div className="woObFormGroup">
              <label className="woObLabel">Training Phases</label>
              <div className="woObPhaseViz">
                {timelinePhases.map((phase, i) => {
                  const totalW = timelineWeeks || phase.weeks.length;
                  const widthPct = (phase.weeks.length / totalW) * 100;
                  return (
                    <div key={i} className="woObPhaseBlock" style={{ width: `${widthPct}%` }}>
                      <div className={`woObPhaseBar woObPhaseBar${i % 4}`}>
                        <span className="woObPhaseName">{phase.name}</span>
                      </div>
                      <div className="woObPhaseWeeks">
                        {phase.weeks.length === 1
                          ? `Wk ${phase.weeks[0]}`
                          : `Wk ${phase.weeks[0]}-${phase.weeks[phase.weeks.length - 1]}`
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Volume summary bar chart */}
            <div className="woObFormGroup">
              <label className="woObLabel">Weekly Volume (sets per muscle)</label>
              <div className="woObVolGrid">
                {Object.entries(volumeSummary)
                  .filter(([, v]) => v > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([muscle, sets]) => (
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

            {/* Action buttons */}
            <div className="woObActions woObSummaryActions">
              <button
                className="woObBtnSecondary"
                onClick={handleCustomize}
                type="button"
              >
                Customize
              </button>
              <button
                className="woObBtnPrimary woObBtnLarge"
                onClick={handleStart}
                type="button"
              >
                Start Training
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

function generatePhases(wc) {
  const range = (s, e) => { const r = []; for (let i = s; i <= e; i++) r.push(i); return r; };
  if (wc <= 4) return [{ name: "Training Block", weeks: range(1, wc), volumeMultiplier: 1.0 }];
  if (wc <= 8) return [
    { name: "Accumulation", weeks: range(1, 3), volumeMultiplier: 1.0 },
    { name: "Intensification", weeks: range(4, 6), volumeMultiplier: 1.1 },
    { name: "Peak", weeks: range(7, wc - 1), volumeMultiplier: 1.15 },
    { name: "Deload", weeks: [wc], volumeMultiplier: 0.6 },
  ];
  if (wc <= 12) return [
    { name: "Accumulation", weeks: range(1, 4), volumeMultiplier: 1.0 },
    { name: "Intensification", weeks: range(5, 8), volumeMultiplier: 1.1 },
    { name: "Peak", weeks: range(9, wc - 1), volumeMultiplier: 1.15 },
    { name: "Deload", weeks: [wc], volumeMultiplier: 0.6 },
  ];
  return [
    { name: "Accumulation", weeks: range(1, 5), volumeMultiplier: 1.0 },
    { name: "Intensification", weeks: range(6, 10), volumeMultiplier: 1.1 },
    { name: "Peak", weeks: range(11, wc - 1), volumeMultiplier: 1.15 },
    { name: "Deload", weeks: [wc], volumeMultiplier: 0.6 },
  ];
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const STYLES = `
/* ============================================================
   Overlay & Card
   ============================================================ */
.woObOverlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  overflow-y: auto;
}

.woObCard {
  background: var(--paper);
  border-radius: 20px;
  box-shadow: var(--shadow);
  max-width: 680px;
  width: 100%;
  padding: 36px 40px;
  position: relative;
  margin: 20px 0;
}

/* ============================================================
   Progress bar
   ============================================================ */
.woObProgress {
  height: 3px;
  background: var(--line);
  border-radius: 3px;
  margin-bottom: 28px;
  overflow: hidden;
}
.woObProgressFill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================================
   Step layout
   ============================================================ */
.woObStep {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.woObStepLeft {
  text-align: left;
  align-items: stretch;
}
.woObStepLeft .woObTitle,
.woObStepLeft .woObDesc,
.woObStepLeft .woObStepNum {
  text-align: center;
}

.woObStepNum {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--muted);
  margin-bottom: 8px;
  font-weight: 600;
}

.woObTitle {
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 8px;
  line-height: 1.3;
}

.woObDesc {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 28px;
  max-width: 480px;
  line-height: 1.5;
  align-self: center;
}

/* ============================================================
   Buttons
   ============================================================ */
.woObBtnPrimary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 32px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}
.woObBtnPrimary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.woObBtnPrimary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.woObBtnLarge {
  padding: 14px 40px;
  font-size: 16px;
}

.woObBtnBack {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}
.woObBtnBack:hover {
  background: var(--chip);
  color: var(--ink);
}

.woObBtnSecondary {
  background: var(--chip);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}
.woObBtnSecondary:hover {
  background: var(--line);
}

.woObActions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
  margin-top: 16px;
  padding-top: 8px;
}
.woObSummaryActions {
  margin-top: 24px;
  justify-content: center;
  gap: 16px;
}

/* ============================================================
   Form elements
   ============================================================ */
.woObFormGroup {
  width: 100%;
  margin-bottom: 22px;
}
.woObLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 10px;
  display: block;
}
.woObOptional {
  font-weight: 400;
  opacity: 0.7;
  font-size: 12px;
}
.woObInput {
  width: 100%;
  padding: 11px 14px;
  border: 2px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  font-size: 15px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}
.woObInput:focus {
  border-color: var(--accent);
}
.woObInput::placeholder {
  color: var(--muted);
  opacity: 0.6;
}
.woObCustomInput {
  margin-top: 12px;
}

/* ============================================================
   Screen 0: Goal Selection
   ============================================================ */
.woObGoalGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 8px;
}
.woObGoalCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 20px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  font-family: inherit;
}
.woObGoalCard:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.woObGoalCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.woObGoalEmoji { font-size: 32px; margin-bottom: 8px; }
.woObGoalLabel { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
.woObGoalDesc { font-size: 11px; color: var(--muted); line-height: 1.4; }

/* ============================================================
   Screen 1: Target Outcome
   ============================================================ */
.woObTargetList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
}
.woObTargetCard {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-size: 15px;
  color: var(--ink);
  font-family: inherit;
}
.woObTargetCard:hover {
  border-color: var(--accent);
}
.woObTargetCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.woObTargetCheck {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  flex-shrink: 0;
  transition: all 0.15s;
}
.woObTargetCardActive .woObTargetCheck {
  background: var(--accent);
  border-color: var(--accent);
}

/* ============================================================
   Screen 2: Timeline
   ============================================================ */
.woObTimelinePills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  margin-bottom: 16px;
  justify-content: center;
}
.woObTimelinePill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 20px;
  border: 2px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 110px;
  position: relative;
  font-family: inherit;
}
.woObTimelinePill:hover {
  border-color: var(--accent);
}
.woObTimelinePillActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.woObTimelinePillLabel {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.woObTimelinePillSub {
  font-size: 11px;
  color: var(--muted);
}
.woObBadge {
  position: absolute;
  top: -8px;
  right: -4px;
  background: var(--accent);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.woObPhasePreviewText {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  line-height: 1.5;
  padding: 12px 20px;
  background: var(--chip);
  border-radius: 10px;
  margin-bottom: 8px;
}

/* ============================================================
   Screen 3: Experience
   ============================================================ */
.woObExpGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 24px;
}
.woObExpCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 20px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  font-family: inherit;
}
.woObExpCard:hover { border-color: var(--accent); }
.woObExpCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.woObExpEmoji { font-size: 28px; margin-bottom: 8px; }
.woObExpLabel { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
.woObExpDesc { font-size: 11px; color: var(--muted); line-height: 1.4; }

/* ============================================================
   Screen 4: Schedule
   ============================================================ */
.woObStepperRow {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}
.woObStepperBtn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid var(--line);
  background: var(--paper);
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}
.woObStepperBtn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.woObStepperBtn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.woObStepperVal {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  min-width: 50px;
  text-align: center;
}
.woObSplitPreview {
  font-size: 13px;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 4px;
}

.woObDayRow {
  display: flex;
  gap: 6px;
}
.woObDayToggle {
  flex: 1;
  padding: 10px 4px;
  border-radius: 10px;
  border: 2px solid var(--line);
  background: var(--paper);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  font-family: inherit;
}
.woObDayToggle:hover { border-color: var(--accent); }
.woObDayToggleActive {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.woObDurationPills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.woObDurationPill {
  padding: 10px 18px;
  border-radius: 20px;
  border: 2px solid var(--line);
  background: var(--paper);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.woObDurationPill:hover { border-color: var(--accent); }
.woObDurationPillActive {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* ============================================================
   Screen 5: Equipment & Limitations
   ============================================================ */
.woObEquipGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  width: 100%;
  margin-bottom: 20px;
}
.woObEquipCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.woObEquipCard:hover { border-color: var(--accent); }
.woObEquipCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.woObEquipEmoji { font-size: 24px; }
.woObEquipLabel { font-size: 12px; font-weight: 600; color: var(--ink); }

.woObExpandBtn {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--chip);
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 16px;
  font-family: inherit;
}
.woObExpandBtn:hover { color: var(--ink); }

.woObLimitationsPanel {
  animation: woObFadeIn 0.2s ease;
}

.woObInjuryGrid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.woObInjuryItem {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.woObInjuryChip {
  padding: 8px 16px;
  border-radius: 20px;
  border: 2px solid var(--line);
  background: var(--paper);
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.woObInjuryChip:hover { border-color: var(--accent); }
.woObInjuryChipActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.woObSeverityRow {
  display: flex;
  gap: 4px;
}
.woObSeverityBtn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--paper);
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.woObSeverityBtn:hover { border-color: var(--accent); }
.woObSeverityBtnActive {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* Tag input */
.woObTagWrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  border: 2px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  min-height: 42px;
  align-items: center;
}
.woObTagWrap:focus-within {
  border-color: var(--accent);
}
.woObTag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.woObTagX {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  opacity: 0.7;
  font-family: inherit;
}
.woObTagX:hover { opacity: 1; }
.woObTagInput {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--ink);
  flex: 1;
  min-width: 120px;
  padding: 2px 0;
  font-family: inherit;
}
.woObTagInput::placeholder {
  color: var(--muted);
  opacity: 0.6;
}

/* ============================================================
   Screen 6: Recovery
   ============================================================ */
.woObStressRow {
  display: flex;
  gap: 8px;
}
.woObStressBtn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.woObStressBtn:hover { border-color: var(--accent); }
.woObStressBtnActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.woObStressNum {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
.woObStressBtnActive .woObStressNum {
  color: var(--accent);
}
.woObStressLabel {
  font-size: 10px;
  color: var(--muted);
  font-weight: 500;
}

.woObActivityGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.woObActivityCard {
  padding: 14px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: inherit;
}
.woObActivityCard:hover { border-color: var(--accent); }
.woObActivityCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.woObActivityLabel {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 2px;
}
.woObActivityDesc {
  font-size: 11px;
  color: var(--muted);
}

/* ============================================================
   Screen 7: Loading
   ============================================================ */
.woObLoadingScreen {
  padding: 40px 0;
  min-height: 300px;
  justify-content: center;
}
.woObLoadingSteps {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 360px;
  margin: 32px auto;
}
.woObLoadingItem {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--muted);
  transition: all 0.3s ease;
  opacity: 0.4;
}
.woObLoadingItemActive {
  opacity: 1;
  color: var(--accent);
}
.woObLoadingItemDone {
  opacity: 1;
  color: var(--ink);
}
.woObLoadingIcon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}
.woObLoadingItemDone .woObLoadingIcon {
  color: var(--accent);
}
.woObLoadingText {
  flex: 1;
}
.woObLoadingBar {
  width: 100%;
  max-width: 360px;
  height: 4px;
  background: var(--line);
  border-radius: 4px;
  overflow: hidden;
  align-self: center;
}
.woObLoadingBarFill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================================
   Screen 8: Summary
   ============================================================ */
.woObSummaryScreen {
  text-align: left;
}
.woObSummaryScreen .woObTitle {
  text-align: center;
}
.woObSummaryScreen .woObDesc {
  text-align: center;
}

.woObSummaryGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  margin-bottom: 24px;
}
.woObSummaryItem {
  background: var(--chip);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
}
.woObSummaryLabel {
  font-size: 11px;
  color: var(--muted);
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.woObSummaryVal {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

/* Schedule preview */
.woObScheduleScroll {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 4px;
  padding-bottom: 6px;
}
.woObSchedule {
  display: flex;
  gap: 8px;
  min-width: max-content;
}
.woObDayCard {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  min-width: 145px;
  max-width: 170px;
}
.woObDayCardRest {
  opacity: 0.45;
  min-width: 90px;
}
.woObDayHeader { margin-bottom: 8px; }
.woObDayTitle {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  display: block;
}
.woObDaySubtitle {
  font-size: 10px;
  color: var(--muted);
}
.woObExList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.woObExRow {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}
.woObExName {
  font-size: 11px;
  color: var(--muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.woObExDetail {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  white-space: nowrap;
}
.woObExMore {
  font-size: 10px;
  color: var(--muted);
  font-style: italic;
  padding-top: 2px;
}

/* Phase visualization */
.woObPhaseViz {
  display: flex;
  gap: 4px;
  width: 100%;
  margin-bottom: 4px;
}
.woObPhaseBlock {
  text-align: center;
  min-width: 0;
}
.woObPhaseBar {
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.woObPhaseBar0 { background: linear-gradient(135deg, #5B7CF5, #7B9CFF); }
.woObPhaseBar1 { background: linear-gradient(135deg, #F59B5B, #F5B87B); }
.woObPhaseBar2 { background: linear-gradient(135deg, #E55B7C, #F57B9C); }
.woObPhaseBar3 { background: linear-gradient(135deg, #5BC57C, #7BD5A0); }
.woObPhaseName {
  font-size: 10px;
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
  color: var(--muted);
  font-weight: 500;
}

/* Volume chart */
.woObVolGrid {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.woObVolItem {
  display: flex;
  align-items: center;
  gap: 10px;
}
.woObVolMuscle {
  font-size: 12px;
  color: var(--muted);
  width: 90px;
  text-align: right;
  flex-shrink: 0;
}
.woObVolBar {
  flex: 1;
  height: 8px;
  background: var(--chip);
  border-radius: 4px;
  overflow: hidden;
}
.woObVolBarFill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #7B9CFF);
  border-radius: 4px;
  transition: width 0.4s ease;
}
.woObVolSets {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  min-width: 24px;
}

/* ============================================================
   Animations
   ============================================================ */
@keyframes woObFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   Scrollbar
   ============================================================ */
.woObScheduleScroll::-webkit-scrollbar {
  height: 4px;
}
.woObScheduleScroll::-webkit-scrollbar-track {
  background: transparent;
}
.woObScheduleScroll::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 4px;
}

/* Close button */
.woObClose {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--chip);
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  z-index: 10;
}
.woObClose:hover {
  background: var(--line);
  color: var(--ink);
}

/* Body stats grid */
.woObBodyGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 8px;
}
.woObHeightRow {
  display: flex;
  align-items: center;
  gap: 6px;
}
.woObInputSmall {
  width: 60px;
}
.woObUnit {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.woObSexBtns {
  display: flex;
  gap: 6px;
}
.woObSexBtn {
  flex: 1;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 700;
  border: 2px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.woObSexBtnActive {
  border-color: var(--accent);
  background: rgba(91,124,245,0.06);
  color: var(--accent);
}
`;
