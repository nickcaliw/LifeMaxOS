import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRestTimer } from "../hooks/useRestTimer.js";
import { calculate1RM } from "../lib/progressiveOverload.js";
import RestTimer from "./RestTimer.jsx";
import WorkoutSummary from "./WorkoutSummary.jsx";

export default function ActiveWorkout({ workout, previousData, onComplete, onCancel }) {
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [sets, setSets] = useState(() => initSets(workout));
  const [showSummary, setShowSummary] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());
  const timer = useRestTimer(120);

  function initSets(wo) {
    if (!wo?.exercises) return [];
    return wo.exercises.map(ex => {
      const numSets = ex.sets || 3;
      return Array.from({ length: numSets }, (_, i) => ({
        weight: "",
        reps: "",
        rir: "",
        setType: i === 0 && numSets > 3 ? "warmup" : "working",
        completed: false,
      }));
    });
  }

  const exercises = workout?.exercises || [];
  const currentEx = exercises[exerciseIdx];
  const currentSets = sets[exerciseIdx] || [];
  const totalExercises = exercises.length;

  // Previous data for current exercise
  const prevExData = useMemo(() => {
    if (!previousData?.exercises || !currentEx) return null;
    return previousData.exercises.find(e =>
      e.name === currentEx.name || e.exerciseId === currentEx.exerciseId
    );
  }, [previousData, currentEx]);

  const updateSet = (setIdx, field, value) => {
    setSets(prev => {
      const next = [...prev];
      next[exerciseIdx] = [...next[exerciseIdx]];
      next[exerciseIdx][setIdx] = { ...next[exerciseIdx][setIdx], [field]: value };
      return next;
    });
  };

  const completeSet = (setIdx) => {
    setSets(prev => {
      const next = [...prev];
      next[exerciseIdx] = [...next[exerciseIdx]];
      next[exerciseIdx][setIdx] = { ...next[exerciseIdx][setIdx], completed: true };
      return next;
    });
    // Auto-start rest timer
    const restTime = currentEx?.restSeconds || 120;
    timer.startTimer(restTime);
  };

  const addSet = () => {
    setSets(prev => {
      const next = [...prev];
      next[exerciseIdx] = [...next[exerciseIdx], { weight: "", reps: "", rir: "", setType: "working", completed: false }];
      return next;
    });
  };

  const removeSet = (setIdx) => {
    setSets(prev => {
      const next = [...prev];
      next[exerciseIdx] = next[exerciseIdx].filter((_, i) => i !== setIdx);
      return next;
    });
  };

  const goNext = () => {
    if (exerciseIdx < totalExercises - 1) setExerciseIdx(i => i + 1);
  };
  const goPrev = () => {
    if (exerciseIdx > 0) setExerciseIdx(i => i - 1);
  };

  const finishWorkout = () => {
    timer.skipTimer();
    setShowSummary(true);
  };

  const saveAndExit = () => {
    const finalExercises = exercises.map((ex, i) => ({
      name: ex.name,
      exerciseId: ex.exerciseId || ex.name,
      sets: (sets[i] || []).map(s => ({
        ...s,
        e1rm: Number(s.weight) > 0 && Number(s.reps) > 0 ? calculate1RM(Number(s.weight), Number(s.reps)) : 0,
      })),
    }));

    onComplete({
      completed: true,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMinutes: Math.round((Date.now() - new Date(startedAt).getTime()) / 60000),
      exercises: finalExercises,
      prsHit: [],
    });
  };

  // Elapsed time
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const completedCount = sets.filter(exSets => exSets.some(s => s.completed)).length;
  const progressPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  if (showSummary) {
    return <WorkoutSummary
      workout={{ exercises: exercises.map((ex, i) => ({ ...ex, sets: sets[i] || [] })) }}
      startedAt={startedAt}
      onSave={saveAndExit}
    />;
  }

  return (
    <div className="woActiveOverlay">
      {/* Header */}
      <div className="woActiveHeader">
        <div className="woActiveHeaderLeft">
          <div className="woActiveTitle">{workout?.title || "Workout"}</div>
          <div className="woActiveElapsed">{formatElapsed(elapsed)}</div>
        </div>
        <div className="woActiveHeaderRight">
          <button className="btn woActiveEndBtn" onClick={finishWorkout} type="button">
            End Workout
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="woActiveProgress">
        <div className="woActiveProgressBar">
          <div className="woActiveProgressFill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="woActiveProgressLabel">{completedCount}/{totalExercises} exercises</div>
      </div>

      {/* Rest Timer (shows when running) */}
      {(timer.isRunning || timer.timeRemaining > 0) && (
        <div className="woActiveRestSection">
          <RestTimer {...timer} onSkip={timer.skipTimer} onAddTime={timer.addTime} />
        </div>
      )}

      {/* Exercise Content */}
      {currentEx && (
        <div className="woActiveBody">
          <div className="woActiveExHeader">
            <div className="woActiveExNum">Exercise {exerciseIdx + 1} of {totalExercises}</div>
            <div className="woActiveExName">{currentEx.name}</div>
            <div className="woActiveExTarget">
              {currentEx.sets || 3} sets × {currentEx.reps || "8-12"} reps
              {currentEx.rir != null && ` @ RIR ${currentEx.rir}`}
            </div>
          </div>

          {/* Previous performance */}
          {prevExData && prevExData.sets?.length > 0 && (
            <div className="woActivePrev">
              <div className="woActivePrevLabel">Last session:</div>
              {prevExData.sets.slice(0, 4).map((s, i) => (
                <span key={i} className="woActivePrevSet">
                  {s.weight}×{s.reps}{s.rir != null ? ` @${s.rir}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* Set Table */}
          <div className="woActiveSets">
            <div className="woActiveSetHeader">
              <span className="woActiveSetCol woActiveSetNum">Set</span>
              <span className="woActiveSetCol">Weight</span>
              <span className="woActiveSetCol">Reps</span>
              <span className="woActiveSetCol woActiveSetSmall">RIR</span>
              <span className="woActiveSetCol woActiveSetSmall">1RM</span>
              <span className="woActiveSetCol woActiveSetCheck"></span>
            </div>
            {currentSets.map((set, si) => {
              const e1rm = Number(set.weight) > 0 && Number(set.reps) > 0
                ? calculate1RM(Number(set.weight), Number(set.reps)) : 0;
              return (
                <div className={`woActiveSetRow ${set.completed ? "woActiveSetDone" : ""} ${set.setType === "warmup" ? "woActiveSetWarmup" : ""}`} key={si}>
                  <span className="woActiveSetCol woActiveSetNum">
                    {set.setType === "warmup" ? "W" : si + 1}
                  </span>
                  <span className="woActiveSetCol">
                    <input type="number" className="woActiveInput"
                      value={set.weight} placeholder="lbs"
                      onChange={e => updateSet(si, "weight", e.target.value)} />
                  </span>
                  <span className="woActiveSetCol">
                    <input type="number" className="woActiveInput"
                      value={set.reps} placeholder="reps"
                      onChange={e => updateSet(si, "reps", e.target.value)} />
                  </span>
                  <span className="woActiveSetCol woActiveSetSmall">
                    <input type="number" className="woActiveInput woActiveInputSmall"
                      value={set.rir} placeholder="—" min="0" max="5"
                      onChange={e => updateSet(si, "rir", e.target.value)} />
                  </span>
                  <span className="woActiveSetCol woActiveSetSmall woActive1rm">
                    {e1rm > 0 ? e1rm : "—"}
                  </span>
                  <span className="woActiveSetCol woActiveSetCheck">
                    {!set.completed ? (
                      <button className="woActiveCheckBtn" onClick={() => completeSet(si)} type="button"
                        disabled={!set.weight || !set.reps}>
                        ✓
                      </button>
                    ) : (
                      <span className="woActiveChecked">✓</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="woActiveSetActions">
            <button className="btn" onClick={addSet} type="button">+ Add Set</button>
            {currentSets.length > 1 && (
              <button className="btn" onClick={() => removeSet(currentSets.length - 1)} type="button">Remove Last</button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="woActiveNav">
        <button className="btn woActiveNavBtn" onClick={goPrev} disabled={exerciseIdx === 0} type="button">
          ← Previous
        </button>
        {exerciseIdx < totalExercises - 1 ? (
          <button className="btn btnPrimary woActiveNavBtn" onClick={goNext} type="button">
            Next Exercise →
          </button>
        ) : (
          <button className="btn btnPrimary woActiveNavBtn" onClick={finishWorkout} type="button">
            Finish Workout 🏆
          </button>
        )}
      </div>
    </div>
  );
}
