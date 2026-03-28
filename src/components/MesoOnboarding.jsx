import { useState, useMemo, useCallback } from "react";

// ---------------------------------------------------------------------------
// NOTE: mesoBuilder.js may not exist yet. These imports will resolve once
// the builder module is created. The component is designed to work with:
//   generateMesocycle(profile, config, template) => mesocycle object
//   MESO_TEMPLATES => array of template definitions
//   recommendTemplate(templates, profile) => sorted templates
// ---------------------------------------------------------------------------
import {
  generateMesocycle as _generateMeso,
  MESO_TEMPLATES as _MESO_TEMPLATES,
  recommendTemplate as _recommendTemplate,
} from "../lib/mesoBuilder.js";

let generateMesocycle = _generateMeso, MESO_TEMPLATES = _MESO_TEMPLATES, recommendTemplate = _recommendTemplate;
if (!generateMesocycle) {
  // Provide fallback data so the UI renders even without the builder
  generateMesocycle = (config) => ({
    weeks: Array.from({ length: config.mesoLength }, (_, i) => ({
      week: i + 1,
      phase: i < config.mesoLength - 1 ? "building" : "peak",
      days: template.days.map(d => ({
        label: d.label,
        muscles: d.muscles,
        exercises: d.muscles.map(m => ({ muscle: m, name: `${m} exercise`, sets: 3, reps: "8-12", rir: Math.max(0, 3 - i) })),
      })),
    })),
    totalWeeks: config.mesoLength + (config.includeDeload ? 1 : 0),
  });

  MESO_TEMPLATES = [
    { id: "full_body_3x", name: "Full Body 3x", days_per_week: 3, experience: "beginner", description: "Hit every muscle 3x/week with full body sessions", frequency: "3x", days: [{ label: "Full Body A", muscles: ["Chest", "Back", "Quads", "Triceps", "Abs"] }, { label: "Full Body B", muscles: ["Chest", "Back", "Shoulders", "Hamstrings", "Biceps"] }, { label: "Full Body C", muscles: ["Chest", "Back", "Quads", "Glutes", "Abs"] }] },
    { id: "upper_lower_4x", name: "Upper / Lower 4x", days_per_week: 4, experience: "beginner-intermediate", description: "Classic split with 2 upper and 2 lower days per week", frequency: "2x", days: [{ label: "Upper A", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] }, { label: "Lower A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Abs"] }, { label: "Upper B", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] }, { label: "Lower B", muscles: ["Hamstrings", "Glutes", "Quads", "Calves", "Abs"] }] },
    { id: "ppl_6x", name: "Push / Pull / Legs 6x", days_per_week: 6, experience: "intermediate-advanced", description: "High frequency PPL hitting each muscle twice per week", frequency: "2x", days: [{ label: "Push A", muscles: ["Chest", "Shoulders", "Triceps"] }, { label: "Pull A", muscles: ["Back", "Biceps", "Abs"] }, { label: "Legs A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] }, { label: "Push B", muscles: ["Chest", "Shoulders", "Triceps"] }, { label: "Pull B", muscles: ["Back", "Biceps", "Abs"] }, { label: "Legs B", muscles: ["Hamstrings", "Glutes", "Quads", "Calves"] }] },
    { id: "ppl_5x", name: "Push / Pull / Legs 5x", days_per_week: 5, experience: "intermediate", description: "PPL with an extra upper and lower day for balanced volume", frequency: "2x", days: [{ label: "Push", muscles: ["Chest", "Shoulders", "Triceps"] }, { label: "Pull", muscles: ["Back", "Biceps", "Abs"] }, { label: "Legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] }, { label: "Upper", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] }, { label: "Lower", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Abs"] }] },
    { id: "upper_lower_ppl_5x", name: "Upper/Lower + PPL 5x", days_per_week: 5, experience: "intermediate", description: "Hybrid split combining upper/lower with PPL for variety", frequency: "2x", days: [{ label: "Upper", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] }, { label: "Lower", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] }, { label: "Push", muscles: ["Chest", "Shoulders", "Triceps"] }, { label: "Pull", muscles: ["Back", "Biceps", "Abs"] }, { label: "Legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Abs"] }] },
    { id: "arnold_6x", name: "Arnold Split 6x", days_per_week: 6, experience: "advanced", description: "Chest/Back, Shoulders/Arms, Legs -- twice per week", frequency: "2x", days: [{ label: "Chest & Back A", muscles: ["Chest", "Back"] }, { label: "Shoulders & Arms A", muscles: ["Shoulders", "Biceps", "Triceps"] }, { label: "Legs A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Abs"] }, { label: "Chest & Back B", muscles: ["Chest", "Back"] }, { label: "Shoulders & Arms B", muscles: ["Shoulders", "Biceps", "Triceps"] }, { label: "Legs B", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Abs"] }] },
    { id: "upper_lower_3x", name: "Upper / Lower 3x", days_per_week: 3, experience: "beginner", description: "Alternating upper and lower sessions, 3 days per week", frequency: "1.5x", days: [{ label: "Upper", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] }, { label: "Lower", muscles: ["Quads", "Hamstrings", "Glutes", "Calves", "Abs"] }, { label: "Full Body", muscles: ["Chest", "Back", "Quads", "Shoulders", "Abs"] }] },
    { id: "ppl_legs_upper_4x", name: "Push/Pull/Legs + Upper 4x", days_per_week: 4, experience: "intermediate", description: "PPL base with an extra upper day for more frequency", frequency: "1.5-2x", days: [{ label: "Push", muscles: ["Chest", "Shoulders", "Triceps"] }, { label: "Pull", muscles: ["Back", "Biceps", "Abs"] }, { label: "Legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] }, { label: "Upper", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] }] },
  ];

  recommendTemplate = (templates, profile) => {
    const daysMatch = templates.filter(t => t.days_per_week === profile.daysPerWeek);
    return daysMatch.length > 0 ? daysMatch : templates;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TOTAL_SCREENS = 9;

const GOALS = [
  { key: "hypertrophy", label: "Build Muscle", desc: "Maximize hypertrophy across all muscle groups", emoji: "\uD83D\uDCAA" },
  { key: "specialization", label: "Specialize", desc: "Bring up lagging muscle groups while maintaining others", emoji: "\uD83C\uDFAF" },
  { key: "strength_hypertrophy", label: "Strength-Hypertrophy", desc: "Build muscle with emphasis on compound strength", emoji: "\uD83C\uDFCB\uFE0F" },
  { key: "recomp", label: "Recomposition", desc: "Build muscle and lose fat simultaneously", emoji: "\u26A1" },
];

const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Beginner", desc: "Less than 1 year", emoji: "\uD83C\uDF31" },
  { key: "intermediate", label: "Intermediate", desc: "1-3 years", emoji: "\uD83D\uDCAA" },
  { key: "advanced", label: "Advanced", desc: "3+ years", emoji: "\uD83C\uDFC6" },
];

const MUSCLE_GROUPS = [
  { key: "chest", label: "Chest", region: "upper" },
  { key: "back", label: "Back", region: "upper" },
  { key: "front_delts", label: "Front Delts", region: "upper" },
  { key: "side_delts", label: "Side Delts", region: "upper" },
  { key: "rear_delts", label: "Rear Delts", region: "upper" },
  { key: "traps", label: "Traps", region: "upper" },
  { key: "biceps", label: "Biceps", region: "arms" },
  { key: "triceps", label: "Triceps", region: "arms" },
  { key: "forearms", label: "Forearms", region: "arms" },
  { key: "quads", label: "Quads", region: "lower" },
  { key: "hamstrings", label: "Hamstrings", region: "lower" },
  { key: "glutes", label: "Glutes", region: "lower" },
  { key: "calves", label: "Calves", region: "lower" },
  { key: "abs", label: "Abs", region: "core" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SESSION_DURATIONS = [45, 60, 75, 90];

const EQUIPMENT_OPTIONS = [
  { key: "full_gym", label: "Full Gym", emoji: "\uD83C\uDFCB\uFE0F" },
  { key: "home_gym", label: "Home Gym", emoji: "\uD83C\uDFE0" },
  { key: "dumbbells_only", label: "Dumbbells Only", emoji: "\uD83D\uDCAA" },
  { key: "machines_only", label: "Machines Only", emoji: "\u2699\uFE0F" },
  { key: "limited", label: "Limited / Minimal", emoji: "\uD83E\uDDD8" },
];

const INJURY_AREAS = [
  { key: "shoulder", label: "Shoulder" },
  { key: "lower_back", label: "Lower Back" },
  { key: "knee", label: "Knee" },
  { key: "wrist", label: "Wrist" },
  { key: "hip", label: "Hip" },
  { key: "none", label: "None" },
];

const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary", desc: "Desk job, minimal movement" },
  { key: "light", label: "Lightly Active", desc: "Some walking, light activity" },
  { key: "moderate", label: "Moderately Active", desc: "Regular activity, on your feet" },
  { key: "very", label: "Very Active", desc: "Physical job or active lifestyle" },
];

const RECOVERY_LEVELS = [
  { key: "poor", label: "Poor", desc: "Often sore for 3+ days" },
  { key: "below_average", label: "Below Average", desc: "Sore for 2-3 days" },
  { key: "average", label: "Average", desc: "Sore for 1-2 days" },
  { key: "good", label: "Good", desc: "Rarely sore past 24 hours" },
  { key: "excellent", label: "Excellent", desc: "Almost never sore" },
];

const MESO_LENGTHS = [4, 5, 6, 8];

const STRESS_LABELS = ["Very Low", "Low", "Moderate", "High", "Very High"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function defaultDays(count) {
  const maps = {
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
  };
  return new Set(maps[count] || maps[4]);
}

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function getPhasePreview(length, includeDeload) {
  const total = length + (includeDeload ? 1 : 0);
  const phases = [];
  for (let i = 1; i <= length; i++) {
    if (i <= Math.ceil(length * 0.4)) phases.push(`Wk ${i}: Accumulation`);
    else if (i <= Math.ceil(length * 0.8)) phases.push(`Wk ${i}: Intensification`);
    else phases.push(`Wk ${i}: Peak`);
  }
  if (includeDeload) phases.push(`Wk ${total}: Deload`);
  return phases;
}

// Volume estimation per muscle group for the summary chart
function estimateVolume(template) {
  const vol = {};
  if (!template || !template.days) return vol;
  template.days.forEach(day => {
    (day.muscles || []).forEach(m => {
      const key = m.toLowerCase();
      vol[key] = (vol[key] || 0) + 3; // ~3 sets per muscle per session as baseline
    });
  });
  return vol;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MesoOnboarding({ onComplete, onCancel }) {
  const [screen, setScreen] = useState(0);

  // Screen 0: Profile
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState("male");
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(10);
  const [weight, setWeight] = useState(170);
  const [experience, setExperience] = useState("");

  // Screen 1: Goal
  const [goal, setGoal] = useState("");

  // Screen 2: Specialization
  const [specialTargets, setSpecialTargets] = useState([]);

  // Screen 3: Schedule
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [preferredDays, setPreferredDays] = useState(() => defaultDays(4));
  const [sessionDuration, setSessionDuration] = useState(60);

  // Screen 4: Equipment
  const [equipment, setEquipment] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [avoidExercises, setAvoidExercises] = useState("");

  // Screen 5: Recovery
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState(3);
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [recoveryLevel, setRecoveryLevel] = useState("average");

  // Screen 6: Meso Config
  const [mesoLength, setMesoLength] = useState(5);
  const [includeDeload, setIncludeDeload] = useState(true);
  const [startDate, setStartDate] = useState(getNextMonday);

  // Screen 7: Template
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Screen 8: Generated meso
  const [generatedMeso, setGeneratedMeso] = useState(null);

  // Build profile object
  const profile = useMemo(() => ({
    age, sex,
    heightFt, heightIn,
    heightCm: Math.round((heightFt * 12 + heightIn) * 2.54),
    weight,
    weightKg: Math.round(weight * 0.453592),
    experience,
    goal,
    specialization_targets: specialTargets,
    daysPerWeek,
    preferredDays: [...preferredDays].sort(),
    sessionDuration,
    equipment,
    injuries,
    excludedExercises: avoidExercises.split(",").map(s => s.trim()).filter(Boolean),
    sleepHours,
    stressLevel,
    activityLevel,
    recoveryLevel,
    mesoLength,
    includeDeload,
    startDate,
  }), [age, sex, heightFt, heightIn, weight, experience, goal, specialTargets, daysPerWeek, preferredDays, sessionDuration, equipment, injuries, avoidExercises, sleepHours, stressLevel, activityLevel, recoveryLevel, mesoLength, includeDeload, startDate]);

  // Filter templates by days per week
  const filteredTemplates = useMemo(() => {
    const all = MESO_TEMPLATES || [];
    const matching = all.filter(t => (t.daysPerWeek || t.days_per_week) === daysPerWeek);
    const pool = matching.length > 0 ? matching : all;
    if (recommendTemplate) {
      try {
        const ranked = recommendTemplate({ ...profile, daysPerWeek });
        if (Array.isArray(ranked) && ranked.length > 0) {
          // recommendTemplate returns [{template, score}], unwrap and filter
          const unwrapped = ranked.map(r => r.template || r).filter(Boolean);
          const rankedMatching = unwrapped.filter(t => (t.daysPerWeek || t.days_per_week) === daysPerWeek);
          if (rankedMatching.length > 0) return rankedMatching;
        }
      } catch { /* fallback */ }
    }
    return pool;
  }, [daysPerWeek, profile]);

  // Navigation
  const goNext = useCallback(() => {
    setScreen(s => {
      // Skip specialization screen if goal doesn't include it
      if (s === 1 && goal !== "specialization") return 3;
      return s + 1;
    });
  }, [goal]);

  const goBack = useCallback(() => {
    setScreen(s => {
      // Skip specialization screen going backwards too
      if (s === 3 && goal !== "specialization") return 1;
      return s - 1;
    });
  }, [goal]);

  // Validation per screen
  const canAdvance = useMemo(() => {
    switch (screen) {
      case 0: return age > 0 && weight > 0 && experience !== "";
      case 1: return goal !== "";
      case 2: return specialTargets.length >= 1 && specialTargets.length <= 4;
      case 3: return preferredDays.size === daysPerWeek && sessionDuration > 0;
      case 4: return equipment.length > 0;
      case 5: return activityLevel !== "" && recoveryLevel !== "";
      case 6: return mesoLength > 0 && startDate !== "";
      case 7: return selectedTemplate !== null;
      default: return true;
    }
  }, [screen, age, weight, experience, goal, specialTargets, preferredDays, daysPerWeek, sessionDuration, equipment, activityLevel, recoveryLevel, mesoLength, startDate, selectedTemplate]);

  // Handle day toggle for schedule
  const toggleDay = useCallback((dayIdx) => {
    setPreferredDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIdx)) {
        next.delete(dayIdx);
      } else {
        if (next.size >= daysPerWeek) {
          // Remove the earliest excess
          const sorted = [...next].sort((a, b) => a - b);
          next.delete(sorted[0]);
        }
        next.add(dayIdx);
      }
      return next;
    });
  }, [daysPerWeek]);

  // Handle days per week change
  const changeDaysPerWeek = useCallback((n) => {
    setDaysPerWeek(n);
    setPreferredDays(defaultDays(n));
  }, []);

  // Handle specialization toggle
  const toggleSpecial = useCallback((key) => {
    setSpecialTargets(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 4) return prev;
      return [...prev, key];
    });
  }, []);

  // Handle equipment toggle
  const toggleEquipment = useCallback((key) => {
    setEquipment(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  // Handle injury toggle
  const toggleInjury = useCallback((key) => {
    if (key === "none") {
      setInjuries(["none"]);
      return;
    }
    setInjuries(prev => {
      const without = prev.filter(k => k !== "none");
      return without.includes(key) ? without.filter(k => k !== key) : [...without, key];
    });
  }, []);

  // Handle template selection + mesocycle generation
  const selectTemplate = useCallback((template) => {
    setSelectedTemplate(template);
    try {
      const meso = generateMesocycle({
        profile,
        template,
        mesoLength,
        includeDeload,
        startDate,
        preferredDays: [...preferredDays].sort(),
        equipment: [...(equipment || [])],
        injuries: [...(injuries || [])],
        specialization: [...(specialTargets || [])],
      });
      setGeneratedMeso(meso);
    } catch (e) {
      console.error("[MesoOnboarding] generateMesocycle error:", e);
      setGeneratedMeso(null);
    }
    setScreen(8);
  }, [profile, mesoLength, includeDeload, startDate, daysPerWeek, sessionDuration, preferredDays, equipment, injuries, specialTargets]);

  // Handle custom split selection
  const selectCustomSplit = useCallback(() => {
    const customTemplate = {
      id: "custom",
      name: "Custom Split",
      daysPerWeek,
      experience: experience || "intermediate",
      description: "Build your own training split",
      frequency: "custom",
      days: [...preferredDays].sort().map((_, i) => ({ label: `Day ${i + 1}`, muscles: [] })),
    };
    setSelectedTemplate(customTemplate);
    try {
      const meso = generateMesocycle({
        profile,
        template: customTemplate,
        mesoLength,
        includeDeload,
        startDate,
        preferredDays: [...preferredDays].sort(),
        equipment: [...(equipment || [])],
        injuries: [...(injuries || [])],
        specialization: [...(specialTargets || [])],
      });
      setGeneratedMeso(meso);
    } catch (e) {
      console.error("[MesoOnboarding] generateMesocycle error:", e);
      setGeneratedMeso(null);
    }
    setScreen(8);
  }, [profile, daysPerWeek, preferredDays, experience, mesoLength, includeDeload, startDate, sessionDuration, equipment, injuries, specialTargets]);

  // Final completion
  const handleComplete = useCallback(() => {
    onComplete({
      profile,
      config: { mesoLength, includeDeload, startDate, daysPerWeek, sessionDuration },
      template: selectedTemplate,
      mesocycle: generatedMeso,
    });
  }, [onComplete, profile, mesoLength, includeDeload, startDate, daysPerWeek, sessionDuration, selectedTemplate, generatedMeso]);

  // Volume data for summary chart
  const volumeData = useMemo(() => {
    if (!selectedTemplate) return {};
    return estimateVolume(selectedTemplate);
  }, [selectedTemplate]);

  const maxVolume = useMemo(() => Math.max(...Object.values(volumeData), 1), [volumeData]);

  // Phase preview
  const phases = useMemo(() => getPhasePreview(mesoLength, includeDeload), [mesoLength, includeDeload]);

  return (
    <div className="moOverlay">
      <style>{STYLES}</style>
      <div className="moCard">
        {/* Close button */}
        {onCancel && (
          <button className="moClose" onClick={onCancel} type="button" title="Cancel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}

        {/* Progress bar - show on screens 0-6 */}
        {screen <= 6 && (
          <div className="moProgress">
            <div className="moProgressFill" style={{ width: `${Math.round((screen / 6) * 100)}%` }} />
          </div>
        )}

        {/* ==================================================================
           Screen 0: Profile
           ================================================================== */}
        {screen === 0 && (
          <div className="moStep moStepLeft">
            <div className="moStepNum">Step 1 of 7</div>
            <h1 className="moTitle">Tell us about you</h1>
            <p className="moDesc">This helps us calibrate volume, intensity, and recovery demands.</p>

            <div className="moRow">
              <div className="moFormGroup moFormHalf">
                <label className="moLabel">Age</label>
                <input className="moInput" type="number" min={14} max={80} value={age} onChange={e => setAge(+e.target.value)} />
              </div>
              <div className="moFormGroup moFormHalf">
                <label className="moLabel">Sex</label>
                <div className="moToggleRow">
                  {["male", "female"].map(s => (
                    <button key={s} type="button" className={`moToggle ${sex === s ? "moToggleActive" : ""}`} onClick={() => setSex(s)}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="moRow">
              <div className="moFormGroup moFormHalf">
                <label className="moLabel">Height</label>
                <div className="moHeightRow">
                  <input className="moInput moInputSmall" type="number" min={3} max={8} value={heightFt} onChange={e => setHeightFt(+e.target.value)} />
                  <span className="moUnit">ft</span>
                  <input className="moInput moInputSmall" type="number" min={0} max={11} value={heightIn} onChange={e => setHeightIn(+e.target.value)} />
                  <span className="moUnit">in</span>
                </div>
              </div>
              <div className="moFormGroup moFormHalf">
                <label className="moLabel">Weight</label>
                <div className="moHeightRow">
                  <input className="moInput" type="number" min={60} max={500} value={weight} onChange={e => setWeight(+e.target.value)} style={{ flex: 1 }} />
                  <span className="moUnit">lbs</span>
                </div>
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Training Experience</label>
              <div className="moExpGrid">
                {EXPERIENCE_LEVELS.map(e => (
                  <button key={e.key} type="button" className={`moExpCard ${experience === e.key ? "moExpCardActive" : ""}`} onClick={() => setExperience(e.key)}>
                    <span className="moExpEmoji">{e.emoji}</span>
                    <span className="moExpLabel">{e.label}</span>
                    <span className="moExpDesc">{e.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="moActions">
              <div />
              <button className="moBtnPrimary" disabled={!canAdvance} onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 1: Goal
           ================================================================== */}
        {screen === 1 && (
          <div className="moStep">
            <div className="moStepNum">Step 2 of 7</div>
            <h1 className="moTitle">What's your training goal?</h1>
            <p className="moDesc">This shapes your volume targets, rep ranges, and exercise selection.</p>

            <div className="moGoalGrid">
              {GOALS.map(g => (
                <button key={g.key} type="button" className={`moGoalCard ${goal === g.key ? "moGoalCardActive" : ""}`} onClick={() => setGoal(g.key)}>
                  <div className="moGoalEmoji">{g.emoji}</div>
                  <div className="moGoalLabel">{g.label}</div>
                  <div className="moGoalDesc">{g.desc}</div>
                </button>
              ))}
            </div>

            <div className="moActions">
              <button className="moBtnBack" onClick={goBack}>Back</button>
              <button className="moBtnPrimary" disabled={!canAdvance} onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 2: Specialization
           ================================================================== */}
        {screen === 2 && (
          <div className="moStep moStepLeft">
            <div className="moStepNum">Step 3 of 7</div>
            <h1 className="moTitle">Which muscles do you want to emphasize?</h1>
            <p className="moDesc">Selected muscles get +30% volume. Pick 1 to 4.</p>

            {["upper", "arms", "lower", "core"].map(region => (
              <div key={region} className="moFormGroup">
                <label className="moLabel">{region === "upper" ? "Upper Body" : region === "arms" ? "Arms" : region === "lower" ? "Lower Body" : "Core"}</label>
                <div className="moChipGrid">
                  {MUSCLE_GROUPS.filter(m => m.region === region).map(m => (
                    <button
                      key={m.key}
                      type="button"
                      className={`moChip ${specialTargets.includes(m.key) ? "moChipActive" : ""} ${specialTargets.length >= 4 && !specialTargets.includes(m.key) ? "moChipDisabled" : ""}`}
                      onClick={() => toggleSpecial(m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {specialTargets.length >= 4 && (
              <p className="moHint">Maximum 4 specialization targets reached.</p>
            )}

            <div className="moActions">
              <button className="moBtnBack" onClick={goBack}>Back</button>
              <button className="moBtnPrimary" disabled={!canAdvance} onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 3: Schedule
           ================================================================== */}
        {screen === 3 && (
          <div className="moStep moStepLeft">
            <div className="moStepNum">{goal === "specialization" ? "Step 4 of 7" : "Step 3 of 7"}</div>
            <h1 className="moTitle">When can you train?</h1>
            <p className="moDesc">We'll build your split around your schedule.</p>

            <div className="moFormGroup">
              <label className="moLabel">Days per week</label>
              <div className="moStepperRow">
                <button type="button" className="moStepperBtn" disabled={daysPerWeek <= 3} onClick={() => changeDaysPerWeek(daysPerWeek - 1)}>-</button>
                <span className="moStepperValue">{daysPerWeek}</span>
                <button type="button" className="moStepperBtn" disabled={daysPerWeek >= 6} onClick={() => changeDaysPerWeek(daysPerWeek + 1)}>+</button>
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Preferred days</label>
              <div className="moDayRow">
                {DAY_LABELS.map((d, i) => (
                  <button key={d} type="button" className={`moDayBtn ${preferredDays.has(i) ? "moDayBtnActive" : ""}`} onClick={() => toggleDay(i)}>
                    {d}
                  </button>
                ))}
              </div>
              <span className="moSubtext">{preferredDays.size} of {daysPerWeek} days selected</span>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Session duration</label>
              <div className="moPillRow">
                {SESSION_DURATIONS.map(d => (
                  <button key={d} type="button" className={`moPill ${sessionDuration === d ? "moPillActive" : ""}`} onClick={() => setSessionDuration(d)}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div className="moActions">
              <button className="moBtnBack" onClick={goBack}>Back</button>
              <button className="moBtnPrimary" disabled={!canAdvance} onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 4: Equipment & Limitations
           ================================================================== */}
        {screen === 4 && (
          <div className="moStep moStepLeft">
            <div className="moStepNum">{goal === "specialization" ? "Step 5 of 7" : "Step 4 of 7"}</div>
            <h1 className="moTitle">What do you have access to?</h1>
            <p className="moDesc">This helps us pick the right exercises for your setup.</p>

            <div className="moFormGroup">
              <label className="moLabel">Equipment</label>
              <div className="moEquipGrid">
                {EQUIPMENT_OPTIONS.map(e => (
                  <button key={e.key} type="button" className={`moEquipCard ${equipment.includes(e.key) ? "moEquipCardActive" : ""}`} onClick={() => toggleEquipment(e.key)}>
                    <span className="moEquipEmoji">{e.emoji}</span>
                    <span className="moEquipLabel">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Injuries or limitations</label>
              <div className="moChipGrid">
                {INJURY_AREAS.map(a => (
                  <button key={a.key} type="button" className={`moChip ${injuries.includes(a.key) ? "moChipActive" : ""}`} onClick={() => toggleInjury(a.key)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Exercises to avoid <span className="moOptional">(optional, comma-separated)</span></label>
              <input
                className="moInput"
                type="text"
                placeholder="e.g. behind neck press, upright row"
                value={avoidExercises}
                onChange={e => setAvoidExercises(e.target.value)}
              />
            </div>

            <div className="moActions">
              <button className="moBtnBack" onClick={goBack}>Back</button>
              <button className="moBtnPrimary" disabled={!canAdvance} onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 5: Recovery
           ================================================================== */}
        {screen === 5 && (
          <div className="moStep moStepLeft">
            <div className="moStepNum">{goal === "specialization" ? "Step 6 of 7" : "Step 5 of 7"}</div>
            <h1 className="moTitle">How well do you recover?</h1>
            <p className="moDesc">Recovery capacity determines how much training volume you can handle.</p>

            <div className="moFormGroup">
              <label className="moLabel">Average sleep per night</label>
              <div className="moStepperRow">
                <button type="button" className="moStepperBtn" disabled={sleepHours <= 4} onClick={() => setSleepHours(sleepHours - 1)}>-</button>
                <span className="moStepperValue">{sleepHours}h</span>
                <button type="button" className="moStepperBtn" disabled={sleepHours >= 10} onClick={() => setSleepHours(sleepHours + 1)}>+</button>
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Stress level</label>
              <div className="moStressRow">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" className={`moStressBtn ${stressLevel === n ? "moStressBtnActive" : ""}`} onClick={() => setStressLevel(n)}>
                    <span className="moStressNum">{n}</span>
                    <span className="moStressLabel">{STRESS_LABELS[n - 1]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Daily activity level</label>
              <div className="moActivityGrid">
                {ACTIVITY_LEVELS.map(a => (
                  <button key={a.key} type="button" className={`moActivityCard ${activityLevel === a.key ? "moActivityCardActive" : ""}`} onClick={() => setActivityLevel(a.key)}>
                    <span className="moActivityLabel">{a.label}</span>
                    <span className="moActivityDesc">{a.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Recovery self-assessment</label>
              <div className="moRecoveryGrid">
                {RECOVERY_LEVELS.map(r => (
                  <button key={r.key} type="button" className={`moRecoveryCard ${recoveryLevel === r.key ? "moRecoveryCardActive" : ""}`} onClick={() => setRecoveryLevel(r.key)}>
                    <span className="moRecoveryLabel">{r.label}</span>
                    <span className="moRecoveryDesc">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="moActions">
              <button className="moBtnBack" onClick={goBack}>Back</button>
              <button className="moBtnPrimary" disabled={!canAdvance} onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 6: Mesocycle Config
           ================================================================== */}
        {screen === 6 && (
          <div className="moStep moStepLeft">
            <div className="moStepNum">{goal === "specialization" ? "Step 7 of 7" : "Step 6 of 7"}</div>
            <h1 className="moTitle">Configure your training block</h1>
            <p className="moDesc">Set the length and start date for your mesocycle.</p>

            <div className="moFormGroup">
              <label className="moLabel">Mesocycle length (training weeks)</label>
              <div className="moPillRow">
                {MESO_LENGTHS.map(n => (
                  <button key={n} type="button" className={`moPill ${mesoLength === n ? "moPillActive" : ""}`} onClick={() => setMesoLength(n)}>
                    {n} weeks
                  </button>
                ))}
              </div>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Include deload week</label>
              <div className="moToggleRow">
                <button type="button" className={`moToggle ${includeDeload ? "moToggleActive" : ""}`} onClick={() => setIncludeDeload(true)}>Yes</button>
                <button type="button" className={`moToggle ${!includeDeload ? "moToggleActive" : ""}`} onClick={() => setIncludeDeload(false)}>No</button>
              </div>
              <span className="moSubtext">Total: {mesoLength + (includeDeload ? 1 : 0)} weeks</span>
            </div>

            <div className="moFormGroup">
              <label className="moLabel">Start date</label>
              <div className="moDateRow">
                <input className="moInput" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="moBtnSecondary" onClick={() => setStartDate(getNextMonday())}>Next Monday</button>
              </div>
            </div>

            <div className="moPhasePreview">
              <label className="moLabel">Phase timeline</label>
              <div className="moPhaseBar">
                {phases.map((p, i) => {
                  const isDeload = p.includes("Deload");
                  const isAccum = p.includes("Accumulation");
                  const isIntens = p.includes("Intensification");
                  return (
                    <div key={i} className={`moPhaseSegment ${isDeload ? "moPhaseDeload" : isAccum ? "moPhaseAccum" : isIntens ? "moPhaseIntens" : "moPhasePeak"}`} style={{ flex: 1 }}>
                      <span className="moPhaseLabel">{p.split(": ")[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="moActions">
              <button className="moBtnBack" onClick={goBack}>Back</button>
              <button className="moBtnPrimary" disabled={!canAdvance} onClick={goNext}>Continue</button>
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 7: Template Chooser
           ================================================================== */}
        {screen === 7 && (
          <div className="moStep moStepLeft">
            <h1 className="moTitle">Choose your training split</h1>
            <p className="moDesc">Templates matched to your {daysPerWeek}-day schedule. Select one to generate your mesocycle.</p>

            <div className="moTemplateGrid">
              {filteredTemplates.map((t, i) => (
                <button key={t.id} type="button" className={`moTemplateCard ${selectedTemplate?.id === t.id ? "moTemplateCardActive" : ""}`} onClick={() => selectTemplate(t)}>
                  {i === 0 && <span className="moTemplateBadge">Recommended</span>}
                  <div className="moTemplateName">{t.name}</div>
                  <div className="moTemplateDesc">{t.description}</div>
                  <div className="moTemplateMeta">
                    <span className="moTemplateTag">{t.daysPerWeek || t.days_per_week} days/wk</span>
                    <span className="moTemplateTag">{t.frequency} frequency</span>
                    <span className="moTemplateTag moTemplateExp">{t.experience}</span>
                  </div>
                  <div className="moTemplateDays">
                    {t.days.map((d, j) => (
                      <span key={j} className="moTemplateDayChip">{d.label}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <button type="button" className="moCustomSplitBtn" onClick={selectCustomSplit}>
              <span className="moCustomIcon">+</span>
              <span>Build Custom Split</span>
            </button>

            <div className="moActions">
              <button className="moBtnBack" onClick={goBack}>Back</button>
              <div />
            </div>
          </div>
        )}

        {/* ==================================================================
           Screen 8: Plan Summary
           ================================================================== */}
        {screen === 8 && (
          <div className="moStep moStepLeft">
            <h1 className="moTitle">Your Mesocycle</h1>
            <p className="moDesc">Review your training block before starting.</p>

            <div className="moSummarySection">
              <div className="moSummaryRow">
                <span className="moSummaryLabel">Goal</span>
                <span className="moSummaryValue">{GOALS.find(g => g.key === goal)?.label || goal}</span>
              </div>
              <div className="moSummaryRow">
                <span className="moSummaryLabel">Template</span>
                <span className="moSummaryValue">{selectedTemplate?.name || "Custom"}</span>
              </div>
              <div className="moSummaryRow">
                <span className="moSummaryLabel">Duration</span>
                <span className="moSummaryValue">{mesoLength} weeks{includeDeload ? " + 1 deload" : ""}</span>
              </div>
              <div className="moSummaryRow">
                <span className="moSummaryLabel">Schedule</span>
                <span className="moSummaryValue">{daysPerWeek} days/week, {sessionDuration} min sessions</span>
              </div>
              <div className="moSummaryRow">
                <span className="moSummaryLabel">Start</span>
                <span className="moSummaryValue">{formatDate(startDate)}</span>
              </div>
            </div>

            {/* Weekly split preview */}
            {selectedTemplate && (
              <div className="moFormGroup">
                <label className="moLabel">Weekly Split</label>
                <div className="moSplitPreview">
                  {selectedTemplate.days.map((d, i) => (
                    <div key={i} className="moSplitDay">
                      <div className="moSplitDayName">{d.label}</div>
                      <div className="moSplitDayMuscles">{(d.muscles || []).join(", ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volume chart */}
            {Object.keys(volumeData).length > 0 && (
              <div className="moFormGroup">
                <label className="moLabel">Estimated Weekly Volume (sets per muscle)</label>
                <div className="moVolumeChart">
                  {Object.entries(volumeData).sort((a, b) => b[1] - a[1]).map(([muscle, sets]) => (
                    <div key={muscle} className="moVolumeRow">
                      <span className="moVolumeName">{muscle.charAt(0).toUpperCase() + muscle.slice(1)}</span>
                      <div className="moVolumeBarTrack">
                        <div className="moVolumeBar" style={{ width: `${Math.round((sets / maxVolume) * 100)}%` }} />
                      </div>
                      <span className="moVolumeSets">{sets}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase timeline */}
            <div className="moFormGroup">
              <label className="moLabel">Phase Timeline</label>
              <div className="moPhaseBar">
                {phases.map((p, i) => {
                  const isDeload = p.includes("Deload");
                  const isAccum = p.includes("Accumulation");
                  const isIntens = p.includes("Intensification");
                  return (
                    <div key={i} className={`moPhaseSegment ${isDeload ? "moPhaseDeload" : isAccum ? "moPhaseAccum" : isIntens ? "moPhaseIntens" : "moPhasePeak"}`} style={{ flex: 1 }}>
                      <span className="moPhaseLabel">{p}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="moActions moSummaryActions">
              <button className="moBtnSecondary" onClick={() => setScreen(0)}>Customize</button>
              <button className="moBtnPrimary moBtnLarge" onClick={handleComplete}>Start Training</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const STYLES = `
/* ============================================================
   Overlay & Card
   ============================================================ */
.moOverlay {
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
.moCard {
  background: var(--paper);
  border-radius: 20px;
  box-shadow: var(--shadow);
  max-width: 700px;
  width: 100%;
  padding: 36px 40px;
  position: relative;
  margin: 20px 0;
}

/* ============================================================
   Close button
   ============================================================ */
.moClose {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--chip);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 2;
}
.moClose:hover {
  background: var(--line);
  color: var(--ink);
}

/* ============================================================
   Progress bar
   ============================================================ */
.moProgress {
  height: 3px;
  background: var(--line);
  border-radius: 3px;
  margin-bottom: 28px;
  overflow: hidden;
}
.moProgressFill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================================
   Step layout
   ============================================================ */
.moStep {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.moStepLeft {
  text-align: left;
  align-items: stretch;
}
.moStepLeft .moTitle,
.moStepLeft .moDesc,
.moStepLeft .moStepNum {
  text-align: center;
}
.moStepNum {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--muted);
  margin-bottom: 8px;
  font-weight: 600;
}
.moTitle {
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 8px;
  line-height: 1.3;
}
.moDesc {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 28px;
  max-width: 520px;
  line-height: 1.5;
  align-self: center;
}

/* ============================================================
   Buttons
   ============================================================ */
.moBtnPrimary {
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
.moBtnPrimary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.moBtnPrimary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.moBtnLarge {
  padding: 14px 40px;
  font-size: 16px;
}
.moBtnBack {
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
.moBtnBack:hover {
  background: var(--chip);
  color: var(--ink);
}
.moBtnSecondary {
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
.moBtnSecondary:hover {
  background: var(--line);
}

.moActions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
  margin-top: 20px;
  padding-top: 8px;
}
.moSummaryActions {
  margin-top: 28px;
  justify-content: center;
  gap: 16px;
}

/* ============================================================
   Form elements
   ============================================================ */
.moFormGroup {
  width: 100%;
  margin-bottom: 22px;
}
.moFormHalf {
  flex: 1;
  min-width: 0;
}
.moLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 10px;
  display: block;
}
.moOptional {
  font-weight: 400;
  opacity: 0.7;
  font-size: 12px;
}
.moInput {
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
.moInput:focus {
  border-color: var(--accent);
}
.moInput::placeholder {
  color: var(--muted);
  opacity: 0.6;
}
.moInputSmall {
  width: 70px;
  flex: none;
}
.moRow {
  display: flex;
  gap: 16px;
  width: 100%;
}
.moHeightRow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.moUnit {
  font-size: 14px;
  color: var(--muted);
  font-weight: 500;
}
.moSubtext {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
  display: block;
}
.moHint {
  font-size: 13px;
  color: var(--accent);
  margin: 0 0 8px;
  font-style: italic;
}

/* ============================================================
   Toggle row
   ============================================================ */
.moToggleRow {
  display: flex;
  gap: 0;
  border: 2px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}
.moToggle {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.moToggle + .moToggle {
  border-left: 2px solid var(--line);
}
.moToggleActive {
  background: var(--accent);
  color: #fff;
}

/* ============================================================
   Experience cards
   ============================================================ */
.moExpGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.moExpCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 18px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.moExpCard:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.moExpCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.moExpEmoji { font-size: 28px; }
.moExpLabel { font-size: 14px; font-weight: 600; color: var(--ink); }
.moExpDesc { font-size: 11px; color: var(--muted); line-height: 1.3; }

/* ============================================================
   Goal cards
   ============================================================ */
.moGoalGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 8px;
}
.moGoalCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 22px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  font-family: inherit;
}
.moGoalCard:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.moGoalCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.moGoalEmoji { font-size: 32px; margin-bottom: 8px; }
.moGoalLabel { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
.moGoalDesc { font-size: 12px; color: var(--muted); line-height: 1.4; }

/* ============================================================
   Chip grid (specialization, injuries)
   ============================================================ */
.moChipGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.moChip {
  padding: 8px 18px;
  border: 2px solid var(--line);
  border-radius: 20px;
  background: var(--paper);
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.moChip:hover:not(.moChipDisabled) {
  border-color: var(--accent);
}
.moChipActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.moChipDisabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ============================================================
   Stepper
   ============================================================ */
.moStepperRow {
  display: flex;
  align-items: center;
  gap: 16px;
}
.moStepperBtn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--line);
  background: var(--paper);
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-family: inherit;
}
.moStepperBtn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.moStepperBtn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.moStepperValue {
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  min-width: 48px;
  text-align: center;
}

/* ============================================================
   Day selector
   ============================================================ */
.moDayRow {
  display: flex;
  gap: 6px;
}
.moDayBtn {
  flex: 1;
  padding: 10px 0;
  border: 2px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  text-align: center;
}
.moDayBtn:hover {
  border-color: var(--accent);
}
.moDayBtnActive {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

/* ============================================================
   Pills
   ============================================================ */
.moPillRow {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.moPill {
  padding: 10px 22px;
  border: 2px solid var(--line);
  border-radius: 24px;
  background: var(--paper);
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.moPill:hover {
  border-color: var(--accent);
}
.moPillActive {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

/* ============================================================
   Equipment grid
   ============================================================ */
.moEquipGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.moEquipCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 12px;
  padding: 16px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.moEquipCard:hover {
  border-color: var(--accent);
}
.moEquipCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.moEquipEmoji { font-size: 24px; }
.moEquipLabel { font-size: 12px; font-weight: 600; color: var(--ink); }

/* ============================================================
   Stress buttons
   ============================================================ */
.moStressRow {
  display: flex;
  gap: 8px;
}
.moStressBtn {
  flex: 1;
  padding: 12px 6px;
  border: 2px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.moStressBtn:hover {
  border-color: var(--accent);
}
.moStressBtnActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.moStressNum {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
.moStressLabel {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.2;
}

/* ============================================================
   Activity cards
   ============================================================ */
.moActivityGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.moActivityCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 12px;
  padding: 14px 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.moActivityCard:hover {
  border-color: var(--accent);
}
.moActivityCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.moActivityLabel { font-size: 13px; font-weight: 600; color: var(--ink); }
.moActivityDesc { font-size: 11px; color: var(--muted); line-height: 1.3; }

/* ============================================================
   Recovery cards
   ============================================================ */
.moRecoveryGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.moRecoveryCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 110px;
}
.moRecoveryCard:hover {
  border-color: var(--accent);
}
.moRecoveryCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.moRecoveryLabel { font-size: 13px; font-weight: 600; color: var(--ink); }
.moRecoveryDesc { font-size: 10px; color: var(--muted); line-height: 1.3; }

/* ============================================================
   Date row
   ============================================================ */
.moDateRow {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

/* ============================================================
   Phase preview bar
   ============================================================ */
.moPhasePreview {
  margin-bottom: 16px;
}
.moPhaseBar {
  display: flex;
  gap: 3px;
  border-radius: 8px;
  overflow: hidden;
}
.moPhaseSegment {
  padding: 10px 4px;
  text-align: center;
  border-radius: 4px;
}
.moPhaseAccum { background: var(--accent-soft); }
.moPhaseIntens { background: var(--accent-medium); }
.moPhasePeak { background: var(--accent); color: #fff; }
.moPhaseDeload { background: var(--chip); }
.moPhaseLabel {
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.moPhaseAccum .moPhaseLabel { color: var(--accent); }
.moPhaseIntens .moPhaseLabel { color: var(--accent); }
.moPhaseDeload .moPhaseLabel { color: var(--muted); }

/* ============================================================
   Template chooser
   ============================================================ */
.moTemplateGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.moTemplateCard {
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 18px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}
.moTemplateCard:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.moTemplateCardActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.moTemplateBadge {
  position: absolute;
  top: -8px;
  right: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.moTemplateName {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.moTemplateDesc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}
.moTemplateMeta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.moTemplateTag {
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--chip);
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}
.moTemplateExp {
  background: var(--accent-soft);
  color: var(--accent);
}
.moTemplateDays {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.moTemplateDayChip {
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--line2, var(--chip));
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}
.moCustomSplitBtn {
  width: 100%;
  padding: 16px;
  border: 2px dashed var(--line);
  border-radius: 14px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}
.moCustomSplitBtn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.moCustomIcon {
  font-size: 20px;
  font-weight: 700;
}

/* ============================================================
   Summary screen
   ============================================================ */
.moSummarySection {
  background: var(--chip);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
}
.moSummaryRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}
.moSummaryRow + .moSummaryRow {
  border-top: 1px solid var(--line);
}
.moSummaryLabel {
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}
.moSummaryValue {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

/* Split preview */
.moSplitPreview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.moSplitDay {
  background: var(--chip);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  align-items: baseline;
}
.moSplitDayName {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  min-width: 100px;
}
.moSplitDayMuscles {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

/* Volume chart */
.moVolumeChart {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.moVolumeRow {
  display: flex;
  align-items: center;
  gap: 10px;
}
.moVolumeName {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  min-width: 90px;
  text-align: right;
}
.moVolumeBarTrack {
  flex: 1;
  height: 16px;
  background: var(--chip);
  border-radius: 8px;
  overflow: hidden;
}
.moVolumeBar {
  height: 100%;
  background: var(--accent);
  border-radius: 8px;
  transition: width 0.3s ease;
  min-width: 4px;
}
.moVolumeSets {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  min-width: 24px;
}
`;
